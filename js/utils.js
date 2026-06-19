// --- Utility functions ---

/**
 * Formats a Date object to YYYY-MM-DD string
 * @param {Date} date 
 * @returns {string}
 */
export function formatDate(date) {
  return date.toLocaleDateString("en-CA");
}

/**
 * Formats a Date object for display (e.g. June 19, 2026)
 * @param {Date} date 
 * @returns {string}
 */
export function formatDateForDisplay(date) {
  const options = { year: "numeric", month: "long", day: "numeric" };
  return date.toLocaleDateString("en-US", options);
}

/**
 * Shows or hides the app loading spinner
 * @param {boolean} isLoading 
 */
export function showLoading(isLoading) {
  const loadingSpinner = document.getElementById("loading-spinner");
  if (loadingSpinner) {
    loadingSpinner.classList.toggle("hidden", !isLoading);
  }
}
