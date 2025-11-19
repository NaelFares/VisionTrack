@echo off
setlocal enabledelayedexpansion
REM Script de démarrage automatique pour Windows
REM Ce script permet de lancer VisionTrack avec juste Docker installé
echo ========================================
echo   VisionTrack - Lancement automatique
echo ========================================
echo.

REM Vérifier si Docker est installé
echo [1/7] Verification de Docker...
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERREUR: Docker n'est pas installe ou n'est pas dans le PATH
    echo Veuillez installer Docker Desktop pour Windows
    echo https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)
echo      Docker est installe
echo.

REM Vérifier si Docker Desktop est en cours d'exécution
echo [1.5/7] Verification que Docker Desktop est lance...
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo      Docker Desktop n'est pas lance, tentative de demarrage...

    REM Tenter de lancer Docker Desktop
    start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"

    REM Attendre que Docker soit prêt (max 60 secondes)
    echo      Attente du demarrage de Docker Desktop...
    set counter=0
    :wait_docker
    timeout /t 2 /nobreak >nul
    docker info >nul 2>&1
    if !errorlevel! equ 0 (
        echo.
        echo      Docker Desktop est maintenant lance
        goto docker_ready
    )
    set /a counter+=1
    echo      Tentative !counter!/30...
    if !counter! lss 30 goto wait_docker

    echo.
    echo ERREUR: Docker Desktop ne repond pas apres 60 secondes
    echo Veuillez lancer Docker Desktop manuellement et reessayer
    pause
    exit /b 1
) else (
    echo      Docker Desktop est deja lance
)
:docker_ready
echo.

REM Vérifier si Docker Compose est installé
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERREUR: Docker Compose n'est pas installe
    echo Veuillez installer Docker Compose
    pause
    exit /b 1
)
echo      Docker Compose est installe
echo.

REM Créer le fichier .env s'il n'existe pas
echo [2/7] Configuration de l'environnement...
if not exist .env (
    echo      .env n'existe pas, creation depuis .env.example...
    if exist .env.example (
        copy .env.example .env >nul
        echo      Fichier .env cree avec succes
    ) else (
        echo ERREUR: Le fichier .env.example est introuvable
        pause
        exit /b 1
    )
) else (
    echo      Fichier .env deja present
)
echo.

REM Arrêter les services existants proprement et supprimer les volumes
echo [3/7] Arret des services existants et nettoyage des volumes...
docker-compose down -v >nul 2>&1
echo      Services arretes et volumes VisionTrack nettoyes
echo.

REM Build des images
echo [4/7] Construction des images Docker...
echo      Cela peut prendre 5-10 minutes au premier lancement...
docker-compose build
if %errorlevel% neq 0 (
    echo ERREUR: Echec lors de la construction des images
    pause
    exit /b 1
)
echo      Images construites avec succes
echo.

REM Démarrer les services en mode détaché
echo [5/7] Demarrage des services...
docker-compose up -d
if %errorlevel% neq 0 (
    echo ERREUR: Echec du demarrage des services
    pause
    exit /b 1
)
echo.

REM Attendre que les services démarrent
echo [6/7] Attente du demarrage des services...
timeout /t 15 /nobreak >nul
echo.

REM Afficher le statut
echo ========================================
echo   Statut des services:
echo ========================================
docker-compose ps
echo.

echo ========================================
echo   VisionTrack est pret !
echo ========================================
echo.
echo Accedez a l'application:
echo   - Frontend:  http://localhost:3000
echo   - Backend:   http://localhost:8000/docs
echo   - IA Service: http://localhost:8001/docs
echo.
echo Pour voir les logs:   docker-compose logs -f
echo Pour arreter:         docker-compose down
echo.
pause
