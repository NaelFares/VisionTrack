# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VisionTrack is a video analysis application using microservices architecture with Docker. It detects and counts people in user-defined zones using YOLOv8n with ByteTrack tracking.

## Architecture

The project consists of 3 independent microservices:

1. **Frontend** (React.js, port 3000): User interface for video upload, zone selection, and results visualization
2. **Backend** (FastAPI, port 8000): Orchestrates uploads, analysis requests, calculates statistics, and stores results
3. **IA Service** (FastAPI + YOLOv8n + ByteTrack, port 8001): Performs person detection and tracking in videos

Communication:
- Frontend → Backend: HTTP requests for uploads and analysis
- Backend → IA Service: HTTP requests for detection (via Docker network)
- Backend ↔ IA Service: Shared Docker volume `/app/shared` for video files

## Key Commands

### Quick Start

```bash
# Windows
start.bat

# Linux/Mac
./start.sh
```

The scripts automatically:
- Check Docker Desktop is running
- Create `.env` from `.env.example`
- Stop existing services and **clean all volumes** (`docker-compose down -v`)
- Build all services
- Start in detached mode
- Display service URLs

**Note**: Volume cleanup (`-v` flag) prevents accumulation of orphaned Docker volumes.

### Development

```bash
# Build all services (first time only)
docker-compose build

# Start all services
docker-compose up

# Start in detached mode
docker-compose up -d

# Stop all services
docker-compose down

# Rebuild specific service
docker-compose up --build <service_name>

# View logs
docker-compose logs -f <service_name>

# Enter a container
docker exec -it visiontrack-<service_name> bash
```

### Testing

```bash
# Test backend
curl http://localhost:8000/

# Test IA service
curl http://localhost:8001/health

# Test upload
curl -X POST http://localhost:8000/upload-video -F "file=@test.mp4"
```

### Clean up

```bash
# Remove containers, networks
docker-compose down

# Remove containers, networks, AND volumes (recommended)
docker-compose down -v

# Full cleanup including images
docker-compose down --rmi all

# Clean orphaned volumes
docker volume prune
```

### Docker Volume Management

**Zero-Storage Policy**: VisionTrack implements automatic cleanup to prevent storage accumulation.

**Volume Types**:
1. **`visiontrack_shared-data`** (named volume): Always empty due to automatic cleanup
2. **Anonymous volumes** (`/app/node_modules`): Created for each container

**Preventing Accumulation**:
- `start.bat` and `start.sh` use `docker-compose down -v` to clean volumes on each run
- Frontend automatically calls `DELETE /analysis/{id}` after downloading files
- Backend deletes original videos immediately after analysis

**Manual Cleanup** (if volumes accumulate):
```bash
# List all volumes
docker volume ls

# Remove unused volumes
docker volume prune

# Check volume disk usage
docker system df
```

**Expected State**: All `/app/shared/` subdirectories (uploads, annotated, results) should remain empty (~0 MB) after each analysis.

## Project Structure

```
VisionTrack/
├── frontend/               # React.js application
│   └── src/
│       ├── pages/
│       │   ├── UploadPage.js    # Video upload and zone selection
│       │   ├── UploadPage.css
│       │   ├── ResultsPage.js   # Analysis results with timeline
│       │   └── ResultsPage.css
│       ├── config.js            # Centralized configuration (API_URL, constants, messages)
│       ├── App.js               # Main component + navigation
│       ├── index.js
│       └── index.css            # Global styles (nav, cards, etc.)
│
├── backend/                # FastAPI orchestration service
│   ├── main.py             # All API endpoints + statistics calculation
│   └── requirements.txt
│
├── ia-service/             # YOLOv8n + ByteTrack service
│   ├── main.py             # Detection + tracking logic
│   ├── bytetrack.yaml      # Default ByteTrack config (used)
│   ├── bytetrack_custom.yaml  # Custom config (available but not used)
│   └── requirements.txt
│
├── docker-compose.yml      # Service orchestration
├── .env                    # Environment variables (gitignored)
├── .env.example            # Environment template
├── start.bat               # Windows startup script
├── start.sh                # Linux/Mac startup script
├── README.md               # User documentation (non-technical)
├── DOCUMENTATION.md        # Technical documentation
└── CLAUDE.md               # This file
```

## Configuration Management

### Centralized Configuration (`frontend/src/config.js`)

