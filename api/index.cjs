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
        // Removed serverApi options to allow use of 'distinct' command
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

    if (term.trim() === "") { // If term is empty or only whitespace, return empty array
      return res.json([]);
    }

    const eventsCollection = currentDb.collection('events');
    const query = {
      year: { $gte: sYear, $lte: eYear },
      group: new RegExp(term, 'i') // Case-insensitive regex search
    };

    // Using distinct here is efficient for getting unique group names matching the criteria
    const matchingGroups = await eventsCollection.distinct("group", query);
    
    // Sort and limit results (distinct doesn't have a built-in limit for this use case)
    const sortedAndLimitedGroups = matchingGroups
      .filter(g => g) // Filter out null/empty groups that might exist
      .sort() // Alphabetical sort
      .slice(0, searchLimit); // Apply limit

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

    // Get unique group names
    const groupsPipeline = [
      { $match: query },
      { $group: { _id: "$group" } },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, groupName: "$_id" } }
    ];
    const uniqueGroups = await eventsCollection.aggregate(groupsPipeline).map(doc => doc.groupName).toArray();

    // Get unique event types
    const typesPipeline = [
      { $match: query },
      { $group: { _id: "$type" } }, // Assuming 'type' is the field for event type
      { $sort: { _id: 1 } },
      { $project: { _id: 0, eventType: "$_id" } }
    ];
    const uniqueTypes = await eventsCollection.aggregate(typesPipeline).map(doc => doc.eventType).toArray();

    res.json({
      groups: uniqueGroups.filter(g => g), // Filter out null/empty groups
      eventTypes: uniqueTypes.filter(t => t) // Filter out null/empty types
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
      groupFilter, eventTypeFilter // New filter parameters
    } = req.query;
    const sYear = parseInt(startYear, 10);
    const eYear = parseInt(endYear, 10);
    const zoom = parseFloat(zoomLevel);
    const eventsCollection = currentDb.collection('events');
    let baseQuery = { year: { $gte: sYear, $lte: eYear } };

    if (groupFilter) {
      baseQuery.group = groupFilter; // Add group filter to query
    }
    if (eventTypeFilter) {
      baseQuery.type = eventTypeFilter; // Add event type filter to query
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
    const { minLat, maxLat, minLng, maxLng, startYear, endYear, limit = '100' } = req.query;
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

  app.get('/api/events/summary', async (req, res) => {
  try {
    const currentDb = await getDb();
    const { 
      startYear, endYear, 
      groupFilter, eventTypeFilter // New filter parameters
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

    // Calculate global event type distribution (respects year range and global eventTypeFilter, but not groupFilter)
    let globalEventTypeQuery = { year: { $gte: sYear, $lte: eYear } };
    if (eventTypeFilter) { // If a global event type filter is set, apply it here too
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

    // If a specific group is filtered, also get event types for that group
    if (groupFilter) {
      const eventTypeForGroupQuery = { 
        year: { $gte: sYear, $lte: eYear },
        group: groupFilter 
      };
      if (eventTypeFilter) { // If there's also a global event type filter, apply it
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

    // --- Start Debug Logs ---
    console.log("--- DEBUG: /api/events/summary ---");
    console.log("Request Query:", JSON.stringify(req.query));
    console.log("Base Query for byYear/byGroup:", JSON.stringify(baseQuery));
    console.log("Global Event Type Query for byEventTypeGlobal:", JSON.stringify(globalEventTypeQuery));
    console.log("Result summaryByEventTypeGlobal length:", summaryByEventTypeGlobal.length);
    // console.log("Result summaryByEventTypeGlobal sample:", JSON.stringify(summaryByEventTypeGlobal.slice(0,2)));


    if (groupFilter) {
      // The variable eventTypeForGroupQuery is defined a few lines below,
      // so we can't log it here. The query itself is constructed correctly.
      if (responseJson.eventTypeCountsForSelectedGroup) {
        console.log("Result eventTypeCountsForSelectedGroup length:", responseJson.eventTypeCountsForSelectedGroup.length);
        // console.log("Result eventTypeCountsForSelectedGroup sample:", JSON.stringify(responseJson.eventTypeCountsForSelectedGroup.slice(0,2)));
      } else {
        console.log("eventTypeCountsForSelectedGroup is undefined in responseJson");
      }
    }
    // console.log("Full responseJson being sent (first 1000 chars):", JSON.stringify(responseJson, null, 2).substring(0,1000));
    // --- End Debug Logs ---

    res.json(responseJson);
  } catch (error) {
    console.error("Error fetching event summary:", error);
    res.status(500).json({ error: "Failed to fetch event summary" });
  }
});

// Only listen locally if not in a serverless environment (like Vercel)
// Vercel sets NODE_ENV to 'production' for deployments
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
