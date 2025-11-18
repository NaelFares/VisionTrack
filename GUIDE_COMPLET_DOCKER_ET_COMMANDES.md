# Guide Complet - Docker, Commandes & Architecture VisionTrack

## TABLE DES MATIÈRES
1. [Concepts de base: Compilation, Build, Docker](#1-concepts)
2. [Commandes (une fois vs plusieurs fois)](#2-commandes)
3. [Architecture et stockage (/app/shared)](#3-architecture)
4. [Cycle de vie d'une vidéo](#4-cycle-de-vie)

---

## 1. CONCEPTS

### Compilation vs Build vs Exécution

**COMPILATION** = Transformer code source en code exécutable
- **Python**: PAS de compilation, exécution directe (langage interprété)
- **React/JavaScript**: "Compilation" = transpilation (JSX → JS moderne → JS compatible navigateurs)

**BUILD** = Préparer l'application pour déploiement

**Dans VisionTrack:**
- Backend (Python) : Aucune compilation, fichiers .py exécutés directement
- IA Service (Python) : Aucune compilation, fichiers .py exécutés directement
- **Frontend (React)** :
  - **Développement** (`npm start`) : Hot reload, pas de build
  - **Production** (`npm run build`) : Minification, bundling, optimisation

### Docker - Analogie simple

**Docker** = Créer des environnements isolés (conteneurs)

**Analogie immeuble:**
- **Conteneur** = Appartement meublé complet
- **Image Docker** = Plan de construction de l'appartement
- **Volume Docker** = Cave commune partagée entre appartements
- **docker-compose** = Gérant d'immeuble (gère les 3 appartements)

**Les 3 "appartements" de VisionTrack:**
```
┌─────────────────────────────────────────┐
│  VOTRE PC WINDOWS                        │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  DOCKER ENGINE                   │   │
│  │                                  │   │
│  │  ┌──────┐  ┌──────┐  ┌──────┐  │   │
│  │  │Front │  │Back  │  │  IA  │  │   │
│  │  │:3000 │  │:8000 │  │:8001 │  │   │
│  │  └───┬──┘  └───┬──┘  └───┬──┘  │   │
│  │      └─────────┴─────────┘      │   │
│  │              │                  │   │
│  │       ┌──────▼──────┐           │   │
│  │       │ /app/shared │           │   │
│  │       │ (partagé)   │           │   │
│  │       └─────────────┘           │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

---

## 2. COMMANDES

### 🔵 PREMIÈRE UTILISATION / APRÈS MODIF Dockerfile

```bash
docker-compose build
```

**Quand l'utiliser:**
- Première installation du projet
- Après modification d'un `Dockerfile`
- Après ajout de dépendances Python (`requirements.txt`) ou Node (`package.json`)

**Durée:** 5-10 minutes la première fois

**Que fait-elle:**
1. Télécharge images de base (python:3.11, node:18)
2. Installe TOUTES les dépendances (YOLOv8, OpenCV, React, etc.)
3. Crée les images Docker pour chaque service
4. **NE DÉMARRE PAS** les services

---

### 🟢 DÉMARRER (quotidien)

```bash
docker-compose up
```

**Quand:** Chaque matin quand tu veux travailler

**Variante recommandée (arrière-plan):**
```bash
docker-compose up -d
```
- `-d` = detached (libère le terminal)
- Voir logs: `docker-compose logs -f`

**Accès après démarrage:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- IA Service: http://localhost:8001

---

### 🔴 ARRÊTER

```bash
docker-compose down
```

**Que fait-elle:**
- Arrête les 3 conteneurs
- Supprime les conteneurs
- **CONSERVE** les volumes (vidéos/résultats sauvegardés)

**⚠️ DANGER - Tout effacer:**
```bash
docker-compose down -v
```
- `-v` = supprime aussi les volumes
- **PERD TOUTES** les vidéos uploadées et résultats!
- Utiliser seulement pour repartir de zéro

---

### ♻️ REDÉMARRER UN SERVICE

```bash
docker-compose restart backend
docker-compose restart ia-service
docker-compose restart frontend
```

**Quand:**
- Après modification du code Python (backend/ia-service)
- Pas nécessaire pour frontend (hot reload automatique)

---

### 📋 VOIR LES LOGS

```bash
# Tous les services
docker-compose logs -f

# Un service spécifique
docker-compose logs -f backend
docker-compose logs --tail=50 ia-service  # Dernières 50 lignes
```

---

### 🔍 ENTRER DANS UN CONTENEUR (explorer)

```bash
docker exec -it visiontrack-backend bash
```

**Une fois dedans:**
```bash
ls /app/shared/uploads/     # Voir vidéos uploadées
ls /app/shared/annotated/   # Voir vidéos annotées
ls /app/shared/results/     # Voir fichiers JSON
exit                        # Sortir
```

---

### RÉSUMÉ - WORKFLOW QUOTIDIEN

```bash
# MATIN
docker-compose up -d

# TRAVAILLER NORMALEMENT
# Frontend: modif code → auto-refresh navigateur
# Backend/IA: modif code → docker-compose restart backend

# SOIR
docker-compose down
# OU laisser tourner
```

---

## 3. ARCHITECTURE

### Où est /app/shared/?

**DEUX EMPLACEMENTS** - C'est le plus important à comprendre!

#### A. Dans les conteneurs Docker
```
/app/shared/                    ← Chemin VIRTUEL dans les conteneurs
├── uploads/                    ← Vidéos uploadées par l'utilisateur
│   └── {uuid}.mp4              Ex: a1b2c3d4-1234-5678-90ab-cdef.mp4
├── annotated/                  ← Vidéos avec rectangles dessinés
│   └── {uuid}_annotated.mp4    Ex: a1b2c3d4-..._annotated.mp4
└── results/                    ← Statistiques JSON
    └── {uuid}.json             Ex: a1b2c3d4-....json
```

#### B. Sur ton PC (Volume Docker)

Docker stocke ça quelque part dans ses fichiers système.
**Tu ne le vois PAS** dans l'Explorateur Windows normalement.

**Pour accéder aux fichiers:**

**Option 1: Via conteneur**
```bash
docker exec -it visiontrack-backend bash
cd /app/shared/uploads
ls
cat video-id.mp4  # Voir le fichier
```

**Option 2: Copier vers ton PC**
```bash
# Du conteneur vers ton PC
docker cp visiontrack-backend:/app/shared/uploads/video.mp4 ./ma-video.mp4

# De ton PC vers le conteneur
docker cp ./ma-video.mp4 visiontrack-backend:/app/shared/uploads/
```

**Option 3: Localisation réelle**
```bash
docker volume inspect visiontrack_shared-data
```
Affiche un chemin Windows très profond dans `C:\ProgramData\Docker\...`

### Structure complète projet

```
C:\Users\frsna\...\VisionTrack\
│
├── docker-compose.yml          ← Chef d'orchestre
├── .env                        ← Configuration (PAS dans Git!)
├── .env.example                ← Template de configuration
├── .gitignore                  ← Fichiers à ignorer
├── CLAUDE.md                   ← Instructions pour Claude
├── ARCHITECTURE_ET_AMELIORATIONS.md
├── GUIDE_COMPLET_DOCKER_ET_COMMANDES.md  ← Ce fichier
│
├── frontend/                   ← React (Port 3000)
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── pages/
│       │   ├── UploadPage.js
│       │   └── ResultsPage.js
│       └── App.js
│
├── backend/                    ← FastAPI (Port 8000)
│   ├── Dockerfile
│   ├── requirements.txt
│   └── main.py
│
├── ia-service/                 ← YOLOv8 (Port 8001)
│   ├── Dockerfile
│   ├── requirements.txt
│   └── main.py
│
└── video_japan8sec.mp4         ← Vidéo de test

VOLUME DOCKER (invisible):
visiontrack_shared-data
└── /app/shared/                ← Monté dans backend ET ia-service
    ├── uploads/
    ├── annotated/
    └── results/
```

---

## 4. CYCLE DE VIE D'UNE VIDÉO

### De l'upload à l'affichage - Étape par étape

```
1. UTILISATEUR UPLOAD VIDÉO
   │
   ▼
   Frontend: UploadPage.js
   POST /upload-video
   │
   ▼
2. BACKEND SAUVEGARDE
   backend/main.py
   - Génère UUID: "a1b2c3d4..."
   - Sauvegarde: /app/shared/uploads/a1b2c3d4.mp4
   - Retourne: { "video_id": "a1b2c3d4..." }
   │
   ▼
3. UTILISATEUR CHOISIT MODE & ZONE (ou pas)
   - Mode "Vidéo entière" OU "Zone spécifique"
   - Clique "Analyser"
   │
   ▼
   Frontend: POST /analyze
   { video_id: "a1b2c3d4", zone: {...} ou null }
   │
   ▼
4. BACKEND APPELLE IA SERVICE
   backend/main.py
   POST http://ia-service:8001/detect
   { video_path: "/app/shared/uploads/a1b2c3d4.mp4", zone: {...} }
   │
   ▼
5. IA SERVICE ANALYSE VIDÉO
   ia-service/main.py
   - Ouvre vidéo avec OpenCV
   - Si zone null → zone = vidéo entière
   - Crée VideoWriter: /app/shared/annotated/a1b2c3d4_annotated.mp4
   - POUR CHAQUE FRAME:
     * Détecte personnes avec YOLOv8n
     * Filtre celles dans la zone
     * Dessine rectangles (zone bleue, personnes vertes)
     * Écrit frame annoté
   - Retourne: { detections: [...], annotated_video_path: "..." }
   │
   ▼
6. BACKEND CALCULE STATISTIQUES
   backend/main.py
   - total_people = somme détections
   - max_people_simultaneous = max dans une frame
   - frame_of_max = numéro frame du max
   - Sauvegarde: /app/shared/results/a1b2c3d4.json
   │
   ▼
7. FRONTEND AFFICHE RÉSULTATS
   ResultsPage.js
   GET /results/a1b2c3d4
   - Affiche statistiques
   - Charge vidéo: <video src="/annotated-videos/a1b2c3d4" />
   - Affiche détections frame par frame
   - Timeline graphique
```

### Fichiers créés pour UNE vidéo

```
/app/shared/
│
├── uploads/
│   └── a1b2c3d4.mp4                [~21 MB] Vidéo ORIGINALE
│       ❌ Jamais supprimée auto
│
├── annotated/
│   └── a1b2c3d4_annotated.mp4      [~20 MB] Vidéo ANNOTÉE
│       ⚠️  Créée systématiquement (lourd!)
│       ❌ Jamais supprimée auto
│
└── results/
    └── a1b2c3d4.json               [~50 KB] Statistiques
        ❌ Jamais supprimée auto
```

**TOTAL: ~41 MB par vidéo**
**1000 vidéos = 41 GB!**

### Les fichiers sont-ils supprimés?

**NON**, jamais automatiquement.

**Suppression manuelle:**
```bash
# Supprimer une vidéo spécifique
docker exec -it visiontrack-backend rm /app/shared/uploads/a1b2c3d4.mp4
docker exec -it visiontrack-backend rm /app/shared/annotated/a1b2c3d4_annotated.mp4
docker exec -it visiontrack-backend rm /app/shared/results/a1b2c3d4.json

# Tout effacer (DANGER!)
docker-compose down -v
```

---

## FAQ

**Q: docker-compose up est lent la première fois?**
R: Oui, il télécharge tout (YOLOv8, OpenCV, dépendances). Fois suivantes: rapide.

**Q: Je modifie Python mais rien ne change?**
R: `docker-compose restart backend` ou `docker-compose restart ia-service`

**Q: Je modifie React mais rien ne change?**
R: Le hot reload devrait marcher. Rafraîchis navigateur (Ctrl+F5).

**Q: Voir les vidéos uploadées?**
R: `docker exec -it visiontrack-backend ls /app/shared/uploads/`

**Q: Docker prend beaucoup d'espace?**
R: Oui. Nettoyer: `docker system prune -a` (attention: supprime tout!)

**Q: Vidéos sur mon disque dur?**
R: Oui, dans volume Docker. Localisation: `docker volume inspect visiontrack_shared-data`

**Q: Quelle différence `docker-compose up` vs `docker-compose up -d`?**
R:
- `up` = bloque terminal, affiche logs en direct
- `up -d` = détaché, libère terminal, voir logs avec `docker-compose logs -f`

**Q: Comment voir si tout tourne?**
R: `docker-compose ps` - Les 3 services doivent être "Up"

**Q: Port déjà utilisé?**
R: Modifier ports dans `docker-compose.yml`:
```yaml
ports:
  - "3001:3000"  # Au lieu de 3000:3000
```

---

## TROUBLESHOOTING

### Erreur: "Port already in use"
Modifier `docker-compose.yml` section `ports:`

### Erreur: "Cannot connect to backend"
1. Backend tourne? `docker-compose ps`
2. Logs: `docker-compose logs backend`
3. Vérifier `.env` - `REACT_APP_API_URL` correct?

### Erreur: "Video not found" dans IA
Backend et IA doivent partager le volume. Vérifier `docker-compose.yml`:
```yaml
volumes:
  - shared-data:/app/shared  # Dans backend ET ia-service
```

### Vidéo ne s'affiche pas
1. Console navigateur (F12) - erreur CORS?
2. Vidéo existe? `docker exec -it visiontrack-backend ls /app/shared/annotated/`
3. Codec vidéo compatible? Vérifier `.env` - `VIDEO_CODEC=mp4v`

---

## COMMANDES UTILES SUPPLÉMENTAIRES

### État des services
```bash
docker-compose ps
```

### Utilisation ressources
```bash
docker stats
```

### Nettoyer Docker (libérer espace)
```bash
docker container prune  # Conteneurs arrêtés
docker image prune      # Images inutilisées
docker system prune -a  # TOUT (ATTENTION!)
```

### Variables d'environnement temporaires
```bash
# PowerShell
$env:LOG_LEVEL="DEBUG"
docker-compose up

# Git Bash
LOG_LEVEL=DEBUG docker-compose up
```

### Rebuild un seul service
```bash
docker-compose build backend
docker-compose up -d backend
```

---

## CHECKLIST QUOTIDIENNE

### ✅ Démarrer
```bash
cd C:\Users\frsna\...\VisionTrack
docker-compose up -d
```

### ✅ Vérifier
```bash
docker-compose ps  # Les 3 doivent être "Up"
```

### ✅ Accéder
- Frontend: http://localhost:3000
- Backend: http://localhost:8000/docs
- IA: http://localhost:8001/docs

### ✅ En cas de problème
```bash
docker-compose logs -f               # Voir logs
docker-compose restart backend       # Redémarrer un service
docker-compose down && docker-compose up -d  # Redémarrer tout
```

### ✅ Arrêter proprement
```bash
docker-compose down  # SANS -v pour garder les données
```

---

## CONFIGURATION - FICHIER .env

Le fichier `.env` contient toute la configuration. Modifier selon besoin:

```bash
# Backend
IA_SERVICE_URL=http://ia-service:8001
UPLOAD_DIR=/app/shared/uploads
MAX_VIDEO_SIZE_MB=500
ALLOWED_ORIGINS=http://localhost:3000

# IA Service
YOLO_MODEL=yolov8n.pt       # ou yolov8s.pt (plus précis, plus lent)
VIDEO_CODEC=mp4v            # ou avc1 (nécessite libs H.264)

# Logging
LOG_LEVEL=INFO              # DEBUG en dev, INFO en prod

# Frontend
REACT_APP_API_URL=http://localhost:8000
```

**Après modification `.env`:**
```bash
docker-compose down
docker-compose up -d
```

---

## EN RÉSUMÉ

**3 commandes essentielles:**
1. `docker-compose up -d` → Démarrer
2. `docker-compose logs -f` → Voir ce qui se passe
3. `docker-compose down` → Arrêter

**Modifications code:**
- Frontend React: Rien à faire (auto-refresh)
- Backend/IA Python: `docker-compose restart backend` ou `ia-service`
- Dépendances/Dockerfile: `docker-compose up --build`

**Fichiers:**
- Vidéos uploadées: `/app/shared/uploads/` dans conteneur
- Vidéos annotées: `/app/shared/annotated/` dans conteneur
- Résultats JSON: `/app/shared/results/` dans conteneur
- Accès: `docker exec -it visiontrack-backend bash` puis `cd /app/shared`

Tu es maintenant autonome! 🚀
