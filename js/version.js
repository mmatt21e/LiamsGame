/*
 * Single source of truth for the application version.
 * Loaded as a classic script by index.html (window) AND by
 * service-worker.js via importScripts (worker scope).
 *
 * BUMP THIS on every release: it renames the service-worker cache,
 * which triggers the safe update flow ("Reload to Update").
 */
self.APP_VERSION = '1.0.0';
