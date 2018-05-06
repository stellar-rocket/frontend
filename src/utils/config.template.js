const template = {
  database: {
    type: 'mongodb',
    host: '127.0.0.1',
    port: 27017,
    database: 'stellar-rocket-app',
    username: '',
    password: ''
  },
  server: {
    port: 3001,
    host: '0.0.0.0'
  },
  controlCenter: {
    port: 3000,
    host: 'localhost',
    secret: 'some_secret'
  },
  bank: {
    port: 3002,
    host: 'localhost',
    secret: 'some_secret'
  },
  captcha: {
    sitekey: 'some_key',
    secret: 'some_secret'
  },
  bet: {
    maxBet: 1000,
    commission: 0.0015 // Percent
  },
  faucet: {
    amount: 1000
  }
}

module.exports = template

if (__filename.match(/.*template.*/g)) {
  console.log(JSON.stringify(template, 'undefined', 2))
}
