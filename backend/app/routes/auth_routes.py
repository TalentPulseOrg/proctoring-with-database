from fastapi import APIRouter, File, UploadFile, Form, HTTPException, Request, Depends
from ..schemas.auth_schemas import AuthResponse, UserResponse, UserRoleResponse
from ..services.face_auth_service import FaceAuthService
from ..utils.error_handlers import (
    ValidationException,
    ResourceNotFoundException,
    ServerException,
    AuthenticationException
)
from ..utils.auth import validate_session, require_auth, require_role
from descope import DescopeClient
import os
import logging
import json

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()
face_auth_service = FaceAuthService()

# Initialize Descope client
DESCOPE_PROJECT_ID = os.getenv("DESCOPE_PROJECT_ID", "P2x56iiJWdwCEbUDl6ikvPeq5tfX")  # Replace with your Project ID
descope_client = DescopeClient(project_id=DESCOPE_PROJECT_ID)

# Simple file-based storage for user roles
ROLES_FILE = "user_roles.json"

def load_user_roles():
    """Load user roles from file"""
    try:
        if os.path.exists(ROLES_FILE):
            with open(ROLES_FILE, 'r') as f:
                return json.load(f)
        return {}
    except Exception as e:
        logger.error(f"Error loading user roles: {str(e)}")
        return {}

def save_user_roles(user_roles):
    """Save user roles to file"""
    try:
        with open(ROLES_FILE, 'w') as f:
            json.dump(user_roles, f)
    except Exception as e:
        logger.error(f"Error saving user roles: {str(e)}")

@router.post("/upload-id-photo", response_model=AuthResponse)
async def upload_id_photo(
    user_id: str = Form(...),
    image_data: UploadFile = File(...)
):
    """Upload ID photo for a user"""
    try:
        logger.info(f"Received ID photo upload request for user {user_id}")
        contents = await image_data.read()
        
        if not contents:
            raise ValidationException("Empty file received", "EMPTY_FILE")
            
        if not image_data.content_type.startswith('image/'):
            raise ValidationException("Invalid file type. Only images are allowed", "INVALID_FILE_TYPE")
            
        success = face_auth_service.save_id_photo(user_id, contents)
        if not success:
            raise ServerException("Failed to save ID photo", "SAVE_FAILED")
            
        logger.info(f"ID photo uploaded successfully for user {user_id}")
        return AuthResponse(
            success=True,
            message="ID photo uploaded successfully"
        )
    except ValidationException:
        raise
    except Exception as e:
        logger.error(f"Error in upload_id_photo: {str(e)}")
        raise ServerException("Failed to process ID photo upload", "UPLOAD_FAILED")

@router.post("/verify-face", response_model=AuthResponse)
async def verify_face(
    user_id: str = Form(...),
    image_data: UploadFile = File(...)
):
    """Verify live photo against stored ID photo"""
    try:
        logger.info(f"Received face verification request for user {user_id}")
        contents = await image_data.read()
        
        if not contents:
            raise ValidationException("Empty file received", "EMPTY_FILE")
            
        if not image_data.content_type.startswith('image/'):
            raise ValidationException("Invalid file type. Only images are allowed", "INVALID_FILE_TYPE")
            
        # Get stored ID photo
        id_photo = face_auth_service.get_id_photo(user_id)
        if not id_photo:
            raise ResourceNotFoundException("ID photo not found", "ID_PHOTO_NOT_FOUND")
            
        # Compare faces
        match, match_score = face_auth_service.compare_faces(id_photo, contents)
        
        # Check liveness
        liveness_result = face_auth_service.detect_liveness(contents)
        
        if match and liveness_result["is_live"]:
            logger.info(f"Face verification successful for user {user_id}")
            return AuthResponse(
                success=True,
                message="Face verification successful",
                match_score=match_score,
                liveness_score=liveness_result["confidence"]
            )
        else:
            logger.warning(f"Face verification failed for user {user_id}")
            return AuthResponse(
                success=False,
                message="Face verification failed",
                match_score=match_score,
                liveness_score=liveness_result["confidence"],
                reason=liveness_result["reason"]
            )
    except (ValidationException, ResourceNotFoundException):
        raise
    except Exception as e:
        logger.error(f"Error in verify_face: {str(e)}")
        raise ServerException("Failed to process face verification", "VERIFICATION_FAILED")

