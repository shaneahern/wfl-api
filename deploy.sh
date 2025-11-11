#!/bin/bash

# Deployment script for WFL Bus API Cloud Function
# Usage: ./deploy.sh

set -e

PROJECT_ID="wflbusfinder"
FUNCTION_NAME="wfl-api"
REGION="us-central1"
RUNTIME="python311"
ENTRY_POINT="handler"
MEMORY="256MB"
TIMEOUT="60s"
MAX_INSTANCES="10"
ALLOW_UNAUTHENTICATED="--allow-unauthenticated"

# Get current project
CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null || echo "")

echo "=========================================="
echo "Deploying WFL Bus API to Cloud Functions"
echo "=========================================="
echo "Target Project: $PROJECT_ID"
echo "Current gcloud project: ${CURRENT_PROJECT:-'not set'}"
echo "Function: $FUNCTION_NAME"
echo "Region: $REGION"
echo ""

# Verify we're deploying to the correct project
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
    echo "⚠️  WARNING: Current gcloud project ($CURRENT_PROJECT) differs from target ($PROJECT_ID)"
    echo "Setting gcloud project to $PROJECT_ID..."
    gcloud config set project $PROJECT_ID
    echo "✅ Project set to $PROJECT_ID"
    echo ""
fi

# Verify project is set correctly
VERIFIED_PROJECT=$(gcloud config get-value project 2>/dev/null)
if [ "$VERIFIED_PROJECT" != "$PROJECT_ID" ]; then
    echo "❌ ERROR: Failed to set project to $PROJECT_ID"
    echo "Current project is: $VERIFIED_PROJECT"
    exit 1
fi

echo "Proceeding with deployment to project: $PROJECT_ID"
echo ""

gcloud functions deploy $FUNCTION_NAME \
  --gen2 \
  --runtime=$RUNTIME \
  --region=$REGION \
  --source=. \
  --entry-point=$ENTRY_POINT \
  --trigger-http \
  --memory=$MEMORY \
  --timeout=$TIMEOUT \
  --max-instances=$MAX_INSTANCES \
  --allow-unauthenticated \
  --set-env-vars GCP_PROJECT=$PROJECT_ID,ADMIN_USERNAME=${ADMIN_USERNAME:-admin},ADMIN_PASSWORD=${ADMIN_PASSWORD:-wfl2026}

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Function deployed to project: $PROJECT_ID"
echo ""
echo "Get the function URL with:"
echo "gcloud functions describe $FUNCTION_NAME --gen2 --region=$REGION --format='value(serviceConfig.uri)'"
echo ""
echo "View in console:"
echo "https://console.cloud.google.com/functions/details/$REGION/$FUNCTION_NAME?project=$PROJECT_ID"
