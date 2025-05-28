require('dotenv').config();
const express = require('express');
const { MongoClient, ServerApiVersion } = require('mongodb');
const cors = require('cors');

const app = express();
const port = process.env.PORT || 3001; // FOR LOCAL

app.use(cors());
app.use(express.json());

const mongoUri = process.env.MONGO_URI;
let db; 
let client; 

async function getDb() {
  if (db) {
    return db;
  }
  if (!mongoUri) {
    console.error('CRITICAL: MONGO_URI is not defined.');
    throw new Error('MONGO_URI not defined. Cannot connect to database.');
  }
  try {
    if (!client) { 
        client = new MongoClient(mongoUri); 
    }
    await client.connect();
    db = client.db("conflict_tracker_db");
    console.log("Successfully connected to MongoDB Atlas!");
    return db;
  } catch (err) {
    console.error("Failed to connect to MongoDB", err);
    throw err; 
  }
}

// need helper for grid
function getGridPrecision(zoomLevel) {
  if (zoomLevel < 5) return 0; 
  if (zoomLevel < 8) return 1; 
  if (zoomLevel < 11) return 2; 
  return 3; 
}

// --- deefine API routes ---

app.get('/api/search_groups', async (req, res) => {
  try {
    const currentDb = await getDb();
    const { term, startYear, endYear, limit = '20' } = req.query;
    const sYear = parseInt(startYear, 10);
    const eYear = parseInt(endYear, 10);
    const searchLimit = parseInt(limit, 10);

    if (isNaN(sYear) || isNaN(eYear)) {
      return res.status(400).json({ error: "Valid startYear and endYear are required." });
    }
    // Allow empty string for term, but not other falsy values or non-strings
    if (term === undefined || term === null || typeof term !== 'string') {
      return res.status(400).json({ error: "Search term must be a string." });
    }

    const eventsCollection = currentDb.collection('events');
    let query;

    if (term.trim() === "") {
      // if term is empty, fetch a default list of groups (e.g., first N alphabetically)
      // within the year range
      query = { year: { $gte: sYear, $lte: eYear } };
      // use distinct  here to get unique group names, then sort and limit
    } else {
      query = {
        year: { $gte: sYear, $lte: eYear },
        group: new RegExp(term, 'i') // case-insensitive regex 
      };
    }
    
    const matchingGroups = await eventsCollection.distinct("group", query);
    
    const sortedAndLimitedGroups = matchingGroups
      .filter(g => g)
      .sort()
      .slice(0, searchLimit);

    res.json(sortedAndLimitedGroups);

  } catch (error) {
    console.error("Error searching groups:", error);
    res.status(500).json({ error: "Failed to search groups" });
  }
});

app.get('/api/filter_options', async (req, res) => {
  try {
    const currentDb = await getDb();
    const { startYear, endYear } = req.query;
    const sYear = parseInt(startYear, 10);
    const eYear = parseInt(endYear, 10);

    if (isNaN(sYear) || isNaN(eYear)) {
      return res.status(400).json({ error: "Valid startYear and endYear are required." });
    }

    const eventsCollection = currentDb.collection('events');
    const query = { year: { $gte: sYear, $lte: eYear } };

    // get unique group names
    const groupsPipeline = [
      { $match: query },
      { $group: { _id: "$group" } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, groupName: "$_id" } }
    ];
    const uniqueGroups = await eventsCollection.aggregate(groupsPipeline).map(doc => doc.groupName).toArray();

    // get unique event types
    const typesPipeline = [
      { $match: query },
      { $group: { _id: "$type" } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, eventType: "$_id" } }
    ];
    const uniqueTypes = await eventsCollection.aggregate(typesPipeline).map(doc => doc.eventType).toArray();

    res.json({
      groups: uniqueGroups.filter(g => g),
      eventTypes: uniqueTypes.filter(t => t)
    });

  } catch (error) {
    console.error("Error fetching filter options:", error);
    res.status(500).json({ error: "Failed to fetch filter options" });
  }
});

