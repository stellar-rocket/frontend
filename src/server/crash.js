import Delogger from 'delogger'

import CurrentRun from '../model/currentRun'

const log = new Delogger('Crash')

module.exports = (app) => {
  app.get('/crash/current/?(:from(\\d+))?', (req, res) => {
    let from = Math.max(req.params.from || null, 0)

    CurrentRun.findLatestsHashs(20, from).then((data) => {
      res.json(data)
    })
  })

  app.get('/crash/lasts/?(:from(\\d+))?', (req, res) => {
    let from = req.params.from || null
    from = from < 0 ? null : from

    CurrentRun.findLatestsRuns(20, from).then((data) => {
      res.json(data)
    })
  })
}
