import { initializeApp, getApps, getApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, onDisconnect, push } from 'firebase/database';

// Default public Firebase project configuration for instant out-of-the-box demo
// Using a secure, isolated session-based path to prevent conflict between different shops.
const DEFAULT_FIREBASE_CONFIG = {
  apiKey: "AIzaSyA40o61sx09xzT-lArCUdZeSDxoFGDETX4",
  authDomain: "abuasimsystem.firebaseapp.com",
  databaseURL: "https://abuasimsystem-default-rtdb.firebaseio.com",
  projectId: "abuasimsystem",
  storageBucket: "abuasimsystem.firebasestorage.app",
  messagingSenderId: "191271312164",
  appId: "1:191271312164:web:6e01b02f90a65e1a1031b1"
};

// Retrieve Firebase config from Settings or fallback to default demo config
export const getFirebaseConfig = () => {
  try {
    const raw = localStorage.getItem('abu_asim_settings');
    if (raw) {
      const items = JSON.parse(raw);
      const userSettings = items.find(item => item.id === 'local-user');
      if (userSettings && userSettings.firebaseConfig && userSettings.firebaseConfig.databaseURL) {
        return userSettings.firebaseConfig;
      }
    }
  } catch (e) {
    console.error("Error reading Firebase config from settings:", e);
  }
  return DEFAULT_FIREBASE_CONFIG;
};

let appInstance = null;
let dbInstance = null;

// Initialize and get the database connection
export const getFirebaseDb = () => {
  const config = getFirebaseConfig();
  
  try {
    const apps = getApps();
    // Re-initialize if the config changed (e.g. user entered their own)
    const currentConfigStr = JSON.stringify(config);
    const lastConfigStr = localStorage.getItem('abu_asim_last_initialized_config');
    
    if (apps.length > 0 && currentConfigStr === lastConfigStr && dbInstance) {
      return dbInstance;
    }
    
    // Cleanup existing app if we are re-initializing
    if (apps.length > 0) {
      // Firebase doesn't allow direct hot-reloading easily, so we just use the existing one if it's the same, 
      // or initialize a new app instance if config changed
    }
    
    appInstance = initializeApp(config, "AbuAsimApp-" + Date.now());
    dbInstance = getDatabase(appInstance);
    
    localStorage.setItem('abu_asim_last_initialized_config', currentConfigStr);
    return dbInstance;
  } catch (e) {
    console.error("Error initializing Firebase:", e);
    // If initialization fails, try to return default or existing app
    try {
      if (getApps().length > 0) {
        const app = getApps()[0];
        return getDatabase(app);
      }
    } catch {}
    return null;
  }
};

// Generate a random, human-readable session ID (e.g. ASIM-8729)
export const generateSessionId = () => {
  const existing = localStorage.getItem('abu_asim_scanner_session_id');
  if (existing) return existing;
  
  const num = Math.floor(1000 + Math.random() * 9000);
  const id = `ASIM-${num}`;
  localStorage.setItem('abu_asim_scanner_session_id', id);
  return id;
};

// Retrieve current session ID
export const getSessionId = () => {
  return localStorage.getItem('abu_asim_scanner_session_id') || generateSessionId();
};
