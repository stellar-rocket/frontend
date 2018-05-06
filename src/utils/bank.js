import Config from './config'
import Request from 'request'

const config = new Config({ sync: true })

export default class BankApi {
  constructor () {
    this.baseURL = `http://${config.bank.host}:${config.bank.port}`
    this.secret = config.bank.secret
  }

  createWallet (userId) {
    return new Promise((resolve, reject) => {
      Request({
        method: 'PUT',
        uri: `${this.baseURL}/wallet/${userId}`,
        qs: {
          secret: this.secret
        }
      }, (err, response, body) => {
        if (err) {
          return reject(err)
        }

        if (response.statusCode >= 400) {
          return reject(response.body)
        }

        resolve()
      })
    })
  }

  getStellarRocketAddress () {
    return new Promise((resolve, reject) => {
      Request({
        method: 'GET',
        uri: `${this.baseURL}/wallet/stellarRocketAddress`,
        qs: {
          secret: this.secret
        }
      }, (err, response, body) => {
        if (err) {
          return reject(err)
        }

        if (response.statusCode >= 400) {
          return reject(response.body)
        }

        resolve(response.body)
      })
    })
  }

  sendTransaction (transaction) {
    return new Promise((resolve, reject) => {
      transaction = transaction.toJSON()

      Request({
        method: 'POST',
        uri: `${this.baseURL}/transaction/${transaction.wallet.toString()}`,
        qs: {
          secret: this.secret
        },
        form: {
          transaction
        }
      }, (err, response, body) => {
        if (err) {
          return reject(err)
        }

        if (response.statusCode >= 400) {
          return reject(response.body)
        }

        resolve()
      })
    })
  }
}
