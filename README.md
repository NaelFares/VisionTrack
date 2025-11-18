# 🎥 VisionTrack - Système d'Analyse Vidéo Intelligent

VisionTrack est une application complète d'analyse vidéo utilisant l'intelligence artificielle (YOLOv8n) pour détecter et compter les personnes dans des zones définies. Le projet utilise une architecture microservices avec Docker.

## 📋 Table des matières

- [Architecture](#architecture)
- [Fonctionnalités](#fonctionnalités)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Utilisation](#utilisation)
- [Endpoints API](#endpoints-api)
- [Structure du projet](#structure-du-projet)
- [Développement](#développement)
- [Troubleshooting](#troubleshooting)

---

## 🏗️ Architecture

VisionTrack utilise une architecture microservices composée de 3 services indépendants :

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│                 │      │                 │      │                 │
│   Frontend      │─────▶│   Backend       │─────▶│   IA Service    │
│   React.js      │      │   FastAPI       │      │   YOLOv8n       │
│   Port 3000     │      │   Port 8000     │      │   Port 8001     │
│                 │      │                 │      │                 │
└─────────────────┘      └─────────────────┘      └─────────────────┘
        │                         │                         │
        └─────────────────────────┴─────────────────────────┘
                            Docker Network
                         (visiontrack-network)
```

### Communication entre services

1. **Frontend → Backend** : Le frontend envoie les requêtes HTTP au backend pour uploader les vidéos et lancer les analyses
2. **Backend → IA Service** : Le backend appelle le service IA pour effectuer la détection de personnes
3. **Volume partagé** : Backend et IA Service partagent un volume Docker pour accéder aux vidéos uploadées

---

## ✨ Fonctionnalités

### Frontend (React.js)

- **Page 1 : Import & Analyse**
  - Upload de vidéo de surveillance
  - Prévisualisation de la vidéo
  - Sélection interactive d'une zone d'analyse (rectangle sur canvas)
  - Lancement de l'analyse

- **Page 2 : Résultats**
  - Lecture de la vidéo annotée avec détections
  - Affichage des détections en temps réel
  - Statistiques :
    - Total de personnes détectées
    - Pic simultané maximum
    - Frame du pic
  - Timeline visuelle des détections
  - **Export des résultats** :
    - 📥 Télécharger la vidéo annotée (.mp4)
    - 📄 Exporter les statistiques (JSON)

### Backend (FastAPI)

- `POST /upload-video` : Upload et stockage des vidéos
- `POST /analyze` : Orchestration de l'analyse et calcul des statistiques
- `GET /results/{video_id}` : Récupération des résultats
- `GET /videos/{video_id}` : Streaming de la vidéo annotée
- `GET /export-video/{video_id}` : Téléchargement de la vidéo annotée
- `GET /export-results/{video_id}` : Téléchargement des statistiques (JSON)

### Service IA (YOLOv8n)

- `POST /detect` : Détection de personnes dans une zone définie
- Filtrage intelligent des détections par zone
- Traitement frame par frame optimisé

---

## 📦 Prérequis

Avant de commencer, assurez-vous d'avoir installé :

- **Docker** (version 20.10 ou supérieure)
- **Docker Compose** (version 2.0 ou supérieure)
- **Git** (pour cloner le projet)

### Vérification de l'installation

```bash
# Vérifier Docker
docker --version

# Vérifier Docker Compose
docker-compose --version

# Vérifier que Docker fonctionne
docker ps
```

---

## 🚀 Installation et Démarrage

### Étape 1 : Cloner le projet (si depuis GitHub)

```bash
git clone <url-du-repo>
cd VisionTrack
```

### Étape 2 : Vérifier la structure

```bash
ls -la
```

Vous devriez voir :
```
VisionTrack/
├── frontend/
├── backend/
├── ia-service/
├── docker-compose.yml
├── start.bat          # Script Windows
├── start.sh           # Script Linux/Mac
├── .env.example       # Template de configuration
├── .gitignore
└── README.md
```

---

## 🎯 Utilisation

### ⚡ Méthode Rapide (Recommandée)

**Pour lancer VisionTrack avec juste Docker installé, utilisez les scripts automatiques :**

#### Windows
```bash
start.bat
```

#### Linux / Mac
```bash
chmod +x start.sh    # Une seule fois pour rendre le script exécutable
./start.sh
```

**Ce que fait le script automatiquement :**
1. ✅ Vérifie que Docker est installé
2. ✅ Crée le fichier `.env` depuis `.env.example` si nécessaire
3. ✅ Arrête les services existants proprement
4. ✅ Construit toutes les images Docker (5-10 minutes au premier lancement)
5. ✅ Démarre tous les services
6. ✅ Affiche les URLs d'accès

**Résultat :**
```
========================================
  VisionTrack est prêt !
========================================

Accédez à l'application:
  - Frontend:   http://localhost:3000
  - Backend:    http://localhost:8000/docs
  - IA Service: http://localhost:8001/docs
```

---

### 🔧 Méthode Manuelle (Alternative)

Si vous préférez contrôler chaque étape manuellement :

#### Première fois : Build de tous les containers

```bash
# Créer le fichier .env
cp .env.example .env

# Build
docker-compose build
```

**Durée estimée** : 5-10 minutes (selon votre connexion internet)

#### Démarrer l'application

```bash
# En mode attaché (voir les logs en direct)
docker-compose up

# En mode détaché (arrière-plan)
docker-compose up -d
```

#### Arrêter l'application

```bash
# Si en mode attaché : Ctrl+C puis
docker-compose down

# Si en mode détaché
docker-compose down
```

#### Voir les logs

```bash
# Logs de tous les services
docker-compose logs

# Logs d'un service spécifique
docker-compose logs frontend
docker-compose logs backend
docker-compose logs ia-service

# Suivre les logs en temps réel
docker-compose logs -f
```

#### Reconstruire après modification du code

```bash
# Reconstruire tous les services
docker-compose up --build

# Reconstruire un service spécifique
docker-compose up --build frontend
docker-compose up --build backend
docker-compose up --build ia-service
```

#### Nettoyer complètement (si problèmes)

```bash
# Arrêter et supprimer tous les containers
docker-compose down

# Supprimer aussi les volumes (⚠️ efface les vidéos uploadées)
docker-compose down -v

# Supprimer aussi les images
docker-compose down --rmi all

# Rebuild complet
docker-compose build --no-cache
docker-compose up
```

---

### 🐳 Commandes dans les containers

#### Entrer dans un container

```bash
# Frontend
docker exec -it visiontrack-frontend sh

# Backend
docker exec -it visiontrack-backend bash

# IA Service
docker exec -it visiontrack-ia-service bash
```

**Pourquoi ?** Pour déboguer, installer des packages, ou inspecter les fichiers

**Exemple d'utilisation** :
```bash
# Entrer dans le backend
docker exec -it visiontrack-backend bash

# Une fois dans le container
ls /app/shared/uploads  # Voir les vidéos uploadées
ls /app/shared/results  # Voir les résultats
cat /app/shared/results/<video_id>.json  # Lire un résultat

# Sortir du container
exit
```

#### Installer un package dans un container en cours d'exécution

```bash
# Backend - Installer un nouveau package Python
docker exec -it visiontrack-backend pip install <package_name>

# Frontend - Installer un nouveau package npm
docker exec -it visiontrack-frontend npm install <package_name>
```

**⚠️ Attention** : Les modifications dans le container seront perdues au redémarrage. Pour les rendre permanentes, ajoutez le package dans `requirements.txt` (Python) ou `package.json` (npm) et reconstruisez.

---

## 📡 Endpoints API

### Backend (Port 8000)

| Méthode | Endpoint | Description | Body |
|---------|----------|-------------|------|
| GET | `/` | Health check | - |
| POST | `/upload-video` | Upload une vidéo | FormData avec `file` |
| POST | `/analyze` | Lance l'analyse | `{"video_id": "...", "zone": {...}}` |
| GET | `/results/{video_id}` | Récupère les résultats | - |
| GET | `/videos/{video_id}` | Stream la vidéo annotée | - |
| GET | `/export-video/{video_id}` | Télécharge la vidéo annotée | - |
| GET | `/export-results/{video_id}` | Télécharge les statistiques JSON | - |

### Service IA (Port 8001)

| Méthode | Endpoint | Description | Body |
|---------|----------|-------------|------|
| GET | `/` | Health check | - |
| POST | `/detect` | Détecte les personnes | `{"video_path": "...", "zone": {...}}` |
| GET | `/health` | État du modèle | - |

### Exemples de requêtes (cURL)

#### Upload d'une vidéo
```bash
curl -X POST "http://localhost:8000/upload-video" \
  -F "file=@/chemin/vers/video.mp4"
```

#### Lancer une analyse
```bash
curl -X POST "http://localhost:8000/analyze" \
  -H "Content-Type: application/json" \
  -d '{
    "video_id": "abc-123",
    "zone": {
      "x1": 100,
      "y1": 100,
      "x2": 500,
      "y2": 500
    }
  }'
```

---

## 📁 Structure du projet

```
VisionTrack/
│
├── frontend/                    # Service Frontend React.js
│   ├── public/                 # Fichiers statiques
│   │   └── index.html
│   ├── src/
│   │   ├── pages/              # Pages de l'application
│   │   │   ├── UploadPage.js   # Page 1 : Upload & Analyse
│   │   │   ├── UploadPage.css
│   │   │   ├── ResultsPage.js  # Page 2 : Résultats
│   │   │   └── ResultsPage.css
│   │   ├── App.js              # Composant principal
│   │   ├── App.css
│   │   ├── index.js            # Point d'entrée
│   │   └── index.css           # Styles globaux
│   ├── package.json            # Dépendances npm
│   ├── Dockerfile              # Configuration Docker
│   └── .env                    # Variables d'environnement
│
├── backend/                     # Service Backend FastAPI
│   ├── main.py                 # Application principale
│   ├── requirements.txt        # Dépendances Python
│   └── Dockerfile              # Configuration Docker
│
├── ia-service/                  # Service IA YOLOv8n
│   ├── main.py                 # Application principale
│   ├── requirements.txt        # Dépendances Python
│   └── Dockerfile              # Configuration Docker
│
├── docker-compose.yml          # Orchestration des services
├── .gitignore                  # Fichiers ignorés par Git
└── README.md                   # Ce fichier
```

---

## 🛠️ Développement

### Modifier le code

Le code est monté en volume dans les containers. Les modifications sont reflétées en temps réel :

- **Frontend** : React hot-reload automatique
- **Backend** : Uvicorn avec `--reload` activé
- **IA Service** : Redémarrage manuel nécessaire (ou ajouter `--reload`)

### Ajouter des dépendances

#### Python (Backend / IA Service)

1. Modifier `requirements.txt`
2. Reconstruire le service :
```bash
docker-compose up --build backend
# ou
docker-compose up --build ia-service
```

#### Node.js (Frontend)

1. Modifier `package.json`
2. Reconstruire le service :
```bash
docker-compose up --build frontend
```

### Déboguer

#### Voir les logs en temps réel
```bash
docker-compose logs -f <service_name>
```

#### Inspecter les volumes
```bash
# Lister les volumes
docker volume ls

# Inspecter le volume partagé
docker volume inspect visiontrack_shared-data
```

---

## 🐛 Troubleshooting

### Problème : Les containers ne démarrent pas

**Solution** :
```bash
docker-compose down
docker-compose build --no-cache
docker-compose up
```

### Problème : Port déjà utilisé (ex: 3000, 8000, 8001)

**Solution** : Modifier les ports dans `docker-compose.yml`
```yaml
ports:
  - "3001:3000"  # Au lieu de 3000:3000
```

### Problème : Le frontend ne peut pas se connecter au backend

**Vérifications** :
1. Le backend est bien démarré : `docker-compose logs backend`
2. L'URL dans le frontend est correcte : vérifier `frontend/.env`
3. CORS est bien configuré dans le backend

### Problème : L'analyse est très lente

**Optimisations possibles** :
1. Utiliser un GPU (décommenter la section GPU dans `docker-compose.yml`)
2. Réduire la résolution de la vidéo
3. Traiter seulement 1 frame sur N (modifier le code IA)

### Problème : Erreur "No space left on device"

**Solution** : Nettoyer Docker
```bash
# Supprimer les containers arrêtés
docker container prune

# Supprimer les images non utilisées
docker image prune

# Supprimer les volumes non utilisés
docker volume prune

# Tout nettoyer (⚠️ attention)
docker system prune -a --volumes
```

### Problème : Le modèle YOLO ne se télécharge pas

**Solution** : Télécharger manuellement
```bash
docker exec -it visiontrack-ia-service python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"
```

---

## 📝 Notes importantes

### Sécurité

⚠️ **Cette application est conçue pour le développement**. Pour la production :

1. Changer `allow_origins=["*"]` dans le backend pour spécifier les domaines autorisés
2. Ajouter une authentification pour les endpoints
3. Utiliser HTTPS
4. Limiter la taille des uploads
5. Ajouter une validation des fichiers uploadés

### Performance

- YOLOv8n est le modèle le plus léger. Pour plus de précision, utilisez YOLOv8s, YOLOv8m, etc.
- Pour de meilleures performances, utilisez un GPU
- Les vidéos de grande taille peuvent prendre du temps à analyser

### Stockage

- **Vidéos originales** : Supprimées automatiquement après l'analyse pour économiser l'espace
- **Vidéos annotées** : Conservées dans le volume Docker, téléchargeables via le bouton d'export
- **Résultats JSON** : Conservés dans le volume Docker, exportables via le bouton d'export
- Pour libérer l'espace : `docker-compose down -v` (⚠️ efface toutes les données stockées)

---

## 🤝 Contribution

Pour contribuer au projet :

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

---

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier `LICENSE` pour plus de détails.

---

## 👤 Auteur

Créé avec ❤️ pour l'analyse vidéo intelligente

---

## 🆘 Support

Pour toute question ou problème :

1. Consulter la section [Troubleshooting](#troubleshooting)
2. Vérifier les logs : `docker-compose logs`
3. Ouvrir une issue sur GitHub

---

**Bon développement ! 🚀**
