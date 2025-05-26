import pandas as pd
import json
import os

# Define file paths
# Assuming the script is run from the root of the project directory
# and the CSV is in a 'data' folder at the root.
CSV_FILE_PATH = os.path.join("data", "1999-01-01-2025-05-02-Middle_East-Northern_Africa.csv")
OUTPUT_EVENTS_JSON_PATH = os.path.join("public", "data", "events.json")
OUTPUT_GROUPS_JSON_PATH = os.path.join("public", "data", "groups.json")

def clean_actor_name(actor):
    """Basic cleaning for actor names."""
    if pd.isna(actor):
        return "Unknown"
    actor = str(actor).strip()
    # Add more specific cleaning rules if needed
    return actor

def main():
    print(f"Starting data processing from: {CSV_FILE_PATH}")

    # Create output directory if it doesn't exist
    os.makedirs(os.path.dirname(OUTPUT_EVENTS_JSON_PATH), exist_ok=True)

    try:
        # Load the CSV file
        print("Loading CSV data...")
        df = pd.read_csv(CSV_FILE_PATH, low_memory=False)
        print(f"Successfully loaded {len(df)} rows from CSV.")
    except FileNotFoundError:
        print(f"Error: The file {CSV_FILE_PATH} was not found.")
        print("Please ensure the ACLED CSV data is placed in the 'data' directory at the project root.")
        return
    except Exception as e:
        print(f"Error loading CSV: {e}")
        return

    # Define essential columns that MUST be in the CSV and their target names
    essential_cols_map = {
        'event_id_cnty': 'id',
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

    # Check for missing essential columns
    missing_essential = [col for col in essential_cols_map.keys() if col not in df.columns]
    if missing_essential:
        print(f"Error: Missing essential columns in CSV: {', '.join(missing_essential)}")
        print(f"Available columns: {', '.join(df.columns)}")
        print("Please ensure the CSV contains these columns or update the 'essential_cols_map' in the script.")
        return

    # Create DataFrame with essential columns
    events_df = df[list(essential_cols_map.keys())].copy()
    events_df.rename(columns=essential_cols_map, inplace=True)

    # Handle optional 'actor2' column (source name: 'actor2', target name: 'group2')
    if 'actor2' in df.columns:
        events_df['group2'] = df['actor2']
        print("Found and using 'actor2' column for 'group2'.")
    else:
        print("Warning: 'actor2' column not found in CSV. Defaulting 'group2' to 'Unknown'.")
        events_df['group2'] = "Unknown"

    # Data Cleaning and Transformation for events
    print("Cleaning and transforming event data...")
    events_df['date'] = pd.to_datetime(events_df['date'], errors='coerce').dt.strftime('%Y-%m-%d')
    events_df.dropna(subset=['id', 'lat', 'lon', 'date'], inplace=True) # Drop events with essential missing data

    # Clean actor names
    events_df['group1'] = events_df['group1'].apply(clean_actor_name)
    events_df['group2'] = events_df['group2'].apply(clean_actor_name)

    # For simplicity, we'll use 'group1' as the primary group for 'groups.json'
    # and for the 'group' field in events.json
    events_df['group'] = events_df['group1']


    # Convert to list of dictionaries for JSON output
    events_data = events_df.to_dict(orient='records')

    # Save events.json
    print(f"Saving events.json to {OUTPUT_EVENTS_JSON_PATH}...")
    with open(OUTPUT_EVENTS_JSON_PATH, 'w') as f:
        json.dump(events_data, f, indent=2)
    print(f"Successfully saved {len(events_data)} events to events.json")

    # Prepare groups.json
    # Extract unique group names from 'group1' and 'group2'
    print("Preparing groups.json...")
    all_actors = set(events_df['group1'].unique()) | set(events_df['group2'].unique())
    # Filter out "Unknown" or empty strings if they were introduced
    unique_groups = sorted([name for name in all_actors if name and name != "Unknown"])


    groups_data = []
    for i, group_name in enumerate(unique_groups):
        groups_data.append({
            "id": f"group_{i+1}", # Generate a simple ID
            "name": group_name,
            "summary": f"Profile summary for {group_name}.", # Placeholder summary
            "ideology": "Unknown" # Placeholder ideology
        })

    # Save groups.json
    print(f"Saving groups.json to {OUTPUT_GROUPS_JSON_PATH}...")
    with open(OUTPUT_GROUPS_JSON_PATH, 'w') as f:
        json.dump(groups_data, f, indent=2)
    print(f"Successfully saved {len(groups_data)} groups to groups.json")

    print("Data processing complete.")

if __name__ == "__main__":
    main()
