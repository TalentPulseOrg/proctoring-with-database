"""
Permission Logging Feature Module

This module handles permission enable logging and tracking.
It can be used independently in other applications.

Dependencies:
- FastAPI
- SQLAlchemy
- Pydantic

Usage:
    from app.features.permission_logging import PermissionLoggingFeature
    
    # Initialize the feature
    permission_feature = PermissionLoggingFeature()
    
    # Include in FastAPI app
    app.include_router(permission_feature.router)
"""

from .routes import router
from .services import PermissionLoggingService

__all__ = [
    'router',
    'PermissionLoggingService', 
] 