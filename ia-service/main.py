"""
Service IA pour VisionTrack
Utilise YOLOv8n pour détecter les personnes dans les vidéos
"""

import os
from pathlib import Path
from typing import List, Dict, Optional

import cv2
import numpy as np
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from ultralytics import YOLO

# Initialisation de l'application FastAPI
app = FastAPI(
    title="VisionTrack IA Service",
    description="Service de détection de personnes avec YOLOv8n",
    version="1.0.0"
)

# Variable globale pour le modèle (chargement lazy)
model = None

def get_model():
    """
    Charge le modèle YOLO de manière lazy (seulement quand nécessaire)
    et le met en cache pour les appels suivants
    """
    global model
    if model is None:
        print("Chargement du modèle YOLOv8n...")
        model = YOLO('yolov8n.pt')
        print("Modèle YOLOv8n chargé avec succès!")
    return model


# ========== Modèles Pydantic pour la validation des données ==========

class Zone(BaseModel):
    """Modèle pour la zone d'analyse (rectangle)"""
    x1: float
    y1: float
    x2: float
    y2: float


class DetectRequest(BaseModel):
    """Requête pour la détection"""
    video_path: str
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


class DetectionResponse(BaseModel):
    """Réponse de détection"""
    message: str
    total_frames: int
    detections: List[FrameDetection]
    annotated_video_path: str


# ========== Endpoints de l'API ==========

@app.get("/")
async def root():
    """Endpoint racine pour vérifier que le service fonctionne"""
    return {
        "message": "VisionTrack IA Service",
        "version": "1.0.0",
        "model": "YOLOv8n",
        "status": "running"
    }


