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
SUPERADMIN_USERNAME = os.environ.get("SUPERADMIN_USERNAME", "superadmin")
SUPERADMIN_PASSWORD = os.environ.get("SUPERADMIN_PASSWORD", "wfl2027")


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


def verify_superadmin(credentials: HTTPBasicCredentials = Depends(security)):
    """Verify superadmin credentials using HTTP Basic Auth."""
    is_correct_username = secrets.compare_digest(credentials.username, SUPERADMIN_USERNAME)
    is_correct_password = secrets.compare_digest(credentials.password, SUPERADMIN_PASSWORD)
    
    if not (is_correct_username and is_correct_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Basic"},
        )
    return credentials.username


def verify_admin_or_superadmin(credentials: HTTPBasicCredentials = Depends(security)):
    """Verify admin or superadmin credentials. Returns username."""
    username = credentials.username
    password = credentials.password
    
    # Check superadmin first
    is_superadmin = (
        secrets.compare_digest(username, SUPERADMIN_USERNAME) and
        secrets.compare_digest(password, SUPERADMIN_PASSWORD)
    )
    
    # Check regular admin
    is_admin = (
        secrets.compare_digest(username, ADMIN_USERNAME) and
        secrets.compare_digest(password, ADMIN_PASSWORD)
    )
    
    if not (is_superadmin or is_admin):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Basic"},
        )
    
    return username


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
    request: Request,
    busNumber: Optional[str] = Query(None),
    main_street: Optional[str] = Query(None),
    primary_cross_street: Optional[str] = Query(None),
    secondary_cross_street: Optional[str] = Query(None),
    latitude: Optional[float] = Query(None),
    longitude: Optional[float] = Query(None),
    city: Optional[str] = Query(None)
):
    """
    WFL endpoint:
    - GET without params: Returns JSON list of all buses sorted by busNumber
    - GET with busNumber: Creates/updates bus entry and returns JSON success response
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
            
            # Add coordinates and city if provided
            if latitude is not None:
                bus_data["latitude"] = latitude
            if longitude is not None:
                bus_data["longitude"] = longitude
            if city:
                bus_data["city"] = city
            
            # Remove empty strings for optional fields (but keep coordinates and city)
            bus_data = {k: v for k, v in bus_data.items() if v != ""}
            
            # Use merge=False to ensure all fields are saved (not just merged)
            # This ensures coordinates are saved even if they weren't in the original document
            bus_ref.set(bus_data, merge=False)
            logger.info(f"Updated bus {busNumber}")
            
            # Always return JSON response (React frontend uses fetch, not browser navigation)
            response_data = {"success": True, "message": f"Bus {busNumber} saved successfully"}
            logger.info(f"Returning response: {response_data}")
            return JSONResponse(content=response_data)
        
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


@app.get("/admin/verify")
async def verify_admin_endpoint(username: str = Depends(verify_admin_or_superadmin)):
    """Verify admin or superadmin credentials. Returns success and username if authenticated."""
    is_superadmin = username == SUPERADMIN_USERNAME
    return JSONResponse(content={
        "success": True,
        "authenticated": True,
        "username": username,
        "isSuperadmin": is_superadmin
    })


@app.get("/admin/google-maps-api-key")
async def get_google_maps_api_key():
    """Get Google Maps API key from environment variable."""
    api_key = os.environ.get("GOOGLE_MAPS_API_KEY", "")
    return JSONResponse(content={"api_key": api_key})


@app.delete("/admin/delete-all-buses")
async def delete_all_buses(credentials: HTTPBasicCredentials = Depends(security)):
    """Delete all bus documents from Firestore. Superadmin only."""
    # Explicit superadmin check - verify both username and password
    username = credentials.username
    password = credentials.password
    
    is_superadmin = (
        secrets.compare_digest(username, SUPERADMIN_USERNAME) and
        secrets.compare_digest(password, SUPERADMIN_PASSWORD)
    )
    
    if not is_superadmin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This operation requires superadmin privileges",
            headers={"WWW-Authenticate": "Basic"},
        )
    
    try:
        buses_ref = db.collection("Bus")
        buses = buses_ref.stream()
        
        deleted_count = 0
        for bus in buses:
            bus.reference.delete()
            deleted_count += 1
        
        logger.info(f"Superadmin {username} deleted {deleted_count} bus documents")
        return JSONResponse(content={
            "success": True,
            "message": f"Deleted {deleted_count} bus documents"
        })
    except Exception as e:
        logger.error(f"Error deleting buses: {str(e)}", exc_info=True)
        return JSONResponse(
            status_code=500,
            content={"error": "Internal server error", "message": str(e)}
        )


# Note: /admin routes are now handled by React Router in the frontend
# The React app serves the admin interface, and authentication is handled client-side
# API endpoints like /admin/delete-all-buses still require server-side authentication


# SPA catch-all route - must be after all API routes
if dist_path.exists():
    @app.get("/{path:path}")
    async def serve_spa(path: str):
        """Serve React app for all non-API routes (SPA routing)."""
        # Don't serve React app for API routes (they're handled above)
        # API routes: /wfl, /streets, /admin/verify, /admin/delete-all-buses (API endpoints only)
        # Note: /admin UI routes are handled by React Router
        if path == "wfl" or path == "streets" or path == "admin/verify":
            raise HTTPException(status_code=404, detail="Not found")
        
        # Check if path starts with API route patterns (but allow /admin/* for React Router)
        if path.startswith("wfl?") or path.startswith("streets?") or path.startswith("admin/verify"):
            raise HTTPException(status_code=404, detail="Not found")
        
        # Serve index.html for all other routes (React Router will handle routing)
        # This includes /admin and all /admin/* routes
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
    # Important: Headers must be lowercase for ASGI spec
    headers_list = []
    for key, value in request.headers.items():
        # ASGI requires lowercase header names
        headers_list.append([key.lower().encode(), value.encode()])
    
    scope = {
        "type": "http",
        "method": request.method,
        "path": request.path,
        "raw_path": request.path.encode(),
        "query_string": request.query_string,
        "headers": headers_list,
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
