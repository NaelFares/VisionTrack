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
  const [videoBlobUrl, setVideoBlobUrl] = useState(null);
  const [videoPreparing, setVideoPreparing] = useState(false);
  const [videoError, setVideoError] = useState(null);
  const [jsonBlobUrl, setJsonBlobUrl] = useState(null);
  const [cleanupDone, setCleanupDone] = useState(false);
  const [cleanupError, setCleanupError] = useState(null);

  // Référence pour la vidéo
  const videoRef = useRef(null);

  // URL de l'API backend
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

  // Charger les résultats au montage du composant
  useEffect(() => {
    loadResults();
  }, [videoId]);

  useEffect(() => {
    setCleanupDone(false);
    setCleanupError(null);
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


  useEffect(() => {
    let jsonUrl = null;
    if (results) {
      const jsonBlob = new Blob([JSON.stringify(results, null, 2)], {
        type: 'application/json'
      });
      jsonUrl = URL.createObjectURL(jsonBlob);
      setJsonBlobUrl(jsonUrl);
    } else {
      setJsonBlobUrl(null);
    }

    return () => {
      if (jsonUrl) {
        URL.revokeObjectURL(jsonUrl);
      }
    };
  }, [results]);

  useEffect(() => {
    let objectUrl = null;
    let cancelled = false;

    if (!results?.annotated_video_path) {
      setVideoBlobUrl(null);
      return;
    }

    setVideoPreparing(true);
    setVideoError(null);
    setVideoBlobUrl(null);

    const fetchVideo = async () => {
      try {
        const response = await fetch(`${API_URL}/annotated-videos/${videoId}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const blob = await response.blob();
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setVideoBlobUrl(objectUrl);
      } catch (err) {
        console.error('ERREUR : Préparation de la vidéo impossible', err);
        if (!cancelled) {
          setVideoError("Impossible de préparer la vidéo. Veuillez réessayer.");
        }
      } finally {
        if (!cancelled) {
          setVideoPreparing(false);
        }
      }
    };

    fetchVideo();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [API_URL, videoId, results?.annotated_video_path]);

  useEffect(() => {
    if (!videoId || !videoBlobUrl || !jsonBlobUrl || cleanupDone) {
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const cleanup = async () => {
      try {
        const response = await fetch(`${API_URL}/analysis/`, {
          method: 'DELETE',
          signal: controller.signal
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        if (!cancelled) {
          setCleanupDone(true);
          setCleanupError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setCleanupError(err.message);
          console.error('ERREUR : Nettoyage des fichiers impossible', err);
        }
      }
    };

    cleanup();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [API_URL, videoId, videoBlobUrl, jsonBlobUrl, cleanupDone]);


  const triggerDownload = (url, filename) => {
    if (!url) return;
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  };

  const handleDownload = (type) => {
    if (type === 'video') {
      triggerDownload(videoBlobUrl, `visiontrack_analysis_${videoId}.mp4`);
    } else {
      triggerDownload(jsonBlobUrl, `visiontrack_results_${videoId}.json`);
    }
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
            src={videoBlobUrl || ''}
            controls
            className="video-player"
            onError={(e) => {
              console.error('ERREUR VIDEO:', e);
              console.error('URL vidéo:', `${API_URL}/annotated-videos/${videoId}`);
              console.error('Erreur détails:', e.target.error);
            }}
            onLoadedMetadata={() => {
              console.log('✓ Vidéo chargée avec succès');
              console.log('Durée:', videoRef.current?.duration);
            }}
          />
          {videoPreparing && (
            <p className="video-path-debug">Préparation de la vidéo en cours...</p>
          )}
          {videoError && (
            <p className="error">{videoError}</p>
          )}
        </div>

        {/* Boutons d'export */}
        <div className="export-buttons">
          <button
            type="button"
            onClick={() => handleDownload('video')}
            className="btn-primary export-btn"
            disabled={!videoBlobUrl}
          >
            Télécharger la vidéo
          </button>
          <button
            type="button"
            onClick={() => handleDownload('results')}
            className="btn-secondary export-btn"
            disabled={!jsonBlobUrl}
          >
            Exporter les statistiques (JSON)
          </button>
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

                // Fonction pour sauter à une frame spécifique
                const jumpToFrame = () => {
                  if (videoRef.current && videoRef.current.duration) {
                    // Estimer le FPS: totalFrames / durée
                    const lastFrame = results.detections[results.detections.length - 1].frame;
                    const fps = lastFrame / videoRef.current.duration;

                    // Calculer le timestamp de cette frame
                    const timestamp = frameData.frame / fps;

                    // Sauter à ce timestamp
                    videoRef.current.currentTime = timestamp;

                    // Scroll vers la vidéo pour voir le changement
                    videoRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                };

                return (
                  <div
                    key={index}
                    className={`timeline-bar ${isMaxFrame ? 'max-frame' : ''}`}
                    style={{ height: `${height}%`, cursor: 'pointer' }}
                    title={`Frame ${frameData.frame}: ${peopleCount} personne(s) - Cliquez pour y aller`}
                    onClick={jumpToFrame}
                  />
                );
              })}
            </div>
          ) : (
            <p className="no-data">Aucune donnée de timeline disponible</p>
          )}

          {/* Marqueurs de temps */}
          {videoRef.current && videoRef.current.duration && (
            <div className="timeline-timestamps">
              {Array.from({ length: 5 }).map((_, i) => {
                const timestamp = (videoRef.current.duration / 4) * i;
                const minutes = Math.floor(timestamp / 60);
                const seconds = Math.floor(timestamp % 60);
                return (
                  <span key={i} className="timestamp">
                    {minutes}:{seconds.toString().padStart(2, '0')}
                  </span>
                );
              })}
            </div>
          )}

          <div className="timeline-legend">
            <span className="legend-max">■ Frame du pic maximum</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ResultsPage;
