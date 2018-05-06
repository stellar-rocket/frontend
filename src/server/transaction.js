import Delogger from 'delogger'

import Transaction from '../model/transaction'

const log = new Delogger('Transaction')

module.exports = (app) => {
  app.get('/transaction', (req, res) => {
    Transaction.find({
      $or: [
        {
          wallet: req.session.user.wallet,
          type: 'deposit'
        },
        {
          wallet: req.session.user.wallet,
          type: 'withdraw'
        }
      ]
    }).limit(20).sort({'date': -1}).then((docs) => {
      res.json(docs)
    }).catch(console.error)
  })
}
