// Configuration centralisée de l'application VisionTrack
// Ce fichier centralise toutes les constantes et configurations
// pour éviter la duplication de code dans les différents composants

// ============================================================================
// API Configuration
// ============================================================================

/**
 * URL de base de l'API backend
 * Lit la variable d'environnement REACT_APP_API_URL du fichier .env
 * Valeur par défaut : http://localhost:8000
 */
export const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

/**
 * Endpoints de l'API
 * Centralise tous les chemins d'endpoints pour faciliter la maintenance
 */
export const ENDPOINTS = {
  UPLOAD: '/upload-video',
  ANALYZE: '/analyze',
  RESULTS: '/results',
  ANNOTATED_VIDEO: '/annotated-videos',
  DELETE_ANALYSIS: '/analysis'
};

// ============================================================================
// Application Constants
// ============================================================================

/**
 * FPS par défaut (fallback uniquement)
 * Le FPS réel de la vidéo est fourni par le backend/IA service dans results.fps
 * Cette valeur est utilisée uniquement si le FPS n'est pas disponible dans les résultats
 */
export const DEFAULT_FPS = 30;

// ============================================================================
// Messages utilisateur
// ============================================================================

/**
 * Messages d'erreur standardisés
 */
export const ERROR_MESSAGES = {
  UPLOAD_FAILED: 'Erreur lors de l\'upload de la vidéo',
  ANALYSIS_FAILED: 'Erreur lors de l\'analyse',
  INVALID_VIDEO: 'Veuillez sélectionner un fichier vidéo valide',
  RESULTS_LOAD_FAILED: 'Erreur lors du chargement des résultats',
  VIDEO_PREPARATION_FAILED: 'Impossible de préparer la vidéo. Veuillez réessayer.',
  NO_VIDEO_SELECTED: 'Veuillez d\'abord uploader une vidéo',
  NO_ZONE_DEFINED: 'Veuillez définir une zone d\'analyse en dessinant un rectangle sur la vidéo'
};

/**
 * Messages de succès standardisés
 */
export const SUCCESS_MESSAGES = {
  UPLOAD_SUCCESS: 'Vidéo uploadée avec succès ! Vous pouvez maintenant définir une zone d\'analyse.',
  ANALYSIS_SUCCESS: 'Analyse terminée avec succès !'
};

// ============================================================================
// UI Configuration
// ============================================================================

/**
 * Délai avant redirection après analyse (en ms)
 */
export const REDIRECT_DELAY = 1000;

/**
 * Couleurs utilisées pour le dessin de la zone
 */
export const ZONE_COLORS = {
  STROKE: '#00D9FF',
  FILL: 'rgba(0, 217, 255, 0.15)',
  POINT_OUTER: '#00D9FF',
  POINT_INNER: '#ffffff'
};

/**
 * Configuration du canvas de zone
 */
export const ZONE_CONFIG = {
  LINE_WIDTH: 2,
  POINT_RADIUS: 6
};
