import pyautogui
import os
import time
from datetime import datetime
import threading
import logging
import sys
import traceback

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class ScreenshotService:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(ScreenshotService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
            
        self.save_folder = "media/snapshots"
        self.interval = 15
        self.is_running = False
        self.thread = None
        self.current_session_id = None
        self.error_count = 0
        self.max_errors = 3
        self.last_screenshot_time = None
        self.screenshot_count = 0

        # Create folder if it doesn't exist
        try:
            if not os.path.exists(self.save_folder):
                os.makedirs(self.save_folder)
            logger.info(f"Screenshot folder created/verified at: {os.path.abspath(self.save_folder)}")
        except Exception as e:
            logger.error(f"Failed to create screenshot folder: {str(e)}")
            raise

        # Test if we can take a screenshot and save it
        try:
            # Take a test screenshot
            logger.info("Taking test screenshot to verify functionality")
            test_screenshot = pyautogui.screenshot()
            
            # Verify the screenshot size is valid
            width, height = test_screenshot.size
            if width <= 0 or height <= 0:
                raise ValueError(f"Invalid screenshot dimensions: {width}x{height}")
            
            # Try to save it to a test file
            test_path = os.path.join(self.save_folder, "test_screenshot.png")
            test_screenshot.save(test_path)
            
            # Verify the file was saved
            if not os.path.exists(test_path):
                raise FileNotFoundError(f"Test screenshot was not saved to {test_path}")
                
            logger.info(f"Successfully saved test screenshot ({width}x{height}) to {test_path}")
            
            # Try to remove the test file
            if os.path.exists(test_path):
                os.remove(test_path)
                
        except Exception as e:
            logger.error(f"Failed to take or save test screenshot: {str(e)}")
            if sys.platform == 'win32':
                logger.error("On Windows, make sure you're running the application with appropriate permissions")
            elif sys.platform == 'linux':
                logger.error("On Linux, make sure you have X11 forwarding enabled if running remotely")
            raise
            
        self._initialized = True
        logger.info("ScreenshotService initialized successfully")

    def start_for_test(self, session_id):
        """Start screenshot capture for a specific session"""
        try:
            if self.is_running:
                logger.warning(f"Screenshot service is already running for session {self.current_session_id}")
                return False
            
            logger.info(f"Starting screenshot service for session {session_id}")
            self.current_session_id = session_id
            self.is_running = True
            self.error_count = 0
            
            # Create a new thread for each session
            self.thread = threading.Thread(target=self._capture_loop, daemon=True)
            self.thread.start()
            
            # Wait a moment to ensure the thread has started
            time.sleep(1)
            
            # Verify the thread is actually running
            if not self.thread.is_alive():
                logger.error("Screenshot thread failed to start")
                self.is_running = False
                return False
                
            logger.info(f"Successfully started screenshot capture for session {session_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to start screenshot service: {str(e)}")
            self.is_running = False
            return False

    def stop_for_test(self):
        """Stop screenshot capture for the current session"""
        try:
            if not self.is_running:
                logger.warning("Screenshot service is not running")
                return False

            session_id = self.current_session_id
            logger.info(f"Stopping screenshot service for session {session_id}")
            
            # First set the flag to signal the thread to stop
            self.is_running = False
            
            # Wait for the thread to complete
            if self.thread and self.thread.is_alive():
                logger.info("Waiting for screenshot thread to complete...")
                self.thread.join(timeout=10)  # Wait up to 10 seconds
                
                if self.thread.is_alive():
                    logger.warning("Screenshot thread did not exit cleanly within timeout")
            
            # Clear session ID
            self.current_session_id = None
            logger.info(f"Successfully stopped screenshot capture for session {session_id}")
            return True
        except Exception as e:
            logger.error(f"Error stopping screenshot service: {str(e)}")
            return False

    def is_active(self):
        """Check if the service is currently running"""
        thread_alive = self.thread is not None and self.thread.is_alive()
        logger.info(f"Screenshot service status check - is_running flag: {self.is_running}, thread_alive: {thread_alive}")
        
        # If the flag is set but the thread is not alive, something went wrong
        if self.is_running and not thread_alive and self.thread is not None:
            logger.warning("Screenshot service flag is 'running' but the thread is not alive - resetting status")
            self.is_running = False
            
        return self.is_running

    def get_current_session_id(self):
        """Get the current session ID being monitored"""
        return self.current_session_id

    def _capture_loop(self):
        logger.info(f"Starting screenshot capture loop for session {self.current_session_id}")
        loop_count = 0
        
        while self.is_running:
            loop_count += 1
            logger.info(f"Screenshot loop iteration {loop_count} for session {self.current_session_id}")
            
            try:
                # Create session-specific folder
                session_folder = os.path.join(self.save_folder, f"test_{self.current_session_id}")
                if not os.path.exists(session_folder):
                    os.makedirs(session_folder)
                    logger.info(f"Created session-specific screenshot folder: {session_folder}")
                
                # Generate filename with current timestamp and session ID
                timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
                filename = f"screenshot_{timestamp}.png"
                filepath = os.path.join(session_folder, filename)

                # Take screenshot and save it
                logger.info(f"Taking screenshot for session {self.current_session_id}")
                screenshot = pyautogui.screenshot()
                screenshot.save(filepath)

                # Create database entry for the screenshot
                try:
                    from app.services.media_database_service import media_db_service
                    success = media_db_service.process_file_creation(filepath)
                    if success:
                        logger.info(f"Database entry created for screenshot: {filepath}")
                    else:
                        logger.warning(f"Failed to create database entry for screenshot: {filepath}")
                except Exception as e:
                    logger.error(f"Error creating database entry for screenshot: {str(e)}")

                # Reset error count on successful capture
                self.error_count = 0
                logger.info(f"Saved screenshot to: {filepath}")

                # Wait for the interval - break it into smaller sleeps to check self.is_running more frequently
                logger.info(f"Waiting for {self.interval} seconds before next screenshot...")
                for i in range(self.interval):
                    if not self.is_running:
                        logger.info("Screenshot service stopped during wait period")
                        return
                    time.sleep(1)
                    
            except Exception as e:
                self.error_count += 1
                logger.error(f"Error capturing screenshot: {str(e)}")
                
                if self.error_count >= self.max_errors:
                    logger.error("Too many consecutive errors, stopping screenshot service")
                    self.is_running = False
                    break
                    
                # Wait before retrying - break it into smaller sleeps
                logger.info(f"Waiting for {self.interval} seconds before retrying...")
                for i in range(self.interval):
                    if not self.is_running:
                        return
                    time.sleep(1)
        
        logger.info(f"Screenshot loop exited for session {self.current_session_id}, is_running={self.is_running}")

# Create a singleton instance
screenshot_service = ScreenshotService()