@app.post("/detect", response_model=DetectionResponse)
async def detect_people(request: DetectRequest):
    """
    Endpoint principal pour détecter les personnes dans une vidéo

    Args:
        request: Contient le chemin de la vidéo et la zone d'analyse

    Returns:
        Liste des détections par frame avec statistiques et vidéo annotée
    """
    print("\n" + "="*80)
    print("DÉBUT DE L'ANALYSE VIDÉO")
    print("="*80)

    video_path = request.video_path
    zone = request.zone

    print(f"Chemin vidéo reçu : {video_path}")
    if zone:
        print(f"Zone d'analyse : x1={zone.x1}, y1={zone.y1}, x2={zone.x2}, y2={zone.y2}")
    else:
        print("Zone d'analyse : VIDÉO ENTIÈRE (aucune zone spécifiée)")

    # Vérifier que le fichier vidéo existe
    if not Path(video_path).exists():
        print(f"ERREUR : Vidéo non trouvée à {video_path}")
        raise HTTPException(status_code=404, detail=f"Vidéo non trouvée : {video_path}")

    print(f"✓ Fichier vidéo trouvé : {Path(video_path).stat().st_size} bytes")

    # Ouvrir la vidéo avec OpenCV
    cap = cv2.VideoCapture(video_path)

    if not cap.isOpened():
        print("ERREUR : Impossible d'ouvrir la vidéo avec OpenCV")
        raise HTTPException(status_code=400, detail="Impossible d'ouvrir la vidéo")

    # Récupérer les informations de la vidéo
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    print(f"✓ Vidéo ouverte avec succès")
    print(f"  - Total frames : {total_frames}")
    print(f"  - FPS : {fps}")
    print(f"  - Résolution : {width}x{height}")

    # Si aucune zone n'est spécifiée, utiliser la vidéo entière
    if zone is None:
        zone = Zone(x1=0, y1=0, x2=width, y2=height)
        print(f"✓ Zone définie sur vidéo entière : (0, 0) -> ({width}, {height})")

    # Créer le répertoire pour les vidéos annotées
    annotated_dir = Path("/app/shared/annotated")
    annotated_dir.mkdir(parents=True, exist_ok=True)
    print(f"✓ Répertoire annotated créé/vérifié : {annotated_dir}")

    # Générer le nom du fichier de sortie pour la vidéo annotée
    video_id = Path(video_path).stem
    annotated_video_path = annotated_dir / f"{video_id}_annotated.mp4"

    print(f"Chemin de sortie pour vidéo annotée : {annotated_video_path}")

    # Créer le VideoWriter pour la vidéo annotée
    fourcc = cv2.VideoWriter_fourcc(*'mp4v')
    out = cv2.VideoWriter(str(annotated_video_path), fourcc, fps, (width, height))

    if not out.isOpened():
        print("ERREUR : Impossible de créer le VideoWriter")
        cap.release()
        raise HTTPException(status_code=500, detail="Impossible de créer la vidéo annotée")

    print(f"✓ VideoWriter créé avec succès")

    # Charger le modèle (lazy loading)
    print("Chargement du modèle YOLO...")
    yolo_model = get_model()
    print("✓ Modèle YOLO chargé")

    # Liste pour stocker toutes les détections
    all_detections = []

    frame_number = 0

    try:
        while True:
            # Lire le frame suivant
            ret, frame = cap.read()

            if not ret:
                break  # Fin de la vidéo

            # Créer une copie du frame pour l'annotation
            annotated_frame = frame.copy()

            # Dessiner la zone d'analyse sur le frame (rectangle semi-transparent)
            overlay = annotated_frame.copy()
            cv2.rectangle(overlay,
                         (int(zone.x1), int(zone.y1)),
                         (int(zone.x2), int(zone.y2)),
                         (91, 127, 255), 2)  # Bleu clair, épaisseur 2
            cv2.addWeighted(overlay, 0.3, annotated_frame, 0.7, 0, annotated_frame)

            # Exécuter YOLOv8n sur le frame
            # verbose=False pour réduire les logs
            results = yolo_model(frame, verbose=False)

            # Filtrer les détections de personnes dans la zone
            frame_boxes = []

            # YOLO renvoie les résultats, on parcourt les détections
            for result in results:
                # Extraire les boxes, classes et confidences
                boxes = result.boxes

                for box in boxes:
                    # Vérifier si c'est une personne (classe 0 dans COCO)
                    class_id = int(box.cls[0])
                    if class_id != 0:  # 0 = personne dans le dataset COCO
                        continue

                    # Extraire les coordonnées et la confiance
                    x1, y1, x2, y2 = box.xyxy[0].tolist()
                    confidence = float(box.conf[0])

                    # Calculer le centre de la bounding box
                    center_x = (x1 + x2) / 2
                    center_y = (y1 + y2) / 2

                    # Vérifier si le centre est dans la zone d'analyse
                    if is_point_in_zone(center_x, center_y, zone):
                        frame_boxes.append({
                            "x1": x1,
                            "y1": y1,
                            "x2": x2,
                            "y2": y2,
                            "confidence": confidence
                        })

                        # Dessiner la bounding box sur le frame annoté
                        # Rectangle vert avec épaisseur 2
                        cv2.rectangle(annotated_frame,
                                    (int(x1), int(y1)),
                                    (int(x2), int(y2)),
                                    (74, 222, 128), 3)  # Vert accent

                        # Ajouter le label avec la confiance
                        label = f"Person {confidence:.2f}"
                        label_size, _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)

                        # Dessiner le fond du label
                        cv2.rectangle(annotated_frame,
                                    (int(x1), int(y1) - label_size[1] - 10),
                                    (int(x1) + label_size[0], int(y1)),
                                    (74, 222, 128), -1)  # Fond vert

                        # Dessiner le texte du label
                        cv2.putText(annotated_frame, label,
                                  (int(x1), int(y1) - 5),
                                  cv2.FONT_HERSHEY_SIMPLEX, 0.6, (11, 15, 31), 2)  # Texte sombre

            # Écrire le frame annoté dans la vidéo de sortie
            out.write(annotated_frame)

            # Si des détections ont été trouvées dans ce frame, les ajouter
            if frame_boxes:
                all_detections.append({
                    "frame": frame_number,
                    "boxes": frame_boxes
                })

            frame_number += 1

            # Log de progression tous les 30 frames
            if frame_number % 30 == 0:
                print(f"Progression : {frame_number}/{total_frames} frames analysés")

    finally:
        # Libérer les ressources
        cap.release()
        out.release()
        print("✓ Ressources vidéo libérées")

    print("\n" + "-"*80)
    print("RÉSUMÉ DE L'ANALYSE")
    print("-"*80)
    print(f"Frames analysés : {frame_number}/{total_frames}")
    print(f"Frames avec détections : {len(all_detections)}")

    # Calculer le nombre total de personnes détectées
    total_detections = sum(len(det["boxes"]) for det in all_detections)
    print(f"Total de détections : {total_detections}")

    # Vérifier que le fichier vidéo annoté a bien été créé
    if annotated_video_path.exists():
        file_size = annotated_video_path.stat().st_size
        print(f"✓ Vidéo annotée créée : {annotated_video_path}")
        print(f"  Taille : {file_size / (1024*1024):.2f} MB")
    else:
        print(f"⚠ ATTENTION : Vidéo annotée non trouvée à {annotated_video_path}")

    print("="*80)
    print("FIN DE L'ANALYSE")
    print("="*80 + "\n")

    response_data = {
        "message": "Détection terminée avec succès",
        "total_frames": frame_number,
        "detections": all_detections,
        "annotated_video_path": str(annotated_video_path)
    }

    print(f"Envoi de la réponse avec {len(all_detections)} détections")

    return response_data


# ========== Fonctions utilitaires ==========

def is_point_in_zone(x: float, y: float, zone: Zone) -> bool:
    """
    Vérifie si un point (x, y) est dans la zone rectangulaire

    Args:
        x: Coordonnée x du point
        y: Coordonnée y du point
        zone: Zone rectangulaire définie par (x1, y1, x2, y2)

    Returns:
        True si le point est dans la zone, False sinon
    """
    return zone.x1 <= x <= zone.x2 and zone.y1 <= y <= zone.y2


@app.get("/health")
async def health_check():
    """
    Endpoint de vérification de santé du service

    Returns:
        État du service
    """
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "model_name": "YOLOv8n"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
