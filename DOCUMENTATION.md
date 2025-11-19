# Documentation Technique - VisionTrack

Documentation technique complète pour développeurs et administrateurs système.

## Table des matières

1. [Architecture](#architecture)
2. [Flux de données](#flux-de-données)
3. [Routes API](#routes-api)
4. [Ports et Communication](#ports-et-communication)
5. [Modèle IA et Tracking](#modèle-ia-et-tracking)
6. [Stockage des Données](#stockage-des-données)
7. [Configuration](#configuration)
8. [Développement](#développement)

---

## Architecture

VisionTrack utilise une architecture microservices avec 3 services Docker indépendants :

```
┌─────────────────────┐
│     Frontend        │
│     React.js        │
│     Port 3000       │
└──────────┬──────────┘
           │ HTTP
           ▼
┌─────────────────────┐      ┌─────────────────────┐
│     Backend         │      │    IA Service       │
│     FastAPI         │─────▶│    YOLOv8n          │
│     Port 8000       │ HTTP │    Port 8001        │
└──────────┬──────────┘      └──────────┬──────────┘
           │                            │
           └────────────┬───────────────┘
                        │
                 ┌──────▼───────┐
                 │ Volume Docker│
                 │ shared-data  │
                 └──────────────┘
```

### Composants

#### Frontend (React.js)
- **Technologie** : React 18.2.0
- **Rôle** : Interface utilisateur
- **Port** : 3000
- **Dépendances principales** :
  - `react-router-dom` : Navigation entre pages
  - `axios` : Requêtes HTTP vers le backend

#### Backend (FastAPI)
- **Technologie** : FastAPI 0.104.1 (Python 3.11)
- **Rôle** : Orchestration, API REST, calcul des statistiques
- **Port** : 8000
- **Dépendances principales** :
  - `fastapi` : Framework web
  - `uvicorn` : Serveur ASGI
  - `httpx` : Client HTTP pour appeler l'IA Service
  - `python-multipart` : Gestion des uploads

#### IA Service (YOLOv8n)
- **Technologie** : FastAPI + Ultralytics YOLOv8n (Python 3.11)
- **Rôle** : Détection et tracking des personnes
- **Port** : 8001
- **Dépendances principales** :
  - `ultralytics` : Framework YOLO
  - `opencv-python-headless` : Traitement vidéo
  - `torch` : Deep learning (CPU uniquement par défaut)

---

## Flux de Données

### 1. Upload de Vidéo

```
Frontend                Backend                    Volume Docker
   │                       │                            │
   │──── POST /upload ────▶│                            │
   │     (FormData)        │                            │
   │                       │──── Sauvegarde ──────────▶│
   │                       │     uploads/<uuid>.ext    │
   │◀──── video_id ────────│                            │
```

### 2. Analyse Vidéo

```
Frontend          Backend              IA Service           Volume Docker
   │                 │                      │                     │
   │── POST /analyze─▶│                     │                     │
   │   {video_id,    │                     │                     │
   │    zone}        │                     │                     │
   │                 │─── POST /detect ───▶│                     │
   │                 │   {video_path,      │                     │
   │                 │    zone}            │                     │
   │                 │                     │◀──── Lecture ───────│
   │                 │                     │    video_path       │
   │                 │                     │                     │
   │                 │                     │──── Écriture ──────▶│
   │                 │                     │    annotated.mp4    │
   │                 │                     │                     │
   │                 │◀─── detections ─────│                     │
   │                 │     + video_path    │                     │
   │                 │                     │                     │
   │                 │──── Calcul stats    │                     │
   │                 │──── Sauvegarde ────────────────────────▶│
   │                 │     results.json    │                     │
   │                 │──── Suppression ────────────────────────▶│
   │                 │     video originale │                     │
   │                 │                     │                     │
   │◀──── results ───│                     │                     │
```

### 3. Consultation des Résultats

```
Frontend                Backend                    Volume Docker
   │                       │                            │
   │── GET /results/{id} ─▶│                            │
   │                       │◀──── Lecture ──────────────│
   │                       │     results/<id>.json      │
   │◀──── JSON stats ──────│                            │
   │                       │                            │
   │── GET /annotated/{id}─▶│                            │
   │                       │◀──── Lecture ──────────────│
   │                       │     annotated/<id>.mp4     │
   │◀──── Video stream ────│                            │
   │                       │                            │
   │  (Téléchargement)     │                            │
   │  Création Blobs       │                            │
   │  locaux               │                            │
   │                       │                            │
   │─ DELETE /analysis/{id}▶│                            │
   │                       │──── Suppression ─────────▶│
   │                       │     annotated + results    │
```

---

## Routes API

### Backend (Port 8000)

#### GET `/`
**Description** : Health check du backend

**Réponse** :
```json
{
  "message": "VisionTrack Backend API",
  "version": "1.0.0",
  "status": "running"
}
```

#### POST `/upload-video`
**Description** : Upload une vidéo sur le serveur

**Body** : `multipart/form-data`
- `file` : Fichier vidéo (MP4, AVI, MOV, etc.)

**Réponse** :
```json
{
  "message": "Vidéo uploadée avec succès",
  "video_id": "550e8400-e29b-41d4-a716-446655440000",
  "filename": "surveillance.mp4"
}
```

#### POST `/analyze`
**Description** : Lance l'analyse d'une vidéo

**Body** :
```json
{
  "video_id": "550e8400-e29b-41d4-a716-446655440000",
  "zone": {
    "x1": 100,
    "y1": 100,
    "x2": 500,
    "y2": 500
  }
}
```
> Note : Le champ `zone` est optionnel. Si absent, analyse la vidéo entière.

**Réponse** :
```json
{
  "message": "Analyse terminée",
  "video_id": "550e8400-e29b-41d4-a716-446655440000",
  "stats": {
    "total_people": 12,
    "max_people_simultaneous": 4,
    "frame_of_max": 145
  }
}
```

#### GET `/results/{video_id}`
**Description** : Récupère les résultats d'analyse

**Réponse** :
```json
{
  "stats": {
    "total_people": 12,
    "max_people_simultaneous": 4,
    "frame_of_max": 145
  },
  "detections": [
    {
      "frame": 1,
      "boxes": [
        {
          "x1": 120.5,
          "y1": 200.3,
          "x2": 180.2,
          "y2": 350.8,
          "confidence": 0.87,
          "track_id": 1
        }
      ]
    }
  ]
}
```

#### GET `/annotated-videos/{video_id}`
**Description** : Stream la vidéo annotée

**Réponse** : Flux vidéo MP4 (H.264)

#### DELETE `/analysis/{video_id}`
**Description** : Supprime la vidéo annotée et les résultats JSON

**Réponse** :
```json
{
  "message": "Analyse supprimée avec succès",
  "deleted_files": ["annotated_video", "results_json"]
}
```

---

### IA Service (Port 8001)

#### GET `/`
**Description** : Health check du service IA

#### GET `/health`
**Description** : État détaillé du service IA

**Réponse** :
```json
{
  "status": "healthy",
  "model_loaded": true,
  "model_name": "YOLOv8n",
  "confidence_threshold": 0.5
}
```

#### POST `/detect`
**Description** : Détecte les personnes dans une vidéo

**Body** :
```json
{
  "video_path": "/app/shared/uploads/550e8400.mp4",
  "zone": {
    "x1": 100,
    "y1": 100,
    "x2": 500,
    "y2": 500
  }
}
```

**Réponse** :
```json
{
  "message": "Détection terminée avec succès",
  "total_frames": 300,
  "detections": [...],
  "annotated_video_path": "/app/shared/annotated/550e8400_annotated.mp4"
}
```

---

## Ports et Communication

### Ports Exposés

| Service | Port Interne | Port Externe | Protocole |
|---------|--------------|--------------|-----------|
| Frontend | 3000 | 3000 | HTTP |
| Backend | 8000 | 8000 | HTTP |
| IA Service | 8001 | 8001 | HTTP |

### Communication Inter-Services

**Frontend → Backend** : HTTP direct via `http://localhost:8000`

**Backend → IA Service** : HTTP via réseau Docker interne
```
http://ia-service:8001/detect
```

**Partage de Fichiers** : Volume Docker `shared-data`
- Backend : `/app/shared`
- IA Service : `/app/shared`

### Réseau Docker

Nom : `visiontrack-network` (créé automatiquement par Docker Compose)

Type : Bridge

---

## Modèle IA et Tracking

### YOLOv8n

**Modèle** : `yolov8n.pt` (nano - le plus léger)
- **Taille** : ~6 MB
- **Vitesse** : ~45 FPS sur CPU (i7)
- **Précision** : mAP 37.3% (COCO dataset)
- **Classes détectées** : 80 classes COCO (seule la classe 0 "person" est utilisée)

**Alternatives disponibles** :
- `yolov8s.pt` : Small (plus précis, plus lent)
- `yolov8m.pt` : Medium
- `yolov8l.pt` : Large
- `yolov8x.pt` : Extra-large

### ByteTrack - Tracking des Personnes

VisionTrack utilise **ByteTrack** (intégré à Ultralytics) pour suivre chaque personne avec un identifiant unique (`track_id`) à travers les frames.

**Configuration** (ia-service/main.py:210-217) :
```python
track_generator = yolo_model.track(
    source=video_path,
    stream=True,
    verbose=False,
    persist=True,              # Garde les IDs stables dans la vidéo
    tracker=TRACKER_CONFIG,    # bytetrack.yaml par défaut
    conf=CONFIDENCE_THRESHOLD  # 0.5 par défaut
)
```

**Fichier de configuration** : `ia-service/bytetrack.yaml` (par défaut Ultralytics)

**Reset automatique** : À la fin de chaque analyse, le tracker est réinitialisé pour que les track_ids repartent de 1.

```python
# ia-service/main.py:351-354
if hasattr(yolo_model, 'predictor') and hasattr(yolo_model.predictor, 'trackers'):
    if len(yolo_model.predictor.trackers) > 0:
        yolo_model.predictor.trackers = []
```

### Calcul des Statistiques

**Logique de comptage** (backend/main.py:calculate_statistics) :

1. **Comptage des track_ids** :
   - Compte les apparitions de chaque `track_id` à travers toute la vidéo

2. **Filtrage des tracks courts** :
   ```python
   MIN_FRAMES_THRESHOLD = 20  # ~0.7 sec à 30 FPS
   ```
   - Seuls les tracks apparaissant ≥ 20 frames sont comptés
   - Élimine les faux positifs et réassignations temporaires

3. **Statistiques calculées** :
   - `total_people` : Nombre de `track_id` uniques filtrés
   - `max_people_simultaneous` : Maximum de personnes dans un même frame
   - `frame_of_max` : Numéro de frame du pic

**Exemple** :
```python
Track ID 1: 98 frames  → Gardé ✓
Track ID 2: 15 frames  → Filtré ✗ (< 20)
Track ID 3: 125 frames → Gardé ✓

total_people = 2
```

### Filtrage par Zone

Si une zone est définie, le filtrage s'effectue sur le **point central** de chaque bounding box :

```python
# ia-service/main.py:253-258
center_x = (box.xyxy[0][0] + box.xyxy[0][2]) / 2
center_y = (box.xyxy[0][1] + box.xyxy[0][3]) / 2

if (zone['x1'] <= center_x <= zone['x2'] and
    zone['y1'] <= center_y <= zone['y2']):
    # Détection conservée
```

---

## Stockage des Données

### Arborescence du Volume Docker

```
/app/shared/
├── uploads/                    # Éphémère - Vidéos uploadées (supprimées après analyse)
│   └── <video_id>.<ext>       # Ex: 550e8400.mp4
│
├── annotated/                  # Éphémère - Vidéos annotées (supprimées après téléchargement)
│   └── <video_id>_annotated.mp4
│
└── results/                    # Éphémère - Résultats JSON (supprimés après téléchargement)
    └── <video_id>.json
```

**Note** : Tous les dossiers sont **éphémères** et restent vides grâce au nettoyage automatique.

### Cycle de Vie des Fichiers

1. **Upload** :
   - Vidéo sauvegardée dans `uploads/<video_id>.<ext>`

2. **Analyse** :
   - IA Service lit la vidéo depuis `uploads/`
   - IA Service écrit la vidéo annotée dans `annotated/`
   - Backend calcule les stats et sauvegarde dans `results/`
   - Backend **supprime** la vidéo originale de `uploads/`

3. **Consultation** :
   - Frontend télécharge la vidéo annotée et les résultats
   - Frontend crée des **Blobs locaux** dans le navigateur

4. **Nettoyage Automatique** :
   - Frontend télécharge les fichiers et crée des Blobs locaux
   - Frontend appelle **automatiquement** `DELETE /analysis/{video_id}` après création des Blobs
   - Backend supprime `annotated/<video_id>_annotated.mp4` et `results/<video_id>.json`
   - **Résultat** : Tous les dossiers du volume restent vides (~0 MB stockage persistant)

### Blobs Frontend

Pour permettre l'accès aux fichiers même après suppression côté serveur, le frontend crée des Blobs :

```javascript
// ResultsPage.js:23-33
useEffect(() => {
  const fetchVideo = async () => {
    const response = await fetch(`${API_URL}/annotated-videos/${videoId}`);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    setVideoBlobUrl(url);
  };
  fetchVideo();
}, [videoId]);
```

---

## Configuration

### Variables d'Environnement

#### .env (Racine du projet)

```env
# ====== BACKEND CONFIGURATION ======
IA_SERVICE_URL=http://ia-service:8001
UPLOAD_DIR=/app/shared/uploads
RESULTS_DIR=/app/shared/results
ANNOTATED_DIR=/app/shared/annotated
MAX_VIDEO_SIZE_MB=500
ALLOWED_ORIGINS=http://localhost:3000

# ====== IA SERVICE CONFIGURATION ======
YOLO_MODEL=yolov8n.pt
VIDEO_CODEC=H264
CONFIDENCE_THRESHOLD=0.5
TRACKER_CONFIG=bytetrack.yaml

# ====== LOGGING CONFIGURATION ======
LOG_LEVEL=INFO

# ====== FRONTEND CONFIGURATION ======
REACT_APP_API_URL=http://localhost:8000

# ====== NETTOYAGE AUTOMATIQUE ======
AUTO_CLEANUP_DAYS=0
GENERATE_ANNOTATED_VIDEO_BY_DEFAULT=true
```

### Configuration Frontend Centralisée

**Fichier** : `frontend/src/config.js`

**Objectif** : Centraliser toutes les constantes, URL API, et messages de l'application frontend selon les principes DRY (Don't Repeat Yourself) et Single Source of Truth.

**Relation avec `.env`** :
- Le fichier `.env` stocke les variables d'environnement (configuration externe)
- Le fichier `config.js` lit ces variables et fournit des valeurs par défaut (configuration code)
- Les deux fichiers sont **complémentaires**, pas redondants

**Exports disponibles** :
- `API_URL` : URL de base du backend
- `ENDPOINTS` : Tous les chemins d'endpoints API
  - `UPLOAD` : `/upload-video`
  - `ANALYZE` : `/analyze`
  - `RESULTS` : `/results`
  - `ANNOTATED_VIDEO` : `/annotated-videos`
  - `DELETE_ANALYSIS` : `/analysis`
- `DEFAULT_FPS` : FPS par défaut (30) - fallback uniquement, le FPS réel vient du backend
- `ERROR_MESSAGES` : Messages d'erreur standardisés
- `SUCCESS_MESSAGES` : Messages de succès standardisés
- `REDIRECT_DELAY` : Délai avant redirection après analyse (ms)
- `ZONE_COLORS` : Couleurs pour le dessin de zone sur canvas
  - `STROKE`, `FILL`, `POINT_OUTER`, `POINT_INNER`
- `ZONE_CONFIG` : Configuration du canvas
  - `LINE_WIDTH`, `POINT_RADIUS`

**Utilisation dans les composants** :
```javascript
// Importer les constantes nécessaires
import { API_URL, ENDPOINTS, ZONE_COLORS, ZONE_CONFIG } from '../config';

// Appels API avec ENDPOINTS (jamais de URLs hardcodées)
axios.post(`${API_URL}${ENDPOINTS.UPLOAD}`, formData);
fetch(`${API_URL}${ENDPOINTS.ANNOTATED_VIDEO}/${videoId}`);

// Dessin canvas avec constantes centralisées
ctx.strokeStyle = ZONE_COLORS.STROKE;
ctx.lineWidth = ZONE_CONFIG.LINE_WIDTH;
```

**Avantages** :
- ✅ Une seule source de vérité (changement unique = application globale)
- ✅ Aucune valeur hardcodée ("magic values") dans les composants
- ✅ Maintenance facilitée (modification d'un endpoint = 1 fichier)
- ✅ Cohérence garantie (messages, couleurs, URLs)
- ✅ Facilite les tests et le debugging

**Note importante** : Un refactoring a été effectué pour éliminer toutes les URLs hardcodées de `UploadPage.js` et `ResultsPage.js`. Toujours utiliser `ENDPOINTS` au lieu de chaînes de caractères directes.

### Paramètres Configurables

| Paramètre | Description | Valeur par défaut | Valeurs possibles |
|-----------|-------------|-------------------|-------------------|
| `YOLO_MODEL` | Modèle YOLO à utiliser | `yolov8n.pt` | `yolov8s.pt`, `yolov8m.pt`, etc. |
| `VIDEO_CODEC` | Codec vidéo final | `H264` | `H264`, `MP4V`, `AVC1`, `X264` |
| `CONFIDENCE_THRESHOLD` | Seuil de confiance | `0.5` | `0.0` à `1.0` |
| `TRACKER_CONFIG` | Fichier config tracker | `bytetrack.yaml` | `bytetrack_custom.yaml` |
| `MIN_FRAMES_THRESHOLD` | Filtrage tracks courts | `20` | Entier > 0 |
| `MAX_VIDEO_SIZE_MB` | Taille max upload | `500` | Entier en MB |

---

## Développement

### Structure des Projets

#### Frontend (React)
```
frontend/src/
├── pages/
│   ├── UploadPage.js      # Page 1 : Upload & Zone
│   ├── UploadPage.css
│   ├── ResultsPage.js     # Page 2 : Résultats
│   └── ResultsPage.css
├── config.js              # Configuration centralisée (API_URL, constantes, messages)
├── App.js                 # Composant racine + navigation
├── index.js               # Point d'entrée
└── index.css              # Styles globaux
```

**Configuration centralisée** (`config.js`) :
- `API_URL` : URL du backend (lit `.env` avec fallback)
- `ENDPOINTS` : Chemins des endpoints API
- `DEFAULT_FPS` : FPS par défaut (30)
- `ERROR_MESSAGES` / `SUCCESS_MESSAGES` : Messages standardisés
- `ZONE_COLORS` / `ZONE_CONFIG` : Configuration du canvas

**Utilisation** :
```javascript
import { API_URL, ERROR_MESSAGES } from '../config';
axios.post(`${API_URL}/upload-video`, formData);
```

#### Backend (FastAPI)
```
backend/
├── main.py                # Tous les endpoints + logique
└── requirements.txt       # Dépendances Python
```

#### IA Service (FastAPI + YOLO)
```
ia-service/
├── main.py                # Endpoint /detect + tracking
├── bytetrack.yaml         # Config ByteTrack par défaut
├── bytetrack_custom.yaml  # Config custom (non utilisé)
└── requirements.txt       # Dépendances Python
```

### Hot Reload

- **Frontend** : React hot-reload actif (modifications immédiates)
- **Backend** : Uvicorn `--reload` actif (redémarrage automatique)
- **IA Service** : Uvicorn `--reload` actif (redémarrage automatique)

### Debugging

**Voir les logs** :
```bash
docker-compose logs -f <service>
```

**Entrer dans un container** :
```bash
docker exec -it visiontrack-<service> bash
```

**Inspecter les fichiers** :
```bash
docker exec -it visiontrack-backend ls /app/shared/uploads
docker exec -it visiontrack-backend cat /app/shared/results/<id>.json
```

### Tests

**Tester le backend** :
```bash
curl http://localhost:8000/
```

**Tester l'IA Service** :
```bash
curl http://localhost:8001/health
```

**Tester l'upload** :
```bash
curl -X POST http://localhost:8000/upload-video \
  -F "file=@test.mp4"
```

---

## Performance et Optimisation

### Métriques Typiques

**Vidéo 1920x1080, 30 FPS, 1 minute** :
- Upload : 5-10 secondes
- Analyse : 2-5 minutes (CPU i7)
- Génération vidéo annotée : 1-2 minutes

### Optimisations Possibles

1. **GPU** : Décommenter la section GPU dans `docker-compose.yml` (nécessite NVIDIA GPU + nvidia-docker)
2. **Modèle plus léger** : Utiliser YOLOv8n (déjà configuré)
3. **Skip frames** : Traiter 1 frame sur N dans le code IA
4. **Résolution** : Réduire la résolution avant upload
5. **Codec** : Utiliser MP4V au lieu de H264 (plus rapide mais moins compatible)

---

## Sécurité

⚠️ **Application en mode développement** - Pour la production :

1. **CORS** : Restreindre `ALLOWED_ORIGINS` aux domaines autorisés
2. **Authentification** : Implémenter JWT ou API keys
3. **HTTPS** : Utiliser un reverse proxy (Nginx + Let's Encrypt)
4. **Validation** : Vérifier les formats de fichiers uploadés
5. **Rate limiting** : Limiter les requêtes par IP
6. **Quotas** : Limiter la taille et le nombre d'uploads par utilisateur

---

## Maintenance

### Nettoyage

**Politique de Stockage Zéro** : VisionTrack implémente un nettoyage automatique pour éviter l'accumulation de données.

**Nettoyer les containers** :
```bash
docker-compose down
```

**Nettoyer les volumes (recommandé)** :
```bash
docker-compose down -v
```

**Note** : `start.bat` et `start.sh` utilisent automatiquement `docker-compose down -v` pour éviter l'accumulation de volumes anonymes orphelins.

**Nettoyer les volumes orphelins manuellement** :
```bash
# Lister les volumes
docker volume ls

# Supprimer les volumes non utilisés
docker volume prune

# Vérifier l'espace disque utilisé par Docker
docker system df
```

**Nettoyer tout Docker** :
```bash
docker system prune -a --volumes
```

**État Attendu** :
- Volume `visiontrack_shared-data` : ~0 MB (vide)
- Dossiers `uploads/`, `annotated/`, `results/` : vides
- Pas de volumes anonymes orphelins

### Backup

**Sauvegarder le volume** :
```bash
docker run --rm -v visiontrack_shared-data:/data -v $(pwd):/backup \
  alpine tar czf /backup/visiontrack-backup.tar.gz /data
```

**Restaurer le volume** :
```bash
docker run --rm -v visiontrack_shared-data:/data -v $(pwd):/backup \
  alpine sh -c "cd /data && tar xzf /backup/visiontrack-backup.tar.gz --strip 1"
```

---

**Documentation mise à jour le : 2025-01-19**
