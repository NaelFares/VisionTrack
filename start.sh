#!/bin/bash
# Script de démarrage automatique pour Unix/Mac/Linux
# Ce script permet de lancer VisionTrack avec juste Docker installé

echo "========================================"
echo "  VisionTrack - Lancement automatique"
echo "========================================"
echo ""

# Vérifier si Docker est installé
echo "[1/7] Vérification de Docker..."
if ! command -v docker &> /dev/null; then
    echo "ERREUR: Docker n'est pas installé"
    echo "Veuillez installer Docker: https://docs.docker.com/get-docker/"
    exit 1
fi
echo "     Docker est installé ✓"
echo ""

# Vérifier si Docker daemon est en cours d'exécution
echo "[1.5/7] Vérification que Docker est lancé..."
if ! docker info &> /dev/null; then
    echo "     Docker n'est pas lancé, tentative de démarrage..."

    # Détecter l'OS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS - Lancer Docker Desktop
        echo "     Détection macOS - Lancement de Docker Desktop..."
        open -a Docker

        # Attendre que Docker soit prêt (max 60 secondes)
        counter=0
        while [ $counter -lt 30 ]; do
            sleep 2
            if docker info &> /dev/null; then
                echo "     Docker Desktop est maintenant lancé ✓"
                break
            fi
            counter=$((counter + 1))
        done

        if [ $counter -eq 30 ]; then
            echo "ERREUR: Docker Desktop ne répond pas après 60 secondes"
            echo "Veuillez lancer Docker Desktop manuellement et réessayer"
            exit 1
        fi
    else
        # Linux - Démarrer le service Docker
        echo "     Détection Linux - Tentative de démarrage du service Docker..."

        # Essayer systemctl d'abord
        if command -v systemctl &> /dev/null; then
            sudo systemctl start docker
        # Sinon essayer service
        elif command -v service &> /dev/null; then
            sudo service docker start
        else
            echo "ERREUR: Impossible de démarrer Docker automatiquement"
            echo "Veuillez démarrer Docker manuellement avec:"
            echo "  sudo systemctl start docker"
            echo "ou:"
            echo "  sudo service docker start"
            exit 1
        fi

        # Attendre que Docker soit prêt
        sleep 3
        if docker info &> /dev/null; then
            echo "     Service Docker démarré ✓"
        else
            echo "ERREUR: Impossible de démarrer Docker"
            echo "Vérifiez les permissions ou démarrez manuellement"
            exit 1
        fi
    fi
else
    echo "     Docker est déjà lancé ✓"
fi
echo ""

# Vérifier si Docker Compose est installé
if ! command -v docker-compose &> /dev/null; then
    echo "ERREUR: Docker Compose n'est pas installé"
    echo "Veuillez installer Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi
echo "     Docker Compose est installé ✓"
echo ""

# Créer le fichier .env s'il n'existe pas
echo "[2/7] Configuration de l'environnement..."
if [ ! -f .env ]; then
    echo "     .env n'existe pas, création depuis .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "     Fichier .env créé avec succès ✓"
    else
        echo "ERREUR: Le fichier .env.example est introuvable"
        exit 1
    fi
else
    echo "     Fichier .env déjà présent ✓"
fi
echo ""

# Arrêter les services existants proprement
echo "[3/7] Arrêt des services existants..."
docker-compose down &> /dev/null
echo "     Services arrêtés ✓"
echo ""

# Build des images
echo "[4/7] Construction des images Docker..."
echo "     Cela peut prendre 5-10 minutes au premier lancement..."
docker-compose build
if [ $? -ne 0 ]; then
    echo "ERREUR: Échec lors de la construction des images"
    exit 1
fi
echo "     Images construites avec succès ✓"
echo ""

# Démarrer les services en mode détaché
echo "[5/7] Démarrage des services..."
docker-compose up -d
if [ $? -ne 0 ]; then
    echo "ERREUR: Échec du démarrage des services"
    exit 1
fi
echo ""

# Attendre que les services démarrent
echo "[6/7] Attente du démarrage des services..."
sleep 15
echo ""

# Afficher le statut
echo "========================================"
echo "  Statut des services:"
echo "========================================"
docker-compose ps
echo ""

echo "========================================"
echo "  VisionTrack est prêt !"
echo "========================================"
echo ""
echo "Accédez à l'application:"
echo "  - Frontend:   http://localhost:3000"
echo "  - Backend:    http://localhost:8000/docs"
echo "  - IA Service: http://localhost:8001/docs"
echo ""
echo "Pour voir les logs:   docker-compose logs -f"
echo "Pour arrêter:         docker-compose down"
echo ""
echo "Appuyez sur Entrée pour continuer..."
read
