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
    db = client.db("conflict_tracker_db");
    console.log("Successfully connected to MongoDB Atlas!");
  } catch (err) {
    console.error("Failed to connect to MongoDB", err);
    process.exit(1);
  }
}

connectDB().then(() => {
  // API Endpoints

  // GET /api/events - Get events based on year range and limit
  app.get('/api/events', async (req, res) => {
    if (!db) {
      return res.status(503).json({ error: "Database not connected" });
    }
    try {
      const { startYear, endYear, limit = '2000' } = req.query; // Query params are strings

      // Validate and parse parameters
      const sYear = parseInt(startYear, 10);
      const eYear = parseInt(endYear, 10);
      const lim = parseInt(limit, 10);

      if (isNaN(sYear) || isNaN(eYear)) {
        return res.status(400).json({ error: "startYear and endYear must be valid numbers." });
      }
      if (isNaN(lim) || lim <= 0) {
        return res.status(400).json({ error: "limit must be a positive valid number." });
      }

      const eventsCollection = db.collection('events');
      const query = {
        year: { $gte: sYear, $lte: eYear }
      };
      
      const events = await eventsCollection.find(query).limit(lim).toArray();
      res.json(events);

    } catch (error) {
      console.error("Error fetching events:", error);
      res.status(500).json({ error: "Failed to fetch events" });
    }
  });

  // GET /api/config/datarange - Get min and max year from events
  app.get('/api/config/datarange', async (req, res) => {
    if (!db) {
      return res.status(503).json({ error: "Database not connected" });
    }
    try {
      const eventsCollection = db.collection('events');
      const result = await eventsCollection.aggregate([
        {
          $group: {
            _id: null, // Group all documents together
            minYear: { $min: "$year" },
            maxYear: { $max: "$year" }
          }
        }
      ]).toArray();

      if (result.length > 0) {
        res.json({ minYear: result[0].minYear, maxYear: result[0].maxYear });
      } else {
        // Fallback if no events or no year field (should not happen with our ETL)
        res.json({ minYear: 1990, maxYear: new Date().getFullYear() }); 
      }
    } catch (error) {
      console.error("Error fetching data range:", error);
      res.status(500).json({ error: "Failed to fetch data range" });
    }
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
