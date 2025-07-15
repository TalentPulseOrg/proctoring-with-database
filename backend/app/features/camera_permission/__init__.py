"""
Camera Permission Feature Module

This module handles camera permission monitoring and violation detection.
It can be used independently in other applications.

Dependencies:
- FastAPI
- SQLAlchemy
- Pydantic

Usage:
    from app.features.camera_permission import CameraPermissionFeature
    
    # Initialize the feature
    camera_feature = CameraPermissionFeature()
    
    # Include in FastAPI app
    app.include_router(camera_feature.router)
"""

from .routes import router
from .services import CameraPermissionService
from .models import CameraPermissionLog
from .schemas import CameraPermissionViolation

__all__ = [
    'router',
    'CameraPermissionService', 
    'CameraPermissionLog',
    'CameraPermissionViolation'
] 