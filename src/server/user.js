import Delogger from 'delogger'
import Gravatar from 'gravatar'

import User from '../model/user'
import Wallet from '../model/wallet'

const log = new Delogger('User')

module.exports = (app) => {
  app.get('/user/?(:id(\\w+))?', (req, res) => {
    var user = req.session.user
    let requestId = req.params.id || user._id.toString()

    User.findOne({
      _id: requestId
    }).populate('wallet').then((doc) => {
      if (!doc) {
        res.status(404)
        return res.end('User not found')
      }

      if (user._id.toString() === doc._id.toString()) {
        let jsonUser = doc.toJSON()
        jsonUser.avatar = Gravatar.url(doc.email)
        res.json(jsonUser)
      } else {
        let jsonUser = {
          username: doc.username,
          avatar: Gravatar.url(doc.email)
        }
        return res.json(jsonUser)
      }
    })
  })
}
