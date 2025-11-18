// Point d'entrée de l'application React
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

// Création du root React et rendu de l'application
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
