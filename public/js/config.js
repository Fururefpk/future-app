/**
 * config.js — backward-compat shim
 *
 * Older inline code used global `Session`, `Demo`, `API_BASE_URL`.
 * Now everything lives under `window.FPH.*`.
 * This shim delegates the old globals to the new namespace so any
 * remaining references still work without conflicts.
 *
 * Load order: after storage.js and api.js (which define FPH.storage and FPH.api).
 */
'use strict';
document.addEventListener('DOMContentLoaded', () => {
  // Only set if the new modules loaded correctly
  if (window.FPH?.storage) {
    window.Session     = FPH.storage.Session;
    window.Demo        = FPH.storage.Demo;
  }
  if (window.FPH?.api) {
    window.API_BASE_URL = FPH.api.BASE;
  }
});