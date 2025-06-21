from typing import List, Dict, Any
from datetime import datetime
from collections import defaultdict
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def generate_proctoring_report(events: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Generate a comprehensive proctoring report from events.
    
    Args:
        events: List of proctoring events
        
    Returns:
        Dictionary containing report data
    """
    logger.info(f"Generating report for {len(events)} events")
    
    # Initialize metrics
    metrics = {
        "tab_switches": 0,
        "multiple_faces": 0,
        "gaze_away": 0,
        "poor_lighting": 0,
        "total_violations": 0
    }
    
    # Track timestamps for timeline
    timeline = []
    
    # Process events
    for event in events:
        event_type = event.get("event_type", "")
        timestamp = event.get("timestamp", "")
        details = event.get("details", {})
        
        logger.info(f"Processing event: {event_type} at {timestamp}")
        
        # Update metrics based on event type
        if event_type == "tab_switch":
            metrics["tab_switches"] += 1
            metrics["total_violations"] += 1
            logger.info(f"Tab switch detected. Total: {metrics['tab_switches']}")
        elif event_type == "multiple_faces":
            metrics["multiple_faces"] += 1
            metrics["total_violations"] += 1
            logger.info(f"Multiple faces detected. Total: {metrics['multiple_faces']}")
        elif event_type in ["gaze_away", "left_frame"]:
            metrics["gaze_away"] += 1
            metrics["total_violations"] += 1
            logger.info(f"Gaze away detected. Total: {metrics['gaze_away']}")
        elif event_type == "poor_lighting":
            metrics["poor_lighting"] += 1
            logger.info(f"Poor lighting detected. Total: {metrics['poor_lighting']}")
        
        # Add to timeline
        timeline.append({
            "timestamp": timestamp,
            "event_type": event_type,
            "details": details
        })
    
    # Calculate environment rating
    environment_rating = calculate_environment_rating(metrics)
    
    # Get session duration
    if events:
        try:
            start_time = datetime.fromisoformat(events[0]["timestamp"])
            end_time = datetime.fromisoformat(events[-1]["timestamp"])
            duration = (end_time - start_time).total_seconds() / 60  # in minutes
        except (KeyError, ValueError) as e:
            logger.error(f"Error calculating duration: {e}")
            duration = 0
    else:
        duration = 0
    
    logger.info(f"Final metrics: {metrics}")
    
    return {
        "metrics": metrics,
        "timeline": timeline,
        "environment_rating": environment_rating,
        "session_duration_minutes": duration,
        "start_time": events[0]["timestamp"] if events else None,
        "end_time": events[-1]["timestamp"] if events else None
    }

def calculate_environment_rating(metrics: Dict[str, int]) -> str:
    """
    Calculate an overall environment rating based on metrics.
    
    Args:
        metrics: Dictionary of proctoring metrics
        
    Returns:
        String rating (Excellent, Good, Fair, Poor)
    """
    total_violations = metrics["total_violations"]
    logger.info(f"Calculating environment rating for {total_violations} violations")
    
    if total_violations == 0:
        return "Excellent"
    elif total_violations <= 3:
        return "Good"
    elif total_violations <= 7:
        return "Fair"
    else:
        return "Poor" 