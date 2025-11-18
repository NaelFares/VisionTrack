// Page 2 : Affichage des résultats d'analyse
import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './ResultsPage.css';

function ResultsPage({ videoId }) {
  // États pour les résultats
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // État pour le frame actuellement affiché
  const [currentFrame, setCurrentFrame] = useState(0);

  // Référence pour la vidéo
  const videoRef = useRef(null);

  // URL de l'API backend
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  // Charger les résultats au montage du composant
  useEffect(() => {
    loadResults();
  }, [videoId]);

  // Fonction pour charger les résultats depuis le backend
  const loadResults = async () => {
    console.log('='.repeat(80));
    console.log('CHARGEMENT DES RÉSULTATS');
    console.log('='.repeat(80));
    console.log('Video ID:', videoId);
    console.log('API URL:', API_URL);

    setLoading(true);
    setError(null);

    try {
      console.log(`Requête GET vers: ${API_URL}/results/${videoId}`);
      const response = await axios.get(`${API_URL}/results/${videoId}`);

      console.log('✓ Réponse reçue du backend');
      console.log('Données reçues:', response.data);

      // Vérifier la structure des données
      if (response.data) {
        console.log('Structure des données:');
        console.log('  - stats:', response.data.stats);
        console.log('  - detections:', response.data.detections ? `${response.data.detections.length} frames` : 'absent');
        console.log('  - annotated_video_path:', response.data.annotated_video_path);
      }

      setResults(response.data);
      console.log('✓ Résultats stockés dans l\'état');
    } catch (err) {
      console.error('ERREUR lors du chargement des résultats:');
      console.error('  Message:', err.message);
      console.error('  Réponse:', err.response?.data);
      console.error('  Status:', err.response?.status);
      setError('Erreur lors du chargement des résultats : ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
      console.log('='.repeat(80) + '\n');
    }
  };

  // Mettre à jour le frame actuel quand la vidéo avance
  useEffect(() => {
    if (videoRef.current && results) {
      const video = videoRef.current;

      const handleTimeUpdate = () => {
        // Calculer le numéro de frame approximatif (en supposant 30 fps)
        const fps = 30;
        const frame = Math.floor(video.currentTime * fps);
        setCurrentFrame(frame);
      };

      video.addEventListener('timeupdate', handleTimeUpdate);

      return () => {
        video.removeEventListener('timeupdate', handleTimeUpdate);
      };
    }
  }, [results]);

  // Obtenir les détections pour le frame actuel
  const getCurrentDetections = () => {
    if (!results || !results.detections) return [];

    // Trouver les détections pour le frame actuel
    const frameData = results.detections.find(d => d.frame === currentFrame);
    return frameData ? frameData.boxes : [];
  };

  if (loading) {
    console.log('Affichage: État de chargement');
    return <div className="loading">Chargement des résultats...</div>;
  }

  if (error) {
    console.log('Affichage: État d\'erreur -', error);
    return (
      <div className="card">
        <div className="error">{error}</div>
        <button onClick={loadResults} className="btn-primary">
          Réessayer
        </button>
      </div>
    );
  }

  if (!results) {
    console.log('Affichage: Aucun résultat disponible');
    return <div className="error">Aucun résultat disponible</div>;
  }

  console.log('Affichage: Rendu de la page de résultats avec les données:', {
    stats: results.stats,
    detectionsCount: results.detections?.length,
    annotatedVideoPath: results.annotated_video_path
  });

  return (
    <div className="results-page">
      {/* Statistiques globales */}
      <div className="card">
        <h2>Statistiques d'analyse</h2>
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-label">Total de personnes détectées</div>
            <div className="stat-value">{results.stats.total_people}</div>
          </div>

          <div className="stat-item">
            <div className="stat-label">Pic simultané maximum</div>
            <div className="stat-value">{results.stats.max_people_simultaneous}</div>
          </div>

          <div className="stat-item">
            <div className="stat-label">Frame du pic</div>
            <div className="stat-value">{results.stats.frame_of_max}</div>
          </div>
        </div>
      </div>

      {/* Lecture de la vidéo annotée */}
      <div className="card">
        <h2>Vidéo annotée avec détections</h2>
        <p className="video-instruction">
          Les personnes détectées sont encadrées en vert. La zone d'analyse est affichée en bleu.
        </p>
        <p className="frame-info">
          Frame actuel : {currentFrame}
        </p>

        <div className="video-container">
          <video
            ref={videoRef}
            src={`${API_URL}/annotated-videos/${videoId}`}
            controls
            className="video-player"
          />
        </div>
      </div>

      {/* Détections du frame actuel */}
      <div className="card">
        <h2>Détections - Frame {currentFrame}</h2>
        {getCurrentDetections().length > 0 ? (
          <div className="detections-list">
            <p className="detection-count">
              {getCurrentDetections().length} personne(s) détectée(s) dans ce frame
            </p>
            <table className="detections-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Confiance</th>
                  <th>Position (x1, y1, x2, y2)</th>
                </tr>
              </thead>
              <tbody>
                {getCurrentDetections().map((box, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>{(box.confidence * 100).toFixed(1)}%</td>
                    <td>
                      ({Math.round(box.x1)}, {Math.round(box.y1)}) → (
                      {Math.round(box.x2)}, {Math.round(box.y2)})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="no-data">Aucune détection dans ce frame</p>
        )}
      </div>

      {/* Timeline des détections */}
      <div className="card">
        <h2>Timeline des détections</h2>
        <div className="timeline">
          {results.detections && results.detections.length > 0 ? (
            <div className="timeline-chart">
              {results.detections.map((frameData, index) => {
                const peopleCount = frameData.boxes.length;
                const isMaxFrame = frameData.frame === results.stats.frame_of_max;
                const height = (peopleCount / results.stats.max_people_simultaneous) * 100;

                return (
                  <div
                    key={index}
                    className={`timeline-bar ${isMaxFrame ? 'max-frame' : ''}`}
                    style={{ height: `${height}%` }}
                    title={`Frame ${frameData.frame}: ${peopleCount} personne(s)`}
                  />
                );
              })}
            </div>
          ) : (
            <p className="no-data">Aucune donnée de timeline disponible</p>
          )}
          <div className="timeline-legend">
            <span>Temps →</span>
            <span className="legend-max">■ Frame du pic maximum</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResultsPage;
