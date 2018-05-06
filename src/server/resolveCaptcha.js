import Delogger from 'delogger'
import Request from 'request'
import Config from '../utils/config'

const config = new Config({sync: true})
const recaptchaBaseURL = 'https://www.google.com/recaptcha/api'
const log = new Delogger('Captcha')

export default function verifyCaptcha (req, res, next) {
  Request.post({
    url: `${recaptchaBaseURL}/siteverify`,
    formData: {
      secret: config.captcha.secret,
      response: req.body.captchaHash || '',
      remoteip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
    }
  }, (err, httpResponse, body) => {
    if (err || httpResponse >= 400) {
      log.error('Failed to verify captcha')
      log.error(err)
      res.status(500)
      res.end()
      return
    }

    let response = JSON.parse(body)
    if (response.success) {
      next()
    } else {
      res.status(401)
      res.json({
        err: 'Invalid captcha.'
      })
    }
  })
}