**Purpose**: All configuration constants, API URLs, and messages are centralized in a single file to follow the DRY (Don't Repeat Yourself) principle and Single Source of Truth pattern.

**File location**: `frontend/src/config.js`

**What it contains**:
- `API_URL`: Backend API base URL (reads from `.env` with fallback)
- `ENDPOINTS`: All API endpoint paths (UPLOAD, ANALYZE, RESULTS, ANNOTATED_VIDEO, DELETE_ANALYSIS)
- `DEFAULT_FPS`: Default frames per second fallback (30) - actual FPS comes from backend
- `ERROR_MESSAGES`: Standardized error messages
- `SUCCESS_MESSAGES`: Standardized success messages
- `REDIRECT_DELAY`: Delay before redirecting after analysis (ms)
- `ZONE_COLORS`: Colors for zone drawing on canvas (STROKE, FILL, POINT_OUTER, POINT_INNER)
- `ZONE_CONFIG`: Canvas configuration (LINE_WIDTH, POINT_RADIUS)

**Usage in components**:
```javascript
// Import what you need
import { API_URL, ENDPOINTS, ERROR_MESSAGES, ZONE_COLORS, ZONE_CONFIG } from '../config';

// API calls use ENDPOINTS (not hardcoded URLs)
axios.post(`${API_URL}${ENDPOINTS.UPLOAD}`, formData);
axios.get(`${API_URL}${ENDPOINTS.RESULTS}/${videoId}`);

// Canvas drawing uses centralized colors/config
ctx.strokeStyle = ZONE_COLORS.STROKE;
ctx.lineWidth = ZONE_CONFIG.LINE_WIDTH;

// Error handling uses standardized messages
setError(ERROR_MESSAGES.UPLOAD_FAILED);
```

**Benefits**:
- ✅ Single source of truth (change once, applies everywhere)
- ✅ No hardcoded URLs or magic values in components
- ✅ Easier maintenance (change endpoint = 1 file edit)
- ✅ Consistent error messages and UI styling
- ✅ Environment variables read only once

**Important**: Always use `ENDPOINTS` constants instead of hardcoded URL paths. This was enforced through a refactoring that eliminated all hardcoded URLs from UploadPage.js and ResultsPage.js.

**Relationship with `.env`**:
- `.env` file stores environment-specific values (external configuration)
- `config.js` reads from `.env` and provides fallback defaults (code-level configuration)
- Both are complementary, not redundant

## Important Implementation Details

### ByteTrack Tracking System

**Key Feature**: VisionTrack uses ByteTrack (integrated in Ultralytics YOLO) to assign unique `track_id` to each person throughout the video.

**Configuration** (`ia-service/main.py:210-217`):
```python
track_generator = yolo_model.track(
    source=video_path,
    stream=True,
    persist=True,              # Keep track_ids stable within video
    tracker=TRACKER_CONFIG,    # bytetrack.yaml (from .env)
    conf=CONFIDENCE_THRESHOLD  # 0.5 default (from .env)
)
```

**Tracker Reset** (`ia-service/main.py:351-354`):
At the end of each analysis, the tracker is reset so track_ids restart from 1 for the next video:
```python
if hasattr(yolo_model, 'predictor') and hasattr(yolo_model.predictor, 'trackers'):
    if len(yolo_model.predictor.trackers) > 0:
        yolo_model.predictor.trackers = []
```

### Zone Selection (Frontend)

The zone selection uses HTML5 Canvas overlay on the video element. Users can:
- Choose "Vidéo entière" mode (no zone filtering)
- Choose "Zone spécifique" mode and draw a rectangle by click-and-drag
- Zone coordinates are sent to backend in video pixel space

### Detection Flow

1. **Upload**: User uploads video → Backend stores it in `/app/shared/uploads/<uuid>.<ext>`
2. **Zone Selection**: User defines zone on canvas (or selects full video mode)
3. **Analysis**: Frontend calls `/analyze` → Backend calls IA Service `/detect`
4. **IA Processing**:
   - Runs YOLOv8n + ByteTrack on each frame
   - Filters detections to only include people (class 0)
   - If zone defined: filters by checking if bounding box center is within zone
   - Assigns `track_id` to each person (persistent across frames)
   - Generates annotated video with bounding boxes + track_ids
   - Saves annotated video to `/app/shared/annotated/<uuid>_annotated.mp4`
5. **Statistics**: Backend calculates statistics with track_id filtering
6. **Storage**:
   - Results saved as JSON in `/app/shared/results/<uuid>.json`
   - **Original video deleted** to save space
7. **Cleanup**: Frontend downloads video + JSON as blobs, then calls `DELETE /analysis/{id}`

### Statistics Calculation (backend/main.py:calculate_statistics)

**With ByteTrack filtering**:
```python
MIN_FRAMES_THRESHOLD = 20  # ~0.7 sec at 30 FPS
```

- `total_people`: Number of unique `track_id` that appear ≥ 20 frames
  - Eliminates short-lived false positives
  - Eliminates temporary ID reassignments
- `max_people_simultaneous`: Maximum number of people detected in a single frame
- `frame_of_max`: Frame number where the maximum occurred

**Example**:
```
Track ID 1: 98 frames  → Counted ✓
Track ID 2: 15 frames  → Filtered ✗ (< 20)
Track ID 3: 125 frames → Counted ✓

total_people = 2
```

### File Storage Lifecycle

```
/app/shared/
├── uploads/                    # Ephemeral: deleted after analysis
│   └── <video_id>.<ext>
├── annotated/                  # Ephemeral: deleted after download
│   └── <video_id>_annotated.mp4
└── results/                    # Ephemeral: deleted after download
    └── <video_id>.json
```

**Lifecycle** (All files are ephemeral - zero persistent storage):
1. Upload → `uploads/video.mp4` (temporary)
2. Analysis → `annotated/video_annotated.mp4` + `results/video.json` (temporary)
3. Cleanup #1 (auto) → `uploads/video.mp4` deleted by backend immediately after analysis
4. Frontend → Downloads both files as Blobs (stored in browser memory)
5. Cleanup #2 (auto) → `DELETE /analysis/{id}` called automatically after blobs created
6. Result → All Docker volumes remain empty (~0 MB persistent storage)

### Frontend Blobs System

To allow access even after server cleanup, frontend creates local blobs:

```javascript
// ResultsPage.js: Video blob
const response = await fetch(`${API_URL}/annotated-videos/${videoId}`);
const blob = await response.blob();
const videoBlobUrl = URL.createObjectURL(blob);

// ResultsPage.js: JSON blob
const jsonBlob = new Blob([JSON.stringify(results, null, 2)],
                         { type: 'application/json' });
const jsonBlobUrl = URL.createObjectURL(jsonBlob);
```

### Interactive Timeline

**Features** (`frontend/src/pages/ResultsPage.js`):
- Visual bar chart of detections per frame
- Click on any bar to jump to that frame in the video
- Scroll to video automatically when clicking timeline
- Timestamp markers (0:00, 0:15, 0:30, etc.)
- Peak frame highlighted in different color

## API Endpoints

### Backend (Port 8000)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| POST | `/upload-video` | Upload video (returns `video_id`) |
| POST | `/analyze` | Launch analysis (requires `video_id`, optional `zone`) |
| GET | `/results/{video_id}` | Get statistics + detections JSON |
| GET | `/annotated-videos/{video_id}` | Stream annotated video (H.264) |
| DELETE | `/analysis/{video_id}` | Delete annotated video + results JSON |

### IA Service (Port 8001)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| GET | `/health` | Detailed status (model loaded, config) |
| POST | `/detect` | Detect + track people (requires `video_path`, optional `zone`) |

## Environment Variables (.env)

### Key Variables:
```env
# IA Service
YOLO_MODEL=yolov8n.pt                    # Model: yolov8n/s/m/l/x
VIDEO_CODEC=H264                         # H264, MP4V, AVC1, X264
CONFIDENCE_THRESHOLD=0.5                 # Detection threshold (0.0-1.0)
TRACKER_CONFIG=bytetrack.yaml            # ByteTrack config file

# Backend
IA_SERVICE_URL=http://ia-service:8001
MAX_VIDEO_SIZE_MB=500

# Frontend
REACT_APP_API_URL=http://localhost:8000
```

## Common Development Scenarios

### Adjusting Detection Sensitivity

**In `.env`**:
```env
CONFIDENCE_THRESHOLD=0.6  # Stricter (fewer detections)
CONFIDENCE_THRESHOLD=0.4  # More permissive (more detections)
```

**In `backend/main.py`**:
```python
MIN_FRAMES_THRESHOLD = 30  # Filter more aggressively
MIN_FRAMES_THRESHOLD = 10  # Be more permissive
```

### Changing YOLO Model

1. Update `.env`: `YOLO_MODEL=yolov8s.pt` (s/m/l/x for better accuracy)
2. Rebuild: `docker-compose up --build ia-service`

### Modifying Tracker Config

1. Edit `ia-service/bytetrack_custom.yaml`
2. Update `.env`: `TRACKER_CONFIG=bytetrack_custom.yaml`
3. Restart: `docker-compose restart ia-service`

### Frontend Changes

React hot-reload is enabled. Just save files and the browser will update automatically.

### Backend/IA Service Changes

Both have `--reload` enabled. Changes apply automatically when you save.

## UX Features

### Upload Page
- **Dual loading states**: `uploadLoading` and `analyzeLoading` (separate states)
- **Upload button**: Shows "Upload en cours..." → "Vidéo uploadée ✓" → Disabled
- **Analysis overlay**: Full-screen loading overlay with spinner during analysis
- **Mode selection**: Radio buttons for "Vidéo entière" vs "Zone spécifique"

### Results Page
- **Timeline interaction**: Click bars to jump to frame + auto-scroll to video
- **Timestamp markers**: Time displayed under timeline (0:00, 0:15, etc.)
- **Export buttons**: Download video and JSON results
- **Automatic cleanup**: Calls DELETE endpoint after blobs are created

### Navigation
- **Navbar layout**: Title left, buttons center (responsive on mobile)
- **Glassmorphism design**: Modern UI with blur effects and gradients

## Troubleshooting

### "Port already in use"
Modify ports in `docker-compose.yml` under the `ports:` section for the conflicting service.

### "Cannot connect to backend from frontend"
1. Check `REACT_APP_API_URL` in `frontend/.env`
2. Ensure backend is running: `docker-compose logs backend`
3. Verify CORS settings in `backend/main.py` (`allow_origins`)

### "Video not found" in IA service
The backend and IA service must share the volume. Check `docker-compose.yml` that both services mount `shared-data:/app/shared`.

### Tracker giving inconsistent IDs
- Check that `persist=True` in `ia-service/main.py`
- Verify tracker is reset between analyses (check reset code)
- Adjust `MIN_FRAMES_THRESHOLD` if too many short tracks

### Slow detection
- YOLOv8n is optimized for speed. For better accuracy at cost of speed, use YOLOv8s or YOLOv8m
- To use GPU, uncomment the deploy section in `docker-compose.yml` for ia-service
- Reduce video resolution before upload
- Use MP4V instead of H264 (faster encoding, less compatibility)

### Docker Desktop not starting (Windows)
The `start.bat` script automatically detects and launches Docker Desktop if needed. If it fails:
1. Manually launch Docker Desktop
2. Wait for it to fully start (blue whale icon in system tray)
3. Run `start.bat` again

## Documentation

- **README.md**: User-friendly guide for non-technical users
- **DOCUMENTATION.md**: Complete technical documentation (architecture, API, flows)
- **CLAUDE.md**: This file - development guidance for Claude Code

## Code Style

- Python: Follow PEP 8, use type hints
- JavaScript: ES6+, functional components with hooks
- Comments: In French for user-facing messages, English for technical documentation
- All functions and endpoints have docstrings explaining parameters and returns

## Security Notes

This is a development setup with relaxed security:
- CORS allows all origins (`allow_origins=["*"]`)
- No authentication on endpoints
- No file size limits strictly enforced
- No validation of uploaded video format beyond MIME type

For production, implement:
- Proper CORS configuration (specific domains)
- Authentication (JWT tokens or API keys)
- File size limits enforcement
- Video format validation
- HTTPS with certificates
- Rate limiting
- Input sanitization

## Performance Notes

**Typical metrics** (1920x1080, 30 FPS, 1 minute video, i7 CPU):
- Upload: 5-10 seconds
- Analysis: 2-5 minutes
- Annotated video generation: 1-2 minutes

**Optimizations**:
- Use GPU for 10-20x speedup (requires NVIDIA GPU + nvidia-docker)
- Skip frames during analysis (process every 2nd or 3rd frame)
- Reduce video resolution before upload
- Use lighter model (YOLOv8n already the lightest)
