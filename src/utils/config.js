import fs from 'fs'
import Delogger from 'delogger'
import EventEmitter from 'events'
import { expect } from 'chai'

import template from './config.template'

export const ConfigLocation = `config.json`

export default class Config extends EventEmitter {
  constructor (props) {
    super()
    props = props || {}
    this.location = process.env.CONFIG_PATH || ConfigLocation
    this.log = new Delogger('Config')

    let config
    if (props.sync) {
      try {
        var data = fs.readFileSync(this.location)
        config = this.parseConfig(data)
        this.assignConfig(config)
      } catch (err) {
        if (err.code === 'ENOENT') {
          this.generateConfig()
        } else {
          this.log.error(err)
        }
      }
    } else {
      fs.readFile(this.location, (err, data) => {
        if (err && err.code === 'ENOENT') {
          this.generateConfig()
        } else if (!err) {
          config = this.parseConfig(data)
          this.assignConfig(config)
        } else {
          this.log.error(err)
        }
      })
    }
  }

  generateConfig () {
    this.assignConfig(template)
    try {
      fs.writeFileSync(this.location, JSON.stringify(template, 'undefined', 2))
    } catch (err) {
      this.log.error(err)
    }
  }

  parseConfig (string) {
    let config = JSON.parse(string)

    expect(config).to.have.property('database').to.be.a('object')
    expect(config.database).to.have.property('type').to.be.equal('mongodb')
    expect(config.database).to.have.property('host').to.be.a('string').not.empty
    expect(config.database).to.have.property('port').to.be.a('number').within(0, 65535)
    expect(config.database).to.have.property('database').to.be.a('string').not.empty

    expect(config.database).to.have.property('username').to.be.a('string').not.empty
    expect(config.database).to.have.property('password').to.be.a('string').not.empty

    expect(config).to.have.property('server').to.be.a('object')
    expect(config.server).to.have.property('port').to.be.a('number').within(0, 65535)
    expect(config.server).to.have.property('host').to.be.a('string').not.empty

    expect(config).to.have.property('controlCenter').to.be.a('object')
    expect(config.controlCenter).to.have.property('port').to.be.a('number').within(0, 65535)
    expect(config.controlCenter).to.have.property('host').to.be.a('string').not.empty
    expect(config.controlCenter).to.have.property('secret').to.be.a('string').not.empty

    expect(config).to.have.property('bank').to.be.a('object')
    expect(config.bank).to.have.property('port').to.be.a('number').within(0, 65535)
    expect(config.bank).to.have.property('host').to.be.a('string').not.empty
    expect(config.bank).to.have.property('secret').to.be.a('string').not.empty

    expect(config).to.have.property('captcha').to.be.a('object')
    expect(config.captcha).to.have.property('sitekey').to.be.a('string').not.empty
    expect(config.captcha).to.have.property('secret').to.be.a('string').not.empty

    expect(config).to.have.property('bet').to.be.a('object')
    expect(config.bet).to.have.property('maxBet').to.be.a('number').to.be.at.least(1000)
    expect(config.bet).to.have.property('commission').to.be.a('number').to.be.at.below(1)

    expect(config).to.have.property('faucet').to.be.a('object')
    expect(config.faucet).to.have.property('amount').to.be.a('number').to.be.at.least(1)

    return config
  }

  assignConfig (config) {
    Object.assign(this, config)

    this.emit('ready')
  }
}
