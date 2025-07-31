# Modular Proctoring System Implementation

## Overview

This document describes the modular implementation of the proctoring system, where each feature is completely independent and can be used in other applications without modification.

## Architecture Principles

### 1. **Feature Independence**
Each proctoring feature is self-contained with its own:
- **Backend**: Models, Services, Routes, Schemas
- **Frontend**: Hooks, Components, API calls
- **Documentation**: Usage examples and dependencies

### 2. **Plug-and-Play Design**
Features can be copied to other applications and work immediately with minimal configuration.

### 3. **Clear Boundaries**
- No cross-feature dependencies
- Shared logic is abstracted into common modules
- Each feature has its own API endpoints

## Backend Modular Structure

### Feature Organization
```
backend/app/features/
├── camera_permission/
│   ├── __init__.py          # Feature exports
│   ├── models.py            # Database models
│   ├── schemas.py           # Pydantic schemas
│   ├── services.py          # Business logic
│   └── routes.py            # API endpoints
├── microphone_permission/
│   ├── __init__.py
│   ├── models.py
│   ├── schemas.py
│   ├── services.py
│   └── routes.py
├── face_detection/
│   ├── __init__.py
│   ├── models.py
│   ├── schemas.py
│   ├── services.py
│   └── routes.py
└── browser_compatibility/
    ├── __init__.py
    ├── models.py
    ├── schemas.py
    ├── services.py
    └── routes.py
```

### API Endpoints Structure
Each feature has its own API prefix:
- **Camera Permission**: `/api/proctoring/camera-permission/*`
- **Microphone Permission**: `/api/proctoring/microphone-permission/*`
- **Face Detection**: `/api/proctoring/face-detection/*`
- **Browser Compatibility**: `/api/proctoring/browser-compatibility/*`

## Frontend Modular Structure

### Feature Organization
```
frontend/src/features/proctoring/
├── camera_permission_check/
│   └── index.js             # Hook + Components
├── microphone_permission_check/
│   └── index.js             # Hook + Components
├── face_detection/
│   └── index.js             # Hook + Components
└── browser_compatibility_check/
    └── index.js             # Hook + Components
```

### Component Structure
Each feature exports:
- **Hook**: For state management and logic
- **Warning Component**: For violation alerts
- **Status Component**: For status display
- **Additional Components**: Feature-specific UI elements

## Individual Feature Documentation

### 1. Camera Permission Feature

#### Backend Usage
```python
# Include in FastAPI app
from app.features.camera_permission.routes import router as camera_router
app.include_router(camera_router)

# Use service directly
from app.features.camera_permission.services import CameraPermissionService
from app.features.camera_permission.schemas import CameraPermissionViolation

# Log violation
violation = CameraPermissionViolation(
    session_id=123,
    error_message="Permission denied",
    device_info="Chrome 120.0"
)
CameraPermissionService.log_permission_event(db, violation.session_id, False, violation.error_message)
```

#### Frontend Usage
```javascript
import { useCameraPermissionMonitor, CameraPermissionWarning } from './features/proctoring/camera_permission_check';

function MyComponent() {
  const { hasPermission, status, recheckPermission } = useCameraPermissionMonitor(sessionId, isActive);
  
  return (
    <div>
      <CameraPermissionWarning 
        hasPermission={hasPermission} 
        status={status} 
        onRecheck={recheckPermission} 
      />
    </div>
  );
}
```
Uncaught SyntaxError: The requested module '/src/api/api.js?t=1752558296536' does not provide an export named 'logMultipleFacesViolation' (at FaceDetectionStatus.jsx:2:10)
#### Dependencies
- **Backend**: FastAPI, SQLAlchemy, Pydantic
- **Frontend**: React, React hooks
- **External**: None

### 2. Microphone Permission Feature

