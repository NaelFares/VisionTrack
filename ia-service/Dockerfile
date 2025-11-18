# Dockerfile pour le service IA avec YOLOv8n
# Image de base Python
FROM python:3.11-slim

# Installer les dépendances système nécessaires pour OpenCV et encodage H.264
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    ffmpeg \
    libx264-dev \
    && rm -rf /var/lib/apt/lists/*

# Définir le répertoire de travail
WORKDIR /app

# Copier les dépendances
COPY requirements.txt .

# Installer les dépendances Python
RUN pip install --no-cache-dir -r requirements.txt

# Note: Le modèle YOLOv8n sera téléchargé automatiquement au premier lancement
# (environ 6 MB, prend quelques secondes)

# Copier le code source
COPY . .

# Exposer le port 8001
EXPOSE 8001

# Démarrer l'application avec Uvicorn
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8001"]
