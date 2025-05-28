require('dotenv').config();
const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3001; // Used for local dev

app.use(cors());
app.use(express.json());

const mongoUri = process.env.MONGO_URI;
let db; // Database instance
let client; // MongoDB client instance

// Centralized DB connection function
async function getDb() {
  if (db) {
    return db;
  }
  if (!mongoUri) {
    console.error('CRITICAL: MONGO_URI is not defined.');
    throw new Error('MONGO_URI not defined. Cannot connect to database.');
  }
  try {
    if (!client) { // Initialize client if not already done
        client = new MongoClient(mongoUri, {
            serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }
        });
    }
    await client.connect();
    db = client.db("conflict_tracker_db");
    console.log("Successfully connected to MongoDB Atlas!");
    return db;
  } catch (err) {
    console.error("Failed to connect to MongoDB", err);
    // In a serverless context, re-throwing allows Vercel to see the init error
    throw err; 
  }
}

// Middleware to ensure DB connection before handling request
// This is useful if you want to ensure DB is ready for all routes,
// but can add latency. Alternatively, check/connect in each route.
// For simplicity now, we'll check in each route.
// app.use(async (req, res, next) => {
//   try {
//     await getDb();
//     next();
//   } catch (error) {
//     res.status(503).json({ error: "Database connection failed" });
//   }
// });


// Helper function for grid precision
function getGridPrecision(zoomLevel) {
  if (zoomLevel < 5) return 0; 
  if (zoomLevel < 8) return 1; 
  if (zoomLevel < 11) return 2; 
  return 3; 
}

// --- Define API Routes ---

app.get('/api/config/datarange', async (req, res) => { // Added /api prefix
  try {
    const currentDb = await getDb();
    const eventsCollection = currentDb.collection('events');
    const result = await eventsCollection.aggregate([
      { $group: { _id: null, minYear: { $min: "$year" }, maxYear: { $max: "$year" } } }
    ]).toArray();
    if (result.length > 0) {
      res.json({ minYear: result[0].minYear, maxYear: result[0].maxYear });
    } else {
      res.json({ minYear: 1990, maxYear: new Date().getFullYear() });
    }
  } catch (error) {
    console.error("Error fetching data range:", error);
    res.status(500).json({ error: "Failed to fetch data range" });
  }
});

app.get('/api/events', async (req, res) => { // Added /api prefix
  try {
    const currentDb = await getDb();
    const { startYear, endYear, zoomLevel = '5', mapBounds, centerLat, centerLng } = req.query;
    const sYear = parseInt(startYear, 10);
    const eYear = parseInt(endYear, 10);
    const zoom = parseFloat(zoomLevel);
    // ... (rest of your validation and query logic for /events) ...
    const eventsCollection = currentDb.collection('events');
    let baseQuery = { year: { $gte: sYear, $lte: eYear } };
    // Note: Geospatial filtering logic was here, currently bypassed for $match
    // This might be a TODO to re-enable if view-dependent clusters are desired.
    const precision = getGridPrecision(zoom);
    const factor = Math.pow(10, precision);
    const aggregationPipeline = [
      { $match: baseQuery },
      { $group: { /* ... your $group stage ... */ 
            _id: { 
              lat_rounded: { $trunc: [ { $multiply: [ "$lat", factor ] }, 0 ] },
              lon_rounded: { $trunc: [ { $multiply: [ "$lon", factor ] }, 0 ] }
            },
            count: { $sum: 1 },
            lat: { $avg: "$lat" }, 
            lon: { $avg: "$lon" },
            minLat: { $min: "$lat" },
            maxLat: { $max: "$lat" },
            minLng: { $min: "$lon" },
            maxLng: { $max: "$lon" }
      }},
      { $project: { /* ... your $project stage ... */ 
            _id: 0, 
            lat: { $round: ["$lat", 4] }, 
            lon: { $round: ["$lon", 4] },
            count: "$count",
            isCluster: { $literal: true },
            bounds: { 
                minLat: "$minLat", maxLat: "$maxLat", minLng: "$minLng", maxLng: "$maxLng"
            }
      }},
      { $sort: { count: -1 } },
      { $limit: 2000 }
    ];
    const results = await eventsCollection.aggregate(aggregationPipeline).toArray();
    res.json(results);
  } catch (error) {
    console.error("Error fetching events/clusters:", error);
    res.status(500).json({ error: "Failed to fetch events/clusters" });
  }
});

