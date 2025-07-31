"""
Gaze Tracking Analysis Feature Module

This module handles gaze tracking analysis and violation logging.
It can be used independently in other applications.

Dependencies:
- FastAPI
- SQLAlchemy
- Pydantic

Usage:
    from app.features.gaze_tracking import GazeTrackingFeature
    
    # Initialize the feature
    gaze_feature = GazeTrackingFeature()
    
    # Include in FastAPI app
    app.include_router(gaze_feature.router)
"""

from .routes import router
from .services import GazeTrackingService

__all__ = [
    'router',
    'GazeTrackingService'
] 