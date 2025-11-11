#!/usr/bin/env python3
"""
Script to delete all bus documents from Firestore.
This is useful for clearing test data.

Usage:
    export FIRESTORE_EMULATOR_HOST=localhost:8081  # if using emulator
    python delete-all-buses.py
"""

import os
from google.cloud import firestore

# Initialize Firestore client
db = firestore.Client(
    project=os.environ.get("GCP_PROJECT", "wflbusfinder"),
    database="wfl-native"
)

def delete_all_buses():
    """Delete all bus documents from Firestore."""
    buses_ref = db.collection("Bus")
    buses = buses_ref.stream()
    
    deleted_count = 0
    for bus in buses:
        print(f"Deleting bus {bus.id}...")
        bus.reference.delete()
        deleted_count += 1
    
    print(f"\n✅ Deleted {deleted_count} bus documents")
    return deleted_count

if __name__ == "__main__":
    print("⚠️  WARNING: This will delete ALL bus documents from Firestore!")
    response = input("Are you sure you want to continue? (yes/no): ")
    
    if response.lower() == "yes":
        delete_all_buses()
    else:
        print("Cancelled.")
