const jwt = require('jsonwebtoken')
const logger = require('../logger')

module.exports = function (req, res, next) {
  const token = req.header('Authorization')?.replace('Bearer ', '')

  if (!token) {
    logger.error('No token, authorization denied')
    return res.status(401).json({ error: 'Ruxsat yo\'q (token topilmadi)' })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET)
    req.user = decoded.user
    next()
  } catch (e) {
    logger.error('Token is not valid')
    res.status(401).json({ error: 'Token yaroqsiz' })
  }
}