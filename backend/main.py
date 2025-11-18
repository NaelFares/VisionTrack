"""
Backend FastAPI pour VisionTrack
Gère l'upload de vidéos, l'orchestration de l'analyse et le stockage des résultats
"""

import os
import json
import uuid
from pathlib import Path
from typing import Dict, List, Optional

from fastapi import FastAPI, File, UploadFile, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx

# Initialisation de l'application FastAPI
app = FastAPI(
    title="VisionTrack Backend",
    description="API pour l'analyse vidéo intelligente",
    version="1.0.0"
)

# Configuration CORS pour permettre les requêtes du frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En production, spécifier les domaines autorisés
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration des répertoires de stockage
UPLOAD_DIR = Path("/app/shared/uploads")
RESULTS_DIR = Path("/app/shared/results")

# Créer les répertoires s'ils n'existent pas
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
RESULTS_DIR.mkdir(parents=True, exist_ok=True)

# URL du service IA (nom du service Docker)
IA_SERVICE_URL = os.getenv("IA_SERVICE_URL", "http://ia-service:8001")


# ========== Modèles Pydantic pour la validation des données ==========

class Zone(BaseModel):
    """Modèle pour la zone d'analyse (rectangle)"""
    x1: float
    y1: float
    x2: float
    y2: float


class AnalyzeRequest(BaseModel):
    """Requête pour lancer une analyse"""
    video_id: str
    zone: Optional[Zone] = None


class DetectionBox(BaseModel):
    """Bounding box d'une détection"""
    x1: float
    y1: float
    x2: float
    y2: float
    confidence: float


class FrameDetection(BaseModel):
    """Détections pour un frame spécifique"""
    frame: int
    boxes: List[DetectionBox]


class Statistics(BaseModel):
    """Statistiques d'analyse"""
    total_people: int
    max_people_simultaneous: int
    frame_of_max: int


class AnalysisResults(BaseModel):
    """Résultats complets de l'analyse"""
    video_id: str
    stats: Statistics
    detections: List[FrameDetection]


# ========== Endpoints de l'API ==========

@app.get("/")
async def root():
    """Endpoint racine pour vérifier que l'API fonctionne"""
    return {
        "message": "VisionTrack Backend API",
        "version": "1.0.0",
        "status": "running"
    }


