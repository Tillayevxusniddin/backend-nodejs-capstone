const express = require('express');
const router = express.Router();
const connectToDatabase = require('../models/db');
const logger = require('../logger');
const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const { ObjectId } = require('mongodb');

router.post('/register', async (req, res) => {
    try {
        const db = await connectToDatabase();
        const collection = db.collection("users");
        const { email, password, firstName, lastName } = req.body;

        if (!email || !password || !firstName || !lastName) {
            logger.error('Missing required fields for registration');
            return res.status(400).json({ error: 'All fields (email, password, firstName, lastName) are required.' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const existingEmail = await collection.findOne({ email: normalizedEmail });

        if (existingEmail) {
            logger.error('Email id already exists');
            return res.status(400).json({ error: 'Email id already exists' });
        }

        const salt = await bcryptjs.genSalt(10);
        const hash = await bcryptjs.hash(password, salt);

        const newUser = await collection.insertOne({
            email: normalizedEmail,
            firstName,
            lastName,
            password: hash,
            createdAt: new Date(),
        });

        const payload = {
            user: {
                id: newUser.insertedId.toString(),
            },
        };

        const authtoken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

        logger.info('User registered successfully');
        res.json({ authtoken, email: normalizedEmail });

    } catch (e) {
        logger.error('Error during user registration:', e);
        return res.status(500).json({ error: 'Internal server error', details: e.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const db = await connectToDatabase();
        const collection = db.collection("users");
        const { email, password } = req.body;

        if (!email || !password) {
            logger.error('Email and password are required for login.');
            return res.status(400).json({ error: 'Email and password are required.' });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const theUser = await collection.findOne({ email: normalizedEmail });

        const passwordMatch = theUser ? await bcryptjs.compare(password, theUser.password) : false;

        if (!theUser || !passwordMatch) {
            logger.error(`Invalid login attempt for email: ${email}`);
            return res.status(401).json({ error: "Email yoki parol noto'g'ri" });
        }

        const userName = theUser.firstName;
        const userEmail = theUser.email;

        const payload = {
            user: {
                id: theUser._id.toString(),
            },
        };

        const authtoken = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.json({ authtoken, userName, userEmail });

    } catch (e) {
        logger.error('Error during user login:', e);
        return res.status(500).json({ error: 'Internal server error', details: e.message });
    }
});

router.put(
    '/update',
    authMiddleware,
    [
        body('firstName').optional().isString().trim().notEmpty().withMessage('First name must be a non-empty string'),
        body('lastName').optional().isString().trim().notEmpty().withMessage('Last name must be a non-empty string'),
        body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                logger.error('Validation errors in update request', { errors: errors.array() });
                return res.status(400).json({ errors: errors.array() });
            }

            const userId = req.user.id;
            const { firstName, lastName, password } = req.body;
            const updateFields = {};

            if (firstName) updateFields.firstName = firstName;
            if (lastName) updateFields.lastName = lastName;
            if (password) {
                const salt = await bcryptjs.genSalt(10);
                updateFields.password = await bcryptjs.hash(password, salt);
            }

            if (Object.keys(updateFields).length === 0) {
                return res.status(400).json({ error: 'Yangilash uchun hech qanday ma\'lumot berilmadi' });
            }
            
            updateFields.updatedAt = new Date();

            const db = await connectToDatabase();
            const collection = db.collection("users");

            const updatedResult = await collection.findOneAndUpdate(
                { _id: new ObjectId(userId) },
                { $set: updateFields },
                { returnDocument: 'after' }
            );

            if (!updatedResult) {
                logger.error(`User with ID ${userId} not found for update.`);
                return res.status(404).json({ error: "Foydalanuvchi topilmadi" });
            }

            logger.info(`User profile for ${updatedResult.email} updated successfully.`);
            res.json({ message: "Profil muvaffaqiyatli yangilandi", user: updatedResult });

        } catch (e) {
            logger.error('Error during user profile update:', e);
            return res.status(500).json({ error: 'Internal server error', details: e.message });
        }
    }
);

module.exports = router;