"""
Window Blur Control Feature Module

This module handles window blur detection and violation logging.
It can be used independently in other applications.

Dependencies:
- FastAPI
- SQLAlchemy
- Pydantic

Usage:
    from app.features.window_blur import WindowBlurFeature
    
    # Initialize the feature
    blur_feature = WindowBlurFeature()
    
    # Include in FastAPI app
    app.include_router(blur_feature.router)
"""

from .routes import router
from .services import WindowBlurService

__all__ = [
    'router',
    'WindowBlurService', 
] 