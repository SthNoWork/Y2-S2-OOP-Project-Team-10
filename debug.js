// core/debug.js
// Global debug flag and logging helper.
// Set window.DEBUG = true in the browser console to enable verbose logs.

window.DEBUG = false;
try {
  const stored = localStorage.getItem('bts_debug_mode');
  if (stored === 'true') {
    window.DEBUG = true;
  }
} catch (e) { }

window.logDebug = function (...args) {
  if (window.DEBUG) console.log(...args);
};