app.get('/api/events_in_cluster', async (req, res) => { // Added /api prefix
  try {
    const currentDb = await getDb();
    // ... (your validation and query logic for /events_in_cluster) ...
    const { minLat, maxLat, minLng, maxLng, startYear, endYear, limit = '100' } = req.query;
    const sYear = parseInt(startYear, 10);
    const eYear = parseInt(endYear, 10);
    const lim = parseInt(limit, 10);
    const fMinLat = parseFloat(minLat); /* ... and other floats ... */
    const fMaxLat = parseFloat(maxLat);
    const fMinLng = parseFloat(minLng);
    const fMaxLng = parseFloat(maxLng);


    if (isNaN(sYear) || isNaN(eYear) || isNaN(fMinLat) || isNaN(fMaxLat) || isNaN(fMinLng) || isNaN(fMaxLng) || isNaN(lim) || lim <=0) {
        return res.status(400).json({ error: "Invalid parameters for events_in_cluster" });
    }

    const eventsCollection = currentDb.collection('events');
    const query = {
      year: { $gte: sYear, $lte: eYear },
      location_geo: { $geoWithin: { $box: [ [fMinLng, fMinLat], [fMaxLng, fMaxLat] ] } }
    };
    const events = await eventsCollection.find(query).limit(lim).map(doc => {
      const { _id, ...rest } = doc;
      return { id: _id, ...rest, isCluster: false };
    }).toArray();
    res.json(events);
  } catch (error) {
    console.error("Error fetching events in cluster:", error);
    res.status(500).json({ error: "Failed to fetch events in cluster" });
  }
});

app.get('/api/events/summary', async (req, res) => { // Added /api prefix
  try {
    const currentDb = await getDb();
    // ... (your validation and query logic for /events/summary) ...
    const { startYear, endYear } = req.query;
    const sYear = parseInt(startYear, 10);
    const eYear = parseInt(endYear, 10);

    if (isNaN(sYear) || isNaN(eYear)) {
        return res.status(400).json({ error: "Valid startYear and endYear are required." });
    }
    const eventsCollection = currentDb.collection('events');
    const baseQuery = { year: { $gte: sYear, $lte: eYear } };
    const byYearPipeline = [ /* ... */ 
        { $match: baseQuery },
        { $group: { _id: "$year", count: { $sum: 1 } } },
        { $project: { _id: 0, year: { $toString: "$_id" }, count: 1 } },
        { $sort: { year: 1 } }
    ];
    const summaryByYear = await eventsCollection.aggregate(byYearPipeline).toArray();
    const byGroupPipeline = [ /* ... */ 
        { $match: baseQuery },
        { $group: { _id: "$group", count: { $sum: 1 } } },
        { $project: { _id: 0, group: "$_id", count: 1 } },
        { $sort: { count: -1 } }
    ];
    const summaryByGroup = await eventsCollection.aggregate(byGroupPipeline).toArray();
    res.json({ byYear: summaryByYear, byGroup: summaryByGroup });
  } catch (error) {
    console.error("Error fetching event summary:", error);
    res.status(500).json({ error: "Failed to fetch event summary" });
  }
});

// Only listen locally if not in a serverless environment (like Vercel)
// Vercel sets NODE_ENV to 'production' for deployments.
if (process.env.NODE_ENV !== 'production') {
  // Ensure DB is connected before starting local server
  getDb().then(() => {
      app.listen(port, () => {
        console.log(`Server listening locally at http://localhost:${port}`);
      });
    }).catch(err => {
      console.error("Local server startup failed due to DB connection error:", err);
      process.exit(1); // Exit if DB connection fails for local dev
    });
}

// Graceful shutdown for local dev (won't run on Vercel serverless)
process.on('SIGINT', async () => {
  if (client && client.topology && client.topology.isConnected()) {
    console.log('Shutting down server...');
    await client.close();
    console.log('MongoDB connection closed.');
  }
  process.exit(0);
});

module.exports = app; // Export the Express app for Vercel
