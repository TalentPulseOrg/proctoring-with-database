"""
Browser Compatibility Feature Module

This module handles browser compatibility checking and violation detection.
It can be used independently in other applications.

Dependencies:
- FastAPI
- SQLAlchemy
- Pydantic

Usage:
    from app.features.browser_compatibility import BrowserCompatibilityFeature
    
    # Initialize the feature
    browser_feature = BrowserCompatibilityFeature()
    
    # Include in FastAPI app
    app.include_router(browser_feature.router)
"""

from .routes import router
from .services import BrowserCompatibilityService

__all__ = [
    'router',
    'BrowserCompatibilityService', 
] 