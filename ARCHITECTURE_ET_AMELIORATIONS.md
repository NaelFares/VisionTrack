# Architecture VisionTrack - Flux de Données & Recommandations

## 1. FLUX DE DONNÉES COMPLET

### A. Upload et Analyse (Frontend → Backend → IA Service)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ FRONTEND (React - Port 3000)                                             │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│ 1. UploadPage.js : handleFileChange()                                    │
│    ├─ Sélection fichier vidéo par l'utilisateur                          │
│    └─ Appel automatique handleUpload()                                   │
│                                                                           │
│ 2. UploadPage.js : handleUpload()                                        │
│    ├─ FormData avec fichier vidéo                                        │
│    └─ POST http://localhost:8000/upload-video                            │
│         └─ Reçoit: { video_id: "uuid" }                                  │
│                                                                           │
│ 3. UploadPage.js : Mode d'analyse (nouveau)                              │
│    ├─ Mode "full" : Analyse vidéo entière (zone = null)                  │
│    └─ Mode "zone" : Sélection rectangle sur canvas                       │
│                                                                           │
│ 4. UploadPage.js : handleAnalyze()                                       │
│    ├─ Prépare: { video_id, zone? }                                       │
│    └─ POST http://localhost:8000/analyze                                 │
│         └─ Reçoit: { message: "success" }                                │
│                                                                           │
│ 5. Redirection vers ResultsPage avec video_id                            │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ BACKEND (FastAPI - Port 8000)                                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│ ENDPOINT 1: POST /upload-video                                           │
│ ├─ Génère UUID unique pour la vidéo                                      │
│ ├─ Sauvegarde: /app/shared/uploads/{video_id}.{ext}                      │
│ └─ Retourne: { video_id }                                                │
│                                                                           │
│ ENDPOINT 2: POST /analyze                                                │
│ ├─ Reçoit: { video_id, zone? }                                           │
│ ├─ Trouve fichier: /app/shared/uploads/{video_id}.*                      │
│ ├─ Prépare requête pour IA Service:                                      │
│ │   {                                                                     │
│ │     "video_path": "/app/shared/uploads/{video_id}.mp4",                │
│ │     "zone": { x1, y1, x2, y2 } ou null                                 │
│ │   }                                                                     │
│ ├─ POST http://ia-service:8001/detect                                    │
│ │   └─ Reçoit:                                                            │
│ │       {                                                                 │
│ │         "detections": [...],                                            │
│ │         "annotated_video_path": "/app/shared/annotated/{id}_ann.mp4"   │
│ │       }                                                                 │
│ ├─ Calcule statistiques (total, max, frame_of_max)                       │
│ ├─ Sauvegarde: /app/shared/results/{video_id}.json                       │
│ └─ Retourne: { message: "success" }                                      │
│                                                                           │
│ ENDPOINT 3: GET /results/{video_id}                                      │
│ ├─ Lit: /app/shared/results/{video_id}.json                              │
│ └─ Retourne:                                                              │
│     {                                                                     │
│       "stats": { total_people, max_people_simultaneous, frame_of_max },  │
│       "detections": [{ frame, boxes: [{ x1, y1, x2, y2, confidence }] }],│
│       "annotated_video_path": "/app/shared/annotated/{id}_annotated.mp4" │
│     }                                                                     │
│                                                                           │
│ ENDPOINT 4: GET /annotated-videos/{video_id}                             │
│ ├─ Lit: /app/shared/annotated/{video_id}_annotated.mp4                   │
│ └─ Retourne: FileResponse (stream vidéo MP4)                             │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ IA SERVICE (FastAPI + YOLOv8n - Port 8001)                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│ ENDPOINT: POST /detect                                                   │
│ ├─ Reçoit: { video_path, zone? }                                         │
│ │                                                                         │
│ ├─ Si zone == null:                                                      │
│ │   └─ Crée zone = (0, 0, video_width, video_height)                     │
│ │                                                                         │
│ ├─ Ouvre vidéo avec OpenCV (cv2.VideoCapture)                            │
│ │                                                                         │
│ ├─ Crée VideoWriter pour vidéo annotée:                                  │
│ │   └─ /app/shared/annotated/{video_id}_annotated.mp4                    │
│ │                                                                         │
│ ├─ BOUCLE sur chaque frame:                                              │
│ │   ├─ Lit frame avec cap.read()                                         │
│ │   ├─ Applique YOLOv8n: results = model(frame)                          │
│ │   ├─ Filtre classe 0 (personnes uniquement)                            │
│ │   ├─ Pour chaque détection:                                            │
│ │   │   ├─ Calcule centre du bounding box                                │
│ │   │   ├─ Vérifie si centre dans zone définie                           │
│ │   │   └─ Si oui: stocke détection                                      │
│ │   ├─ Dessine sur frame:                                                │
│ │   │   ├─ Rectangle bleu pour zone (cv2.rectangle)                      │
│ │   │   └─ Rectangle vert pour chaque personne détectée                  │
│ │   └─ Écrit frame annoté: out.write(annotated_frame)                    │
│ │                                                                         │
│ ├─ Ferme VideoWriter et VideoCapture                                     │
│ │                                                                         │
│ └─ Retourne:                                                              │
│     {                                                                     │
│       "detections": [                                                     │
│         {                                                                 │
│           "frame": 0,                                                     │
│           "boxes": [                                                      │
│             { "x1": 100, "y1": 200, "x2": 150, "y2": 300,                │
│               "confidence": 0.95, "class": "person" }                    │
│           ]                                                               │
│         }                                                                 │
│       ],                                                                  │
│       "annotated_video_path": "/app/shared/annotated/{id}_ann.mp4"       │
│     }                                                                     │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ STOCKAGE DOCKER (Volume partagé: shared-data)                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│ /app/shared/                                                              │
│ ├─ uploads/                                                               │
│ │  └─ {video_id}.mp4          ← Vidéo originale uploadée                 │
│ │                                                                         │
│ ├─ annotated/                                                             │
│ │  └─ {video_id}_annotated.mp4 ← Vidéo avec bounding boxes CRÉÉE ICI    │
│ │                                                                         │
│ └─ results/                                                               │
│    └─ {video_id}.json          ← Statistiques et détections              │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ FRONTEND - Affichage Résultats (ResultsPage.js)                          │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                           │
│ 1. GET http://localhost:8000/results/{video_id}                          │
│    └─ Reçoit: { stats, detections, annotated_video_path }                │
│                                                                           │
│ 2. Affiche statistiques (total_people, max_simultaneous, etc.)           │
│                                                                           │
│ 3. Charge vidéo annotée:                                                 │
│    <video src="http://localhost:8000/annotated-videos/{video_id}" />     │
│                                                                           │
│ 4. Affiche détections du frame actuel                                    │
│                                                                           │
│ 5. Timeline des détections (graphique)                                   │
│                                                                           │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. PROBLÈME VIDÉO NON AFFICHÉE - DIAGNOSTIC

