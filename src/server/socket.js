import SocketIO from 'socket.io'
import SocketIOClient from 'socket.io-client'
import Delogger from 'delogger'
import Cookie from 'cookie'

import { Resolve } from './resolveUser'
import Config from '../utils/config'
import Crash from '../utils/crash'

const config = new Config({sync: true})
const log = new Delogger('Socket')

module.exports = (app, server) => {
  app.io = SocketIO(server)

  app.io.set('authorization', authorization)

  /* app.io.on('connect', (socket) => {
    log.info('User connect')
    socket.on('disconnect', () => {
      log.info('User leave')
    })
  }) */

  app.controlCenterSocket = SocketIOClient(`http://${config.controlCenter.host}:${config.controlCenter.port}?secret=${config.controlCenter.secret}`)

  app.controlCenterSocket.on('connect', () => {
    log.info('Connected to Control Center')
  })

  app.controlCenterSocket.on('disconnect', () => {
    log.info('Disconnected from Control Center')
  })

  app.crashSocket = new Crash(app.io, app.controlCenterSocket)

  const events = [
    'crash:begin',
    'crash:value',
    'crash:end'
  ]

  forwardEvents(events, app.controlCenterSocket, app.io)
}

function authorization (handshake, accept) {
  var cookies = Cookie.parse(handshake.headers.cookie || '')

  if (!cookies.stellarSession) {
    return accept('Not logged in', false)
  }

  Resolve(cookies.stellarSession).then((session) => {
    if (session) {
      accept(null, true)
    } else {
      accept('Invalid session', false)
    }
  })
}

function forwardEvents (events, from, to) {
  for (let event of events) {
    from.on(event, (data) => {
      if (event === 'crash:value') {
        data = data.multiplicator
      }
      to.emit(event, data)
    })
  }
}
