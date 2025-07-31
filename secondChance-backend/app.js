require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const pinoLogger = require('./logger');
const connectToDatabase = require('./models/db');
// const { loadData } = require('./util/import-mongo/index'); 
const pinoHttp = require('pino-http'); 

const secondChanceItemsRoutes = require('./routes/secondChanceItemsRoutes');
const authRoutes = require('./routes/authRoutes');
const searchRoutes = require('./routes/searchRoutes');

const app = express();
app.use('*', cors());
const port = 3060;

connectToDatabase()
  .then(() => {
    pinoLogger.info('Connected to DB')
  })
  .catch((e) => console.error('Failed to connect to DB', e))

app.use(pinoHttp({ logger }))

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(express.static(path.join(__dirname, 'public')))

app.use('/api/secondchance/items', secondChanceItemsRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/secondchance/search', searchRoutes)

app.get('/', (req, res) => {
  res.send('Inside the server')
})

app.use((err, req, res, next) => {
  console.error(err)
  logger.error(err.stack)
  res.status(500).send('Internal Server Error')
})

app.listen(port, () => {
  console.log(`Server running on port ${port}`)
  pinoLogger.info(`Server running on port ${port}`)
})

module.exports = app