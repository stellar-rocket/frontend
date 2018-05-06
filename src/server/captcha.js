import Delogger from 'delogger'

import Config from '../utils/config'

const log = new Delogger('Captcha')
const config = new Config({sync: true})

module.exports = (app) => {
  app.get('/captcha/sitekey', (req, res) => {
    res.json(config.captcha.sitekey)
  })
}
