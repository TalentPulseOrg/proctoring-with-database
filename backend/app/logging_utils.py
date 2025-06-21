import logging
import os
import json
import sys
from datetime import datetime
import time
import uuid

# Configure root logger
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)

# Create logger for this module
logger = logging.getLogger(__name__)

# Ensure logs directory exists
logs_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'logs')
if not os.path.exists(logs_dir):
    try:
        os.makedirs(logs_dir)
        logger.info(f"Created logs directory at {logs_dir}")
        # Add file handler after creating directory
        file_handler = logging.FileHandler(os.path.join(logs_dir, 'app.log'), 'a')
        file_handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))
        logging.getLogger().addHandler(file_handler)
    except Exception as e:
        logger.error(f"Failed to create logs directory: {str(e)}")

# Create monitoring logs directory
monitoring_logs_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'monitoring_logs')
if not os.path.exists(monitoring_logs_dir):
    try:
        os.makedirs(monitoring_logs_dir)
        logger.info(f"Created monitoring logs directory at {monitoring_logs_dir}")
    except Exception as e:
        logger.error(f"Failed to create monitoring logs directory: {str(e)}")

def log_event(event_type, session_id=None, test_id=None, user_id=None, data=None, severity="info"):
    """
    Log an event to the monitoring logs
    
    Args:
        event_type (str): Type of event (e.g., 'violation', 'submission', 'error')
        session_id (str, optional): Test session ID
        test_id (str or int, optional): Test ID
        user_id (str or int, optional): User ID
        data (dict, optional): Additional data to log
        severity (str, optional): Event severity (info, warning, error, critical)
    
    Returns:
        dict: The logged event data with metadata
    """
    try:
        # Create event object
        event = {
            "id": str(uuid.uuid4()),
            "timestamp": datetime.utcnow().isoformat(),
            "unix_timestamp": int(time.time()),
            "event_type": event_type,
            "severity": severity
        }
        
        # Add optional fields if provided
        if session_id:
            event["session_id"] = session_id
        if test_id:
            event["test_id"] = test_id
        if user_id:
            event["user_id"] = user_id
        if data:
            event["data"] = data
            
        # Log to appropriate logger based on severity
        log_message = f"{event_type}: {json.dumps(data or {})}"
        if severity == "warning":
            logger.warning(log_message)
        elif severity == "error":
            logger.error(log_message)
        elif severity == "critical":
            logger.critical(log_message)
        else:
            logger.info(log_message)
            
        # Write to monitoring log file
        filename = f"{datetime.utcnow().strftime('%Y-%m-%d')}_events.jsonl"
        filepath = os.path.join(monitoring_logs_dir, filename)
        
        with open(filepath, 'a') as f:
            f.write(json.dumps(event) + '\n')
            
        return event
        
    except Exception as e:
        logger.error(f"Failed to log event: {str(e)}")
        # Try to log to stderr at minimum
        print(f"ERROR: Failed to log event: {str(e)}", file=sys.stderr)
        return {
            "error": True,
            "message": f"Failed to log event: {str(e)}",
            "event_type": event_type
        }

def get_session_logs(session_id, limit=100, event_type=None):
    """
    Retrieve logs for a specific session
    
    Args:
        session_id (str): The session ID to filter logs for
        limit (int, optional): Maximum number of logs to return
        event_type (str, optional): Filter by event type
        
    Returns:
        list: List of log events for the session
    """
    try:
        session_logs = []
        
        # Get all log files
        log_files = [os.path.join(monitoring_logs_dir, f) for f in os.listdir(monitoring_logs_dir)
                    if f.endswith('_events.jsonl')]
        
        # Sort by date (newest first)
        log_files.sort(reverse=True)
        
        # Process log files until we have enough events
        for log_file in log_files:
            if len(session_logs) >= limit:
                break
                
            try:
                with open(log_file, 'r') as f:
                    for line in f:
                        try:
                            event = json.loads(line.strip())
                            if event.get('session_id') == session_id:
                                if event_type is None or event.get('event_type') == event_type:
                                    session_logs.append(event)
                                    if len(session_logs) >= limit:
                                        break
                        except json.JSONDecodeError:
                            continue
            except Exception as e:
                logger.error(f"Error reading log file {log_file}: {str(e)}")
                
        # Sort by timestamp (newest first)
        session_logs.sort(key=lambda x: x.get('unix_timestamp', 0), reverse=True)
        
        return session_logs[:limit]
        
    except Exception as e:
        logger.error(f"Failed to get session logs: {str(e)}")
        return [] 