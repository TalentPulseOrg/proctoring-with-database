from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
import logging
from ..database import get_db
from ..models.violation import Violation
from ..models.test_session import TestSession
from ..models.test import Test
from ..models.user import User
from ..services.violation_service import ViolationService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analytics/violations", tags=["Violation Analytics"])

@router.get("/summary")
async def get_violations_summary(
    test_id: Optional[int] = Query(None, description="Filter by specific test"),
    days: Optional[int] = Query(7, description="Number of days to look back"),
    db: Session = Depends(get_db)
):
    """Get comprehensive violations summary with analytics"""
    try:
        # Calculate date range
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Base query
        query = db.query(Violation).filter(
            Violation.timestamp >= start_date,
            Violation.timestamp <= end_date
        )
        
        # Filter by test if specified
        if test_id:
            query = query.join(TestSession).filter(TestSession.test_id == test_id)
        
        violations = query.all()
        
        # Total counts
        total_violations = len(violations)
        
        # Violation counts by type
        violation_counts = {}
        for violation in violations:
            v_type = violation.violation_type
            violation_counts[v_type] = violation_counts.get(v_type, 0) + 1
        
        # Most problematic sessions
        session_violation_counts = {}
        for violation in violations:
            session_id = violation.session_id
            session_violation_counts[session_id] = session_violation_counts.get(session_id, 0) + 1
        
        # Sort by violation count
        most_problematic_sessions = sorted(
            session_violation_counts.items(), 
            key=lambda x: x[1], 
            reverse=True
        )[:10]  # Top 10
        
        # Get session details for most problematic
        problematic_sessions_details = []
        for session_id, count in most_problematic_sessions:
            session = db.query(TestSession).options(
                joinedload(TestSession.user),
                joinedload(TestSession.test)
            ).filter(TestSession.id == session_id).first()
            
            if session:
                problematic_sessions_details.append({
                    "session_id": session_id,
                    "violation_count": count,
                    "user_name": session.user.name if session.user else "Unknown",
                    "user_email": session.user.email if session.user else "Unknown",
                    "test_title": session.test.title if session.test else "Unknown",
                    "start_time": session.start_time.isoformat() if session.start_time else None,
                    "status": session.status
                })
        
        # Violations by day (for trending)
        violations_by_day = {}
        for i in range(days):
            date = start_date + timedelta(days=i)
            date_str = date.strftime('%Y-%m-%d')
            violations_by_day[date_str] = 0
        
        for violation in violations:
            date_str = violation.timestamp.strftime('%Y-%m-%d')
            if date_str in violations_by_day:
                violations_by_day[date_str] += 1
        
        # Most common violation types
        most_common_violations = sorted(
            violation_counts.items(), 
            key=lambda x: x[1], 
            reverse=True
        )
        
        # Violation descriptions
        violation_descriptions = {
            'camera_permission_denied': 'User denied camera access',
            'microphone_permission_denied': 'User denied microphone access',
            'browser_compatibility_issue': 'Unsupported browser detected',
            'tab_switch': 'User switched away from test tab',
            'window_blur': 'Test window lost focus',
            'fullscreen_exit': 'User exited fullscreen mode',
            'keyboard_shortcut': 'Restricted keyboard shortcut attempted',
            'lighting_issue': 'Poor lighting conditions detected',
            'gaze_away': 'User looked away from screen',
            'multiple_faces': 'Multiple faces detected in camera',
            'audio_suspicious': 'Suspicious audio activity detected'
        }
        
        return {
            "summary": {
                "total_violations": total_violations,
                "date_range": {
                    "start": start_date.isoformat(),
                    "end": end_date.isoformat(),
                    "days": days
                },
                "unique_sessions_affected": len(session_violation_counts),
                "average_violations_per_session": round(total_violations / len(session_violation_counts), 2) if session_violation_counts else 0
            },
            "violation_types": {
                "counts": violation_counts,
                "descriptions": violation_descriptions,
                "most_common": most_common_violations[:5]  # Top 5
            },
            "trending": {
                "by_day": violations_by_day
            },
            "problematic_sessions": problematic_sessions_details,
            "severity_analysis": {
                "high_risk_sessions": len([s for s in session_violation_counts.values() if s >= 10]),
                "medium_risk_sessions": len([s for s in session_violation_counts.values() if 5 <= s < 10]),
                "low_risk_sessions": len([s for s in session_violation_counts.values() if 1 <= s < 5])
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting violations summary: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/test/{test_id}/summary")
async def get_test_violations_summary(
    test_id: int,
    db: Session = Depends(get_db)
):
    """Get violations summary for a specific test"""
    try:
        # Check if test exists
        test = db.query(Test).filter(Test.test_id == test_id).first()
        if not test:
            raise HTTPException(status_code=404, detail="Test not found")
        
        # Get all sessions for this test
        sessions = db.query(TestSession).filter(TestSession.test_id == test_id).all()
        session_ids = [s.id for s in sessions]
        
        if not session_ids:
            return {
                "test_id": test_id,
                "test_title": test.title,
                "total_sessions": 0,
                "total_violations": 0,
                "sessions_with_violations": 0,
                "violation_types": {},
                "session_details": []
            }
        
        # Get violations for all sessions
        violations = db.query(Violation).filter(
            Violation.session_id.in_(session_ids)
        ).all()
        
        # Process violations by session
        session_violations = {}
        violation_counts = {}
        
        for violation in violations:
            session_id = violation.session_id
            if session_id not in session_violations:
                session_violations[session_id] = []
            session_violations[session_id].append(violation)
            
            v_type = violation.violation_type
            violation_counts[v_type] = violation_counts.get(v_type, 0) + 1
        
        # Create session details
        session_details = []
        for session in sessions:
            session_viols = session_violations.get(session.id, [])
            user = db.query(User).filter(User.id == session.user_id).first()
            
            session_details.append({
                "session_id": session.id,
                "user_name": user.name if user else "Unknown",
                "user_email": user.email if user else "Unknown",
                "start_time": session.start_time.isoformat() if session.start_time else None,
                "end_time": session.end_time.isoformat() if session.end_time else None,
                "status": session.status,
                "violation_count": len(session_viols),
                "violations": [
                    {
                        "type": v.violation_type,
                        "timestamp": v.timestamp.isoformat(),
                        "details": v.details
                    }
                    for v in session_viols
                ]
            })
        
        return {
            "test_id": test_id,
            "test_title": test.title,
            "total_sessions": len(sessions),
            "total_violations": len(violations),
            "sessions_with_violations": len(session_violations),
            "violation_types": violation_counts,
            "session_details": session_details
        }
        
    except Exception as e:
        logger.error(f"Error getting test violations summary: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/user/{user_id}/summary")
async def get_user_violations_summary(
    user_id: int,
    days: Optional[int] = Query(30, description="Number of days to look back"),
    db: Session = Depends(get_db)
):
    """Get violations summary for a specific user"""
    try:
        # Check if user exists
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Calculate date range
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Get user's sessions in date range
        sessions = db.query(TestSession).filter(
            TestSession.user_id == user_id,
            TestSession.start_time >= start_date,
            TestSession.start_time <= end_date
        ).all()
        
        if not sessions:
            return {
                "user_id": user_id,
                "user_name": user.name,
                "user_email": user.email,
                "total_sessions": 0,
                "total_violations": 0,
                "violation_types": {},
                "sessions": []
            }
        
        session_ids = [s.id for s in sessions]
        
        # Get violations for user's sessions
        violations = db.query(Violation).filter(
            Violation.session_id.in_(session_ids)
        ).all()
        
        # Process violations
        violation_counts = {}
        session_violations = {}
        
        for violation in violations:
            session_id = violation.session_id
            if session_id not in session_violations:
                session_violations[session_id] = []
            session_violations[session_id].append(violation)
            
            v_type = violation.violation_type
            violation_counts[v_type] = violation_counts.get(v_type, 0) + 1
        
        # Create session summaries
        session_summaries = []
        for session in sessions:
            session_viols = session_violations.get(session.id, [])
            test = db.query(Test).filter(Test.test_id == session.test_id).first()
            
            session_summaries.append({
                "session_id": session.id,
                "test_id": session.test_id,
                "test_title": test.title if test else "Unknown",
                "start_time": session.start_time.isoformat() if session.start_time else None,
                "end_time": session.end_time.isoformat() if session.end_time else None,
                "status": session.status,
                "score": session.score,
                "violation_count": len(session_viols)
            })
        
        return {
            "user_id": user_id,
            "user_name": user.name,
            "user_email": user.email,
            "date_range": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
                "days": days
            },
            "total_sessions": len(sessions),
            "total_violations": len(violations),
            "violation_types": violation_counts,
            "sessions": session_summaries
        }
        
    except Exception as e:
        logger.error(f"Error getting user violations summary: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/export")
async def export_violations(
    test_id: Optional[int] = Query(None, description="Filter by specific test"),
    user_id: Optional[int] = Query(None, description="Filter by specific user"),
    days: Optional[int] = Query(7, description="Number of days to look back"),
    format: str = Query("json", description="Export format: json or csv"),
    db: Session = Depends(get_db)
):
    """Export violations data for analysis"""
    try:
        # Calculate date range
        end_date = datetime.utcnow()
        start_date = end_date - timedelta(days=days)
        
        # Build query
        query = db.query(Violation).options(
            joinedload(Violation.session).joinedload(TestSession.user),
            joinedload(Violation.session).joinedload(TestSession.test)
        ).filter(
            Violation.timestamp >= start_date,
            Violation.timestamp <= end_date
        )
        
        if test_id:
            query = query.join(TestSession).filter(TestSession.test_id == test_id)
        
        if user_id:
            query = query.join(TestSession).filter(TestSession.user_id == user_id)
        
        violations = query.all()
        
        # Format data
        export_data = []
        for violation in violations:
            export_data.append({
                "violation_id": violation.id,
                "session_id": violation.session_id,
                "user_id": violation.session.user_id if violation.session else None,
                "user_name": violation.session.user.name if violation.session and violation.session.user else "Unknown",
                "user_email": violation.session.user.email if violation.session and violation.session.user else "Unknown",
                "test_id": violation.session.test_id if violation.session else None,
                "test_title": violation.session.test.title if violation.session and violation.session.test else "Unknown",
                "violation_type": violation.violation_type,
                "timestamp": violation.timestamp.isoformat(),
                "details": violation.details,
                "filepath": violation.filepath
            })
        
        if format.lower() == "csv":
            # For CSV format, you would implement CSV conversion here
            # For now, return JSON with a note
            return {
                "format": "json",
                "note": "CSV export not implemented yet",
                "data": export_data,
                "count": len(export_data)
            }
        
        return {
            "format": "json",
            "data": export_data,
            "count": len(export_data),
            "date_range": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat()
            }
        }
        
    except Exception as e:
        logger.error(f"Error exporting violations: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
