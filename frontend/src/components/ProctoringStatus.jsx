import React from 'react';
import AppLayout from '../layouts/AppLayout'; // Assuming AppLayout is in ../layouts/

// Status indicator component
const StatusIndicator = ({ active, label, warning = false }) => (
  <div className={`flex items-center p-2 rounded-md ${active ? (warning ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700') : 'bg-gray-50 text-gray-500'}`}>
    <div className={`w-3 h-3 rounded-full mr-2 ${active ? (warning ? 'bg-red-500' : 'bg-green-500') : 'bg-gray-300'}`}></div>
    <span className="text-sm font-medium">{label}</span>
  </div>
);

export default function ProctoringStatus({
  isFaceDetectionActive,
  isGazeTrackingActive,
  isScreenshotServiceActive,
  isFullscreenEnforced,
  isKeyboardShortcutsDisabled,
  isTabSwitchingBlocked,
  isCopyPasteDisabled,
  isContextMenuDisabled,
  isDeveloperToolsBlocked,
  isEscapeKeyBlocked,
  isWindowBlurBlocked,
  isMultipleFacesDetected,
  isNoFaceDetected,
  isGazeAway,
  isContinuousNoise,
  hasCameraPermission = true,
  isCameraPermissionViolated = false,
  hasMicrophonePermission = true,
  isMicrophonePermissionViolated = false
}) {
  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Proctoring Status Grid */}
        <div className="grid grid-cols-2 gap-2">
          <StatusIndicator 
            active={isFaceDetectionActive && hasCameraPermission} 
            label="Face Detection" 
            warning={isMultipleFacesDetected || isNoFaceDetected || isCameraPermissionViolated}
          />
          <StatusIndicator 
            active={isGazeTrackingActive} 
            label="Gaze Tracking" 
            warning={isGazeAway}
          />
          <StatusIndicator 
            active={isScreenshotServiceActive} 
            label="Screenshot Service"
          />
          <StatusIndicator 
            active={isFullscreenEnforced} 
            label="Fullscreen Mode"
          />
          <StatusIndicator 
            active={isKeyboardShortcutsDisabled} 
            label="Keyboard Shortcuts Blocked"
          />
          <StatusIndicator 
            active={isTabSwitchingBlocked} 
            label="Tab Switching Blocked"
          />
          <StatusIndicator 
            active={isCopyPasteDisabled} 
            label="Copy/Paste Disabled"
          />
          <StatusIndicator 
            active={isContextMenuDisabled} 
            label="Context Menu Disabled"
          />
          <StatusIndicator 
            active={isDeveloperToolsBlocked} 
            label="Developer Tools Blocked"
          />
          <StatusIndicator 
            active={isEscapeKeyBlocked} 
            label="Escape Key Blocked"
          />
          <StatusIndicator 
            active={isWindowBlurBlocked} 
            label="Window Focus Enforced"
          />
        </div>

        {/* Active Violations Section */}
        {(isMultipleFacesDetected || isNoFaceDetected || isGazeAway || 
          isContinuousNoise || isCameraPermissionViolated || isMicrophonePermissionViolated) && (
          <div className="mt-4 p-3 bg-red-50 rounded-md border border-red-200">
            <h4 className="text-sm font-semibold mb-2 text-red-700">Active Violations</h4>
            <ul className="space-y-1">
              {isCameraPermissionViolated && <li className="text-sm text-red-600">• Camera access revoked</li>}
              {isMicrophonePermissionViolated && <li className="text-sm text-red-600">• Microphone access revoked</li>}
              {isMultipleFacesDetected && <li className="text-sm text-red-600">• More than one face detected</li>}
              {isNoFaceDetected && <li className="text-sm text-red-600">• No face detected</li>}
              {isGazeAway && <li className="text-sm text-red-600">• Looking away from screen</li>}
              {isContinuousNoise && <li className="text-sm text-red-600">• Continuous background noise detected</li>}
            </ul>
          </div>
        )}
      </div>
    </AppLayout>
  );
} 