#### Backend Usage
```python
# Include in FastAPI app
from app.features.microphone_permission.routes import router as mic_router
app.include_router(mic_router)

# Use service directly
from app.features.microphone_permission.services import MicrophonePermissionService

# Log permission grant
MicrophonePermissionService.log_permission_event(db, session_id, True, device_info="Chrome 120.0")
```

#### Frontend Usage
```javascript
import { useMicrophonePermissionMonitor, MicrophonePermissionStatus } from './features/proctoring/microphone_permission_check';

function MyComponent() {
  const { hasPermission, status, isMonitoring } = useMicrophonePermissionMonitor(sessionId, isActive);
  
  return (
    <div>
      <MicrophonePermissionStatus 
        hasPermission={hasPermission} 
        status={status} 
        isMonitoring={isMonitoring} 
      />
    </div>
  );
}
```

#### Dependencies
- **Backend**: FastAPI, SQLAlchemy, Pydantic
- **Frontend**: React, React hooks
- **External**: None

### 3. Face Detection Feature

#### Backend Usage
```python
# Include in FastAPI app
from app.features.face_detection.routes import router as face_router
app.include_router(face_router)

# Use service directly
from app.features.face_detection.services import FaceDetectionService
from app.features.face_detection.schemas import FaceDetectionRequest

# Detect faces
request = FaceDetectionRequest(
    session_id=123,
    image_data="base64_encoded_image",
    confidence_threshold=0.5
)
result = FaceDetectionService.process_face_detection(db, request)
```

#### Frontend Usage
```javascript
import { useFaceDetection, FaceDetectionVideo, FaceDetectionWarning } from './features/proctoring/face_detection';

function MyComponent() {
  const { faceCount, isMultipleFaces, videoRef, isMonitoring } = useFaceDetection(sessionId, isActive);
  
  return (
    <div>
      <FaceDetectionVideo videoRef={videoRef} isMonitoring={isMonitoring} />
      <FaceDetectionWarning 
        isMultipleFaces={isMultipleFaces} 
        faceCount={faceCount} 
      />
    </div>
  );
}
```

#### Dependencies
- **Backend**: FastAPI, SQLAlchemy, Pydantic, OpenCV, face_recognition
- **Frontend**: React, React hooks
- **External**: OpenCV, face_recognition library

### 4. Browser Compatibility Feature

#### Backend Usage
```python
# Include in FastAPI app
from app.features.browser_compatibility.routes import router as browser_router
app.include_router(browser_router)

# Use service directly
from app.features.browser_compatibility.services import BrowserCompatibilityService

# Check compatibility
result = BrowserCompatibilityService.log_browser_check(
    db, session_id, "Chrome", "120.0", user_agent
)
```

#### Frontend Usage
```javascript
import { useBrowserCompatibilityCheck, BrowserCompatibilityWarning } from './features/proctoring/browser_compatibility_check';

function MyComponent() {
  const { isCompatible, browserInfo, checkCompatibility } = useBrowserCompatibilityCheck(sessionId, isActive);
  
  return (
    <div>
      <BrowserCompatibilityWarning 
        isCompatible={isCompatible} 
        browserInfo={browserInfo} 
      />
    </div>
  );
}
```

#### Dependencies
- **Backend**: FastAPI, SQLAlchemy, Pydantic
- **Frontend**: React, React hooks
- **External**: None

## How to Extract and Use Individual Features

### Step 1: Copy Feature Files
```bash
# Copy camera permission feature
cp -r backend/app/features/camera_permission/ /path/to/new/app/features/
cp -r frontend/src/features/proctoring/camera_permission_check/ /path/to/new/app/src/features/
```

### Step 2: Update Dependencies
```python
# Backend requirements.txt
fastapi
sqlalchemy
pydantic
# Add any feature-specific dependencies
```

```javascript
// Frontend package.json
{
  "dependencies": {
    "react": "^18.0.0",
    "axios": "^1.0.0"
    // Add any feature-specific dependencies
  }
}
```

### Step 3: Include in Application
```python
# Backend main.py
from app.features.camera_permission.routes import router as camera_router
app.include_router(camera_router)
```