### Situation actuelle:
- ✅ Backend sert bien la vidéo (GET /annotated-videos/{id} → 200 OK)
- ✅ Statistiques s'affichent correctement
- ❌ Balise `<video>` ne charge pas la vidéo

### Causes possibles:

#### A. CORS (Cross-Origin Resource Sharing)
Le backend autorise `*` mais peut ne pas autoriser les requêtes de streaming vidéo.

**Vérification:**
Ouvre la console du navigateur (F12) et cherche une erreur CORS.

**Solution si CORS:**
Dans `backend/main.py`, ligne 32-37, ajoute:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]  # ← Ajoute cette ligne
)
```

#### B. Codec vidéo non supporté par le navigateur
OpenCV peut créer des vidéos avec des codecs non standard.

**Vérification dans IA Service (ia-service/main.py:150):**
```python
fourcc = cv2.VideoWriter_fourcc(*'mp4v')  # ← Problématique
```

`mp4v` n'est pas toujours compatible. **Meilleure pratique:**
```python
fourcc = cv2.VideoWriter_fourcc(*'avc1')  # H.264 - compatible tous navigateurs
```

#### C. Taille de fichier trop grande pour streaming direct
Les vidéos annotées font ~20 MB. Le navigateur peut avoir du mal à buffer.

**Solution:** Implémenter le Range Request support dans le backend.

---

## 3. CODE REVIEW - VALEURS HARDCODÉES & MAUVAISES PRATIQUES

### 🔴 CRITIQUE - À corriger avant production

#### A. URLs hardcodées dans le code

**backend/main.py:24**
```python
IA_SERVICE_URL = "http://ia-service:8001"  # ← HARDCODÉ
```

**Solution:**
```python
import os
IA_SERVICE_URL = os.getenv("IA_SERVICE_URL", "http://ia-service:8001")
```

**frontend/src/pages/UploadPage.js:25**
```python
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
```
✅ Correct, mais documenter dans README que `.env` doit être créé.

---

#### B. Chemins hardcodés

**backend/main.py:27-29**
```python
UPLOAD_DIR = Path("/app/shared/uploads")
RESULTS_DIR = Path("/app/shared/results")
ANNOTATED_DIR = Path("/app/shared/annotated")
```

**Solution:** Variables d'environnement
```python
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "/app/shared/uploads"))
RESULTS_DIR = Path(os.getenv("RESULTS_DIR", "/app/shared/results"))
ANNOTATED_DIR = Path(os.getenv("ANNOTATED_DIR", "/app/shared/annotated"))
```

---

#### C. CORS trop permissif (SÉCURITÉ)

**backend/main.py:33**
```python
allow_origins=["*"]  # ← DANGER en production
```

**Solution pour production:**
```python
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