@app.post("/upload-video")
async def upload_video(file: UploadFile = File(...)):
    """
    Endpoint pour uploader une vidéo

    Args:
        file: Fichier vidéo uploadé

    Returns:
        Dict avec le video_id généré
    """
    # Vérifier que c'est bien un fichier vidéo
    if not file.content_type.startswith('video/'):
        raise HTTPException(status_code=400, detail="Le fichier doit être une vidéo")

    # Générer un ID unique pour la vidéo
    video_id = str(uuid.uuid4())

    # Obtenir l'extension du fichier original
    file_extension = Path(file.filename).suffix

    # Chemin de sauvegarde
    video_path = UPLOAD_DIR / f"{video_id}{file_extension}"

    # Sauvegarder le fichier
    try:
        with open(video_path, "wb") as f:
            content = await file.read()
            f.write(content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la sauvegarde : {str(e)}")

    return {
        "video_id": video_id,
        "filename": file.filename,
        "size": len(content),
        "message": "Vidéo uploadée avec succès"
    }


@app.post("/analyze")
async def analyze_video(request: AnalyzeRequest):
    """
    Endpoint pour lancer l'analyse d'une vidéo

    Args:
        request: Contient video_id et zone d'analyse

    Returns:
        Dict avec les statistiques d'analyse
    """
    print("\n" + "="*80)
    print("BACKEND - DÉBUT DE L'ANALYSE")
    print("="*80)

    video_id = request.video_id
    zone = request.zone

    print(f"Video ID reçu : {video_id}")
    if zone:
        print(f"Zone reçue : x1={zone.x1}, y1={zone.y1}, x2={zone.x2}, y2={zone.y2}")
    else:
        print("Zone : VIDÉO ENTIÈRE (aucune zone spécifiée)")

    # Trouver le fichier vidéo
    video_files = list(UPLOAD_DIR.glob(f"{video_id}.*"))
    if not video_files:
        print(f"ERREUR : Vidéo non trouvée pour l'ID {video_id}")
        raise HTTPException(status_code=404, detail="Vidéo non trouvée")

    video_path = str(video_files[0])
    print(f"✓ Vidéo trouvée : {video_path}")

    # Préparer la requête pour le service IA
    ia_request_data = {
        "video_path": video_path
    }

    # Ajouter la zone seulement si elle est spécifiée
    if zone:
        ia_request_data["zone"] = {
            "x1": zone.x1,
            "y1": zone.y1,
            "x2": zone.x2,
            "y2": zone.y2
        }

    # Appeler le service IA
    print(f"Appel du service IA : {IA_SERVICE_URL}/detect")
    try:
        async with httpx.AsyncClient(timeout=300.0) as client:  # Timeout de 5 minutes
            response = await client.post(
                f"{IA_SERVICE_URL}/detect",
                json=ia_request_data
            )
            response.raise_for_status()
            detections_data = response.json()

        print(f"✓ Réponse reçue du service IA")
        print(f"  Clés dans la réponse : {list(detections_data.keys())}")
    except httpx.RequestError as e:
        print(f"ERREUR : Communication avec le service IA impossible - {str(e)}")
        raise HTTPException(status_code=503, detail=f"Erreur de communication avec le service IA : {str(e)}")
    except httpx.HTTPStatusError as e:
        print(f"ERREUR : Le service IA a renvoyé une erreur HTTP {e.response.status_code}")
        raise HTTPException(status_code=e.response.status_code, detail=f"Erreur du service IA : {str(e)}")

    # Extraire les détections et le chemin de la vidéo annotée
    detections = detections_data.get("detections", [])
    annotated_video_path = detections_data.get("annotated_video_path", "")

    print(f"Détections extraites : {len(detections)} frames avec détections")
    print(f"Vidéo annotée : {annotated_video_path}")

    # Calculer les statistiques
    stats = calculate_statistics(detections)

    print(f"Statistiques calculées :")
    print(f"  - Total personnes : {stats['total_people']}")
    print(f"  - Max simultané : {stats['max_people_simultaneous']}")
    print(f"  - Frame du max : {stats['frame_of_max']}")

    # Préparer les résultats complets
    results = {
        "video_id": video_id,
        "stats": stats,
        "detections": detections,
        "annotated_video_path": annotated_video_path
    }

    # Sauvegarder les résultats dans un fichier JSON
    results_path = RESULTS_DIR / f"{video_id}.json"
    print(f"Sauvegarde des résultats dans : {results_path}")
    try:
        with open(results_path, "w") as f:
            json.dump(results, f, indent=2)
        print(f"✓ Résultats sauvegardés ({results_path.stat().st_size} bytes)")
    except Exception as e:
        print(f"ERREUR : Impossible de sauvegarder les résultats - {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la sauvegarde des résultats : {str(e)}")

    print("="*80)
    print("BACKEND - FIN DE L'ANALYSE")
    print("="*80 + "\n")

    return {
        "message": "Analyse terminée avec succès",
        "stats": stats
    }


@app.get("/results/{video_id}")
async def get_results(video_id: str):
    """
    Endpoint pour récupérer les résultats d'une analyse

    Args:
        video_id: ID de la vidéo

    Returns:
        Résultats complets de l'analyse
    """
    print(f"\nBACKEND - Requête GET /results/{video_id}")
    results_path = RESULTS_DIR / f"{video_id}.json"

    if not results_path.exists():
        print(f"ERREUR : Fichier de résultats non trouvé à {results_path}")
        # Lister les fichiers disponibles pour debug
        available_files = list(RESULTS_DIR.glob("*.json"))
        print(f"Fichiers disponibles dans {RESULTS_DIR}: {[f.name for f in available_files]}")
        raise HTTPException(status_code=404, detail="Résultats non trouvés")

    print(f"✓ Fichier de résultats trouvé : {results_path}")
    try:
        with open(results_path, "r") as f:
            results = json.load(f)
        print(f"✓ Résultats chargés : {len(results.get('detections', []))} détections")
        print(f"  Stats : {results.get('stats')}")
    except Exception as e:
        print(f"ERREUR : Impossible de lire les résultats - {str(e)}")
        raise HTTPException(status_code=500, detail=f"Erreur lors de la lecture des résultats : {str(e)}")

    return results


@app.get("/videos/{video_id}")
async def get_video(video_id: str):
    """
    Endpoint pour récupérer une vidéo uploadée

    Args:
        video_id: ID de la vidéo

    Returns:
        Fichier vidéo
    """
    # Trouver le fichier vidéo
    video_files = list(UPLOAD_DIR.glob(f"{video_id}.*"))
    if not video_files:
        raise HTTPException(status_code=404, detail="Vidéo non trouvée")

    video_path = video_files[0]

    return FileResponse(
        video_path,
        media_type="video/mp4",
        filename=f"{video_id}{video_path.suffix}"
    )


@app.get("/annotated-videos/{video_id}")
async def get_annotated_video(video_id: str):
    """
    Endpoint pour récupérer la vidéo annotée avec les bounding boxes

    Args:
        video_id: ID de la vidéo

    Returns:
        Fichier vidéo annoté
    """
    # Le chemin de la vidéo annotée est dans le volume partagé
    annotated_path = Path("/app/shared/annotated") / f"{video_id}_annotated.mp4"

    if not annotated_path.exists():
        raise HTTPException(status_code=404, detail="Vidéo annotée non trouvée")

    return FileResponse(
        annotated_path,
        media_type="video/mp4",
        filename=f"{video_id}_annotated.mp4"
    )


# ========== Fonctions utilitaires ==========

def calculate_statistics(detections: List[Dict]) -> Dict:
    """
    Calcule les statistiques à partir des détections

    Args:
        detections: Liste des détections par frame

    Returns:
        Dict avec les statistiques calculées
    """
    if not detections:
        return {
            "total_people": 0,
            "max_people_simultaneous": 0,
            "frame_of_max": 0
        }

    # Compter le total de personnes détectées (avec dédoublonnage approximatif)
    # Note : dans une version plus avancée, on pourrait implémenter un tracking
    total_people = 0
    max_people = 0
    frame_of_max = 0

    for detection in detections:
        frame_num = detection["frame"]
        num_people = len(detection["boxes"])

        # Mettre à jour le maximum
        if num_people > max_people:
            max_people = num_people
            frame_of_max = frame_num

        # Pour le total, on compte simplement toutes les détections
        # Dans une version avancée, on utiliserait un algorithme de tracking
        total_people += num_people

    return {
        "total_people": total_people,
        "max_people_simultaneous": max_people,
        "frame_of_max": frame_of_max
    }


# ========== Gestion des erreurs ==========

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Gestionnaire global des exceptions"""
    return JSONResponse(
        status_code=500,
        content={
            "detail": f"Erreur interne du serveur : {str(exc)}"
        }
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
