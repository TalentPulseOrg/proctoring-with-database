"""
Audio Monitoring Feature Module

This module handles audio monitoring and violation logging.
It can be used independently in other applications.

Dependencies:
- FastAPI
- SQLAlchemy
- Pydantic

Usage:
    from app.features.audio_monitoring import AudioMonitoringFeature
    
    # Initialize the feature
    audio_feature = AudioMonitoringFeature()
    
    # Include in FastAPI app
    app.include_router(audio_feature.router)
"""

from .routes import router
from .services import AudioMonitoringService
from .models import AudioViolation
from .schemas import AudioViolationRequest

__all__ = [
    'router',
    'AudioMonitoringService', 
    'AudioViolation',
    'AudioViolationRequest'
] 