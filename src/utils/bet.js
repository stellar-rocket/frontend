import Delogger from 'delogger'

import Bet from '../model/bet'
import Hash from '../model/hash'
import Wallet from '../model/wallet'
import Transaction from '../model/transaction'
import BankUtils from './bank'
import Config from './config'

const config = new Config({ sync: true })

export default class BetUtils {
  constructor (io) {
    this.log = new Delogger('Bets')
    this.io = io

    this.bank = new BankUtils()

    this.bets = []
    this.closedBets = []
  }

  reset () {
    this.bets = []
    this.closedBets = []
  }

  getBet (userId) {
    let bet = this.bets.find((bet) => bet.user.toString() === userId)
    if (!bet) {
      bet = this.closedBets.find((bet) => bet.user.toString() === userId)
    }
    return bet
  }

  checkout (hashValue) {
    return new Promise((resolve, reject) => {
      this.closeAllBetAt(0)
      Hash.findOne({
        value: hashValue
      }).then((doc) => {
        if (!doc) {
          throw new Error('Hash not found')
        }

        let closedBets = this.closedBets.map((bet) => {
          bet.hash = doc._id
          return bet
        })

        if (closedBets.length <= 0) {
          this.log.info(`No bet saved for hash ${doc.value}`)
          return resolve(closedBets)
        }

        return Bet.collection.insert(closedBets).then(() => {
          this.log.info(`Saved bet for hash ${doc.value}`)

          return this.updateWallets(closedBets)
        }).then(() => {
          this.log.info(`Updated wallets balance`)
          resolve(closedBets)
        })
      }).catch((err) => {
        this.log.error('Failed to save bets')
        this.log.error(err)
        reject(err)
      })
    })
  }

  updateWallets (bets) {
    return new Promise((resolve, reject) => {
      for (let bet of bets) {
        let profit = Math.abs(bet.profit)
        profit -= profit * config.bet.commission

        let transaction = new Transaction({
          wallet: bet.wallet,
          type: profit > 0 ? 'credit' : 'debit',
          amount: profit,
          status: 'progress'
        })

        return this.bank.sendTransaction(transaction).then(resolve).catch(reject)
      }
    })
  }

  closeAllBetAt (multiplicator) {
    let bets = this.bets.slice(0) // clone
    for (let bet of bets) {
      this.closeBet({username: 'BetUtils'}, bet.id, multiplicator)
    }
  }

  closeAutoBetFor (multiplicator) {
    let toCloseBets = this.bets.filter((bet) => {
      return bet.multiplicator === null ? false : multiplicator >= bet.multiplicator
    })

    for (let bet of toCloseBets) {
      this.closeBet({username: 'BetUtils'}, bet.id, bet.multiplicator)
    }
  }

  openBet (user, bet) {
    return new Promise((resolve, reject) => {
      if (!(bet instanceof Bet)) {
        throw Error('bet is not an Instance of Bet')
      }

      Wallet.findOne({
        _id: user.wallet
      }).then((doc) => {
        if (!doc) {
          return reject(new Error('Wallet not found'))
        }

        if (doc.balance < bet.amount) {
          return reject(new Error('Not enough funds'))
        }

        this.bets.push(bet)

        this.log.info(`${user.username} bet ${bet.amount} Stroops`)
        if (bet.multiplicator) {
          this.log.info(`\`- This bet will auto close at ${bet.multiplicator}`)
        }

        this.io.emit('client:bet:open', bet)

        resolve(bet)
      }).catch(reject)
    })
  }

  closeBet (user, betId, multiplicator) {
    let betIndex = this.bets.findIndex((bet) => bet.id === betId)

    if (betIndex === -1) {
      return false
    }

    let bet = this.bets.splice(betIndex, 1)[0]

    bet.multiplicator = multiplicator
    bet.profit = Math.floor((bet.amount * (multiplicator / 100)) - bet.amount)

    this.closedBets.push(bet)

    this.log.info(`${user.username} close is bet of ${bet.amount} Stroops at ${bet.multiplicator}. Profit: ${bet.profit}`)
    this.io.emit('client:bet:close', bet)

    return bet
  }
}