#### D. Aucune validation de taille de fichier

**backend/main.py:98** - `upload_video` accepte n'importe quelle taille

**Solution:**
```python
MAX_FILE_SIZE = int(os.getenv("MAX_VIDEO_SIZE_MB", "500")) * 1024 * 1024  # 500 MB par défaut

@app.post("/upload-video")
async def upload_video(file: UploadFile = File(...)):
    # Lire en chunks pour vérifier la taille
    total_size = 0
    chunks = []

    async for chunk in file.stream:
        total_size += len(chunk)
        if total_size > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"Fichier trop volumineux. Maximum: {MAX_FILE_SIZE / (1024*1024)} MB"
            )
        chunks.append(chunk)

    # Puis écrire le fichier...
```

---

#### E. Aucune gestion d'authentification

Tous les endpoints sont publics. En production, il faut:
- JWT tokens
- API keys
- Rate limiting

---

#### F. Pas de nettoyage des fichiers temporaires

Les vidéos et résultats s'accumulent indéfiniment.

**Solution:** Ajouter un endpoint de cleanup ou un job cron.

---

### 🟡 AMÉLIORATIONS RECOMMANDÉES

#### A. Magic numbers dans le code

**frontend/src/pages/ResultsPage.js:74**
```javascript
const fps = 30;  // ← Assumé, pas lu de la vidéo
```

**Solution:** Lire le FPS réel de la vidéo dans le backend.

---

#### B. Logging avec print() au lieu de logger

**Partout:** `print("message")`

**Solution:** Utiliser le module `logging` de Python
```python
import logging

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

# Au lieu de print()
logger.info("Message")
logger.error("Erreur")
logger.debug("Debug")
```

---

#### C. Pas de gestion des erreurs réseau

**frontend/src/pages/UploadPage.js** - Si le backend est down, l'erreur n'est pas claire.

**Solution:** Intercepteur Axios avec retry logic.

---

#### D. Zone en pixels au lieu de pourcentages

**UploadPage.js** envoie des coordonnées en pixels absolus. Si la vidéo est redimensionnée, les coordonnées sont fausses.

**Solution:** Envoyer en pourcentages (0-1) et convertir dans l'IA service.

---

## 4. OPTIMISATION STOCKAGE - VIDÉOS ANNOTÉES OPTIONNELLES

### Problème actuel:
Chaque analyse crée automatiquement une vidéo annotée de ~20 MB. Pour un client avec 1000 vidéos → 20 GB d'espace!

### Solution proposée:

#### Option 1: Rendre la création de vidéo annotée optionnelle

**Modifier l'API d'analyse:**

```python
class AnalyzeRequest(BaseModel):
    video_id: str
    zone: Optional[Zone] = None
    generate_annotated_video: bool = False  # ← NOUVEAU: False par défaut
```

**Dans le frontend, ajouter une checkbox:**
```javascript
<label>
  <input
    type="checkbox"
    checked={generateAnnotatedVideo}
    onChange={(e) => setGenerateAnnotatedVideo(e.target.checked)}
  />
  Générer la vidéo annotée (occupe ~20 MB)
</label>
```

**Dans l'IA service:**
```python
@app.post("/detect")
async def detect_people(request: DetectRequest):
    # ... détection normale ...

    annotated_video_path = None

    if request.generate_annotated_video:  # ← Conditionnel
        # Créer VideoWriter et annoter
        annotated_video_path = create_annotated_video(...)

    return {
        "detections": detections,
        "annotated_video_path": annotated_video_path  # Peut être null
    }
```

**Économie:**
- Sans vidéo annotée: Seul le JSON est stocké (~50 KB au lieu de 20 MB)
- **Facteur de réduction: 400x**

---

#### Option 2: Générer la vidéo annotée à la demande

Ne créer la vidéo que lorsque l'utilisateur clique sur "Voir la vidéo annotée".

**Frontend:**
```javascript
const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);

const handleGenerateVideo = async () => {
  setIsGeneratingVideo(true);
  await axios.post(`${API_URL}/generate-annotated-video/${videoId}`);
  // Puis charger la vidéo
  setIsGeneratingVideo(false);
};

// Dans le render:
{!results.annotated_video_path ? (
  <button onClick={handleGenerateVideo} disabled={isGeneratingVideo}>
    {isGeneratingVideo ? 'Génération en cours...' : 'Générer la vidéo annotée'}
  </button>
) : (
  <video src={...} />
)}
```

**Backend - Nouvel endpoint:**
```python
@app.post("/generate-annotated-video/{video_id}")
async def generate_annotated_video(video_id: str):
    # Lire les résultats existants
    results = read_results(video_id)

    # Appeler l'IA service pour créer la vidéo avec les détections existantes
    # (pas besoin de re-détecter, juste annoter)

    return {"status": "success", "video_path": "..."}
```

