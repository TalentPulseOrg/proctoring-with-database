import json
import logging
from datetime import datetime
import os
from pathlib import Path

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create logs directory
logs_dir = Path("monitoring_logs")
logs_dir.mkdir(parents=True, exist_ok=True)

def log_event(event_type, event_data):
    """
    Log an event to a file
    
    Args:
        event_type (str): Type of event (e.g., 'gaze_analysis', 'face_detection')
        event_data (dict): Event data to log
    """
    try:
        # Create event entry with timestamp
        event = {
            "timestamp": datetime.now().isoformat(),
            "event_type": event_type,
            "data": event_data
        }
        
        # Append to log file
        log_file = logs_dir / f"{event_type}_log.json"
        
        # Initialize file with an empty array if it doesn't exist
        if not log_file.exists():
            with open(log_file, 'w') as f:
                json.dump([], f)
        
        # Read existing logs
        with open(log_file, 'r') as f:
            try:
                logs = json.load(f)
            except json.JSONDecodeError:
                logs = []
        
        # Append new event
        logs.append(event)
        
        # Write back to file
        with open(log_file, 'w') as f:
            json.dump(logs, f, indent=2)
        
        logger.info(f"Logged {event_type} event")
        return True
    except Exception as e:
        logger.error(f"Error logging event: {str(e)}")
        return False 