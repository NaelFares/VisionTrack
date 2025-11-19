// Page 1 : Upload de vidéo et sélection de zone d'analyse
import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { API_URL, ENDPOINTS, ERROR_MESSAGES, SUCCESS_MESSAGES, REDIRECT_DELAY, ZONE_COLORS, ZONE_CONFIG } from '../config';
import './UploadPage.css';

function UploadPage({ onAnalysisComplete }) {
  // États pour gérer le processus d'upload et d'analyse
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [videoId, setVideoId] = useState(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // État pour le mode d'analyse
  const [analysisMode, setAnalysisMode] = useState('full'); // 'full' ou 'zone'

  // État pour la zone de sélection (rectangle)
  const [zone, setZone] = useState(null); // { x1, y1, x2, y2 }
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState(null);

  // Références pour le canvas et la vidéo
  const canvasRef = useRef(null);
  const videoRef = useRef(null);

  // Gestionnaire de sélection de fichier vidéo
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Vérifier que c'est bien une vidéo
      if (!file.type.startsWith('video/')) {
        setError(ERROR_MESSAGES.INVALID_VIDEO);
        return;
      }

      setVideoFile(file);
      setVideoUrl(URL.createObjectURL(file));
      setVideoId(null);
      setZone(null);
      setError(null);
      setSuccess(null);

      // Upload automatique après sélection
      await handleUpload(file);
    }
  };

  // Initialiser le canvas quand la vidéo est chargée
  useEffect(() => {
    if (videoUrl && videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      const updateCanvasSize = () => {
        // Vérifier que les dimensions vidéo sont disponibles
        if (video.videoWidth > 0 && video.videoHeight > 0) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }
      };

      // Méthode 1: Essayer immédiatement si la vidéo est déjà chargée
      if (video.readyState >= video.HAVE_METADATA) {
        updateCanvasSize();
      }

      // Méthode 2: Écouter plusieurs événements pour garantir la mise à jour
      const events = ['loadedmetadata', 'loadeddata', 'canplay'];
      events.forEach(event => {
        video.addEventListener(event, updateCanvasSize);
      });

      // Méthode 3: Fallback avec setTimeout pour forcer la mise à jour
      const timeoutId = setTimeout(() => {
        updateCanvasSize();
      }, 500);

      // Cleanup
      return () => {
        events.forEach(event => {
          video.removeEventListener(event, updateCanvasSize);
        });
        clearTimeout(timeoutId);
      };
    }
  }, [videoUrl, analysisMode]);

  // Dessiner la zone sélectionnée sur le canvas
  const drawZone = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Effacer le canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (zone) {
      const width = zone.x2 - zone.x1;
      const height = zone.y2 - zone.y1;

      // Remplissage semi-transparent
      ctx.fillStyle = ZONE_COLORS.FILL;
      ctx.fillRect(zone.x1, zone.y1, width, height);

      // Dessiner le rectangle de la zone avec des lignes fines
      ctx.strokeStyle = ZONE_COLORS.STROKE;
      ctx.lineWidth = ZONE_CONFIG.LINE_WIDTH;
      ctx.strokeRect(zone.x1, zone.y1, width, height);

      // Dessiner les 4 points aux angles
      const pointRadius = ZONE_CONFIG.POINT_RADIUS;
      const corners = [
        { x: zone.x1, y: zone.y1 },         // Coin haut-gauche
        { x: zone.x2, y: zone.y1 },         // Coin haut-droit
        { x: zone.x1, y: zone.y2 },         // Coin bas-gauche
        { x: zone.x2, y: zone.y2 }          // Coin bas-droit
      ];

      corners.forEach(corner => {
        // Cercle extérieur (bordure)
        ctx.beginPath();
        ctx.arc(corner.x, corner.y, pointRadius, 0, Math.PI * 2);
        ctx.fillStyle = ZONE_COLORS.POINT_OUTER;
        ctx.fill();

        // Cercle intérieur (centre)
        ctx.beginPath();
        ctx.arc(corner.x, corner.y, pointRadius - 2, 0, Math.PI * 2);
        ctx.fillStyle = ZONE_COLORS.POINT_INNER;
        ctx.fill();
      });
    }
  };

  // Redessiner quand la zone change
  useEffect(() => {
    if (zone) {
      drawZone();
    } else {
      // Si pas de zone, effacer le canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [zone]);

  // Gestionnaires de dessin de la zone
  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();

    // Calculer les ratios d'échelle
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Convertir les coordonnées de clic en coordonnées canvas
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setIsDrawing(true);
    setStartPoint({ x, y });
  };

  const handleMouseMove = (e) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Mettre à jour la zone temporaire
    setZone({
      x1: Math.min(startPoint.x, x),
      y1: Math.min(startPoint.y, y),
      x2: Math.max(startPoint.x, x),
      y2: Math.max(startPoint.y, y),
    });
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  // Upload de la vidéo vers le backend
  const handleUpload = async (file) => {
    const fileToUpload = file || videoFile;
    if (!fileToUpload) {
      setError(ERROR_MESSAGES.NO_VIDEO_SELECTED);
      return;
    }

    setUploadLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('file', fileToUpload);

    try {
      const response = await axios.post(`${API_URL}${ENDPOINTS.UPLOAD}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setVideoId(response.data.video_id);
      setSuccess(SUCCESS_MESSAGES.UPLOAD_SUCCESS);
    } catch (err) {
      setError(ERROR_MESSAGES.UPLOAD_FAILED + ' : ' + (err.response?.data?.detail || err.message));
    } finally {
      setUploadLoading(false);
    }
  };

  // Lancer l'analyse
  const handleAnalyze = async () => {
    if (!videoId) {
      setError(ERROR_MESSAGES.NO_VIDEO_SELECTED);
      return;
    }

    // Vérifier la zone seulement si le mode 'zone' est sélectionné
    if (analysisMode === 'zone' && !zone) {
      setError(ERROR_MESSAGES.NO_ZONE_DEFINED);
      return;
    }

    setAnalyzeLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Préparer les données de la requête
      const requestData = {
        video_id: videoId
      };

      // Ajouter la zone seulement si le mode 'zone' est sélectionné
      if (analysisMode === 'zone' && zone) {
        requestData.zone = zone;
        console.log('=== ENVOI ANALYSE AVEC ZONE ===');
        console.log('Zone envoyée au backend:', {
          x1: zone.x1,
          y1: zone.y1,
          x2: zone.x2,
          y2: zone.y2,
          largeur: zone.x2 - zone.x1,
          hauteur: zone.y2 - zone.y1
        });
      } else {
        console.log('=== ENVOI ANALYSE SANS ZONE ===');
      }

      const response = await axios.post(`${API_URL}${ENDPOINTS.ANALYZE}`, requestData);

      setSuccess(SUCCESS_MESSAGES.ANALYSIS_SUCCESS);

      // Rediriger vers la page de résultats après un court délai
      setTimeout(() => {
        onAnalysisComplete(videoId);
      }, REDIRECT_DELAY);
    } catch (err) {
      setError(ERROR_MESSAGES.ANALYSIS_FAILED + ' : ' + (err.response?.data?.detail || err.message));
      setAnalyzeLoading(false);
    }
  };

  return (
    <div className="upload-page">
      {/* Overlay de chargement pendant l'analyse */}
      {analyzeLoading && (
        <div className="analysis-overlay">
          <div className="spinner-container">
            <div className="spinner"></div>
            <p>Analyse en cours...</p>
            <p className="analysis-subtitle">Veuillez patienter, cela peut prendre quelques minutes</p>
          </div>
        </div>
      )}

      {/* Messages de succès/erreur */}
      {error && <div className="error">{error}</div>}
      {success && <div className="success">{success}</div>}

      {/* Section 1: Sélection de fichier */}
      <div className="card">
        <h2>1. Importer une vidéo</h2>
        <div className="file-input-container">
          <input
            type="file"
            accept="video/*"
            onChange={handleFileChange}
            id="video-input"
            className="file-input"
            disabled={uploadLoading || analyzeLoading || videoId}
          />
          <label htmlFor="video-input" className={`file-input-label ${videoId ? 'disabled' : ''}`}>
            {uploadLoading ? 'Upload en cours...' : videoId ? 'Vidéo uploadée ✓' : 'Choisir une vidéo'}
          </label>
          {videoFile && <span className="file-name">{videoFile.name}</span>}
        </div>
      </div>

      {/* Section 2: Choisir le mode d'analyse */}
      {videoUrl && videoId && (
        <div className="card">
          <h2>2. Choisir le mode d'analyse</h2>
          <div className="analysis-mode-selector">
            <label className={`mode-option ${analysisMode === 'full' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="analysisMode"
                value="full"
                checked={analysisMode === 'full'}
                onChange={(e) => {
                  setAnalysisMode(e.target.value);
                  setZone(null);
                }}
              />
              <div className="mode-content">
                <strong>Vidéo entière</strong>
                <span>Analyser toute la vidéo sans restriction de zone</span>
              </div>
            </label>

            <label className={`mode-option ${analysisMode === 'zone' ? 'selected' : ''}`}>
              <input
                type="radio"
                name="analysisMode"
                value="zone"
                checked={analysisMode === 'zone'}
                onChange={(e) => {
                  setAnalysisMode(e.target.value);
                  setZone(null);
                }}
              />
              <div className="mode-content">
                <strong>Zone spécifique</strong>
                <span>Définir une zone rectangulaire sur la vidéo</span>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Section 3: Définir la zone d'analyse (seulement si mode 'zone') */}
      {videoUrl && videoId && analysisMode === 'zone' && (
        <div className="card">
          <h2>3. Définir la zone d'analyse</h2>
          <p className="instruction-text">
            Cliquez et glissez sur la vidéo pour dessiner un rectangle définissant la zone d'analyse.
          </p>

          <div className="video-container">
            <video
              ref={videoRef}
              src={videoUrl}
              controls
              className="video-player"
            />
            <canvas
              ref={canvasRef}
              className="zone-canvas"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          </div>

          {zone && (
            <div className="zone-info">
              <p>
                <strong>Zone sélectionnée :</strong> ({Math.round(zone.x1)}, {Math.round(zone.y1)}) → ({Math.round(zone.x2)}, {Math.round(zone.y2)})
              </p>
              <button onClick={() => setZone(null)} className="btn-primary">
                Réinitialiser la zone
              </button>
            </div>
          )}
        </div>
      )}

      {/* Section 4: Lancer l'analyse */}
      {videoId && (analysisMode === 'full' || (analysisMode === 'zone' && zone)) && (
        <div className="card">
          <h2>{analysisMode === 'zone' ? '4' : '3'}. Lancer l'analyse</h2>
          <p className="instruction-text">
            {analysisMode === 'full'
              ? 'L\'analyse portera sur la vidéo entière.'
              : 'L\'analyse portera uniquement sur la zone sélectionnée.'}
          </p>
          <button
            onClick={handleAnalyze}
            disabled={analyzeLoading}
            className="btn-success btn-analyze"
          >
            {analyzeLoading ? 'Analyse en cours...' : 'Analyser la vidéo'}
          </button>
        </div>
      )}
    </div>
  );
}

export default UploadPage;
