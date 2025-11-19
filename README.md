# 🎥 VisionTrack - Comptage de Personnes par IA

Application d'analyse vidéo utilisant l'intelligence artificielle pour détecter et compter les personnes dans des vidéos de surveillance.

## 📋 Qu'est-ce que VisionTrack ?

VisionTrack analyse automatiquement vos vidéos de surveillance pour :
- **Compter le nombre de personnes** ayant traversé une zone
- **Détecter le pic d'affluence** (nombre maximum de personnes simultanées)
- **Générer une vidéo annotée** avec les détections visibles
- **Exporter les statistiques** au format JSON

## 🚀 Démarrage Rapide

### Prérequis

- **Docker Desktop** installé sur votre ordinateur
  - [Télécharger Docker pour Windows](https://www.docker.com/products/docker-desktop)
  - [Télécharger Docker pour Mac](https://www.docker.com/products/docker-desktop)
- 2 Go d'espace disque libre minimum
- Une vidéo à analyser (MP4, AVI, MOV, etc.)

### Lancement en 2 étapes

#### 1. Démarrer l'application

**Sur Windows :**
```bash
start.bat
```

**Sur Mac/Linux :**
```bash
chmod +x start.sh    # Une seule fois
./start.sh
```

Le script va automatiquement :
- ✅ Vérifier que Docker est lancé
- ✅ Créer la configuration nécessaire
- ✅ Télécharger et construire les composants (5-10 min au premier lancement)
- ✅ Démarrer l'application

#### 2. Ouvrir l'application

Une fois que vous voyez ce message :
```
========================================
  VisionTrack est prêt !
========================================

Accédez à l'application:
  - Frontend:  http://localhost:3000
```

Ouvrez votre navigateur et allez sur : **http://localhost:3000**

## 🎯 Comment utiliser VisionTrack

### Étape 1 : Import & Analyse

1. **Choisir une vidéo**
   - Cliquez sur "Choisir une vidéo"
   - Sélectionnez votre vidéo de surveillance

2. **Choisir le mode d'analyse**
   - **Vidéo entière** : Analyse toute la vidéo
   - **Zone spécifique** : Dessinez un rectangle sur la zone à analyser

3. **Lancer l'analyse**
   - Cliquez sur "Analyser la vidéo"
   - Patientez quelques minutes (une animation s'affiche)

### Étape 2 : Consulter les Résultats

Vous obtenez automatiquement :

- **📊 Statistiques**
  - Nombre total de personnes détectées
  - Pic d'affluence maximum
  - Frame où le pic a été atteint

- **🎬 Vidéo annotée**
  - Vidéo avec les détections visibles
  - Identifiant de chaque personne (Track ID)
  - Possibilité de cliquer sur la timeline pour naviguer

- **📥 Export**
  - Télécharger la vidéo annotée (bouton "Télécharger la vidéo")
  - Exporter les statistiques JSON (bouton "Télécharger les résultats")

## ⚙️ Configuration (optionnel)

Le fichier `.env` permet de personnaliser :
- `CONFIDENCE_THRESHOLD` : Seuil de confiance des détections (0.5 par défaut)
- `VIDEO_CODEC` : Format vidéo (H264 recommandé)
- `TRACKER_CONFIG` : Fichier de configuration du tracker

## 🔧 Commandes Utiles

### Arrêter l'application
```bash
docker-compose down
```

### Redémarrer l'application
```bash
docker-compose up -d
```

### Voir les logs en direct
```bash
docker-compose logs -f
```

### Nettoyer complètement (en cas de problème)
```bash
docker-compose down -v
docker-compose up --build
```

## 🐛 Problèmes Fréquents

### Docker Desktop n'est pas lancé
**Solution** : Lancez Docker Desktop et attendez qu'il soit complètement démarré (icône bleue dans la barre des tâches).

### Port déjà utilisé (3000, 8000 ou 8001)
**Solution** : Un autre programme utilise ce port. Fermez-le ou modifiez le port dans `docker-compose.yml`.

### L'analyse est très lente
**Causes** :
- Vidéo trop longue (> 5 minutes)
- Résolution trop élevée (4K)

**Solutions** :
- Testez avec une vidéo plus courte (30 sec - 2 min)
- Réduisez la résolution de votre vidéo avant l'upload

### Pas assez de mémoire
**Solution** : Dans Docker Desktop → Settings → Resources → Memory, allouez au moins 4 Go.

## 📁 Où sont stockées mes données ?

- **Vidéos uploadées** : Supprimées automatiquement après l'analyse
- **Vidéos annotées** : Stockées dans Docker, téléchargeables via l'interface
- **Statistiques JSON** : Stockées dans Docker, téléchargeables via l'interface
- **Nettoyage** : `docker-compose down -v` efface toutes les données

## 📚 Documentation Technique

Pour les développeurs ou utilisateurs avancés, consultez [DOCUMENTATION.md](DOCUMENTATION.md) pour :
- Architecture détaillée
- Routes API
- Configuration avancée
- Tracking et comptage
- Développement

## 🆘 Support

En cas de problème :
1. Consultez la section [Problèmes Fréquents](#-problèmes-fréquents)
2. Vérifiez les logs : `docker-compose logs`
3. Consultez la [documentation technique](DOCUMENTATION.md)
4. Ouvrez une issue sur GitHub

## 📝 Notes Importantes

⚠️ **Attention** : Cette application est conçue pour un usage local et de développement. Pour une utilisation en production, des mesures de sécurité supplémentaires sont nécessaires.

## 📄 Licence

Ce projet est sous licence MIT.

---

**Bon comptage ! 🚀**
