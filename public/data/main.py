'''
needed to count records of events.json real quick

Number of records: 699016
'''

import json

def count_records(file_path):
    with open(file_path, 'r') as f:
        data = json.load(f)
        if isinstance(data, list):
            return len(data)
        else:
            return "JSON file does not contain a top-level array."

file = 'events.json'
record_count = count_records(file)
print(f"Number of records: {record_count}")