@echo off
REM Script de démarrage rapide pour Windows
echo ========================================
echo VisionTrack - Démarrage de l'application
echo ========================================
echo.

REM Vérifier si Docker est installé
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERREUR: Docker n'est pas installé ou n'est pas dans le PATH
    echo Veuillez installer Docker Desktop pour Windows
    pause
    exit /b 1
)

REM Vérifier si Docker Compose est installé
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERREUR: Docker Compose n'est pas installé
    echo Veuillez installer Docker Compose
    pause
    exit /b 1
)

echo Docker est installé ✓
echo.

REM Vérifier si c'est le premier lancement
docker images | find "visiontrack" >nul
if %errorlevel% neq 0 (
    echo Premier lancement détecté - Build des images...
    echo Cela peut prendre 5-10 minutes...
    echo.
    docker-compose build
    if %errorlevel% neq 0 (
        echo ERREUR lors du build
        pause
        exit /b 1
    )
)

echo Démarrage des services...
echo.
docker-compose up

pause
