/**
 * Collection de fonctions utilitaires pour le projet Bolt2bolt
 * Ce projet est open source sous licence [préciser la licence]
 */

/**
 * Formate une date selon les paramètres régionaux
 * @param {Date} date - La date à formater
 * @param {string} locale - Les paramètres régionaux (par défaut: 'fr-FR')
 * @return {string} La date formatée
 */
export function formatDate(date, locale = 'fr-FR') {
  return new Intl.DateTimeFormat(locale).format(date);
}

/**
 * Calcule la distance entre deux coordonnées GPS
 * @param {Object} coord1 - Première coordonnée {lat, lng}
 * @param {Object} coord2 - Seconde coordonnée {lat, lng}
 * @return {number} Distance en kilomètres
 */
export function calculateDistance(coord1, coord2) {
  // Formule de haversine pour calculer la distance entre deux points sur une sphère
  const R = 6371; // Rayon de la Terre en km
  const dLat = (coord2.lat - coord1.lat) * Math.PI / 