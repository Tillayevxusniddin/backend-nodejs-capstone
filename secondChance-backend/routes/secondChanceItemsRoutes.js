const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const connectToDatabase = require('../models/db');
const logger = require('../logger');

// Define the upload directory path
const directoryPath = 'public/images';

// Set up storage for uploaded files
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, directoryPath); // Specify the upload directory
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname); // Use the original file name
  },
});

const upload = multer({ storage: storage });


// Get all secondChanceItems
router.get('/', async (req, res, next) => {
    logger.info('/ called');
    try {
        const db = await connectToDatabase();
        const collection = db.collection("secondChanceItems"); 
        const secondChanceItems = await collection.find({}).toArray();

        res.json(secondChanceItems);
    } catch (e) {
        logger.console.error('oops something went wrong', e)
        next(e);
    }
});

// Add a new item
router.post('/', upload.single('image'), async(req, res,next) => { // 'file' o'rniga 'image' ishlatish mantiqan to'g'riroq
    try {
        const db = await connectToDatabase(); // HINT: const db = await connectToDatabase();

        const collection = db.collection('secondChanceItems'); // HINT: Access the collection using const collection = db.collection("secondChanceItems");

        let secondChanceItem = req.body; // HINT: let secondChanceItem = req.body;

        if (req.file) {
            secondChanceItem.image = '/images/' + req.file.originalname;
        } else {
            secondChanceItem.image = '/images/default-item.jpeg'; // Yoki boshqa default rasm
        }

        const lastItem = await collection.find().sort({id: -1}).limit(1).toArray();
        secondChanceItem.id = (lastItem.length > 0 ? parseInt(lastItem[0].id) + 1 : 1).toString();
        
        secondChanceItem.date_added = Math.floor(Date.now() / 1000); // Unix timestamp in seconds

        secondChanceItem.age_days = 0;
        secondChanceItem.age_years = 0;

        if (!secondChanceItem.comments) {
            secondChanceItem.comments = [];
        }

        const result = await collection.insertOne(secondChanceItem);
        logger.info(`Item added with _id: ${result.insertedId}`);

        res.status(201).json({ _id: result.insertedId, ...secondChanceItem });

    } catch (e) {
        logger.error('Error in POST /api/secondchance/items:', e);
        next(e);
    }
});

// Get a single secondChanceItem by ID
router.get('/:id', async (req, res, next) => {
    try {
        const db = await connectToDatabase(); // HINT: const db = await connectToDatabase();

        const collection = db.collection('secondChanceItems'); // HINT: const collection = db.collection("secondChanceItems");
        const itemId = req.params.id;

        const secondChanceItem = await collection.findOne({ id: itemId });

        if (!secondChanceItem) {
            logger.warn(`Item with ID ${itemId} not found.`); // Log warning for not found item
            return res.status(404).json({ message: 'secondChanceItem not found' }); // res.send o'rniga res.json ishlatish RESTful API uchun yaxshiroq
        }

        res.json(secondChanceItem);

    } catch (e) {
        logger.error(`Error in GET /api/secondchance/items/:id for ID ${req.params.id}:`, e);
        next(e);
    }
});

// Update and existing item
router.put('/:id', upload.single('image'), async(req, res,next) => {
    try {
        const db = await connectToDatabase(); // HINT: const db = await connectToDatabase();

        const collection = db.collection('secondChanceItems'); // HINT: const collection = db.collection("secondChanceItems");

        const itemId = req.params.id;
        
        let secondChanceItem = await collection.findOne({ id: itemId }); // 'id' ni 'itemId' bilan almashtiramiz

        if (!secondChanceItem) {
            logger.error(`secondChanceItem with ID ${itemId} not found for update.`);
            return res.status(404).json({ error: "secondChanceItem not found" });
        }
        const updatedFields = req.body;

        if (req.file) {
            updatedFields.image = '/images/' + req.file.originalname;
        }

        updatedFields.updatedAt = new Date();

        if (updatedFields.age_days !== undefined) {
             updatedFields.age_years = Number((updatedFields.age_days / 365).toFixed(1));
        }

        const updateResult = await collection.findOneAndUpdate(
            { id: itemId }, 
            { $set: updatedFields }, 
            { returnDocument: 'after' } 
        );

        if (updateResult.value) { 
            logger.info(`Item with ID ${itemId} updated successfully.`);
            res.json({ uploaded: "success", updatedItem: updateResult.value }); 
        } else {
            logger.error(`Failed to update item with ID ${itemId}. No document found or changes made.`);
            res.status(500).json({ uploaded: "failed", message: "Failed to update item" });
        }
    } catch (e) {
        logger.error(`Error in PUT /api/secondchance/items/:id for ID ${req.params.id}:`, e);
        next(e);
    }
});

// Delete an existing item
router.delete('/:id', async(req, res,next) => {
    try {
        const db = await connectToDatabase(); // HINT: const db = await connectToDatabase();

        const collection = db.collection('secondChanceItems'); // HINT: const collection = db.collection("secondChanceItems");

        const itemId = req.params.id;

        const secondChanceItem = await collection.findOne({ id: itemId });

        if (!secondChanceItem) {
            logger.error(`secondChanceItem with ID ${itemId} not found for deletion.`);
            return res.status(404).json({ error: "secondChanceItem not found" });
        }

        const result = await collection.deleteOne({ id: itemId }); // 'id' ni 'itemId' bilan almashtiramiz

        if (result.deletedCount > 0) {
            logger.info(`Item with ID ${itemId} deleted successfully.`);
            res.json({ deleted: "success", message: `Item with ID ${itemId} deleted.` }); // Qo'shimcha xabar
        } else {
            logger.error(`Failed to delete item with ID ${itemId}. No document found or deleted.`);
            res.status(500).json({ deleted: "failed", message: "Failed to delete item" });
        }

    } catch (e) {
        logger.error(`Error in DELETE /api/secondchance/items/:id for ID ${req.params.id}:`, e);
        next(e);
    }
});


module.exports = router;
