import Mongoose from 'mongoose'

import Server from './server'
import Config from './utils/config'

const config = new Config({})
var server = new Server()

config.on('ready', () => {
  connectDB().then(() => {
    server.listen()
  })
})

function connectDB () {
  return new Promise((resolve, reject) => {
    let username = encodeURIComponent(config.database.username)
    let password = encodeURIComponent(config.database.password)

    let databaseUrl
    if (username && password) {
      databaseUrl = `${config.database.type}://${username}:${password}@${config.database.host}:${config.database.port}/${config.database.database}?authMechanism=DEFAULT`
    } else {
      databaseUrl = `${config.database.type}://${config.database.host}:${config.database.port}/${config.database.database}`
    }

    Mongoose.connect(databaseUrl)
    let db = Mongoose.connection
    db.on('error', (err) => {
      throw err
    })
    db.once('open', resolve)
  })
}
