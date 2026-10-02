// ========================================================
// Plesk Node.js Application Startup File
// Web Personal Ust. Jaenal Maskun, S.Pd.I.
// ========================================================
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.PORT = process.env.PORT || 3000;

// Run precompiled production server bundle
require('./dist/server.cjs');
