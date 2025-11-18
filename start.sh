#!/bin/bash
# Script de démarrage rapide pour Unix/Mac/Linux

echo "========================================"
echo "VisionTrack - Démarrage de l'application"
echo "========================================"
echo ""

# Vérifier si Docker est installé
if ! command -v docker &> /dev/null; then
    echo "ERREUR: Docker n'est pas installé"
    echo "Veuillez installer Docker: https://docs.docker.com/get-docker/"
    exit 1
fi

# Vérifier si Docker Compose est installé
if ! command -v docker-compose &> /dev/null; then
    echo "ERREUR: Docker Compose n'est pas installé"
    echo "Veuillez installer Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

echo "Docker est installé ✓"
echo ""

# Vérifier si c'est le premier lancement
if ! docker images | grep -q "visiontrack"; then
    echo "Premier lancement détecté - Build des images..."
    echo "Cela peut prendre 5-10 minutes..."
    echo ""
    docker-compose build
    if [ $? -ne 0 ]; then
        echo "ERREUR lors du build"
        exit 1
    fi
fi

echo "Démarrage des services..."
echo ""
echo "L'application sera accessible sur:"
echo "  - Frontend: http://localhost:3000"
echo "  - Backend:  http://localhost:8000"
echo "  - IA:       http://localhost:8001"
echo ""
echo "Appuyez sur Ctrl+C pour arrêter"
echo ""

docker-compose up