app.get('/api/config/datarange', async (req, res) => {
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

  app.get('/api/events', async (req, res) => {
  try {
    const currentDb = await getDb();
    const { 
      startYear, endYear, zoomLevel = '5', 
      mapBounds, centerLat, centerLng,
      groupFilter, eventTypeFilter
    } = req.query;
    const sYear = parseInt(startYear, 10);
    const eYear = parseInt(endYear, 10);
    const zoom = parseFloat(zoomLevel);
    const eventsCollection = currentDb.collection('events');
    let baseQuery = { year: { $gte: sYear, $lte: eYear } };

    if (groupFilter) {
      baseQuery.group = groupFilter;
    }
    if (eventTypeFilter) {
      baseQuery.type = eventTypeFilter;
    }
  
    const precision = getGridPrecision(zoom);
    const factor = Math.pow(10, precision);
    const aggregationPipeline = [
      { $match: baseQuery },
      { $group: {
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
      { $project: {
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

app.get('/api/events_in_cluster', async (req, res) => {
  try {
    const currentDb = await getDb();
    const { 
      minLat, maxLat, minLng, maxLng, 
      startYear, endYear, limit = '100',
      groupFilter, eventTypeFilter
    } = req.query;
    const sYear = parseInt(startYear, 10);
    const eYear = parseInt(endYear, 10);
    const lim = parseInt(limit, 10);
    const fMinLat = parseFloat(minLat); 
    const fMaxLat = parseFloat(maxLat);
    const fMinLng = parseFloat(minLng);
    const fMaxLng = parseFloat(maxLng);


    if (isNaN(sYear) || isNaN(eYear) || isNaN(fMinLat) || isNaN(fMaxLat) || isNaN(fMinLng) || isNaN(fMaxLng) || isNaN(lim) || lim <=0) {
        return res.status(400).json({ error: "Invalid parameters for events_in_cluster" });
    }

    const eventsCollection = currentDb.collection('events');
    let query = {
      year: { $gte: sYear, $lte: eYear },
      location_geo: { $geoWithin: { $box: [ [fMinLng, fMinLat], [fMaxLng, fMaxLat] ] } }
    };

    if (groupFilter) {
      query.group = groupFilter;
    }
    if (eventTypeFilter) {
      query.type = eventTypeFilter;
    }

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

  app.get('/api/events/summary', async (req, res) => {
  try {
    const currentDb = await getDb();
    const { 
      startYear, endYear, 
      groupFilter, eventTypeFilter 
    } = req.query;
    const sYear = parseInt(startYear, 10);
    const eYear = parseInt(endYear, 10);

    if (isNaN(sYear) || isNaN(eYear)) {
        return res.status(400).json({ error: "Valid startYear and endYear are required." });
    }
    const eventsCollection = currentDb.collection('events');
    let baseQuery = { year: { $gte: sYear, $lte: eYear } };

    if (groupFilter) {
      baseQuery.group = groupFilter;
    }
    if (eventTypeFilter) {
      baseQuery.type = eventTypeFilter;
    }

    const byYearPipeline = [
        { $match: baseQuery },
        { $group: { _id: "$year", count: { $sum: 1 } } },
        { $project: { _id: 0, year: { $toString: "$_id" }, count: 1 } },
        { $sort: { year: 1 } }
    ];
    const summaryByYear = await eventsCollection.aggregate(byYearPipeline).toArray();
    
    // This byGroupPipeline is affected by all filters in baseQuery
    const byGroupPipeline = [
        { $match: baseQuery },
        { $group: { _id: "$group", count: { $sum: 1 } } },
        { $project: { _id: 0, group: "$_id", count: 1 } },
        { $sort: { count: -1 } }
    ];
    const summaryByGroup = await eventsCollection.aggregate(byGroupPipeline).toArray();

    // calculate global event type distribution (respects year range and global eventTypeFilter but not groupFilter)
    let globalEventTypeQuery = { year: { $gte: sYear, $lte: eYear } };
    if (eventTypeFilter) {
      globalEventTypeQuery.type = eventTypeFilter;
    }
    const byEventTypeGlobalPipeline = [
        { $match: globalEventTypeQuery },
        { $group: { _id: "$type", count: { $sum: 1 } } },
        { $project: { _id: 0, type: "$_id", count: 1 } },
        { $sort: { count: -1 } }
    ];
    const summaryByEventTypeGlobal = await eventsCollection.aggregate(byEventTypeGlobalPipeline).toArray();

    let responseJson = {
      byYear: summaryByYear,
      byGroup: summaryByGroup,
      byEventTypeGlobal: summaryByEventTypeGlobal
    };

    if (groupFilter) {
      const eventTypeForGroupQuery = { 
        year: { $gte: sYear, $lte: eYear },
        group: groupFilter 
      };
      if (eventTypeFilter) {
        eventTypeForGroupQuery.type = eventTypeFilter;
      }
      const eventTypeCountsForSelectedGroupPipeline = [
        { $match: eventTypeForGroupQuery },
        { $group: { _id: "$type", count: { $sum: 1 } } },
        { $project: { _id: 0, type: "$_id", count: 1 } },
        { $sort: { count: -1 } }
      ];
      const eventTypeCountsForSelectedGroup = await eventsCollection.aggregate(eventTypeCountsForSelectedGroupPipeline).toArray();
      responseJson.eventTypeCountsForSelectedGroup = eventTypeCountsForSelectedGroup;
    }

    res.json(responseJson);
  } catch (error) {
    console.error("Error fetching event summary:", error);
    res.status(500).json({ error: "Failed to fetch event summary" });
  }
});

// Only listen locally if not a serverless environment (like Vercel)
// Vercel sets NODE_ENV to 'production' for deployment
if (process.env.NODE_ENV !== 'production') {
  getDb().then(() => {
      app.listen(port, () => {
        console.log(`Server listening locally at http://localhost:${port}`);
      });
    }).catch(err => {
      console.error("Local server startup failed due to DB connection error:", err);
      process.exit(1);
    });
}

process.on('SIGINT', async () => {
  if (client && client.topology && client.topology.isConnected()) {
    console.log('Shutting down server...');
    await client.close();
    console.log('MongoDB connection closed.');
  }
  process.exit(0);
});

module.exports = app; // export for vercel i miseed this bruh
