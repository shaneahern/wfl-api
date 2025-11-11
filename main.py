from fastapi import FastAPI, Query, Request, HTTPException, Depends, status
from fastapi.responses import RedirectResponse, JSONResponse, FileResponse, HTMLResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from google.cloud import firestore
from mangum import Mangum
import os
import logging
from typing import Optional, List, Dict, Any
from pathlib import Path
import secrets

# Initialize logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(title="WFL Bus Finder API")

# Add CORS middleware for mobile apps
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Firestore client
# Cloud Functions automatically provides credentials via GOOGLE_APPLICATION_CREDENTIALS
# or default service account
# Use the new Native Mode database: wfl-native
db = firestore.Client(project=os.environ.get("GCP_PROJECT", "wflbusfinder"), database="wfl-native")

# Authentication setup
security = HTTPBasic()

# Get admin credentials from environment variables
# Default values for local development (should be set via env vars in production)
ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "wfl2026")


def verify_admin(credentials: HTTPBasicCredentials = Depends(security)):
    """Verify admin credentials using HTTP Basic Auth."""
    is_correct_username = secrets.compare_digest(credentials.username, ADMIN_USERNAME)
    is_correct_password = secrets.compare_digest(credentials.password, ADMIN_PASSWORD)
    
    if not (is_correct_username and is_correct_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username


# Street data structure
# Main streets with their possible primary cross streets
STREET_DATA = {
    "Spear Street (east side)": [
        "Mission Street",
        "Howard Street",
        "Folsom Street",
        "Harrison Street",
        "Bryant Street"
    ],
    "Spear Street (west side)": [
        "Mission Street",
        "Howard Street",
        "Folsom Street",
        "Harrison Street",
        "Bryant Street"
    ],
    "Folsom Street": [
        "The Embarcadero",
        "Spear Street",
        "Main Street",
        "Beale Street",
        "Fremont Street",
        "Grote Place",
        "1st Street",
        "Essex Street",
        "2nd Street",
        "Hawthorne Street",
        "3rd Street",
        "Mabini Street",
        "4th Street",
        "5th Street"
    ],
    "Harrison Street": [
        "The Embarcadero",
        "Spear Street",
        "Main Street",
        "Fremont Street",
        "1st Street",
        "Essex Street",
        "2nd Street",
        "Hawthorne Street",
        "3rd Street",
        "Lapu Lapu Street",
        "4th Street",
        "5th Street"
    ],
    "Bryant Street": [
        "The Embarcadero",
        "Main Street",
        "Beale Street",
        "Rincon Street",
        "2nd Street",
        "Jack London Alley",
        "3rd Street",
        "Ritch Street",
        "Zoe Street",
        "4th Street",
        "5th Street"
    ],
    "The Embarcadero": [
        "Battery Street",
        "Green Street",
        "Broadway Street",
        "Washington Street",
        "Market Street",
        "Mission Street",
        "Howard Street",
        "Folsom Street",
        "Harrison Street",
        "Bryant Street",
        "Brannan Street",
        "Townsend Street",
        "2nd Street",
        "3rd Street",
        "4th Street"
    ]
}

# Secondary cross street data - depends on both main_street and primary_cross_street
# Format: (main_street, primary_cross_street): [list of secondary cross streets]
SECONDARY_CROSS_STREETS = {
    # Battery Street
    ("*", "Battery Street"): ["Green Street", "Lombard Street"],
    # Green Street
    ("*", "Green Street"): ["Battery Street", "Broadway Street"],
    # Broadway Street
    ("*", "Broadway Street"): ["Green Street", "Washington Street"],
    # Washington Street
    ("*", "Washington Street"): ["Broadway Street", "Market Street"],
    # Market Street
    ("*", "Market Street"): ["Washington Street", "Mission Street"],
    # Mission Street
    ("*", "Mission Street"): ["Market Street", "Howard Street"],
    # Howard Street
    ("*", "Howard Street"): ["Mission Street", "Folsom Street"],
    # Folsom Street
    ("*", "Folsom Street"): ["Howard Street", "Harrison Street"],
    # Harrison Street
    ("*", "Harrison Street"): ["Folsom Street", "Bryant Street"],
    # The Embarcadero
    ("Bryant Street", "The Embarcadero"): ["Main Street"],
    ("*", "The Embarcadero"): ["Spear Street"],
    # Townsend Street
    ("The Embarcadero", "Townsend Street"): ["Brannan Street"],
    ("*", "Townsend Street"): ["2nd Street"],
    # Brannan Street
    ("*", "Brannan Street"): ["Townsend Street", "Bryant Street"],
    # Bryant Street
    ("*", "Bryant Street"): ["Brannan Street", "Harrison Street"],
    # Spear Street
    ("*", "Spear Street"): ["The Embarcadero", "Main Street"],
    # Main Street
    ("Bryant Street", "Main Street"): ["The Embarcadero", "Beale Street"],
    ("Harrison Street", "Main Street"): ["Spear Street", "Fremont Street"],
    ("*", "Main Street"): ["Spear Street", "Beale Street"],
    # Beale Street
    ("Bryant Street", "Beale Street"): ["Main Street", "Rincon Street", "2nd Street"],
    ("*", "Beale Street"): ["Main Street", "Fremont Street"],
    # Rincon Street
    ("*", "Rincon Street"): ["Beale Street", "2nd Street"],
    # Fremont Street
    ("Harrison Street", "Fremont Street"): ["Main Street", "1st Street"],
    ("Folsom Street", "Fremont Street"): ["Beale Street", "Grote Place", "1st Street"],
    ("*", "Fremont Street"): ["Beale Street", "1st Street"],
    # Grote Place
    ("*", "Grote Place"): ["Fremont Street", "1st Street"],
    # 1st Street
    ("Folsom Street", "1st Street"): ["Fremont Street", "Grote Place", "Essex Place", "2nd Street"],
    ("*", "1st Street"): ["Fremont Street", "Essex Place", "2nd Street"],
    # Essex Street
    ("*", "Essex Street"): ["1st Street", "2nd Street"],
    # 2nd Street
    ("Bryant Street", "2nd Street"): ["Beale Street", "Rincon Street", "Jack London Alley", "3rd Street"],
    ("The Embarcadero", "2nd Street"): ["Townsend Street", "3rd Street"],
    ("*", "2nd Street"): ["1st Street", "Essex Street", "Hawthorne Street"],
    # Hawthorne Street
    ("*", "Hawthorne Street"): ["2nd Street", "3rd Street"],
    # Jack London Alley
    ("*", "Jack London Alley"): ["2nd Street", "3rd Street"],
    # 3rd Street
    ("The Embarcadero", "3rd Street"): ["2nd Street", "4th Street"],
    ("Bryant Street", "3rd Street"): ["Jack London Alley", "Ritch Street", "4th Street"],
    ("Folsom Street", "3rd Street"): ["Hawthorne Street", "Mabini Street", "4th Street"],
    ("Harrison Street", "3rd Street"): ["Hawthorne Street", "Lapu Lapu Street", "4th Street"],
    ("*", "3rd Street"): ["4th Street"],
    # Mabini Street
    ("*", "Mabini Street"): ["3rd Street", "4th Street"],
    # Lapu Lapu Street
    ("*", "Lapu Lapu Street"): ["3rd Street", "4th Street"],
    # Ritch Street
    ("*", "Ritch Street"): ["3rd Street", "Zoe Street", "4th Street"],
    # Zoe Street
    ("*", "Zoe Street"): ["3rd Street", "Ritch Street", "4th Street"],
    # 4th Street
    ("Folsom Street", "4th Street"): ["3rd Street", "Mabini Street", "5th Street"],
    ("Harrison Street", "4th Street"): ["3rd Street", "Lapu Lapu Street", "5th Street"],
    ("Bryant Street", "4th Street"): ["3rd Street", "Zoe Street", "Ritch Street", "5th Street"],
    ("*", "4th Street"): ["3rd Street", "5th Street"],
    # 5th Street
    ("*", "5th Street"): ["4th Street"]
}


@app.get("/streets")
async def get_streets():
    """Get street data for dropdowns."""
    return JSONResponse(content={
        "main_streets": list(STREET_DATA.keys()),
        "cross_streets": STREET_DATA,
        "secondary_cross_streets": {f"{k[0]}|{k[1]}": v for k, v in SECONDARY_CROSS_STREETS.items()}
    })


def sort_buses_by_number(buses: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Sort buses by busNumber, handling numeric conversion."""
    def get_bus_number(bus: Dict[str, Any]) -> int:
        bus_number = bus.get("busNumber", "")
        try:
            return int(bus_number)
        except (ValueError, TypeError):
            return 0
    
    return sorted(buses, key=get_bus_number)


# Mount static files from React build (if dist directory exists)
dist_path = Path(__file__).parent / "dist"
if dist_path.exists():
    app.mount("/assets", StaticFiles(directory=dist_path / "assets"), name="assets")
    
    @app.get("/")
    async def root():
        """Serve React app index.html."""
        index_path = dist_path / "index.html"
        if index_path.exists():
            return FileResponse(index_path)
        return {"message": "WFL Bus Finder API - React app not built"}
else:
    @app.get("/")
    async def root():
        """Landing page (when React app not built)."""
        return {
            "message": "WFL Bus Finder API",
            "endpoints": {
                "/wfl": "Get all buses or create/update a bus",
                "/admin": "Admin interface"
            }
        }


@app.get("/wfl")
async def wfl_endpoint(
    busNumber: Optional[str] = Query(None),
    main_street: Optional[str] = Query(None),
    primary_cross_street: Optional[str] = Query(None),
    secondary_cross_street: Optional[str] = Query(None)
):
    """
    WFL endpoint:
    - GET without params: Returns JSON list of all buses sorted by busNumber
    - GET with busNumber: Creates/updates bus entry and redirects to /admin
    """
    try:
        if busNumber and busNumber.strip():
            # Create or update bus entry
            bus_ref = db.collection("Bus").document(busNumber)
            
            bus_data = {
                "busNumber": busNumber,
                "main_street": main_street or "",
                "primary_cross_street": primary_cross_street if primary_cross_street and primary_cross_street != "null" else "",
                "secondary_cross_street": secondary_cross_street if secondary_cross_street and secondary_cross_street != "null" else ""
            }
            
            # Remove empty strings for optional fields
            bus_data = {k: v for k, v in bus_data.items() if v}
            
            bus_ref.set(bus_data, merge=True)
            logger.info(f"Updated bus {busNumber}")
            
            # Return redirect response with success parameter
            # Redirect to admin input page in React app
            return RedirectResponse(url="/admin/input?saved=true", status_code=302)
        
        else:
            # Return all buses as JSON
            buses_ref = db.collection("Bus")
            buses = buses_ref.stream()
            
            buses_list = []
            for bus in buses:
                bus_dict = bus.to_dict()
                buses_list.append(bus_dict)
            
            # Sort by busNumber
            buses_list = sort_buses_by_number(buses_list)
            
            return JSONResponse(content=buses_list)
    
    except Exception as e:
        logger.error(f"Error in /wfl endpoint: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"error": "Internal server error", "message": str(e)}
        )


@app.get("/admin")
async def admin_endpoint(username: str = Depends(verify_admin)):
    """Admin endpoint - serves admin interface."""
    return await admin_html()


@app.get("/admin/index.html")
async def admin_html(username: str = Depends(verify_admin)):
    """Serve admin HTML page."""
    # Try to read from file first (for local development)
    admin_html_path = Path(__file__).parent / "src" / "main" / "webapp" / "admin" / "index.html"
    if admin_html_path.exists():
        try:
            return FileResponse(admin_html_path)
        except Exception as e:
            logger.warning(f"Could not read admin HTML file: {e}, using embedded version")
    
    # Embedded HTML (works for Cloud Functions deployment)
    return HTMLResponse("""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>WFL Bus Finder - Admin</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #0052A5 0%, #003366 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            padding: 30px;
        }
        h1 { color: #003366; margin-bottom: 10px; font-size: 28px; }
        .subtitle { color: #666; margin-bottom: 30px; font-size: 14px; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 8px; color: #333; font-weight: 500; font-size: 14px; }
        .required { color: #DC143C; }
        input[type="text"] {
            width: 100%;
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 6px;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        input[type="text"]:focus, select:focus { outline: none; border-color: #0052A5; }
        select {
            width: 100%;
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 6px;
            font-size: 18px;
            background: white;
            cursor: pointer;
            transition: border-color 0.3s;
            -webkit-appearance: none;
            -moz-appearance: none;
            appearance: none;
        }
        select option {
            font-size: 18px;
            padding: 10px;
        }
        @media screen and (max-width: 768px) {
            select {
                font-size: 16px !important;
                padding: 14px;
                min-height: 48px;
            }
            select option {
                font-size: 20px !important;
                padding: 16px !important;
                min-height: 48px;
                line-height: 1.5;
            }
            select:focus {
                font-size: 18px !important;
            }
        }
        .help-text { font-size: 12px; color: #999; margin-top: 4px; }
        .button-group { display: flex; gap: 10px; margin-top: 30px; }
        button {
            flex: 1;
            padding: 14px;
            border: none;
            border-radius: 6px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        button:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        button:active { transform: translateY(0); }
        .btn-primary {
            background: linear-gradient(135deg, #0052A5 0%, #003366 100%);
            color: white;
        }
        .btn-secondary { background: #f0f0f0; color: #333; }
        .message {
            padding: 12px;
            border-radius: 6px;
            margin-bottom: 20px;
            display: none;
        }
        .message.success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .message.error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .buses-list {
            margin-top: 40px;
            padding-top: 30px;
            border-top: 2px solid #e0e0e0;
        }
        .buses-list h2 { color: #333; margin-bottom: 15px; font-size: 20px; }
        .bus-item {
            background: #f8f9fa;
            padding: 12px;
            border-radius: 6px;
            margin-bottom: 10px;
            font-size: 14px;
        }
        .bus-number { font-weight: 600; color: #0052A5; }
        .loading { text-align: center; color: #999; padding: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚌 WFL Bus Finder Admin</h1>
        <p class="subtitle">Enter bus location information</p>
        
        <div id="message" class="message"></div>
        
        <form id="busForm" onsubmit="submitBus(event)">
            <div class="form-group">
                <label for="busNumber">Bus Number <span class="required">*</span></label>
                <input type="text" id="busNumber" name="busNumber" required 
                       placeholder="e.g., 123" pattern="[0-9]+" title="Numbers only">
                <div class="help-text">Enter the bus number</div>
            </div>
            
            <div class="form-group">
                <label for="main_street">Main Street <span class="required">*</span></label>
                <select id="main_street" name="main_street" required>
                    <option value="">-- Select Main Street --</option>
                </select>
                <div class="help-text">The main street where the bus is located</div>
            </div>
            
            <div class="form-group">
                <label for="primary_cross_street">Primary Cross Street</label>
                <select id="primary_cross_street" name="primary_cross_street">
                    <option value="">-- Select Cross Street --</option>
                </select>
                <div class="help-text">First intersecting street (optional)</div>
            </div>
            
            <div class="form-group">
                <label for="secondary_cross_street">Secondary Cross Street</label>
                <select id="secondary_cross_street" name="secondary_cross_street">
                    <option value="">-- Select Cross Street --</option>
                </select>
                <div class="help-text">Second intersecting street (optional)</div>
            </div>
            
            <div class="button-group">
                <button type="submit" class="btn-primary">Save Bus Location</button>
                <button type="button" class="btn-secondary" onclick="loadBuses()">Refresh List</button>
            </div>
        </form>
        
        <div class="buses-list">
            <h2>Current Buses</h2>
            <div id="busesContainer" class="loading">Loading buses...</div>
        </div>
    </div>
    
    <script>
        let streetData = {};
        
        // Debug: Log when script loads
        console.log('Admin page script loaded');
        
        window.addEventListener('DOMContentLoaded', async () => {
            console.log('DOMContentLoaded fired');
            await loadStreets();
            loadBuses();
        });
        
        async function loadStreets() {
            console.log('loadStreets() called');
            try {
                const response = await fetch('/streets');
                console.log('Fetch response:', response.status, response.statusText);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                console.log('Street data received:', data);
                
                if (!data.main_streets || data.main_streets.length === 0) {
                    console.error('No main streets found in response');
                    return;
                }
                
                streetData = data.cross_streets || {};
                window.secondaryCrossStreets = data.secondary_cross_streets || {};
                
                // Populate main street dropdown
                const mainStreetSelect = document.getElementById('main_street');
                console.log('main_street element:', mainStreetSelect);
                if (!mainStreetSelect) {
                    console.error('main_street select element not found');
                    return;
                }
                
                // Clear existing options except the first one
                while (mainStreetSelect.options.length > 1) {
                    mainStreetSelect.remove(1);
                }
                
                data.main_streets.forEach(street => {
                    const option = document.createElement('option');
                    option.value = street;
                    option.textContent = street;
                    mainStreetSelect.appendChild(option);
                });
                
                console.log(`Loaded ${data.main_streets.length} main streets into dropdown`);
                
                // Add change listener to update cross streets
                mainStreetSelect.addEventListener('change', () => {
                    updateCrossStreets();
                    // Clear secondary when main street changes
                    document.getElementById('secondary_cross_street').innerHTML = '<option value="">-- Select Cross Street --</option>';
                });
                
                // Add change listener to primary cross street to update secondary
                document.getElementById('primary_cross_street').addEventListener('change', updateSecondaryCrossStreets);
            } catch (error) {
                console.error('Error loading streets:', error);
            }
        }
        
        function updateCrossStreets() {
            const mainStreet = document.getElementById('main_street').value;
            const primarySelect = document.getElementById('primary_cross_street');
            const secondarySelect = document.getElementById('secondary_cross_street');
            
            // Clear existing options (except first empty option)
            primarySelect.innerHTML = '<option value="">-- Select Cross Street --</option>';
            secondarySelect.innerHTML = '<option value="">-- Select Cross Street --</option>';
            
            if (mainStreet && streetData[mainStreet]) {
                // Populate primary cross streets
                streetData[mainStreet].forEach(street => {
                    const option = document.createElement('option');
                    option.value = street;
                    option.textContent = street;
                    primarySelect.appendChild(option);
                });
            }
        }
        
        function updateSecondaryCrossStreets() {
            const mainStreet = document.getElementById('main_street').value;
            const primaryCrossStreet = document.getElementById('primary_cross_street').value;
            const secondarySelect = document.getElementById('secondary_cross_street');
            
            // Clear existing options
            secondarySelect.innerHTML = '<option value="">-- Select Cross Street --</option>';
            
            if (!mainStreet || !primaryCrossStreet || !window.secondaryCrossStreets) {
                return;
            }
            
            // Try to find specific match first (main_street|primary_cross_street)
            let key = `${mainStreet}|${primaryCrossStreet}`;
            let streets = window.secondaryCrossStreets[key];
            
            // If not found, try wildcard match (*|primary_cross_street)
            if (!streets) {
                key = `*|${primaryCrossStreet}`;
                streets = window.secondaryCrossStreets[key];
            }
            
            if (streets && Array.isArray(streets)) {
                streets.forEach(street => {
                    const option = document.createElement('option');
                    option.value = street;
                    option.textContent = street;
                    secondarySelect.appendChild(option);
                });
            }
        }
        
        function showMessage(text, type) {
            const messageEl = document.getElementById('message');
            messageEl.textContent = text;
            messageEl.className = 'message ' + type;
            messageEl.style.display = 'block';
            setTimeout(() => { messageEl.style.display = 'none'; }, 5000);
        }
        
        function submitBus(event) {
            event.preventDefault();
            const form = event.target;
            const formData = new FormData(form);
            const params = new URLSearchParams();
            for (const [key, value] of formData.entries()) {
                if (value.trim()) params.append(key, value.trim());
            }
            window.location.href = '/wfl?' + params.toString();
        }
        
        async function loadBuses() {
            const container = document.getElementById('busesContainer');
            container.innerHTML = '<div class="loading">Loading buses...</div>';
            try {
                const response = await fetch('/wfl');
                const buses = await response.json();
                if (buses.length === 0) {
                    container.innerHTML = '<div class="loading">No buses registered yet.</div>';
                    return;
                }
                container.innerHTML = buses.map(bus => `
                    <div class="bus-item">
                        <span class="bus-number">Bus ${bus.busNumber || 'N/A'}</span><br>
                        <strong>${bus.main_street || 'N/A'}</strong>
                        ${bus.primary_cross_street ? ` & ${bus.primary_cross_street}` : ''}
                        ${bus.secondary_cross_street ? ` & ${bus.secondary_cross_street}` : ''}
                    </div>
                `).join('');
            } catch (error) {
                container.innerHTML = '<div class="loading" style="color: #e74c3c;">Error loading buses. Please try again.</div>';
            }
        }
        
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('saved') === 'true') {
            showMessage('Bus location saved successfully!', 'success');
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    </script>
</body>
</html>""")


# SPA catch-all route - must be after all API routes
if dist_path.exists():
    @app.get("/{path:path}")
    async def serve_spa(path: str):
        """Serve React app for all non-API routes (SPA routing)."""
        # Don't serve React app for API routes (they're handled above)
        # API routes: /wfl, /streets, /admin (without subpaths), /admin/index.html
        if path == "wfl" or path == "streets" or path == "admin" or path == "admin/index.html":
            raise HTTPException(status_code=404, detail="Not found")
        
        # Check if path starts with API route patterns
        if path.startswith("wfl?") or path.startswith("streets?") or path.startswith("admin?"):
            raise HTTPException(status_code=404, detail="Not found")
        
        # Serve index.html for all other routes (React Router will handle routing)
        index_path = dist_path / "index.html"
        if index_path.exists():
            return FileResponse(index_path)
        raise HTTPException(status_code=404, detail="React app not found")


# Cloud Functions 2nd gen entry point
# For HTTP triggers, Cloud Functions Gen2 uses functions-framework with Flask
# We need to bridge Flask requests to FastAPI (ASGI)
# Use asgiref.sync to run ASGI app synchronously
from flask import Request, Response
from asgiref.sync import async_to_sync
import json

def handler(request: Request):
    """
    Cloud Functions Gen2 HTTP handler.
    Bridges Flask Request to FastAPI (ASGI) using asgiref.
    """
    # Convert Flask request to ASGI scope
    scope = {
        "type": "http",
        "method": request.method,
        "path": request.path,
        "raw_path": request.path.encode(),
        "query_string": request.query_string,
        "headers": [[k.encode(), v.encode()] for k, v in request.headers.items()],
        "server": (request.host.split(":")[0] if ":" in request.host else request.host, 
                   int(request.host.split(":")[1]) if ":" in request.host else 80),
        "client": (request.remote_addr or "127.0.0.1", 0),
        "scheme": request.scheme,
        "http_version": "1.1",
        "extensions": {},
    }
    
    # Get request body
    request_body = request.get_data()
    body_sent = False
    
    async def receive():
        nonlocal body_sent
        if body_sent:
            return {"type": "http.disconnect"}
        body_sent = True
        return {"type": "http.request", "body": request_body}
    
    # Collect response
    response_data = {"status": 200, "headers": [], "body": b""}
    
    async def send(message):
        if message["type"] == "http.response.start":
            response_data["status"] = message["status"]
            response_data["headers"] = message["headers"]
        elif message["type"] == "http.response.body":
            response_data["body"] += message.get("body", b"")
    
    # Run the ASGI app using asgiref
    try:
        # Use async_to_sync to run the ASGI app
        async def run_asgi():
            await app(scope, receive, send)
        
        async_to_sync(run_asgi)()
    except Exception as e:
        import traceback
        print(f"Error in handler: {e}")
        print(traceback.format_exc())
        return Response(
            json.dumps({"error": str(e)}),
            status=500,
            headers={"Content-Type": "application/json"}
        )
    
    # Convert ASGI response to Flask Response
    status_code = response_data["status"]
    headers = {k.decode(): v.decode() for k, v in response_data["headers"]}
    body = response_data["body"]
    
    return Response(body, status=status_code, headers=headers)


# For local development
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)
