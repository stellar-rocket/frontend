import Session from '../model/session'

export default function () {
  return (req, res, next) => {
    if (req.cookies.stellarSession) {
      Resolve(req.cookies.stellarSession).then((session) => {
        if (session) {
          req.session = session
        } else {
          res.clearCookie('stellarSession')
        }
        next()
      }).catch(() => {
        res.status(500)
        res.end()
      })
    } else {
      next()
    }
  }
}

export function Resolve (sessionUid) {
  return new Promise((resolve, reject) => {
    Session.findOne({
      uid: sessionUid
    }).populate('user').then((session) => {
      resolve(session)
    }).catch(reject)
  })
}
