import Delogger from 'delogger'
import Cookie from 'cookie'

import { Resolve } from '../server/resolveUser'
import Bet from '../model/bet'
import BetUtils from '../utils/bet'
import Config from './config'

const config = new Config({ sync: true })

const defaultCrash = {
  multiplicator: -1,
  runId: -1,
  position: -1
}
// A modifier dans web-static --> forms/bet.js
const MAX_BET = config.bet.maxBet

export default class Crash {
  constructor (clientIo, controlCenterIo) {
    this.log = new Delogger('CrashSocket')

    this.clientIo = clientIo
    this.controlCenterIo = controlCenterIo

    this.betUtils = new BetUtils(clientIo)

    this.ready = false
    this.currentCrash = defaultCrash
    this.initSocket()
  }

  initSocket () {
    this.initServerSocket()
    this.initClientSocket()
  }

  initServerSocket () {
    // When crash begin
    this.controlCenterIo.on('crash:begin', (data) => {
      this.log.info(`Starting game n°${data.metadata.position} of run n°${data.metadata.runId}`)
      this.betUtils.reset()
      this.ready = true
      this.currentCrash = {
        multiplicator: 100,
        runId: data.metadata.runId,
        position: data.metadata.position
      }
    })

    // When control center send a crash value
    this.controlCenterIo.on('crash:value', (data) => {
      if (data.metadata.runId !== this.currentCrash.runId ||
        data.metadata.position !== this.currentCrash.position) {
        this.ready = false
        this.currentCrash = defaultCrash
        return null
      }

      if (data.multiplicator >= 100) {
        this.ready = false
      }

      this.currentCrash = {
        multiplicator: data.multiplicator,
        runId: data.metadata.runId,
        position: data.metadata.position
      }

      this.betUtils.closeAutoBetFor(data.multiplicator)
    })

    // When crash finish
    this.controlCenterIo.on('crash:end', (data) => {
      this.log.info(`Game n°${data.metadata.position} of run n°${data.metadata.runId} just Crashed at ${data.multiplicator}`)
      this.ready = false
      this.betUtils.checkout(data.hash).then((closedBets) => {
        this.clientIo.emit('crash:checkout', closedBets)
      })
    })
  }

  initClientSocket () {
    this.clientIo.on('connect', (socket) => {
      var cookies = Cookie.parse(socket.handshake.headers.cookie || '')

      if (!cookies.stellarSession) {
        return 'Not logged in'
      }

      Resolve(cookies.stellarSession).then((session) => {
        if (!session) {
          return 'Invalid session'
        }

        socket.user = session.user

        // Client Ready to bet
        socket.emit('client:ready', {
          multiplicator: this.currentCrash.multiplicator,
          metadata: {
            runId: this.currentCrash.runId,
            position: this.currentCrash.position
          },
          maxBet: MAX_BET,
          bets: {
            open: this.betUtils.bets,
            closed: this.betUtils.closedBets
          }
        })

        // When client open bet
        socket.on('client:bet:open', (data, callback) => {
          if (!(callback instanceof Function)) {
            callback = function () {}
          }

          if (!this.ready) {
            return callback('Cannot bet now')
          }

          this.handleClientBetOpen(data, socket).then((response) => {
            callback(null, response)
          }).catch((err) => {
            callback(err.message)
          })
        })

        // When client close bet
        socket.on('client:bet:close', (data, callback) => {
          if (!(callback instanceof Function)) {
            callback = function () {}
          }

          if (this.ready) {
            return callback('Cannot checkout now')
          }

          this.handleClientBetClose(data, socket).then((response) => {
            callback(null, response)
          }).catch((err) => {
            callback(err.message)
          })
        })
      })
    })
  }

  handleClientBetOpen (data, socket) {
    return new Promise((resolve, reject) => {
      // Check if the bet is for the current run
      // Also check if values are valids
      if (data.runId !== this.currentCrash.runId ||
        data.position !== this.currentCrash.position) {
        return reject(new Error('Current position or runId are invalid'))
      }

      // Check if amount is present
      if (!data.amount) {
        return reject(new Error('Missing amount'))
      }

      // Check if amount is a Int
      data.amount = parseInt(data.amount)
      if (isNaN(data.amount)) {
        return reject(new Error('Invalid amount value'))
      }

      // Check if amount is valid
      if (data.amount > MAX_BET || data.amount <= 0) {
        return reject(new Error('Cannot bet this value'))
      }

      // Check if multiplicator is a Int if defined
      if (data.multiplicator) {
        data.multiplicator = parseInt(data.multiplicator)
        if (isNaN(data.multiplicator)) {
          return reject(new Error('Invalid multiplicator value'))
        }
      }

      // Check if the user have already a bet running
      if (this.betUtils.getBet(socket.user._id.toString())) {
        return reject(new Error(`Already bet for this crash. runId: ${this.currentCrash.runId}, position:${this.currentCrash.position}`))
      }

      // Create the bet
      let bet = new Bet({
        user: socket.user._id,
        wallet: socket.user.wallet,
        amount: data.amount,
        multiplicator: data.multiplicator
      })
      this.betUtils.openBet(socket.user, bet).then(resolve).catch(reject)
    })
  }

  handleClientBetClose (data, socket) {
    return new Promise((resolve, reject) => {
      // Check the user have a current bet
      let bet = this.betUtils.getBet(socket.user._id.toString())
      if (!bet) {
        return reject(new Error(`Not bet for runId: ${this.currentCrash.runId}, position:${this.currentCrash.position}`))
      }

      let closedBets = this.betUtils.closeBet(socket.user, bet._id.toString(), this.currentCrash.multiplicator)
      return resolve(closedBets)
    })
  }
}
