import os
import cv2
import numpy as np
import face_recognition
from datetime import datetime
import json
import logging

logger = logging.getLogger(__name__)

class MonitoringService:
    def __init__(self):
        self.logs_dir = "monitoring_logs"
        os.makedirs(self.logs_dir, exist_ok=True)

    def process_image(self, image_data, test_id, user_id):
        try:
            # Convert binary image data to numpy array
            nparr = np.frombuffer(image_data, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            if img is None:
                logger.error("Failed to decode image")
                return {
                    "is_suspicious": False,
                    "face_count": 0,
                    "timestamp": datetime.now().isoformat()
                }
            
            # Convert BGR to RGB (face_recognition uses RGB)
            rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            
            # Detect faces
            face_locations = face_recognition.face_locations(rgb_img)
            face_count = len(face_locations)
            
            # Determine if suspicious (multiple faces)
            is_suspicious = face_count > 1
            
            # If suspicious, save to suspicious folder
            if is_suspicious:
                suspicious_folder = os.path.join("suspicious_snapshots", test_id)
                os.makedirs(suspicious_folder, exist_ok=True)
                
                timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
                filename = f"suspicious_{timestamp}.jpg"
                filepath = os.path.join(suspicious_folder, filename)
                
                cv2.imwrite(filepath, img)
                logger.warning(f"Multiple faces detected ({face_count}). Saved to {filepath}")
            
            return {
                "is_suspicious": is_suspicious,
                "face_count": face_count,
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error processing image: {str(e)}")
            raise

    def log_event(self, test_id, event_type, details):
        try:
            log_file = os.path.join(self.logs_dir, f"{test_id}_events.json")
            
            # Load existing logs or create new list
            if os.path.exists(log_file):
                with open(log_file, 'r') as f:
                    logs = json.load(f)
            else:
                logs = []
            
            # Add new event
            event = {
                "timestamp": datetime.now().isoformat(),
                "type": event_type,
                "details": details
            }
            logs.append(event)
            
            # Save updated logs
            with open(log_file, 'w') as f:
                json.dump(logs, f, indent=2)
                
        except Exception as e:
            logger.error(f"Error logging event: {str(e)}")
            raise

    def get_monitoring_logs(self, test_id):
        try:
            log_file = os.path.join(self.logs_dir, f"{test_id}_events.json")
            
            if os.path.exists(log_file):
                with open(log_file, 'r') as f:
                    return json.load(f)
            return []
            
        except Exception as e:
            logger.error(f"Error getting monitoring logs: {str(e)}")
            raise

monitoring_service = MonitoringService() 