const express = require('express');
const router = express.Router();
const connectToDatabase = require('../models/db'); 
const logger = require('../logger'); 
const bcryptjs = require('bcryptjs'); 
const jwt = require('jsonwebtoken'); 

require('dotenv').config({ path: '../.env' }); 
const JWT_SECRET = process.env.JWT_SECRET; 

router.post('/register', async (req, res) => {
    try {
        const db = await connectToDatabase(); 

        const collection = db.collection("users"); 

        const { email, password, firstName, lastName } = req.body;

        if (!email || !password || !firstName || !lastName) {
            logger.error('Missing required fields for registration');
            return res.status(400).json({ error: 'All fields (email, password, firstName, lastName) are required.' });
        }

        const existingEmail = await collection.findOne({ email });

        if (existingEmail) {
            logger.error('Email id already exists');
            return res.status(400).json({ error: 'Email id already exists' });
        }

        const salt = await bcryptjs.genSalt(10); // Salt yaratish
        const hash = await bcryptjs.hash(password, salt); // Parolni shifrlash

        const newUser = await collection.insertOne({
            email, 
            firstName,
            lastName,
            password: hash, 
            createdAt: new Date(), 
        });

        const payload = {
            user: {
                id: newUser.insertedId, 
            },
        };

        const authtoken = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' }); 

        logger.info('User registered successfully'); 

        res.json({ authtoken, email }); 

    } catch (e) {
        logger.error('Error during user registration:', e); 
        return res.status(500).json({ error: 'Internal server error', details: e.message }); 
    }
});

module.exports = router;