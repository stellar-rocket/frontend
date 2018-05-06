import Delogger from 'delogger'

import Transaction from '../model/transaction'
import Wallet from '../model/wallet'
import BankApi from '../utils/bank'
import ResolveCaptcha from './resolveCaptcha'

const log = new Delogger('Wallet')

const bankAPI = new BankApi()
module.exports = (app) => {
  app.get('/wallet/stellarRocketAddress', (req, res) => {
    bankAPI.getStellarRocketAddress().then((address) => {
      res.end(address)
    }).catch((err) => {
      log.error('Failed to retriev stellarRocketAddress from bank')
      log.error(err)
      res.status(500)
    })
  })

  app.post('/wallet/withdraw', ResolveCaptcha, (req, res) => {
    if (!req.body.amount || !req.body.address) {
      res.status(400)
      return res.json({
        err: 'Missing amount or address',
        body: req.body
      })
    }

    Wallet.findOne({
      _id: req.session.user.wallet
    }).then((doc) => {
      if (!doc) {
        res.status(404)
        return res.json({
          err: 'Wallet not found'
        })
      }

      if (doc.balance < req.body.amount) {
        res.status(403)
        return res.json({
          err: 'Insufficient wallet balance',
          wallet: doc
        })
      }

      let transaction = new Transaction({
        wallet: doc._id.toString(),
        type: 'withdraw',
        amount: req.body.amount,
        address: req.body.address,
        status: 'progress'
      })

      bankAPI.sendTransaction(transaction).then(() => {
        res.end()
      }).catch((err) => {
        log.error('Failed to process transaction')
        log.error(err)
        res.status(500)
        res.end()
      })
    })
  })
}
