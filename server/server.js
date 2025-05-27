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

  // Helper function to determine grid precision based on zoom level
  function getGridPrecision(zoomLevel) {
    // Coarser grid: fewer, larger clusters, especially when zoomed out
    if (zoomLevel < 5) return 0; // Degrees (very coarse, e.g., for zoom levels 0-4)
    if (zoomLevel < 8) return 1; // 0.1 degree (coarse, e.g., for zoom levels 5-7)
    if (zoomLevel < 11) return 2; // 0.01 degree (medium, e.g., for zoom levels 8-10)
    return 3; // 0.001 degree (fine, e.g., for zoom levels 11+)
  }

  // GET /api/events - Get events or clusters based on year range, map bounds, and zoom
  app.get('/api/events', async (req, res) => {
    if (!db) {
      return res.status(503).json({ error: "Database not connected" });
    }
    try {
      const { 
        startYear, 
        endYear, 
        zoomLevel = '5', 
        mapBounds, // e.g., "minLng,minLat,maxLng,maxLat" - currently not sent by client
        centerLat, // New: center latitude of the map view
        centerLng  // New: center longitude of the map view
      } = req.query;

      const sYear = parseInt(startYear, 10);
      const eYear = parseInt(endYear, 10);
      const zoom = parseFloat(zoomLevel);
      const cLat = parseFloat(centerLat);
      const cLng = parseFloat(centerLng);

      if (isNaN(sYear) || isNaN(eYear)) {
        return res.status(400).json({ error: "startYear and endYear must be valid numbers." });
      }
      // if (isNaN(lim) || lim <= 0) {
      //   return res.status(400).json({ error: "limit must be a positive valid number." });
      // }
      if (isNaN(zoom)) {
        return res.status(400).json({ error: "zoomLevel must be a valid number." });
      }
      
      const eventsCollection = db.collection('events');
      let baseQuery = { // Renamed to baseQuery
        year: { $gte: sYear, $lte: eYear }
      };

      // Define Earth radius for $centerSphere conversion
      const EARTH_RADIUS_KM = 6371;

      // Geospatial filtering logic will be kept for reference but NOT applied to baseQuery for this test
      let geoFilterActive = false;
      if (!isNaN(cLat) && !isNaN(cLng) && zoom >= 7) {
        // ... (geospatial filter logic as before, but it won't modify baseQuery directly here)
        // We'll log if it *would* have been active
        geoFilterActive = true;
        console.log(`Geospatial filter WOULD be active for center [${cLng},${cLat}] at zoom ${zoom}`);
      } else if (mapBounds) {
        // ... (mapBounds logic)
        // geoFilterActive = true; // if mapBounds were valid
        console.log(`Geospatial filter based on mapBounds WOULD be active.`);
      }
      
      // const CLUSTER_ZOOM_THRESHOLD = 7; 
      // const MAX_POINTS_BEFORE_CLUSTERING = 2001; 

      // This endpoint will now always return clusters based on the baseQuery (year range only for this test)
      console.log(`Fetching clusters for base query (year range only for this test):`, baseQuery, `Grid Precision Zoom: ${zoom}`);
      const precision = getGridPrecision(zoom); 
      const factor = Math.pow(10, precision);

      const aggregationPipeline = [
        { $match: baseQuery }, // Use baseQuery (year range only) for the $match stage
        {
          $group: {
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
          }
        },
        {
          $project: {
            _id: 0, 
            lat: { $round: ["$lat", 4] }, 
            lon: { $round: ["$lon", 4] },
            count: "$count",
            isCluster: { $literal: true },
            bounds: { 
                minLat: "$minLat", maxLat: "$maxLat", minLng: "$minLng", maxLng: "$maxLng"
            }
          }
        },
        { $sort: { count: -1 } }, 
        { $limit: 2000 } 
      ];
      
      const results = await eventsCollection.aggregate(aggregationPipeline).toArray();
      console.log(`Returning ${results.length} clusters (based on year range, grid precision by zoom).`);
      res.json(results);

    } catch (error) {
      console.error("Error fetching events/clusters:", error);
      res.status(500).json({ error: "Failed to fetch events/clusters" });
    }
  });

  // New Endpoint: GET /api/events_in_cluster
  app.get('/api/events_in_cluster', async (req, res) => {
    if (!db) {
      return res.status(503).json({ error: "Database not connected" });
    }
    try {
      const { 
        minLat, maxLat, minLng, maxLng, 
        startYear, endYear, 
        limit = '100' // Limit how many individual events to return from a cluster
      } = req.query;

      // Validate and parse parameters
      const sYear = parseInt(startYear, 10);
      const eYear = parseInt(endYear, 10);
      const lim = parseInt(limit, 10);
      const fMinLat = parseFloat(minLat);
      const fMaxLat = parseFloat(maxLat);
      const fMinLng = parseFloat(minLng);
      const fMaxLng = parseFloat(maxLng);

      if (isNaN(sYear) || isNaN(eYear) || 
          isNaN(fMinLat) || isNaN(fMaxLat) || isNaN(fMinLng) || isNaN(fMaxLng)) {
        return res.status(400).json({ error: "Valid startYear, endYear, and geo bounds (minLat, maxLat, minLng, maxLng) are required." });
      }
      if (isNaN(lim) || lim <= 0) {
        return res.status(400).json({ error: "limit must be a positive valid number." });
      }

      const eventsCollection = db.collection('events');
      const query = {
        year: { $gte: sYear, $lte: eYear },
        location_geo: {
          $geoWithin: {
            // Using $box with the exact bounds of the cluster
            // Note: $box uses [bottomLeft, topRight] = [[minLng, minLat], [maxLng, maxLat]]
            $box: [ [fMinLng, fMinLat], [fMaxLng, fMaxLat] ]
          }
        }
      };
      
      console.log("Fetching events within cluster bounds:", query);
      const events = await eventsCollection.find(query).limit(lim).map(doc => {
        const { _id, ...rest } = doc; // Destructure to separate _id
        return { id: _id, ...rest, isCluster: false }; // Create new object with id and spread rest
      }).toArray();
      res.json(events);

    } catch (error) {
      console.error("Error fetching events in cluster:", error);
      res.status(500).json({ error: "Failed to fetch events in cluster" });
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

  // New Endpoint: GET /api/events/summary - Get aggregated data for dashboard overview
  app.get('/api/events/summary', async (req, res) => {
    if (!db) {
      return res.status(503).json({ error: "Database not connected" });
    }
    try {
      const { startYear, endYear } = req.query;
      const sYear = parseInt(startYear, 10);
      const eYear = parseInt(endYear, 10);

      if (isNaN(sYear) || isNaN(eYear)) {
        return res.status(400).json({ error: "Valid startYear and endYear are required." });
      }

      const eventsCollection = db.collection('events');
      const baseQuery = { year: { $gte: sYear, $lte: eYear } };

      // Aggregation 1: Counts by year
      const byYearPipeline = [
        { $match: baseQuery },
        { $group: { _id: "$year", count: { $sum: 1 } } },
        { $project: { _id: 0, year: { $toString: "$_id" }, count: 1 } }, // Ensure year is string
        { $sort: { year: 1 } }
      ];
      const summaryByYear = await eventsCollection.aggregate(byYearPipeline).toArray();

      // Aggregation 2: Counts by group
      const byGroupPipeline = [
        { $match: baseQuery },
        { $group: { _id: "$group", count: { $sum: 1 } } },
        { $project: { _id: 0, group: "$_id", count: 1 } },
        { $sort: { count: -1 } } // Optionally sort by count
      ];
      const summaryByGroup = await eventsCollection.aggregate(byGroupPipeline).toArray();
      
      console.log(`Returning summary for ${sYear}-${eYear}: ${summaryByYear.length} year entries, ${summaryByGroup.length} group entries.`);
      res.json({
        byYear: summaryByYear,
        byGroup: summaryByGroup
      });

    } catch (error) {
      console.error("Error fetching event summary:", error);
      res.status(500).json({ error: "Failed to fetch event summary" });
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
