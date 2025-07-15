"""
Microphone Permission Feature Module

This module handles microphone permission monitoring and violation detection.
It can be used independently in other applications.

Dependencies:
- FastAPI
- SQLAlchemy
- Pydantic

Usage:
    from app.features.microphone_permission import MicrophonePermissionFeature
    
    # Initialize the feature
    mic_feature = MicrophonePermissionFeature()
    
    # Include in FastAPI app
    app.include_router(mic_feature.router)
"""

from .routes import router
from .services import MicrophonePermissionService
from .models import MicrophonePermissionLog
from .schemas import MicrophonePermissionViolation

__all__ = [
    'router',
    'MicrophonePermissionService', 
    'MicrophonePermissionLog',
    'MicrophonePermissionViolation'
] 