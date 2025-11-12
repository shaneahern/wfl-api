#!/bin/bash

# Helper script to start the backend with Firestore emulator
# Usage: ./start-backend.sh

cd "$(dirname "$0")"

echo "Starting backend with Firestore emulator..."
echo "Make sure the Firestore emulator is running on localhost:8081"
echo ""

# Check if Firestore emulator is running
if ! curl -s http://localhost:8081 > /dev/null 2>&1; then
    echo "⚠️  WARNING: Firestore emulator doesn't appear to be running on localhost:8081"
    echo "Start it with: gcloud emulators firestore start --host-port=localhost:8081"
    echo ""
fi

# Set environment variables
export FIRESTORE_EMULATOR_HOST=localhost:8081
export ADMIN_USERNAME=${ADMIN_USERNAME:-admin}
export ADMIN_PASSWORD=${ADMIN_PASSWORD:-wfl2026}
export SUPERADMIN_USERNAME=${SUPERADMIN_USERNAME:-superadmin}
export SUPERADMIN_PASSWORD=${SUPERADMIN_PASSWORD:-wfl2027}

echo "Environment variables:"
echo "  FIRESTORE_EMULATOR_HOST=$FIRESTORE_EMULATOR_HOST"
echo "  ADMIN_USERNAME=$ADMIN_USERNAME"
echo "  ADMIN_PASSWORD=$ADMIN_PASSWORD"
echo "  SUPERADMIN_USERNAME=$SUPERADMIN_USERNAME"
echo "  SUPERADMIN_PASSWORD=$SUPERADMIN_PASSWORD"
echo ""
echo "Starting backend on http://localhost:8080"
echo "Press Ctrl+C to stop"
echo ""

# Start the backend
python main.py
