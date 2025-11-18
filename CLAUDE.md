# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

VisionTrack is a video analysis application using microservices architecture with Docker. It detects and counts people in user-defined zones using YOLOv8n.

## Architecture

The project consists of 3 independent microservices:

1. **Frontend** (React.js, port 3000): User interface for video upload, zone selection, and results visualization
2. **Backend** (FastAPI, port 8000): Orchestrates uploads, analysis requests, and stores results
3. **IA Service** (FastAPI + YOLOv8n, port 8001): Performs person detection in videos

Communication:
- Frontend → Backend: HTTP requests for uploads and analysis
- Backend → IA Service: HTTP requests for detection (via Docker network)
- Backend ↔ IA Service: Shared Docker volume for video files

## Key Commands

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
docker exec -it visiontrack-backend pytest

# Test individual endpoint
curl http://localhost:8000/

# Test IA service
curl http://localhost:8001/health
```

### Clean up

```bash
# Remove containers, networks
docker-compose down

# Remove containers, networks, AND volumes (deletes uploaded videos)
docker-compose down -v

# Full cleanup including images
docker-compose down --rmi all
```

## Project Structure

- `frontend/`: React.js application
  - `src/pages/UploadPage.js`: Video upload and zone selection
  - `src/pages/ResultsPage.js`: Analysis results display

- `backend/`: FastAPI orchestration service
  - `main.py`: All API endpoints and business logic
  - Endpoints: `/upload-video`, `/analyze`, `/results/{id}`, `/videos/{id}`

- `ia-service/`: YOLOv8n detection service
  - `main.py`: Detection logic with OpenCV and YOLO
  - Endpoint: `/detect`

- `docker-compose.yml`: Service orchestration
- Shared volume: `/app/shared` for video storage between backend and IA service

## Important Implementation Details

### Zone Selection (Frontend)
The zone selection uses HTML5 Canvas overlay on the video element. Users draw a rectangle by click-and-drag. The zone coordinates are sent to the backend in video pixel space.

### Detection Flow
1. User uploads video → Backend stores it with UUID
2. User defines zone on canvas → Coordinates captured
3. Frontend calls `/analyze` → Backend calls IA Service `/detect`
4. IA Service processes video frame-by-frame:
   - Runs YOLOv8n on each frame
   - Filters detections to only include people (class 0)
   - Further filters by checking if bounding box center is within the defined zone
5. Backend calculates statistics from all detections
6. Results stored as JSON and returned to frontend

### Statistics Calculation
- `total_people`: Sum of all person detections across all frames (no tracking, may count same person multiple times)
- `max_people_simultaneous`: Maximum number of people detected in a single frame
- `frame_of_max`: Frame number where the maximum occurred

### File Storage
- Videos: `/app/shared/uploads/<video_id>.<extension>`
- Results: `/app/shared/results/<video_id>.json`
- Shared between backend and IA service via Docker volume

## Dependencies

### Frontend
- React 18.2.0
- react-router-dom 6.20.0
- axios 1.6.2

### Backend
- FastAPI 0.104.1
- uvicorn 0.24.0
- httpx 0.25.2 (for calling IA service)
- python-multipart (for file uploads)

### IA Service
- FastAPI 0.104.1
- ultralytics 8.0.228 (YOLOv8n)
- opencv-python-headless 4.8.1.78
- numpy 1.24.3

## Common Development Scenarios

### Adding a new endpoint
1. Add endpoint function in `backend/main.py` or `ia-service/main.py`
2. Define Pydantic models for request/response validation
3. Update README.md with endpoint documentation
4. Restart the service: `docker-compose restart <service>`

### Modifying detection logic
1. Edit `ia-service/main.py` in the `/detect` endpoint
2. The service has `--reload` enabled, changes apply automatically
3. Test with: `docker-compose logs -f ia-service`

### Changing YOLO model
1. Update model name in `ia-service/main.py`: `model = YOLO('yolov8s.pt')`
2. Update Dockerfile to pre-download the new model
3. Rebuild: `docker-compose up --build ia-service`

### Frontend changes
React hot-reload is enabled. Just save files and the browser will update automatically.

## Troubleshooting

### "Port already in use"
Modify ports in `docker-compose.yml` under the `ports:` section for the conflicting service.

### "Cannot connect to backend from frontend"
1. Check `REACT_APP_API_URL` in `frontend/.env`
2. Ensure backend is running: `docker-compose logs backend`
3. Verify CORS settings in `backend/main.py`

### "Video not found" in IA service
The backend and IA service must share the volume. Check `docker-compose.yml` that both services mount `shared-data:/app/shared`.

### Slow detection
- YOLOv8n is optimized for speed. For better accuracy at cost of speed, use YOLOv8s or YOLOv8m
- To use GPU, uncomment the deploy section in `docker-compose.yml` for ia-service
- Process fewer frames: modify detection loop to skip frames (e.g., process every 3rd frame)

## Code Style

- Python: Follow PEP 8, use type hints
- JavaScript: ES6+, functional components with hooks
- Comments: In French for user-facing messages, English for technical documentation
- All functions and endpoints have docstrings explaining parameters and returns

## Security Notes

This is a development setup with relaxed security:
- CORS allows all origins (`allow_origins=["*"]`)
- No authentication on endpoints
- No file size limits on uploads
- No validation of uploaded video format beyond MIME type

For production, implement:
- Proper CORS configuration
- Authentication (JWT tokens)
- File size limits
- Video format validation
- HTTPS with certificates
