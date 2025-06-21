import json
import csv
from datetime import datetime
from typing import Dict, Any, List, Optional
import os
from pathlib import Path
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ProctoringEventLogger:
    def __init__(self, session_id: str):
        self.session_id = session_id
        self.events: List[Dict[str, Any]] = []
        self.logs_dir = Path("results/logs")
        self.logs_dir.mkdir(parents=True, exist_ok=True)
        self.session_file = self.logs_dir / f"session_{session_id}.json"
        self.load_events()
        logger.info(f"Initialized logger for session {session_id} with {len(self.events)} events")

    def load_events(self) -> None:
        """Load events from disk if they exist."""
        if self.session_file.exists():
            try:
                with open(self.session_file, 'r') as f:
                    self.events = json.load(f)
                logger.info(f"Loaded {len(self.events)} events from {self.session_file}")
            except json.JSONDecodeError as e:
                logger.error(f"Error loading events from {self.session_file}: {e}")
                self.events = []
        else:
            logger.info(f"No existing events file found at {self.session_file}")

    def save_events(self) -> None:
        """Save events to disk."""
        try:
            with open(self.session_file, 'w') as f:
                json.dump(self.events, f, indent=2)
            logger.info(f"Saved {len(self.events)} events to {self.session_file}")
        except Exception as e:
            logger.error(f"Error saving events to {self.session_file}: {e}")

    def log_event(self, event_type: str, details: Dict[str, Any]) -> None:
        """
        Log a proctoring event with timestamp and details.
        
        Args:
            event_type: Type of event (e.g., 'tab_switch', 'multiple_faces', etc.)
            details: Dictionary containing event-specific details
        """
        event = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": event_type,
            "details": details
        }
        self.events.append(event)
        logger.info(f"Logged event: {event_type} at {event['timestamp']}")
        self.save_events()

    def export_json(self) -> str:
        """
        Export events as JSON file.
        
        Returns:
            str: Path to the exported JSON file
        """
        filename = f"proctoring_log_{self.session_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        filepath = self.logs_dir / filename
        
        with open(filepath, 'w') as f:
            json.dump(self.events, f, indent=2)
        
        return str(filepath)

    def export_csv(self) -> str:
        """
        Export events as CSV file.
        
        Returns:
            str: Path to the exported CSV file
        """
        filename = f"proctoring_log_{self.session_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        filepath = self.logs_dir / filename
        
        with open(filepath, 'w', newline='') as f:
            writer = csv.DictWriter(f, fieldnames=['timestamp', 'event_type', 'details'])
            writer.writeheader()
            
            for event in self.events:
                row = {
                    'timestamp': event['timestamp'],
                    'event_type': event['event_type'],
                    'details': json.dumps(event['details'])
                }
                writer.writerow(row)
        
        return str(filepath)

    def get_events(self, event_type: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Get all events or filter by event type.
        
        Args:
            event_type: Optional event type to filter by
            
        Returns:
            List of event dictionaries
        """
        # Reload events from disk to ensure we have the latest data
        self.load_events()
        
        if event_type:
            filtered_events = [event for event in self.events if event["event_type"] == event_type]
            logger.info(f"Retrieved {len(filtered_events)} events of type {event_type}")
            return filtered_events
        
        logger.info(f"Retrieved all {len(self.events)} events")
        return self.events

    def clear_events(self) -> None:
        """Clear all logged events."""
        self.events = []
        if self.session_file.exists():
            try:
                self.session_file.unlink()
                logger.info(f"Cleared events and deleted file {self.session_file}")
            except Exception as e:
                logger.error(f"Error deleting events file {self.session_file}: {e}")
        else:
            logger.info("No events file to delete") 