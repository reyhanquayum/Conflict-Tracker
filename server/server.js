require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors()); // Enable CORS for all routes
app.use(express.json()); // Middleware to parse JSON bodies

// MongoDB Connection URI
const mongoUri = process.env.MONGO_URI;
if (!mongoUri) {
  console.error('Error: MONGO_URI is not defined in .env file');
  process.exit(1);
}

const client = new MongoClient(mongoUri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

let db;

async function connectDB() {
  try {
    await client.connect();
    db = client.db("conflict_tracker_db"); // Replace with your DB_NAME if different
    console.log("Successfully connected to MongoDB Atlas!");
  } catch (err) {
    console.error("Failed to connect to MongoDB", err);
    process.exit(1);
  }
}

connectDB().then(() => {
  // API Endpoints

  // Placeholder for GET /api/events
  app.get('/api/events', async (req, res) => {
    // To be implemented:
    // const { startYear, endYear, limit = 2000 } = req.query;
    // Query db.collection('events') based on params
    // Send results
    res.json({ message: "GET /api/events endpoint placeholder", query: req.query });
  });

  // Placeholder for GET /api/config/datarange
  app.get('/api/config/datarange', async (req, res) => {
    // To be implemented:
    // Query db.collection('events') for min and max year
    // Send { minYear, maxYear }
    res.json({ message: "GET /api/config/datarange placeholder" });
  });


  app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down server...');
  await client.close();
  console.log('MongoDB connection closed.');
  process.exit(0);
});
