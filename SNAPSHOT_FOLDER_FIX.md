# Screenshot and Snapshot Folder Structure Fix

## Problem Description
The proctoring system was storing two types of images:
1. **Webcam screenshots** in `screenshots/test_{sessionId}` folders (working correctly)
2. **Screen snapshots** in `snapshots/` folders, but always starting from `test_1` instead of using the current session ID

## Root Cause
The screenshot service was using `test_id` instead of `session_id` to create folder names, and there were hardcoded references to `test_1` in setup scripts.

## Changes Made

### 1. Backend API Changes (`backend/app/routes/proctoring_api.py`)
- **Modified `ScreenshotRequest` model**: Added `session_id` field alongside `test_id`
- **Updated `start_screenshot_service` endpoint**: Now uses `session_id` instead of `test_id` for starting the screenshot service
- **Validation**: Now requires `session_id` instead of `test_id`

### 2. Screenshot Service Changes (`backend/app/services/screenshot.py`)
- **Renamed variables**: `current_test_id` → `current_session_id`
- **Updated folder creation**: Now creates `media/snapshots/test_{session_id}` folders
- **Updated logging**: All log messages now reference session IDs instead of test IDs
- **Method updates**: `start_for_test()` now takes `session_id` parameter

### 3. Frontend API Changes (`frontend/src/api/api.js`)
- **Updated `startScreenshotService`**: Now requires only `session_id` as mandatory parameter
- **Backward compatibility**: Still accepts `test_id` for compatibility but uses `session_id` as primary identifier

### 4. Monitoring Routes (`backend/app/routes/monitoring.py`)
- **Updated `/save-snapshot` endpoint**: Now prefers `sessionId` over `test_id` for folder naming
- **Added `test_` prefix**: Ensures consistent folder structure `test_{sessionId}`
- **Updated `/capture` endpoint**: Also uses `test_` prefix for consistency

### 5. Setup Script Changes
- **`backend/setup_webcam_storage.py`**: Removed hardcoded `test_1` directory creation
- **`backend/app/routes/test_route.py`**: Removed default `test_1` directory creation
- **Updated documentation**: Now indicates that test-specific directories are created dynamically

## Result
Now both webcam screenshots and screen snapshots will be stored in folders named `test_{current_sessionId}`:

### Before:
```
media/
├── screenshots/test_{sessionId}/    ✅ (was working correctly)
└── snapshots/test_1/                ❌ (always used test_1)
```

### After:
```
media/
├── screenshots/test_{sessionId}/    ✅ (still working correctly)
└── snapshots/test_{sessionId}/      ✅ (now uses correct session ID)
```

## Testing
To verify the fix works:
1. Start a test session
2. Check that both `screenshots/test_{sessionId}` and `snapshots/test_{sessionId}` folders are created
3. Verify that images are stored in the correct session-specific folders
4. Start multiple test sessions and confirm each gets its own folder

## Backward Compatibility
- The changes maintain backward compatibility
- Existing `test_id` parameters are still accepted but `session_id` takes precedence
- No breaking changes to existing API contracts
