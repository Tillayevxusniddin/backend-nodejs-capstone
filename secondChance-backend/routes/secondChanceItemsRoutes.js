const express = require('express')
const multer = require('multer')
const router = express.Router()
const connectToDatabase = require('../models/db')
const logger = require('../logger')

const directoryPath = 'public/images'

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, directoryPath)
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname)
  }
})

const upload = multer({ storage: storage })

router.get('/', async (req, res, next) => {
  logger.info('/ called')
  try {
    const db = await connectToDatabase()
    const collection = db.collection('secondChanceItems')
    const secondChanceItems = await collection.find({}).toArray()

    res.json(secondChanceItems)
  } catch (e) {
    logger.error('oops something went wrong', e)
    next(e)
  }
})

router.post('/', upload.single('image'), async (req, res, next) => {
  try {
    const db = await connectToDatabase()

    const collection = db.collection('secondChanceItems')

    let secondChanceItem = req.body

    if (req.file) {
      secondChanceItem.image = '/images/' + req.file.originalname
    } else {
      secondChanceItem.image = '/images/default-item.jpeg'
    }

    const lastItem = await collection.find().sort({ id: -1 }).limit(1).toArray()
    secondChanceItem.id = (lastItem.length > 0 ? parseInt(lastItem[0].id) + 1 : 1).toString()

    secondChanceItem.date_added = Math.floor(Date.now() / 1000)

    secondChanceItem.age_days = 0
    secondChanceItem.age_years = 0

    if (!secondChanceItem.comments) {
      secondChanceItem.comments = []
    }

    const result = await collection.insertOne(secondChanceItem)
    logger.info(`Item added with _id: ${result.insertedId}`)

    res.status(201).json({ _id: result.insertedId, ...secondChanceItem })
  } catch (e) {
    logger.error('Error in POST /api/secondchance/items:', e)
    next(e)
  }
})

router.get('/:id', async (req, res, next) => {
  try {
    const db = await connectToDatabase()

    const collection = db.collection('secondChanceItems')
    const itemId = req.params.id

    const secondChanceItem = await collection.findOne({ id: itemId })

    if (!secondChanceItem) {
      logger.warn(`Item with ID ${itemId} not found.`)
      return res.status(404).json({ message: 'secondChanceItem not found' })
    }

    res.json(secondChanceItem)
  } catch (e) {
    logger.error(`Error in GET /api/secondchance/items/:id for ID ${req.params.id}:`, e)
    next(e)
  }
})

router.put('/:id', upload.single('image'), async (req, res, next) => {
  try {
    const db = await connectToDatabase()

    const collection = db.collection('secondChanceItems')

    const itemId = req.params.id

    const secondChanceItem = await collection.findOne({ id: itemId })

    if (!secondChanceItem) {
      logger.error(`secondChanceItem with ID ${itemId} not found for update.`)
      return res.status(404).json({ error: 'secondChanceItem not found' })
    }
    const updatedFields = req.body

    if (req.file) {
      updatedFields.image = '/images/' + req.file.originalname
    }

    updatedFields.updatedAt = new Date()

    if (updatedFields.age_days !== undefined) {
      updatedFields.age_years = Number((updatedFields.age_days / 365).toFixed(1))
    }

    const updateResult = await collection.findOneAndUpdate(
      { id: itemId },
      { $set: updatedFields },
      { returnDocument: 'after' }
    )

    if (updateResult.value) {
      logger.info(`Item with ID ${itemId} updated successfully.`)
      res.json({ uploaded: 'success', updatedItem: updateResult.value })
    } else {
      logger.error(`Failed to update item with ID ${itemId}. No document found or changes made.`)
      res.status(500).json({ uploaded: 'failed', message: 'Failed to update item' })
    }
  } catch (e) {
    logger.error(`Error in PUT /api/secondchance/items/:id for ID ${req.params.id}:`, e)
    next(e)
  }
})

router.delete('/:id', async (req, res, next) => {
  try {
    const db = await connectToDatabase()

    const collection = db.collection('secondChanceItems')

    const itemId = req.params.id

    const secondChanceItem = await collection.findOne({ id: itemId })

    if (!secondChanceItem) {
      logger.error(`secondChanceItem with ID ${itemId} not found for deletion.`)
      return res.status(404).json({ error: 'secondChanceItem not found' })
    }

    const result = await collection.deleteOne({ id: itemId })

    if (result.deletedCount > 0) {
      logger.info(`Item with ID ${itemId} deleted successfully.`)
      res.json({ deleted: 'success', message: `Item with ID ${itemId} deleted.` })
    } else {
      logger.error(`Failed to delete item with ID ${itemId}. No document found or deleted.`)
      res.status(500).json({ deleted: 'failed', message: 'Failed to delete item' })
    }
  } catch (e) {
    logger.error(`Error in DELETE /api/secondchance/items/:id for ID ${req.params.id}:`, e)
    next(e)
  }
})

module.exports = router