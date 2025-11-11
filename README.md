# WFL Bus Finder API

Modern Python FastAPI application for tracking bus locations, deployed to Google Cloud Functions (2nd gen).

## Features

- REST API for bus location tracking
- Firestore database integration
- Pay-per-use Cloud Functions deployment (perfect for annual events)
- Automatic CORS support for mobile apps
- FastAPI with automatic OpenAPI documentation
- Admin web interface with dropdown menus for street selection

## Quick Start

### Local Development

1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Start Firestore emulator (on port 8081 to avoid conflict):
   ```bash
   gcloud emulators firestore start --host-port=localhost:8081
   ```

3. Set environment variable (in another terminal):
   ```bash
   export FIRESTORE_EMULATOR_HOST=localhost:8081
   export ADMIN_USERNAME=admin
   export ADMIN_PASSWORD=wfl2026
   ```

4. Run the app:
   ```bash
   python main.py
   ```

5. Visit: http://localhost:8080/admin
   - When prompted, enter username: `admin` and password: `wfl2026`

### Deployment

Deploy to Cloud Functions:

```bash
./deploy.sh
```

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions.

## Cost Savings

- **Old (App Engine)**: ~$300/year
- **New (Cloud Functions)**: ~$0.40/year for annual event
- **Savings**: ~$299.60/year

## Mobile App Integration

After deploying the Cloud Function, update the mobile app's API endpoint:

1. **Get the function URL**:
   ```bash
   gcloud functions describe wfl-api --gen2 --region=us-central1 --format='value(serviceConfig.uri)'
   ```

2. **Update the mobile app** (`busfinder/config/constants.ts`):
   - Replace `PROD_API_URL` with: `{FUNCTION_URL}/wfl`
   - Example: `https://us-central1-wflbusfinder.cloudfunctions.net/wfl-api/wfl`

3. **For local development**, the mobile app will automatically use `http://localhost:8080/wfl` when running in dev mode.

## API Endpoints

- `GET /` - API information
- `GET /wfl` - Get all buses (JSON) or create/update a bus
- `GET /admin` - Admin web interface (requires HTTP Basic Auth)
- `GET /streets` - Street data for dropdowns

## Links

* [Cloud Functions Console](https://console.cloud.google.com/functions/list?project=wflbusfinder)
* [Firestore Console](https://console.cloud.google.com/firestore?project=wflbusfinder)
* [iOS App on AppStore Connect](https://appstoreconnect.apple.com/apps/495757277/appstore/ios/version/deliverable)
* [Android App on Play Store Developer Console](https://play.google.com/console/u/0/developers/5820018852460086515/app/4976246589771747702/app-dashboard?timespan=thirtyDays)