```javascript
// Frontend App.jsx
import { useCameraPermissionMonitor } from './features/camera_permission_check';

function App() {
  const { hasPermission } = useCameraPermissionMonitor(sessionId, true);
  // Use the feature
}
```

### Step 4: Configure Database
```python
# Create database tables for the feature
from app.features.camera_permission.models import CameraPermissionLog
Base.metadata.create_all(engine)
```

## API Reference

### Camera Permission Endpoints
- `POST /api/proctoring/camera-permission/violation` - Log violation
- `POST /api/proctoring/camera-permission/grant` - Log permission grant
- `GET /api/proctoring/camera-permission/session/{session_id}/status` - Get status
- `GET /api/proctoring/camera-permission/session/{session_id}/logs` - Get logs

### Microphone Permission Endpoints
- `POST /api/proctoring/microphone-permission/violation` - Log violation
- `POST /api/proctoring/microphone-permission/grant` - Log permission grant
- `GET /api/proctoring/microphone-permission/session/{session_id}/status` - Get status
- `GET /api/proctoring/microphone-permission/session/{session_id}/logs` - Get logs

### Face Detection Endpoints
- `POST /api/proctoring/face-detection/detect` - Detect faces
- `POST /api/proctoring/face-detection/violation/multiple-faces` - Log violation
- `GET /api/proctoring/face-detection/session/{session_id}/summary` - Get summary
- `GET /api/proctoring/face-detection/session/{session_id}/detections` - Get detections

### Browser Compatibility Endpoints
- `POST /api/proctoring/browser-compatibility/check` - Check compatibility
- `POST /api/proctoring/browser-compatibility/violation` - Log violation
- `GET /api/proctoring/browser-compatibility/session/{session_id}/status` - Get status
- `GET /api/proctoring/browser-compatibility/supported-browsers` - Get supported browsers

## Benefits of This Implementation

### 1. **Scalability**
- Features can be added/removed independently
- No impact on existing features when adding new ones
- Easy to scale individual features

### 2. **Maintainability**
- Clear separation of concerns
- Easy to debug and test individual features
- Self-contained documentation

### 3. **Reusability**
- Features can be used in other applications
- No code duplication across projects
- Consistent API patterns

### 4. **Flexibility**
- Mix and match features as needed
- Customize individual features without affecting others
- Easy to extend with new functionality

## Testing Individual Features

### Backend Testing
```python
# Test camera permission feature
from app.features.camera_permission.services import CameraPermissionService

def test_camera_permission():
    result = CameraPermissionService.log_permission_event(
        db, session_id=1, permission_granted=True
    )
    assert result.session_id == 1
    assert result.permission_granted == True
```

### Frontend Testing
```javascript
// Test camera permission hook
import { renderHook } from '@testing-library/react';
import { useCameraPermissionMonitor } from './camera_permission_check';

test('camera permission monitoring', () => {
  const { result } = renderHook(() => useCameraPermissionMonitor(1, true));
  expect(result.current.hasPermission).toBeDefined();
});
```

## Migration Guide

### From Monolithic to Modular
1. **Identify Features**: Break down existing code into logical features
2. **Extract Models**: Move database models to feature folders
3. **Extract Services**: Move business logic to feature services
4. **Extract Routes**: Create feature-specific API routes
5. **Extract Components**: Move frontend components to feature folders
6. **Update Imports**: Update all import statements
7. **Test Features**: Test each feature independently

### Best Practices
- Keep features completely independent
- Use clear naming conventions
- Document all dependencies
- Provide usage examples
- Include error handling
- Add comprehensive tests

## Conclusion

This modular implementation provides a robust foundation for scalable proctoring systems. Each feature is self-contained, well-documented, and can be easily reused in other applications. The clear separation of concerns makes the system maintainable and extensible.

For questions or contributions, please refer to the individual feature documentation or contact the development team. 