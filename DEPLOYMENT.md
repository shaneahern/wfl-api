# WFL Bus Finder API - Cloud Functions Deployment

## Overview

Modern Python FastAPI application deployed to Google Cloud Functions (2nd gen). Perfect for once-per-year usage with pay-per-use pricing (~$0.40/year vs $300/year for App Engine).

## Prerequisites

1. **Install Google Cloud SDK**:
   ```bash
   # macOS
   brew install --cask google-cloud-sdk
   
   # Or download from: https://cloud.google.com/sdk/docs/install
   ```

2. **Install Java 8+** (required for Firestore emulator):
   ```bash
   # macOS with Homebrew
   brew install openjdk@17
   
   # Or using asdf (if you use it)
   asdf plugin add java
   asdf install java zulu-17.56.15
   asdf global java zulu-17.56.15
   ```

3. **Authenticate with Google Cloud**:
   ```bash
   gcloud auth login
   gcloud config set project wflbusfinder
   ```

4. **Enable required APIs**:
   ```bash
   gcloud services enable cloudfunctions.googleapis.com
   gcloud services enable cloudbuild.googleapis.com
   gcloud services enable firestore.googleapis.com
   ```

4. **Install Python dependencies** (for local development):
   ```bash
   pip install -r requirements.txt
   ```

## Local Development

### Running Locally with Firestore Emulator

1. **Start Firestore Emulator** (on port 8081 to avoid conflict):
   ```bash
   gcloud emulators firestore start --host-port=localhost:8081
   ```

2. **Set environment variable** (in another terminal):
   ```bash
   export FIRESTORE_EMULATOR_HOST=localhost:8081
   ```

3. **Run the FastAPI app** (on port 8080):
   ```bash
   python main.py
   ```

   Or with uvicorn directly:
   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8080
   ```

4. **Test endpoints**:
   - Main: http://localhost:8080/
   - Get all buses: http://localhost:8080/wfl
   - Admin: http://localhost:8080/admin

### Alternative: Testing with Real Firestore (No Emulator)

If you don't want to use the emulator, you can test against your actual Firestore database:

1. **Authenticate with Application Default Credentials**:
   ```bash
   gcloud auth application-default login
   ```

2. **Set your project**:
   ```bash
   export GCP_PROJECT=wflbusfinder
   ```

3. **Run the app** (it will use real Firestore):
   ```bash
   python main.py
   ```

**Note**: This will use your actual Firestore database, so be careful with test data.

## Deployment

### Option 1: Using Deployment Script (Recommended)

The deployment script automatically sets the correct project (`wflbusfinder`) before deploying:

```bash
./deploy.sh
```

**Important**: The script will:
- Check your current gcloud project
- Automatically switch to `wflbusfinder` if needed
- Verify the project is set correctly before deploying
- Show warnings if the project differs from expected

### Option 2: Manual Deployment

**Important**: Make sure you're deploying to the correct project:

```bash
# First, verify/set the correct project
gcloud config set project wflbusfinder

# Verify it's set correctly
gcloud config get-value project

# Then deploy
gcloud functions deploy wfl-api \
  --gen2 \
  --runtime=python311 \
  --region=us-central1 \
  --source=. \
  --entry-point=handler \
  --trigger-http \
  --memory=256MB \
  --timeout=60s \
  --max-instances=10 \
  --allow-unauthenticated \
  --set-env-vars GCP_PROJECT=wflbusfinder
```

### Get Function URL

After deployment, get your function URL:

```bash
gcloud functions describe wfl-api \
  --gen2 \
  --region=us-central1 \
  --format='value(serviceConfig.uri)'
```

## API Endpoints

- `GET /` - Landing page with API information
- `GET /wfl` - Returns JSON array of all buses (sorted by busNumber)
- `GET /wfl?busNumber=X&main_street=...&primary_cross_street=...&secondary_cross_street=...` - Creates/updates bus entry, returns redirect to `/admin`
- `GET /admin` - Returns redirect to admin interface

## Environment Variables

The function uses the following environment variables:
- `GCP_PROJECT` - Google Cloud Project ID (default: wflbusfinder)

## Firestore Data Model

**Collection**: `Bus`

**Document Structure**:
- Document ID: `busNumber` (string)
- Fields:
  - `busNumber` (string)
  - `main_street` (string)
  - `primary_cross_street` (string, optional)
  - `secondary_cross_street` (string, optional)

## Cost Comparison

- **App Engine Standard**: ~$25-30/month = $300/year
- **Cloud Functions**: ~$0.40 for one day of heavy usage, $0 when idle
- **Savings**: ~$299.60/year for once-per-year event

## Troubleshooting

### Function not deploying
- Check that all required APIs are enabled
- Verify you have Cloud Functions Admin and Service Account User roles
- Check logs: `gcloud functions logs read wfl-api --gen2 --region=us-central1`

### Firestore connection issues
- Verify Firestore is enabled in your project
- Check IAM permissions for the Cloud Functions service account
- For local testing, ensure Firestore emulator is running

### Cold start performance
- First request after idle period may take 1-3 seconds
- Subsequent requests are fast (warm instances)
- For annual event, this is acceptable

## Monitoring

View function logs:
```bash
gcloud functions logs read wfl-api --gen2 --region=us-central1 --limit=50
```

View in Cloud Console:
https://console.cloud.google.com/functions/list?project=wflbusfinder
