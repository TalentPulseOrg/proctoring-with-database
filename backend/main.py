from fastapi import FastAPI, Request, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles
from starlette.responses import PlainTextResponse
from pathlib import Path
from app.routes import exam_route, test_route, auth_routes, proctoring_events, monitoring, user_routes
from app.routes import test_api, proctoring_api, analytics, face_verification_api, media_routes
from app.routes.session_api import router as session_api_router  # Import the database-based session API
from app.utils.error_handlers import (
    ProctoringException,
    ValidationException,
    proctoring_exception_handler,
    validation_exception_handler,
    general_exception_handler
)
import logging
import os
import sys
from starlette.exceptions import HTTPException as StarletteHTTPException
import traceback
import datetime

# Initialize database
from app.database import engine, Base, recreate_all_tables, create_default_admin

# Import models module (which will handle the proper import order)
import app.models

# Try to import our permission fix script
try:
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    from fix_sql_permissions import fix_permissions_with_windows_auth
except ImportError:
    from app.db_permission_setup import grant_table_permissions, check_table_permissions

# Set up logging with a more restrictive configuration
logging.basicConfig(
    level=logging.WARNING,  # Change from INFO to WARNING to reduce output
    format='%(levelname)s: %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Set specific loggers to higher levels to reduce output
logging.getLogger("uvicorn").setLevel(logging.WARNING)
logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
logging.getLogger("uvicorn.error").setLevel(logging.ERROR)
logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)

# Drop and recreate database tables - but catch any errors
try:
    logger.warning("Recreating database tables...")
    recreate_all_tables()
    logger.warning("Database tables recreated successfully.")
except Exception as e:
    logger.error(f"Failed to recreate tables: {str(e)}")
    logger.warning("Continuing without recreating tables.")

# Create a default admin user if none exists
try:
    logger.warning("Creating default admin user if needed...")
    create_default_admin()
    logger.warning("Default user check completed.")
except Exception as e:
    logger.error(f"Failed to create default admin: {str(e)}")
    logger.warning("Continuing without creating default admin.")

# Grant permissions to the SQL user for the tables - but catch any errors
try:
    logger.warning("Fixing SQL permissions...")
    # Try to use our comprehensive permission fix script first
    if 'fix_permissions_with_windows_auth' in locals():
        fix_permissions_with_windows_auth()
    else:
        # Fall back to the original method
        grant_table_permissions()
    logger.warning("Permissions granted successfully.")
except Exception as e:
    logger.error(f"Failed to grant permissions: {str(e)}")
    logger.warning("Continuing anyway, but there might be permission issues.")

app = FastAPI()

# Define allowed origins
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    # Add any other origins as needed
]

# Enable CORS - updated configuration with expose_headers for better compatibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=600  # Cache preflight requests for 10 minutes
)

# Add a more robust CORS preflight handler
@app.options("/{full_path:path}")
async def options_handler(request: Request, full_path: str):
    origin = request.headers.get("origin", "")
    if origin in origins or "*" in origins:
        return PlainTextResponse(
            status_code=200,
            content="",
            headers={
                "Access-Control-Allow-Origin": origin,
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Max-Age": "600",  # 10 minutes cache for preflight requests
                "Access-Control-Allow-Credentials": "true"
            }
        )
    return PlainTextResponse(status_code=400)

# Create media directory if it doesn't exist
media_dir = Path("media")
media_dir.mkdir(exist_ok=True)

# Create screenshots directory for webcam snapshots
screenshots_dir = media_dir / "screenshots"
screenshots_dir.mkdir(exist_ok=True)
logger.warning(f"Created media directories: {media_dir}, {screenshots_dir}")

# Mount static file server for media files
app.mount("/media", StaticFiles(directory="media"), name="media")

