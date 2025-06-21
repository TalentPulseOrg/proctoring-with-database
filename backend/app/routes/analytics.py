from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any, List
import logging
from ..database import get_db
from ..services.test_session_service import TestSessionService
from ..services.proctoring_service import ProctoringService
from sqlalchemy import func
from ..models.test_session import TestSession
from ..models.violation import Violation
from datetime import datetime, timedelta

# Set up logging with reduced verbosity
logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])

@router.get("/user/{user_id}")
async def get_user_analytics(user_id: int, db: Session = Depends(get_db)):
    """Get analytics for a specific user"""
    try:
        # Get all sessions for this user
        user_sessions = TestSessionService.get_sessions_by_user(db, user_id)
        
        # Calculate metrics
        total_sessions = len(user_sessions)
        completed_sessions = len([s for s in user_sessions if s.status == "completed"])
        average_score = sum([s.percentage or 0 for s in user_sessions if s.status == "completed"]) / completed_sessions if completed_sessions > 0 else 0
        
        # Get violations for this user's sessions
        violations = []
        for session in user_sessions:
            session_violations = ProctoringService.get_session_violations(db, session.id)
            violations.extend(session_violations)
        
        # Count violation types
        violation_types = {}
        for v in violations:
            if v.violation_type in violation_types:
                violation_types[v.violation_type] += 1
            else:
                violation_types[v.violation_type] = 1
                
        return {
            "user_id": user_id,
            "total_sessions": total_sessions,
            "completed_sessions": completed_sessions,
            "average_score": average_score,
            "violation_count": len(violations),
            "violation_types": violation_types
        }
    except Exception as e:
        logger.error(f"Error getting user analytics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/test/{test_id}")
async def get_test_analytics(test_id: int, db: Session = Depends(get_db)):
    """Get analytics for a specific test"""
    try:
        # Get all sessions for this test
        test_sessions = TestSessionService.get_sessions_by_test(db, test_id)
        
        # Calculate metrics
        total_sessions = len(test_sessions)
        completed_sessions = len([s for s in test_sessions if s.status == "completed"])
        average_score = sum([s.percentage or 0 for s in test_sessions if s.status == "completed"]) / completed_sessions if completed_sessions > 0 else 0
        
        # Calculate score distribution
        score_ranges = {
            "0-20": 0,
            "21-40": 0,
            "41-60": 0,
            "61-80": 0,
            "81-100": 0
        }
        
        for session in test_sessions:
            if session.status == "completed" and session.percentage is not None:
                if session.percentage <= 20:
                    score_ranges["0-20"] += 1
                elif session.percentage <= 40:
                    score_ranges["21-40"] += 1
                elif session.percentage <= 60:
                    score_ranges["41-60"] += 1
                elif session.percentage <= 80:
                    score_ranges["61-80"] += 1
                else:
                    score_ranges["81-100"] += 1
        
        return {
            "test_id": test_id,
            "total_sessions": total_sessions,
            "completed_sessions": completed_sessions,
            "average_score": average_score,
            "score_distribution": score_ranges
        }
    except Exception as e:
        logger.error(f"Error getting test analytics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/violations")
async def get_violation_statistics(db: Session = Depends(get_db)):
    """Get violation statistics"""
    try:
        # Count total violations
        total_violations = db.query(func.count(Violation.id)).scalar()
        
        # Count violations by type
        violations_by_type = db.query(
            Violation.violation_type,
            func.count(Violation.id).label("count")
        ).group_by(Violation.violation_type).all()
        
        # Format the results
        violation_types = {v_type: count for v_type, count in violations_by_type}
        
        return {
            "total_violations": total_violations,
            "violations_by_type": violation_types
        }
    except Exception as e:
        logger.error(f"Error getting violation statistics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/performance")
async def get_performance_statistics(
    period: str = "week",  # week, month, year
    db: Session = Depends(get_db)
):
    """Get performance statistics"""
    try:
        # Determine the date range
        now = datetime.utcnow()
        if period == "week":
            start_date = now - timedelta(days=7)
        elif period == "month":
            start_date = now - timedelta(days=30)
        elif period == "year":
            start_date = now - timedelta(days=365)
        else:
            raise HTTPException(status_code=400, detail="Invalid period. Use 'week', 'month', or 'year'.")
        
        # Get completed sessions in the date range
        completed_sessions = db.query(TestSession).filter(
            TestSession.status == "completed",
            TestSession.end_time >= start_date,
            TestSession.end_time <= now
        ).all()
        
        # Calculate average score
        average_score = sum([s.percentage or 0 for s in completed_sessions]) / len(completed_sessions) if completed_sessions else 0
        
        # Count sessions by day
        sessions_by_day = {}
        for session in completed_sessions:
            day = session.end_time.strftime("%Y-%m-%d")
            if day in sessions_by_day:
                sessions_by_day[day] += 1
            else:
                sessions_by_day[day] = 1
        
        return {
            "period": period,
            "completed_sessions": len(completed_sessions),
            "average_score": average_score,
            "sessions_by_day": sessions_by_day
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting performance statistics: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 