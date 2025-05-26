import pandas as pd
import os
from pymongo import MongoClient, UpdateOne, ASCENDING, DESCENDING
from dotenv import load_dotenv
import json # Keep for potential debugging or small local outputs if needed

# Load environment variables from .env file in the project root
# Assumes this script is run from the project root: C:/Users/reyha/GitHub/Conflict-Tracker
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '.env') 
load_dotenv(dotenv_path=dotenv_path)

MONGO_URI = os.getenv("MONGO_URI")
DB_NAME = "conflict_tracker_db" # Or get from .env if you prefer
EVENTS_COLLECTION_NAME = "events"
GROUPS_COLLECTION_NAME = "groups"

# Define file paths
CSV_FILE_PATH = os.path.join("data", "1999-01-01-2025-05-02-Middle_East-Northern_Africa.csv")

def clean_actor_name(actor):
    if pd.isna(actor):
        return "Unknown"
    actor = str(actor).strip()
    return actor

def main():
    if not MONGO_URI:
        print("Error: MONGO_URI not found in environment variables.")
        print("Please ensure you have a .env file in the project root with your MongoDB Atlas connection string.")
        return

    print(f"Starting data processing from: {CSV_FILE_PATH}")
    print(f"Connecting to MongoDB Atlas...")

    try:
        client = MongoClient(MONGO_URI)
        db = client[DB_NAME]
        events_collection = db[EVENTS_COLLECTION_NAME]
        groups_collection = db[GROUPS_COLLECTION_NAME]
        # Test connection
        client.admin.command('ping')
        print("Successfully connected to MongoDB Atlas.")
    except Exception as e:
        print(f"Error connecting to MongoDB: {e}")
        return

    try:
        print("Loading CSV data...")
        df = pd.read_csv(CSV_FILE_PATH, low_memory=False)
        print(f"Successfully loaded {len(df)} rows from CSV.")
    except FileNotFoundError:
        print(f"Error: The file {CSV_FILE_PATH} was not found.")
        return
    except Exception as e:
        print(f"Error loading CSV: {e}")
        return

    essential_cols_map = {
        'event_id_cnty': '_id', # Use event_id_cnty as MongoDB _id for uniqueness
        'event_date': 'date',
        'year': 'year',
        'event_type': 'type',
        'actor1': 'group1',
        'location': 'location_name',
        'latitude': 'lat',
        'longitude': 'lon',
        'notes': 'description',
        'fatalities': 'fatalities'
    }

    missing_essential = [col for col in essential_cols_map.keys() if col not in df.columns]
    if missing_essential:
        print(f"Error: Missing essential columns in CSV: {', '.join(missing_essential)}")
        return

    events_df = df[list(essential_cols_map.keys())].copy()
    events_df.rename(columns=essential_cols_map, inplace=True)

    if 'actor2' in df.columns:
        events_df['group2'] = df['actor2']
    else:
        events_df['group2'] = "Unknown"

    print("Cleaning and transforming event data...")
    # Convert date to datetime objects for MongoDB, ensure year is integer
    try:
        events_df['date_obj'] = pd.to_datetime(events_df['date'], errors='coerce')
        events_df['year'] = pd.to_numeric(events_df['year'], errors='coerce').astype('Int64') # Handle potential NaNs before int conversion
        events_df.dropna(subset=['_id', 'lat', 'lon', 'date_obj', 'year'], inplace=True)
    except Exception as e:
        print(f"Error during date/year conversion: {e}")
        return
        
    events_df['group1'] = events_df['group1'].apply(clean_actor_name)
    events_df['group2'] = events_df['group2'].apply(clean_actor_name)
    events_df['group'] = events_df['group1'] # Primary group for quick access

    # Prepare for MongoDB: convert lat/lon to GeoJSON Point for geospatial queries if desired later
    # For now, keeping them as numbers. If using $nearSphere, they need to be in a GeoJSON Point.
    # Example: events_df['location_geo'] = events_df.apply(lambda row: {"type": "Point", "coordinates": [row['lon'], row['lat']]}, axis=1)


    # Convert DataFrame to list of dictionaries for MongoDB insertion
    events_to_insert = events_df.to_dict(orient='records')
    
    # Upsert events data to MongoDB (update if _id exists, insert if not)
    if events_to_insert:
        print(f"Preparing to upsert {len(events_to_insert)} events to MongoDB collection '{EVENTS_COLLECTION_NAME}'...")
        BATCH_SIZE = 5000
        total_upserted = 0
        total_modified = 0
        for i in range(0, len(events_to_insert), BATCH_SIZE):
            batch = events_to_insert[i:i + BATCH_SIZE]
            operations = [
                UpdateOne({"_id": record["_id"]}, {"$set": record}, upsert=True)
                for record in batch
            ]
            print(f"Upserting batch {i // BATCH_SIZE + 1} of {len(batch)} events...")
            try:
                result = events_collection.bulk_write(operations)
                print(f"Batch upsert result: {result.upserted_count} upserted, {result.modified_count} modified.")
                total_upserted += result.upserted_count
                total_modified += result.modified_count
            except Exception as e:
                print(f"Error during events batch_write to MongoDB (batch starting at index {i}): {e}")
                # Optionally, decide if you want to stop or continue with next batch
                return # Stop on error for now
        print(f"Total MongoDB events upsert result: {total_upserted} upserted, {total_modified} modified.")
    else:
        print("No event data to insert.")


    # Prepare and upsert groups data
    print("Preparing and upserting groups data...")
    all_actors = set(events_df['group1'].unique()) | set(events_df['group2'].unique())
    unique_groups = sorted([name for name in all_actors if name and name != "Unknown"])

    group_operations_all = []
    for group_name in unique_groups:
        group_doc = {
            "name": group_name,
            "summary": f"Profile summary for {group_name}.", # Placeholder
            "ideology": "Unknown" # Placeholder
        }
        group_operations_all.append(
            UpdateOne({"name": group_name}, {"$set": group_doc}, upsert=True)
        )
    
    if group_operations_all:
        print(f"Preparing to upsert {len(group_operations_all)} groups to MongoDB collection '{GROUPS_COLLECTION_NAME}'...")
        total_group_upserted = 0
        total_group_modified = 0
        for i in range(0, len(group_operations_all), BATCH_SIZE): # Using same BATCH_SIZE
            batch_ops = group_operations_all[i:i + BATCH_SIZE]
            print(f"Upserting batch {i // BATCH_SIZE + 1} of {len(batch_ops)} groups...")
            try:
                result = groups_collection.bulk_write(batch_ops)
                print(f"Batch group upsert result: {result.upserted_count} upserted, {result.modified_count} modified.")
                total_group_upserted += result.upserted_count
                total_group_modified += result.modified_count
            except Exception as e:
                print(f"Error during groups batch_write to MongoDB (batch starting at index {i}): {e}")
                return # Stop on error
        print(f"Total MongoDB groups upsert result: {total_group_upserted} upserted, {total_group_modified} modified.")
    else:
        print("No group data to insert.")

    # Create Indexes (This is the correct location for this block)
    print("Creating indexes on MongoDB collections...")
    try:
        events_collection.create_index([("year", ASCENDING)])
        events_collection.create_index([("date_obj", DESCENDING)])
        events_collection.create_index([("group", ASCENDING)])
        # If using geospatial queries: events_collection.create_index([("location_geo", "2dsphere")])
        print(f"Indexes created for '{EVENTS_COLLECTION_NAME}'.")
        
        groups_collection.create_index([("name", ASCENDING)], unique=True)
        print(f"Indexes created for '{GROUPS_COLLECTION_NAME}'.")
    except Exception as e:
        print(f"Error creating indexes: {e}")

    print("Data processing and MongoDB loading complete.")
    client.close()

if __name__ == "__main__":
    main()
