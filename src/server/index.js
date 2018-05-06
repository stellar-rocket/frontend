import Delogger from 'delogger'
import Express from 'express'
import compression from 'compression'
import cookieParser from 'cookie-parser'
import bodyParser from 'body-parser'
import http from 'http'

import ResolveUser from './resolveUser'
import Config from '../utils/config'

const config = new Config({sync: true})

export default class Server {
  constructor () {
    this.log = new Delogger('Server')
    this.app = new Express()
    this.app.disable('x-powered-by')
    this.app.use(compression())
    this.app.use(cookieParser())
    this.app.use(bodyParser.json())
    this.app.use(bodyParser.urlencoded({
      extended: true
    }))

    this.server = http.createServer(this.app)

    this.app.use(ResolveUser())
    require('./log')(this.app)
    require('./auth')(this.app)
    require('./socket')(this.app, this.server)
    require('./user')(this.app)
    require('./crash')(this.app)
    require('./wallet')(this.app)
    require('./transaction')(this.app)
    require('./faucet')(this.app)
    require('./captcha')(this.app)
  }

  listen () {
    let port = config.server.port
    let host = config.server.host
    this.server.listen(port, host, (err) => {
      if (err) {
        this.log.error(err)
        throw err
      }

      this.log.info(`Server listening on port ${host}:${port}`)
    })
  }
}