@router.post("/check-liveness", response_model=AuthResponse)
async def check_liveness(
    image_data: UploadFile = File(...)
):
    """Check if the photo is of a live person"""
    try:
        logger.info("Received liveness check request")
        contents = await image_data.read()
        
        if not contents:
            raise ValidationException("Empty file received", "EMPTY_FILE")
            
        if not image_data.content_type.startswith('image/'):
            raise ValidationException("Invalid file type. Only images are allowed", "INVALID_FILE_TYPE")
            
        result = face_auth_service.detect_liveness(contents)
        
        if result["is_live"]:
            logger.info("Liveness check passed")
            return AuthResponse(
                success=True,
                message="Liveness check passed",
                liveness_score=result["confidence"]
            )
        else:
            logger.warning("Liveness check failed")
            return AuthResponse(
                success=False,
                message="Liveness check failed",
                liveness_score=result["confidence"],
                reason=result["reason"]
            )
    except ValidationException:
        raise
    except Exception as e:
        logger.error(f"Error in check_liveness: {str(e)}")
        raise ServerException("Failed to process liveness check", "LIVENESS_CHECK_FAILED")

@router.post("/validate-session")
async def validate_auth_session(request: Request):
    """Validate user session and return user information"""
    try:
        # Get the authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid or missing authorization header")
        
        token = auth_header.split(" ")[1]
        
        # Validate session with Descope
        validation_response = descope_client.validate_session(token)
        
        # Extract user details from validation response
        user_id = validation_response.get("userId")
        email = validation_response.get("email")
        name = validation_response.get("name")
        roles = validation_response.get("roles", [])
        
        return {
            "userId": user_id,
            "email": email,
            "name": name,
            "roles": roles,
            "isAuthenticated": True
        }
    except Exception as e:
        logger.error(f"Error validating session: {str(e)}")
        raise HTTPException(status_code=401, detail=str(e))

@router.get("/me", response_model=UserResponse)
async def get_current_user(request: Request):
    """Get current authenticated user information"""
    try:
        # Get the authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid or missing authorization header")
        
        token = auth_header.split(" ")[1]
        
        # Validate session with Descope
        validation_response = descope_client.validate_session(token)
        
        # Extract user details from validation response
        user_id = validation_response.get("userId")
        email = validation_response.get("email")
        name = validation_response.get("name")
        roles = validation_response.get("roles", [])
        
        return UserResponse(
            userId=user_id,
            email=email,
            name=name,
            roles=roles
        )
    except Exception as e:
        logger.error(f"Error getting user information: {str(e)}")
        raise HTTPException(status_code=401, detail=str(e))

@router.post("/set-role")
async def set_user_role(user_role: UserRoleResponse, request: Request):
    """Set user role (admin or candidate)"""
    try:
        # Get the authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid or missing authorization header")
        
        token = auth_header.split(" ")[1]
        
        # Validate session with Descope
        validation_response = descope_client.validate_session(token)
        
        # Get user ID
        user_id = validation_response.get("userId")
        if not user_id:
            raise HTTPException(status_code=400, detail="User ID not found in token")
        
        # Update user role in Descope
        role = user_role.role
        if role not in ["admin", "candidate"]:
            raise HTTPException(status_code=400, detail="Invalid role. Must be 'admin' or 'candidate'")
        
        # Store the role in our simple database
        user_roles = load_user_roles()
        user_roles[user_id] = role
        save_user_roles(user_roles)
        
        logger.info(f"Role {role} saved for user {user_id}")
        
        # Return success response with the role
        return {"userId": user_id, "role": role, "success": True}
    except Exception as e:
        logger.error(f"Error setting user role: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/check-role")
async def check_user_role(request: Request):
    """Check if the user already has a role assigned and what it is"""
    try:
        # Get the authorization header
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Invalid or missing authorization header")
        
        token = auth_header.split(" ")[1]
        
        # Validate session with Descope
        validation_response = descope_client.validate_session(token)
        
        # Get user ID
        user_id = validation_response.get("userId")
        if not user_id:
            raise HTTPException(status_code=400, detail="User ID not found in token")
        
        # Get the user's role from our simple database
        user_roles = load_user_roles()
        role = user_roles.get(user_id)
        
        if role:
            return {"userId": user_id, "role": role, "hasRole": True}
        else:
            return {"userId": user_id, "hasRole": False}
    except Exception as e:
        logger.error(f"Error checking user role: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e)) 