import Delogger from 'delogger'
import CryptoJS from 'crypto-js'
import Crypto from 'crypto'

import BankApi from '../utils/bank'
import User from '../model/user'
import Session from '../model/session'
import ResolveCaptcha from './resolveCaptcha'

const log = new Delogger('Auth')
const bankAPI = new BankApi()

module.exports = (app) => {
  app.use((req, res, next) => {
    if (req.url.match(/\/(auth|app|captcha)\/.*/g)) {
      next()
    } else {
      // Is the user logged in
      if (req.session && req.session.user) {
        next()
      } else {
        res.status(401)
        res.end('Unauthorized')
      }
    }
  })

  app.post('/auth/register', ResolveCaptcha, (req, res) => {
    var form = {
      username: req.body.username,
      password: CryptoJS.SHA256(req.body.password).toString(),
      email: req.body.email
    }

    if (!form.username || !form.password || !form.email) {
      res.status(400)
      res.json({
        err: 'Missing User, Email or Password.'
      })
    }

    let newUser = new User(form)
    newUser.save().then(() => {
      return bankAPI.createWallet(newUser._id)
    }).then(() => {
      return setSession(req, res, newUser)
    }).then(() => {
      log.info(`User ${newUser.username} register`)
      res.status(200)
      res.json({
        err: false
      })
    }).catch((err) => {
      if (err.code === 11000) {
        res.status(409)
        return res.json({
          err: 'Username or email already used.'
        })
      }

      newUser.delete()
      log.error('Failed to register user')
      log.error(err)

      res.status(500)
      res.end()
    })
  })

  app.post('/auth/login', ResolveCaptcha, (req, res) => {
    const form = {
      username: req.body.username,
      password: CryptoJS.SHA256(req.body.password).toString()
    }

    if (!form.username || !form.password) {
      res.status(400)
      return res.json({
        err: 'Missing User or Password.'
      })
    }

    User.findOne({
      username: form.username,
      password: form.password
    }).then((user) => {
      if (!user) {
        res.status(401)
        return res.json({
          err: 'Invalid user / password combinaison.'
        })
      }

      setSession(res, res, user).then(() => {
        log.info(`User ${user.username} login`)
        res.status(200)
        res.json({
          err: false
        })
      })
    }).catch((err) => {
      log.error('Failed to login user')
      log.error(err)

      res.status(500)
      res.end()
    })
  })

  app.post('/auth/logout', (req, res) => {
    if (!req.session || !req.session.user) {
      res.status(401)
      return res.json({
        err: 'You are not logged in.'
      })
    }

    unsetSession(req, res).then(() => {
      log.info(`User ${req.session.user.username} logout`)
      res.status(200)
      res.json({
        err: false
      })
    }).catch((err) => {
      log.error('Failed to logout user')
      log.error(err)

      res.status(500)
      res.end()
    })
  })

  app.post('/auth/changepass', (req, res) => {
    var form = {
      username: req.body.username,
      oldPassword: CryptoJS.SHA256(req.body.oldPassword).toString(),
      newPassword: CryptoJS.SHA256(req.body.newPassword).toString()
    }

    if (!form.username || !form.oldPassword || !form.newPassword) {
      res.status(400)
      return res.json({
        err: 'Missing User, oldPassword or newPassword.'
      })
    }

    User.findOne({
      username: form.username,
      password: form.oldPassword
    }).then((user) => {
      if (!user) {
        res.status(401)
        res.json({
          err: 'Invalid user / password combinaison.'
        })
      } else {
        return user.update({
          password: form.newPassword
        })
      }
    }).then(() => {
      res.status(200)
      res.json({
        err: false
      })
    }).catch((err) => {
      log.error('Failed to change user password')
      log.error(err)

      res.status(500)
      res.end()
    })
  })

  app.get('/auth/isLogged', (req, res) => {
    res.status(200)
    res.json(req.session != null && req.session.user != null)
  })
}

function setSession (req, res, user) {
  return new Promise((resolve, reject) => {
    let session = new Session({
      user,
      uid: Crypto.randomBytes(128).toString('hex')
    })

    session.save().then(() => {
      res.cookie('stellarSession', session.uid, {expires: new Date(Date.now() + 86400000), httpOnly: true, encode: String})
      resolve()
    }).then(resolve).catch((err) => {
      log.error('Failed to save session')
      log.error(err)
      return reject(err)
    })
  })
}

function unsetSession (req, res) {
  return new Promise((resolve, reject) => {
    req.session.remove().then(() => {
      res.clearCookie('stellarSession')
      resolve()
    }).catch((err) => {
      log.error('Failed to unset session')
      log.error(err)
      return reject(err)
    })
  })
}
