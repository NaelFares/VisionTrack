# 🚀 Guide de Démarrage Rapide - VisionTrack

Ce guide vous permet de lancer VisionTrack en **5 minutes**.

## Prérequis

- Docker Desktop installé et en cours d'exécution
- 2 Go d'espace disque libre minimum
- Une vidéo de surveillance à analyser (format MP4, AVI, MOV, etc.)

## Étapes de lancement

### 1. Démarrer l'application

**Windows:**
```bash
# Double-cliquer sur start.bat
# OU dans un terminal:
start.bat
```

**Mac/Linux:**
```bash
# Rendre le script exécutable (une seule fois)
chmod +x start.sh

# Lancer
./start.sh
```

**Ou manuellement:**
```bash
docker-compose up --build
```

### 2. Attendre que tous les services démarrent

Vous devriez voir ces messages dans la console :
```
visiontrack-frontend    | Compiled successfully!
visiontrack-backend     | INFO:     Application startup complete.
visiontrack-ia-service  | INFO:     Application startup complete.
```

⏱️ **Temps d'attente** :
- Premier lancement : 5-10 minutes (téléchargement + build)
- Lancements suivants : 30 secondes

### 3. Ouvrir l'application

Ouvrez votre navigateur et allez sur : **http://localhost:3000**

### 4. Utiliser l'application

#### Page "Import & Analyse"

1. **Cliquer sur "Choisir une vidéo"**
   - Sélectionner une vidéo de surveillance (de préférence avec des personnes)
   - Formats supportés : MP4, AVI, MOV, MKV, etc.

2. **Cliquer sur "Uploader la vidéo"**
   - Attendre que l'upload se termine
   - Vous verrez un message de succès

3. **Définir la zone d'analyse**
   - La vidéo s'affiche avec un overlay
   - **Cliquer et glisser** sur la vidéo pour dessiner un rectangle
   - Ce rectangle définit la zone où les personnes seront comptées

4. **Cliquer sur "Analyser la vidéo"**
   - L'analyse démarre (peut prendre quelques minutes selon la durée de la vidéo)
   - Vous serez automatiquement redirigé vers la page de résultats

#### Page "Résultats"

Une fois l'analyse terminée, vous verrez :

- **Statistiques** :
  - Total de personnes détectées
  - Pic simultané maximum
  - Frame du pic

- **Vidéo analysée** :
  - Lecture de la vidéo originale
  - Frame actuel affiché

- **Détections** :
  - Liste des personnes détectées dans le frame actuel
  - Coordonnées des bounding boxes
  - Niveau de confiance de chaque détection

- **Timeline** :
  - Graphique visuel des détections dans le temps
  - Le pic est affiché en rouge

## Exemple de test avec une vidéo de démonstration

Si vous n'avez pas de vidéo de surveillance, vous pouvez :

1. **Télécharger une vidéo de test gratuite** :
   - [Pexels - Videos](https://www.pexels.com/search/videos/people%20walking/)
   - [Pixabay - Videos](https://pixabay.com/videos/search/pedestrians/)

2. **Utiliser votre webcam** :
   - Enregistrer une courte vidéo avec votre webcam
   - Vous pouvez utiliser l'application Caméra de Windows ou QuickTime sur Mac

## Vérification rapide que tout fonctionne

### Tester le Backend
```bash
curl http://localhost:8000/
```

Réponse attendue :
```json
{
  "message": "VisionTrack Backend API",
  "version": "1.0.0",
  "status": "running"
}
```

### Tester le Service IA
```bash
curl http://localhost:8001/health
```

Réponse attendue :
```json
{
  "status": "healthy",
  "model_loaded": true,
  "model_name": "YOLOv8n"
}
```

## Arrêter l'application

Appuyez sur **Ctrl+C** dans le terminal, puis :

```bash
docker-compose down
```

## Relancer l'application (après le premier build)

```bash
docker-compose up
```

⚡ Le lancement sera beaucoup plus rapide (30 secondes environ).

## Troubleshooting rapide

### Problème : Port déjà utilisé

**Erreur** : `Bind for 0.0.0.0:3000 failed: port is already allocated`

**Solution** : Un autre programme utilise le port. Modifier le port dans `docker-compose.yml` :
```yaml
ports:
  - "3001:3000"  # Utiliser 3001 au lieu de 3000
```

### Problème : Docker n'est pas lancé

**Erreur** : `Cannot connect to the Docker daemon`

**Solution** : Lancer Docker Desktop et attendre qu'il soit complètement démarré.

### Problème : Pas assez de mémoire

**Erreur** : Build échoue ou containers s'arrêtent

**Solution** : Dans Docker Desktop, augmenter la mémoire allouée (Settings → Resources → Memory : minimum 4 GB recommandé).

### Problème : L'analyse est très lente

**Causes possibles** :
- Vidéo très longue (> 5 minutes)
- Résolution très élevée (4K)
- Pas de GPU disponible

**Solutions** :
- Tester avec une vidéo plus courte (30 secondes - 2 minutes)
- Réduire la résolution de la vidéo avant upload
- Si vous avez un GPU NVIDIA, décommenter la section GPU dans `docker-compose.yml`

## Prochaines étapes

- Lire le [README.md](README.md) complet pour plus de détails
- Consulter les [endpoints API](README.md#endpoints-api)
- Explorer le code dans les dossiers `frontend/`, `backend/`, et `ia-service/`

## Support

En cas de problème :
1. Consulter les logs : `docker-compose logs`
2. Lire la section [Troubleshooting du README](README.md#troubleshooting)
3. Ouvrir une issue sur GitHub

---

**Bon test ! 🎉**
