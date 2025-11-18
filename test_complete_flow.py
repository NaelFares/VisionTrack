#!/usr/bin/env python3
"""
Script de test automatisé pour VisionTrack
Teste le flux complet : upload → définition zone → analyse → résultats
"""

import requests
import json
import time
import sys

# Configuration
API_URL = "http://localhost:8000"
VIDEO_FILE = "video_japan8sec.mp4"

# Couleurs pour l'affichage
GREEN = '\033[92m'
RED = '\033[91m'
BLUE = '\033[94m'
YELLOW = '\033[93m'
RESET = '\033[0m'

def print_step(message):
    print(f"\n{BLUE}{'='*80}")
    print(f"{message}")
    print(f"{'='*80}{RESET}\n")

def print_success(message):
    print(f"{GREEN}[OK] {message}{RESET}")

def print_error(message):
    print(f"{RED}[ERREUR] {message}{RESET}")

def print_info(message):
    print(f"{YELLOW}[INFO] {message}{RESET}")

# Étape 1 : Upload de la vidéo
print_step("ÉTAPE 1 : Upload de la vidéo")
try:
    with open(VIDEO_FILE, 'rb') as f:
        files = {'file': (VIDEO_FILE, f, 'video/mp4')}
        response = requests.post(f"{API_URL}/upload-video", files=files, timeout=30)

    if response.status_code == 200:
        data = response.json()
        video_id = data['video_id']
        print_success(f"Vidéo uploadée avec succès")
        print_info(f"Video ID: {video_id}")
        print_info(f"Taille: {data.get('size', 0) / (1024*1024):.2f} MB")
    else:
        print_error(f"Échec de l'upload: {response.status_code}")
        print_error(response.text)
        sys.exit(1)
except Exception as e:
    print_error(f"Erreur lors de l'upload: {e}")
    sys.exit(1)

# Étape 2 : Définir une zone d'analyse (zone centrale de la vidéo)
print_step("ÉTAPE 2 : Définition de la zone d'analyse")
# Zone centrale : 25% de marge de chaque côté
# Assumons une résolution standard de 1920x1080 (sera ajusté par le service IA)
zone = {
    "x1": 480,   # 25% de 1920
    "y1": 270,   # 25% de 1080
    "x2": 1440,  # 75% de 1920
    "y2": 810    # 75% de 1080
}
print_info(f"Zone definie: ({zone['x1']}, {zone['y1']}) -> ({zone['x2']}, {zone['y2']})")

# Étape 3 : Lancer l'analyse
print_step("ÉTAPE 3 : Lancement de l'analyse")
try:
    analyze_data = {
        "video_id": video_id,
        "zone": zone
    }
    print_info("Analyse en cours... (cela peut prendre quelques minutes)")
    response = requests.post(
        f"{API_URL}/analyze",
        json=analyze_data,
        timeout=300  # 5 minutes timeout
    )

    if response.status_code == 200:
        data = response.json()
        print_success("Analyse terminée avec succès")
        print_info(f"Message: {data.get('message')}")

        stats = data.get('stats', {})
        print_info(f"Total personnes détectées: {stats.get('total_people', 0)}")
        print_info(f"Max simultané: {stats.get('max_people_simultaneous', 0)}")
        print_info(f"Frame du pic: {stats.get('frame_of_max', 0)}")
    else:
        print_error(f"Échec de l'analyse: {response.status_code}")
        print_error(response.text)
        sys.exit(1)
except Exception as e:
    print_error(f"Erreur lors de l'analyse: {e}")
    sys.exit(1)

# Petite pause pour s'assurer que tout est sauvegardé
time.sleep(1)

# Étape 4 : Récupérer les résultats complets
print_step("ÉTAPE 4 : Récupération des résultats complets")
try:
    response = requests.get(f"{API_URL}/results/{video_id}", timeout=10)

    if response.status_code == 200:
        results = response.json()
        print_success("Résultats récupérés avec succès")

        # Afficher les statistiques
        stats = results.get('stats', {})
        detections = results.get('detections', [])

        print(f"\n{BLUE}Statistiques détaillées:{RESET}")
        print(f"  • Total de personnes: {stats.get('total_people', 0)}")
        print(f"  • Maximum simultané: {stats.get('max_people_simultaneous', 0)}")
        print(f"  • Frame du maximum: {stats.get('frame_of_max', 0)}")
        print(f"  • Frames avec détections: {len(detections)}")

        # Afficher quelques exemples de détections
        if detections:
            print(f"\n{BLUE}Exemples de détections:{RESET}")
            for i, det in enumerate(detections[:3]):  # 3 premiers frames
                frame_num = det.get('frame', 0)
                num_people = len(det.get('boxes', []))
                print(f"  Frame {frame_num}: {num_people} personne(s)")

        # Vérifier le chemin de la vidéo annotée
        annotated_path = results.get('annotated_video_path', '')
        if annotated_path:
            print_success(f"Video annotee creee: {annotated_path}")
        else:
            print_error("Aucun chemin de video annotee dans les resultats")

        # Sauvegarder les résultats dans un fichier pour inspection
        with open(f"test_results_{video_id}.json", 'w') as f:
            json.dump(results, f, indent=2)
        print_info(f"Résultats sauvegardés dans: test_results_{video_id}.json")

    else:
        print_error(f"Échec de récupération des résultats: {response.status_code}")
        print_error(response.text)
        sys.exit(1)
except Exception as e:
    print_error(f"Erreur lors de la récupération des résultats: {e}")
    sys.exit(1)

# Étape 5 : Vérifier la vidéo annotée
print_step("ÉTAPE 5 : Vérification de la vidéo annotée")
try:
    response = requests.get(
        f"{API_URL}/annotated-videos/{video_id}",
        timeout=10,
        stream=True
    )

    if response.status_code == 200:
        # Vérifier les headers
        content_type = response.headers.get('Content-Type', '')
        content_length = response.headers.get('Content-Length', '0')

        print_success("Vidéo annotée accessible")
        print_info(f"Type de contenu: {content_type}")
        print_info(f"Taille: {int(content_length) / (1024*1024):.2f} MB")
    else:
        print_error(f"Vidéo annotée non accessible: {response.status_code}")
        print_error(response.text)
except Exception as e:
    print_error(f"Erreur lors de la vérification de la vidéo annotée: {e}")

# Résumé final
print_step("RÉSUMÉ DU TEST")
print_success("Tous les tests sont passés avec succès!")
print(f"\n{BLUE}Pour visualiser les résultats:{RESET}")
print(f"  1. Ouvrir l'application: http://localhost:3000")
print(f"  2. Cliquer sur 'Résultats'")
print(f"  3. Ou consulter: test_results_{video_id}.json")
print(f"\n{YELLOW}Note: Vous pouvez aussi consulter les logs des services:{RESET}")
print(f"  docker-compose logs backend --tail=50")
print(f"  docker-compose logs ia-service --tail=50")