# Custom exception handlers
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    logger.error(f"HTTP Exception: {exc.detail}, Status Code: {exc.status_code}")
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": {"code": "HTTP_ERROR", "message": str(exc.detail)}}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"Validation Error: {str(exc)}")
    return JSONResponse(
        status_code=422,
        content={"error": {"code": "VALIDATION_ERROR", "message": "Validation error", "details": exc.errors()}}
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled Exception: {str(exc)}")
    logger.error(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "INTERNAL_SERVER_ERROR",
                "message": "An unexpected error occurred",
                "additional_info": {
                    "original_error": str(exc),
                    "type": str(type(exc).__name__),
                    "module": str(type(exc).__module__)
                }
            }
        }
    )

# Add a health check endpoint
@app.get("/api/health-check")
async def health_check():
    logger.info("Health check endpoint called")
    try:
        return {
            "status": "ok",
            "message": "API is running",
            "timestamp": str(datetime.datetime.now()),
            "version": "1.0.0"
        }
    except Exception as e:
        logger.error(f"Error in health check: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Add a CORS diagnostic endpoint
@app.get("/api/cors-test")
async def cors_test(request: Request):
    origin = request.headers.get("origin", "No origin header")
    return {
        "status": "ok", 
        "message": "CORS test successful",
        "request_headers": {
            "origin": origin,
            "host": request.headers.get("host", "No host header"),
            "user-agent": request.headers.get("user-agent", "No user-agent header")
        },
        "cors_config": {
            "allowed_origins": origins,
            "allowed_methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
            "allowed_headers": ["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"]
        }
    }

# Add existing routers - wrapped in try/except
try:
    app.include_router(exam_route.router)
    app.include_router(test_route.router)
    app.include_router(auth_routes.router, prefix="/auth", tags=["Authentication"])
    app.include_router(proctoring_events.router)
    app.include_router(monitoring.router)
    app.include_router(user_routes.router)
except Exception as e:
    logger.error(f"Error including existing routers: {str(e)}")

# Add new API routers - wrapped in try/except
try:
    app.include_router(test_api.router)
    app.include_router(session_api_router)
    app.include_router(proctoring_api.router)
    app.include_router(analytics.router)
    app.include_router(face_verification_api.router)
    app.include_router(media_routes.router)
except Exception as e:
    logger.error(f"Error including new API routers: {str(e)}")

# Add the gaze_routes router - needs to be imported first
try:
    from app.routes import gaze_routes
    app.include_router(gaze_routes.router, prefix="/api/proctoring/gaze", tags=["Gaze Tracking"])
    logger.info("Gaze tracking routes included successfully")
except Exception as e:
    logger.error(f"Error including gaze routes: {str(e)}")

@app.get("/")
async def root():
    logger.info("Root endpoint called")
    return {"message": "Server is running", "status": "ok"}

@app.get("/db-check")
async def db_check():
    """Diagnostic endpoint to check database connection and tables"""
    try:
        # Use SQLAlchemy MetaData to get all tables
        from sqlalchemy import inspect
        inspector = inspect(engine)
        schemas = inspector.get_schema_names()
        
        result = {
            "status": "success",
            "connection": "Connected to database",
            "schemas": {}
        }
        
        for schema in schemas:
            tables = inspector.get_table_names(schema=schema)
            result["schemas"][schema] = {}
            
            for table in tables:
                columns = inspector.get_columns(table, schema=schema)
                result["schemas"][schema][table] = [col["name"] for col in columns]
        
        # Check permissions
        try:
            if 'check_table_permissions' in globals():
                permissions = check_table_permissions()
                result["permissions"] = permissions
            else:
                result["permissions_check"] = "Permission check function not available"
        except Exception as e:
            result["permissions_error"] = str(e)
        
        return result
    except Exception as e:
        logger.error(f"Error checking database: {str(e)}")
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    # Configure uvicorn logging
    uvicorn.run(
        app, 
        host="0.0.0.0", 
        port=8000,
        log_level="info"  # Use info for more detailed logs
    ) 