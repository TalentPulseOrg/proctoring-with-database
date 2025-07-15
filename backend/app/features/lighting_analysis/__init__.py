"""
Lighting Analysis Feature Module

This module handles lighting analysis and violation logging.
It can be used independently in other applications.

Dependencies:
- FastAPI
- SQLAlchemy
- Pydantic

Usage:
    from app.features.lighting_analysis import LightingAnalysisFeature
    
    # Initialize the feature
    lighting_feature = LightingAnalysisFeature()
    
    # Include in FastAPI app
    app.include_router(lighting_feature.router)
"""

from .routes import router
from .services import LightingAnalysisService

__all__ = [
    'router',
    'LightingAnalysisService', 
] 