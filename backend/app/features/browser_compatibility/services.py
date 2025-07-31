"""
Browser Compatibility Service

This module contains the business logic for browser compatibility monitoring.
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging
import re

from app.services.violation_service import ViolationService

logger = logging.getLogger(__name__)

class BrowserCompatibilityService:
    """Service class for browser compatibility operations"""
    
    # Supported browsers and their patterns
    SUPPORTED_BROWSERS = {
        'chrome': ['chrome', 'chromium'],
        'firefox': ['firefox', 'mozilla'],
        'edge': ['edge', 'edg'],
        'safari': ['safari']
    }
    
    @staticmethod
    def check_browser_compatibility(browser_name: str, user_agent: Optional[str] = None) -> bool:
        """Check if a browser is compatible"""
        try:
            browser_name_lower = browser_name.lower()
            
            # Check if browser is in supported list
            for supported_browser, patterns in BrowserCompatibilityService.SUPPORTED_BROWSERS.items():
                if any(pattern in browser_name_lower for pattern in patterns):
                    return True
            
            # Additional check using user agent if provided
            if user_agent:
                user_agent_lower = user_agent.lower()
                for supported_browser, patterns in BrowserCompatibilityService.SUPPORTED_BROWSERS.items():
                    if any(pattern in user_agent_lower for pattern in patterns):
                        return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error checking browser compatibility: {str(e)}")
            return False
    
    @staticmethod
    def extract_browser_info(user_agent: str) -> tuple[str, Optional[str]]:
        """Extract browser name and version from user agent string"""
        try:
            # Common browser patterns
            patterns = {
                'chrome': r'Chrome/(\d+\.\d+)',
                'firefox': r'Firefox/(\d+\.\d+)',
                'edge': r'Edge/(\d+\.\d+)',
                'safari': r'Safari/(\d+\.\d+)'
            }
            
            user_agent_lower = user_agent.lower()
            
            # Determine browser name
            if 'chrome' in user_agent_lower:
                browser_name = 'Chrome'
                pattern = patterns['chrome']
            elif 'firefox' in user_agent_lower:
                browser_name = 'Firefox'
                pattern = patterns['firefox']
            elif 'edge' in user_agent_lower:
                browser_name = 'Edge'
                pattern = patterns['edge']
            elif 'safari' in user_agent_lower:
                browser_name = 'Safari'
                pattern = patterns['safari']
            else:
                browser_name = 'Unknown'
                pattern = None
            
            # Extract version
            version = None
            if pattern:
                match = re.search(pattern, user_agent)
                if match:
                    version = match.group(1)
            
            return browser_name, version
            
        except Exception as e:
            logger.error(f"Error extracting browser info: {str(e)}")
            return 'Unknown', None
    
    @staticmethod
    def log_browser_check(
        db: Session,
        session_id: int,
        browser_name: str,
        browser_version: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> Dict[str, Any]:
        """Log a browser compatibility check"""
        try:
            # Check compatibility
            is_compatible = BrowserCompatibilityService.check_browser_compatibility(browser_name, user_agent)
            
            # Log violation if browser is not compatible
            if not is_compatible:
                browser_info = {
                    "browser_name": browser_name,
                    "browser_version": browser_version,
                    "user_agent": user_agent
                }
                
                violation = ViolationService.log_browser_compatibility_violation(
                    db=db,
                    session_id=session_id,
                    browser_info=browser_info
                )
                
                if violation:
                    logger.warning(f"Browser compatibility violation logged for session {session_id}: {browser_name}")
                else:
                    logger.error(f"Failed to log browser compatibility violation for session {session_id}")
            
            logger.info(f"Browser compatibility checked for session {session_id}: {browser_name} - compatible={is_compatible}")
            
            return {
                "session_id": session_id,
                "browser_name": browser_name,
                "browser_version": browser_version,
                "user_agent": user_agent,
                "is_compatible": is_compatible,
                "timestamp": datetime.utcnow()
            }
            
        except Exception as e:
            logger.error(f"Error logging browser compatibility: {str(e)}")
            return {
                "session_id": session_id,
                "browser_name": browser_name,
                "browser_version": browser_version,
                "user_agent": user_agent,
                "is_compatible": False,
                "timestamp": datetime.utcnow(),
                "error": str(e)
            }
    
    @staticmethod
    def get_session_browser_checks(db: Session, session_id: int) -> List[Dict[str, Any]]:
        """Get all browser compatibility checks for a session"""
        try:
            from app.models.violation import Violation
            
            violations = db.query(Violation).filter(
                and_(
                    Violation.session_id == session_id,
                    Violation.violation_type == 'browser_compatibility_issue'
                )
            ).order_by(Violation.timestamp.desc()).all()
            
            return [
                {
                    "id": violation.id,
                    "session_id": violation.session_id,
                    "timestamp": violation.timestamp,
                    "details": violation.details,
                    "filepath": violation.filepath
                } for violation in violations
            ]
        except Exception as e:
            logger.error(f"Error getting session browser checks: {str(e)}")
            return []
    
    @staticmethod
    def get_browser_compatibility_status(db: Session, session_id: int) -> Dict[str, Any]:
        """Get the current browser compatibility status for a session"""
        try:
            from app.models.violation import Violation
            
            # Get the most recent browser compatibility violation for this session
            latest_violation = db.query(Violation).filter(
                and_(
                    Violation.session_id == session_id,
                    Violation.violation_type == 'browser_compatibility_issue'
                )
            ).order_by(Violation.timestamp.desc()).first()
            
            if not latest_violation:
                return {
                    "session_id": session_id,
                    "browser_name": "Unknown",
                    "is_compatible": True,  # No violations means compatible
                    "last_check": None
                }
            
            # Extract browser info from violation details
            browser_name = "Unknown"
            if latest_violation.details and 'browser_info' in latest_violation.details:
                browser_info = latest_violation.details['browser_info']
                browser_name = browser_info.get('browser_name', 'Unknown')
            
            return {
                "session_id": session_id,
                "browser_name": browser_name,
                "is_compatible": False,  # Has violations means incompatible
                "last_check": latest_violation.timestamp
            }
        except Exception as e:
            logger.error(f"Error getting browser compatibility status: {str(e)}")
            return {
                "session_id": session_id,
                "browser_name": "Unknown",
                "is_compatible": True,
                "last_check": None,
                "error": str(e)
            } 