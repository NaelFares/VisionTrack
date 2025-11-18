// Page 1 : Upload de vidéo et sélection de zone d'analyse
import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './UploadPage.css';

function UploadPage({ onAnalysisComplete }) {
  // États pour gérer le processus d'upload et d'analyse
  const [videoFile, setVideoFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [videoId, setVideoId] = useState(null);
  const [loading, setLoading] = useState(false);
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

  // URL de l'API backend (configurée dans package.json proxy ou ici)
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  // Gestionnaire de sélection de fichier vidéo
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Vérifier que c'est bien une vidéo
      if (!file.type.startsWith('video/')) {
        setError('Veuillez sélectionner un fichier vidéo valide');
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

      video.addEventListener('loadedmetadata', () => {
        // Ajuster la taille du canvas à celle de la vidéo
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      });
    }
  }, [videoUrl]);

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
      ctx.fillStyle = 'rgba(0, 217, 255, 0.15)';
      ctx.fillRect(zone.x1, zone.y1, width, height);

      // Dessiner le rectangle de la zone avec des lignes fines
      ctx.strokeStyle = '#00D9FF';
      ctx.lineWidth = 2;
      ctx.strokeRect(zone.x1, zone.y1, width, height);

      // Dessiner les 4 points aux angles
      const pointRadius = 6;
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
        ctx.fillStyle = '#00D9FF';
        ctx.fill();

        // Cercle intérieur (centre)
        ctx.beginPath();
        ctx.arc(corner.x, corner.y, pointRadius - 2, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      });
    }
  };

  // Redessiner quand la zone change
  useEffect(() => {
    if (zone) {
      drawZone();
    }
  }, [zone]);

  // Gestionnaires de dessin de la zone
  const handleMouseDown = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

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
      setError('Veuillez sélectionner une vidéo');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    const formData = new FormData();
    formData.append('file', fileToUpload);

    try {
      const response = await axios.post(`${API_URL}/upload-video`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setVideoId(response.data.video_id);
      setSuccess('Vidéo uploadée avec succès ! Vous pouvez maintenant définir une zone d\'analyse.');
    } catch (err) {
      setError('Erreur lors de l\'upload de la vidéo : ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  // Lancer l'analyse
  const handleAnalyze = async () => {
    if (!videoId) {
      setError('Veuillez d\'abord uploader une vidéo');
      return;
    }

    // Vérifier la zone seulement si le mode 'zone' est sélectionné
    if (analysisMode === 'zone' && !zone) {
      setError('Veuillez définir une zone d\'analyse en dessinant un rectangle sur la vidéo');
      return;
    }

    setLoading(true);
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
      }

      const response = await axios.post(`${API_URL}/analyze`, requestData);

      setSuccess('Analyse terminée avec succès !');

      // Rediriger vers la page de résultats après 1 seconde
      setTimeout(() => {
        onAnalysisComplete(videoId);
      }, 1000);
    } catch (err) {
      setError('Erreur lors de l\'analyse : ' + (err.response?.data?.detail || err.message));
      setLoading(false);
    }
  };

  return (
    <div className="upload-page">
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
            disabled={loading}
          />
          <label htmlFor="video-input" className="file-input-label">
            {loading ? 'Upload en cours...' : 'Choisir une vidéo'}
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
            disabled={loading}
            className="btn-success btn-analyze"
          >
            {loading ? 'Analyse en cours...' : 'Analyser la vidéo'}
          </button>
        </div>
      )}
    </div>
  );
}

export default UploadPage;
