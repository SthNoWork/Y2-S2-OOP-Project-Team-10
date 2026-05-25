// core/debug.js
// Global debug flag and logging helper.
// Set window.DEBUG = true in the browser console to enable verbose logs.

window.DEBUG    = false;
window.logDebug = function (...args) {
  if (window.DEBUG) console.log(...args);
};