# Modular Violation System Documentation

## Overview

This document explains the **completely modular violation logging system** that ensures each feature is independent and can be copied to other applications without any dependencies.

## Problem Solved

**Before**: Mixed violation logging systems
- Global violation system (`backend/app/models/violation.py`) - NOT modular
- Feature-specific systems - MODULAR but some dependencies remained

**After**: Completely modular violation system
- Each feature has its own independent violation table
- No dependencies on global violation system
- Features can be copied to other applications without any changes

## Architecture

### 1. Base Violation Class
```python
# backend/app/features/shared/base_violation.py
class BaseViolation(Base):
    __abstract__ = True
    
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, nullable=False, index=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    violation_type = Column(String(50), nullable=False)
    details = Column(Text, nullable=True)
    filepath = Column(String(500), nullable=True)
```

### 2. Feature-Specific Violation Models
Each feature extends the base class and adds its own fields:

```python
# backend/app/features/lighting_analysis/models.py
class LightingViolation(BaseViolation):
    __tablename__ = "lighting_violations"
    
    # Feature-specific fields
    brightness_level = Column(Float, nullable=True)
    lighting_condition = Column(String(50), nullable=True)
```

### 3. Independent Feature Services
Each feature handles its own violation logging:

```python
# backend/app/features/lighting_analysis/services.py
class LightingAnalysisService:
    @staticmethod
    def log_lighting_violation(db: Session, request: LightingViolationRequest):
        # Completely independent violation logging
        violation_entry = LightingViolation(
            session_id=request.session_id,
            violation_type="lighting_violation",
            details=json.dumps(violation_details),
            filepath=request.screenshot_path,
            brightness_level=request.brightness_level,
            lighting_condition=request.lighting_condition
        )
        db.add(violation_entry)
        db.commit()
```

## Complete Feature Independence

### Each Feature Contains:
1. **Models** (`models.py`) - Feature-specific violation table
2. **Schemas** (`schemas.py`) - Request/response validation
3. **Services** (`services.py`) - Business logic and violation logging
4. **Routes** (`routes.py`) - API endpoints
5. **Frontend Hooks** (`index.js`) - React hooks for monitoring
6. **Frontend Components** - Warning and status components

### No Dependencies On:
- Global violation system (`backend/app/models/violation.py`)
- Global violation service (`backend/app/services/violation_service.py`)
- Global violation routes (`backend/app/routes/proctoring_api.py`)

## Feature List with Modular Violation Tables

| Feature | Violation Table | Status |
|---------|----------------|--------|
| 1. Camera Permission | `camera_permission_violations` | ✅ Modular |
| 2. Microphone Permission | `microphone_permission_violations` | ✅ Modular |
| 3. Browser Compatibility | `browser_compatibility_logs` | ✅ Modular |
| 4. Multiple Face Detection | `multiple_faces_violations` | ✅ Modular |
| 5. Tab Switching Control | `tab_switching_violations` | ✅ Modular |
| 6. Window Blur Control | `window_blur_violations` | ✅ Modular |
| 7. Full Screen Enforcement | `fullscreen_exit_violations` | ✅ Modular |
| 8. Lighting Analysis | `lighting_violations` | ✅ Modular |
| 9. Gaze Tracking Analysis | `gaze_violations` | ✅ Modular |
| 10. Behavioral Anomaly | `behavioral_anomalies` | ❌ Not implemented |
| 11. Audio Monitoring | `audio_violations` | ✅ Modular |
| 12. Permission Enable Log | `proctor_permission_logs` | ✅ Modular |

## Copy-Paste Independence

### To Copy a Feature to Another Application:

1. **Copy the entire feature folder**:
   ```
   backend/app/features/lighting_analysis/
   ├── __init__.py
   ├── models.py
   ├── schemas.py
   ├── services.py
   └── routes.py
   ```

2. **Copy the frontend feature folder**:
   ```
   frontend/src/features/proctoring/lighting_analysis/
   └── index.js
   ```

3. **Add to the new application's main.py**:
   ```python
   from app.features.lighting_analysis.routes import router as lighting_analysis_router
   app.include_router(lighting_analysis_router)
   ```

4. **That's it!** The feature will work completely independently.

## Migration Script

The migration script ensures all features have their own violation tables:

```python
# backend/app/features/shared/modular_violation_migration.py
python -m app.features.shared.modular_violation_migration
```

This script:
1. Creates feature-specific violation tables
2. Verifies modular violation system
3. Migrates any existing global violations to modular tables

## API Endpoints

Each feature has its own independent API endpoints:

### Lighting Analysis
- `POST /api/proctoring/lighting-analysis/violation`
- `GET /api/proctoring/lighting-analysis/session/{session_id}/violations`
- `GET /api/proctoring/lighting-analysis/session/{session_id}/status`
- `GET /api/proctoring/lighting-analysis/session/{session_id}/summary`

### Gaze Tracking
- `POST /api/proctoring/gaze-tracking/violation`
- `GET /api/proctoring/gaze-tracking/session/{session_id}/violations`
- `GET /api/proctoring/gaze-tracking/session/{session_id}/status`
- `GET /api/proctoring/gaze-tracking/session/{session_id}/summary`

### Audio Monitoring
- `POST /api/proctoring/audio-monitoring/violation`
- `GET /api/proctoring/audio-monitoring/session/{session_id}/violations`
- `GET /api/proctoring/audio-monitoring/session/{session_id}/status`
- `GET /api/proctoring/audio-monitoring/session/{session_id}/summary`

### Permission Logging
- `POST /api/proctoring/permission-logging/log`
- `GET /api/proctoring/permission-logging/session/{session_id}/permissions`
- `GET /api/proctoring/permission-logging/session/{session_id}/status`
- `GET /api/proctoring/permission-logging/session/{session_id}/summary`

## Frontend Usage

Each feature provides its own React hooks and components:

```javascript
// Lighting Analysis
import { useLightingAnalysis, LightingWarning } from './features/proctoring/lighting_analysis';
const { currentBrightness, lightingCondition, logViolation } = useLightingAnalysis(sessionId);

// Gaze Tracking
import { useGazeTracking, GazeWarning } from './features/proctoring/gaze_tracking_analysis';
const { isLookingAtScreen, gazeDirection, logViolation } = useGazeTracking(sessionId);

// Audio Monitoring
import { useAudioMonitoring, AudioWarning } from './features/proctoring/audio_monitoring';
const { audioLevel, audioType, logViolation } = useAudioMonitoring(sessionId);

// Permission Logging
import { usePermissionLogging, PermissionStatus } from './features/proctoring/permission_logging';
const { permissions, logPermission } = usePermissionLogging(sessionId);
```

## Benefits Achieved

1. **Complete Independence**: Each feature can be copied to other applications
2. **No Dependencies**: No reliance on global violation system
3. **Self-Contained**: Each feature has its own database table, API, and frontend components
4. **Scalable**: Easy to add/remove features without affecting others
5. **Maintainable**: Clear separation of concerns
6. **Reusable**: Features can be used in different applications

## Verification

To verify that a feature is completely modular:

1. **Check for imports**: No imports from global violation system
2. **Check database**: Feature has its own violation table
3. **Check API**: Feature has its own API endpoints
4. **Check frontend**: Feature has its own React hooks and components
5. **Test isolation**: Feature works when copied to another application

## Conclusion

The modular violation system ensures that **each feature is completely independent** and can be copied to other applications without any modifications. This achieves the goal of true modularity where features are self-contained and reusable. 