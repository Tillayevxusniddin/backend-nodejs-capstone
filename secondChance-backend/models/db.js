// db.js
// require('dotenv').config({ path: '../.env' });
require('dotenv').config();
const MongoClient = require('mongodb').MongoClient;

// MongoDB connection URL with authentication options
let url = `${process.env.MONGO_URL}`;

let dbInstance = null;
const dbName = `${process.env.MONGO_DB}`;

async function connectToDatabase() {
    if (dbInstance){
        return dbInstance
    };

    const client = new MongoClient(url);      

    try {

        await client.connect();
        console.log('Successfully connected to MongoDB!');

        dbInstance = client.db(dbName);
        console.log(`Connected to database: ${dbName}`);

        return dbInstance;
    } catch (error) {
        console.error('Failed to connect to MongoDB:', error);
        throw error; 
    }
}

module.exports = connectToDatabase;