**Économie:**
- Vidéos créées uniquement si demandées
- Peut être supprimée après visualisation

---

#### Option 3: Compression et suppression automatique

**Après création de la vidéo annotée:**
1. La compresser avec FFmpeg (réduire qualité/bitrate)
2. Supprimer après 24h ou 7 jours (configurable)

```python
import subprocess
from datetime import datetime, timedelta

def compress_video(input_path, output_path):
    subprocess.run([
        'ffmpeg', '-i', input_path,
        '-vcodec', 'libx264',
        '-crf', '28',  # Qualité 0-51 (28 = bon compromis)
        '-preset', 'fast',
        output_path
    ])

# Job de nettoyage (scheduler ou cron)
def cleanup_old_videos():
    cutoff_date = datetime.now() - timedelta(days=7)

    for video_file in ANNOTATED_DIR.glob("*.mp4"):
        if datetime.fromtimestamp(video_file.stat().st_mtime) < cutoff_date:
            video_file.unlink()  # Supprimer
            logger.info(f"Vidéo supprimée: {video_file}")
```

---

## 5. NETTOYAGE DES LOGS

### Logs actuels (ajoutés pour debugging):

**À GARDER en production (avec logging.INFO):**
- ✅ Début/fin d'analyse
- ✅ Erreurs et exceptions
- ✅ Statistiques finales

**À SUPPRIMER ou passer en DEBUG:**
- ❌ `print("="*80)` partout (trop verbeux)
- ❌ Logs de progression frame par frame (sauf si DEBUG)
- ❌ `console.log()` dans le frontend (utiliser mode development uniquement)

### Stratégie de logging propre:

```python
import logging
import os

# Configuration selon environnement
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
logging.basicConfig(
    level=getattr(logging, LOG_LEVEL),
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)

# Dans le code:
logger.info(f"Analyse démarrée pour video {video_id}")  # Toujours visible
logger.debug(f"Frame {i}/{total} analysée")  # Seulement si DEBUG
logger.error(f"Erreur: {e}")  # Toujours visible
```

**Variables d'environnement dans docker-compose.yml:**
```yaml
environment:
  - LOG_LEVEL=DEBUG  # Development
  # - LOG_LEVEL=INFO  # Production
```

---

## 6. RÉSUMÉ DES ACTIONS PRIORITAIRES

### 🔴 Urgent (avant production):
1. ✅ Fixer l'affichage vidéo (codec avc1 + CORS)
2. ✅ Externaliser toutes les URLs en variables d'environnement
3. ✅ Ajouter validation de taille de fichier
4. ✅ Remplacer `allow_origins=["*"]` par liste spécifique
5. ✅ Remplacer `print()` par `logging`

### 🟡 Important (amélioration):
6. ✅ Rendre vidéo annotée optionnelle (économie 400x)
7. ✅ Ajouter authentification (JWT)
8. ✅ Implémenter nettoyage automatique des fichiers
9. ✅ Gérer les coordonnées en pourcentages
10. ✅ Ajouter tests unitaires

### 🟢 Nice-to-have:
11. Rate limiting
12. Métriques (Prometheus)
13. Health checks
14. Documentation OpenAPI améliorée

---

## 7. FICHIER .env RECOMMANDÉ

Créer `.env` à la racine du projet:

```bash
# Backend
IA_SERVICE_URL=http://ia-service:8001
UPLOAD_DIR=/app/shared/uploads
RESULTS_DIR=/app/shared/results
ANNOTATED_DIR=/app/shared/annotated
MAX_VIDEO_SIZE_MB=500
ALLOWED_ORIGINS=http://localhost:3000,https://mondomaine.com
LOG_LEVEL=INFO

# Frontend
REACT_APP_API_URL=http://localhost:8000

# Sécurité
JWT_SECRET=your-secret-key-here
API_KEY=your-api-key-here

# Stockage
ENABLE_ANNOTATED_VIDEO_BY_DEFAULT=false
AUTO_CLEANUP_DAYS=7
```

Et modifier `docker-compose.yml`:
```yaml
services:
  backend:
    env_file:
      - .env
```

---

## 8. NEXT STEPS POUR TOI

1. **Fixer le problème vidéo immédiatement:**
   - Change le codec dans `ia-service/main.py:150`: `mp4v` → `avc1`
   - Redémarre: `docker-compose restart ia-service`
   - Teste dans le navigateur

2. **Créer un fichier .env** et externaliser les configurations

3. **Décider:** Veux-tu implémenter la vidéo annotée optionnelle maintenant?

4. **Code review systématique:** Veux-tu que je crée des issues GitHub pour chaque point?

Dis-moi ce que tu veux prioriser!
