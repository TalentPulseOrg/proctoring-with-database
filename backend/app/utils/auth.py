from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Dict
import jwt
from datetime import datetime, timedelta
from functools import wraps
from flask import request, jsonify
import os
from descope import DescopeClient
# Replace the import with a more general Exception since we're not sure of the exact path

security = HTTPBearer()

# This should be in environment variables in production
SECRET_KEY = "your-secret-key"
ALGORITHM = "HS256"

# Initialize Descope client
DESCOPE_PROJECT_ID = os.getenv("DESCOPE_PROJECT_ID", "P2x56iiJWdwCEbUDl6ikvPeq5tfX")  # Replace with your Project ID
descope_client = DescopeClient(project_id=DESCOPE_PROJECT_ID)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=30)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return {"id": user_id}
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_auth_token():
    """Extract JWT token from Authorization header"""
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        return None
    return auth_header.split(' ')[1]

def validate_session():
    """Validate the user's session token"""
    token = get_auth_token()
    if not token:
        return None, "No authentication token provided"
    
    try:
        # Validate the JWT token
        validation_response = descope_client.validate_session(token)
        return validation_response, None
    except Exception as e:
        return None, str(e)

def require_auth(f):
    """Decorator to require authentication for a route"""
    @wraps(f)
    def decorated(*args, **kwargs):
        validation_response, error = validate_session()
        if error:
            return jsonify({"error": "Authentication required", "details": error}), 401
        
        # Add user info to request context
        request.user = validation_response
        return f(*args, **kwargs)
    return decorated

def require_role(role):
    """Decorator to require a specific role for a route"""
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            validation_response, error = validate_session()
            if error:
                return jsonify({"error": "Authentication required", "details": error}), 401
            
            # Check if user has the required role
            roles = validation_response.get("roles", [])
            if role not in roles:
                return jsonify({"error": "Insufficient permissions", "details": f"Role '{role}' required"}), 403
            
            # Add user info to request context
            request.user = validation_response
            return f(*args, **kwargs)
        return decorated
    return decorator 