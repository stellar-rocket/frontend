import Delogger from 'delogger'

import Transaction from '../model/transaction'
import ResolveCaptcha from './resolveCaptcha'
import Wallet from '../model/wallet'
import Config from '../utils/config'
import BankApi from '../utils/bank'

const log = new Delogger('Faucet')
const config = new Config({sync: true})
const bankAPI = new BankApi()

module.exports = (app) => {
  app.post('/faucet', ResolveCaptcha, (req, res) => {
    Wallet.findOne({
      _id: req.session.user.wallet
    }).then((doc) => {
      if (!doc) {
        res.status(404)
        return res.json({
          err: 'Wallet not found'
        })
      }

      if (doc.balance > 0) {
        res.status(403)
        return res.json({
          err: 'Wallet is not empty'
        })
      }

      let transaction = new Transaction({
        wallet: doc._id.toString(),
        type: 'faucet',
        amount: config.faucet.amount,
        address: '',
        status: 'progress'
      })

      bankAPI.sendTransaction(transaction).then(() => {
        res.json({
          err: null,
          faucet: {
            amount: config.faucet.amount
          }
        })
      }).catch((err) => {
        log.error('Failed to process transaction')
        log.error(err)
        res.status(500)
        res.end({
          err: 'Internal error'
        })
      })
    })
  })
}
