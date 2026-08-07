// ── Climatrixa Mobile — Constants ────────────────────────────────────────────

const String kApiBase = 'https://climatrixa-system-api.onrender.com';

// Auth
const String kTokenKey   = 'climatrixa_token';
const String kUserKey    = 'climatrixa_user';

// Polling intervals (ms) — no WebSocket on mobile; matches web polling cadence
const int kReadingPollMs = 30000;   // 30 s — live sensor readings
const int kAlertPollMs   = 20000;   // 20 s — alert events

// Alert reminder intervals (ms) — mirrors web GlobalAlertPopup behaviour
const int kAlertRemindMs        = 60000;       // 1 min — threshold / predicted
const int kAnomalyRemindMs      = 15 * 60000;  // 15 min — anomaly

// Forecast
const int kDefaultForecastHours = 24;

// Teal (public brand) & Purple (admin brand) seeds — fed to Material 3 scheme
// (used in AppTheme so they live here too for convenience)
const int kPublicSeed = 0xFF14B8A6;  // teal-500
const int kAdminSeed  = 0xFF7C3AED;  // violet-600
