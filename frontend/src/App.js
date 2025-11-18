// Composant principal de l'application
import React, { useState } from 'react';
import UploadPage from './pages/UploadPage';
import ResultsPage from './pages/ResultsPage';
import './App.css';

function App() {
  // État pour gérer la navigation entre les pages
  const [currentPage, setCurrentPage] = useState('upload'); // 'upload' ou 'results'

  // État pour stocker l'ID de la vidéo analysée
  const [videoId, setVideoId] = useState(null);

  // Fonction appelée quand l'analyse est terminée
  const handleAnalysisComplete = (id) => {
    setVideoId(id);
    setCurrentPage('results');
  };

  return (
    <div className="App">
      {/* Barre de navigation */}
      <nav className="nav">
        <h1>VisionTrack</h1>
        <div className="nav-links">
          <button
            onClick={() => setCurrentPage('upload')}
            className={currentPage === 'upload' ? 'active' : ''}
          >
            Import & Analyse
          </button>
          <button
            onClick={() => setCurrentPage('results')}
            className={currentPage === 'results' ? 'active' : ''}
            disabled={!videoId}
          >
            Résultats
          </button>
        </div>
      </nav>

      {/* Contenu principal - affichage conditionnel des pages */}
      <div className="container">
        {currentPage === 'upload' && (
          <UploadPage onAnalysisComplete={handleAnalysisComplete} />
        )}
        {currentPage === 'results' && videoId && (
          <ResultsPage videoId={videoId} />
        )}
      </div>
    </div>
  );
}

export default App;
