// ============================================================
// Abu Asim Management System - Database Layer
// Storage: Desktop File (File System Access API) + LocalStorage fallback
// ============================================================

const DB_PREFIX = 'abu_asim_';
const FILE_HANDLE_KEY = 'abu_asim_file_handle';

// ── File System state ─────────────────────────────────────
let _fileHandle = null;       // FileSystemFileHandle
let _fileSaveTimer = null;    // debounce timer
let _fileReady = false;       // true once file is linked

// ── Notify other parts of app when data changes ───────────
const notifyChange = (collectionName) => {
  window.dispatchEvent(new CustomEvent('db-change-' + collectionName));
};

// ─────────────────────────────────────────────────────────
//  LocalStorage helpers (always-available fallback)
// ─────────────────────────────────────────────────────────
const getLocalData = (collectionName) => {
  try {
    const data = localStorage.getItem(DB_PREFIX + collectionName);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
};

const setLocalData = (collectionName, data) => {
  try {
    localStorage.setItem(DB_PREFIX + collectionName, JSON.stringify(data));
  } catch { }
};

// ─────────────────────────────────────────────────────────
//  File System Access API helpers
// ─────────────────────────────────────────────────────────

// Save persisted file handle to IndexedDB (localStorage can't store it)
const saveHandleToIDB = async (handle) => {
  try {
    const db = await openIDB();
    const tx = db.transaction('handles', 'readwrite');
    tx.objectStore('handles').put(handle, FILE_HANDLE_KEY);
    await txDone(tx);
  } catch { }
};

const loadHandleFromIDB = async () => {
  try {
    const db = await openIDB();
    const tx = db.transaction('handles', 'readonly');
    const handle = await idbGet(tx.objectStore('handles'), FILE_HANDLE_KEY);
    await txDone(tx);
    return handle || null;
  } catch { return null; }
};

const openIDB = () => new Promise((resolve, reject) => {
  const req = indexedDB.open('AbuAsimFileHandles', 1);
  req.onupgradeneeded = (e) => e.target.result.createObjectStore('handles');
  req.onsuccess = (e) => resolve(e.target.result);
  req.onerror = reject;
});

const idbGet = (store, key) => new Promise((resolve, reject) => {
  const req = store.get(key);
  req.onsuccess = (e) => resolve(e.target.result);
  req.onerror = reject;
});

const txDone = (tx) => new Promise((resolve, reject) => {
  tx.oncomplete = resolve;
  tx.onerror = reject;
});

// ── Read all data from the linked JSON file ──────────────
export const readFromFile = async () => {
  if (!_fileHandle) return null;
  try {
    const file = await _fileHandle.getFile();
    const text = await file.text();
    if (!text.trim()) return {};
    return JSON.parse(text);
  } catch { return null; }
};

// ── Write ALL localStorage data to the linked JSON file ──
const writeToFile = async () => {
  if (!_fileHandle) return;
  try {
    // Check we still have permission
    const perm = await _fileHandle.queryPermission({ mode: 'readwrite' });
    if (perm !== 'granted') return;

    const allData = {};
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith(DB_PREFIX)) {
        const collName = key.replace(DB_PREFIX, '');
        try { allData[collName] = JSON.parse(localStorage.getItem(key)); } catch { }
      }
    });

    const payload = {
      _meta: {
        app: 'Abu Asim Management System',
        lastSaved: new Date().toISOString(),
        version: '3.0'
      },
      ...allData
    };

    const writable = await _fileHandle.createWritable();
    await writable.write(JSON.stringify(payload, null, 2));
    await writable.close();
  } catch (err) {
    console.warn('[DB] File write failed:', err);
  }
};

// ── Debounced save — prevents too many writes ─────────────
const scheduleSave = () => {
  if (!_fileHandle) return;
  clearTimeout(_fileSaveTimer);
  _fileSaveTimer = setTimeout(() => writeToFile(), 600);
};

// ── Load data from file into localStorage ─────────────────
const loadFileDataIntoLocalStorage = async () => {
  const data = await readFromFile();
  if (!data) return false;
  Object.keys(data).forEach(key => {
    if (key === '_meta') return;
    try {
      localStorage.setItem(DB_PREFIX + key, JSON.stringify(data[key]));
    } catch { }
  });
  return true;
};

// ─────────────────────────────────────────────────────────
//  PUBLIC: Connect to a desktop file (called from Settings)
// ─────────────────────────────────────────────────────────
export const connectDataFile = async () => {
  if (!window.showSaveFilePicker) {
    alert('Aapka browser File System API support nahi karta.\nChrome ya Edge use karein.');
    return false;
  }
  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: 'AbuAsim_Data.json',
      types: [{ description: 'JSON Data File', accept: { 'application/json': ['.json'] } }],
      startIn: 'desktop'
    });
    _fileHandle = handle;
    _fileReady = true;
    await saveHandleToIDB(handle);

    // Write current data to the new file immediately
    await writeToFile();
    window.dispatchEvent(new CustomEvent('file-connected', { detail: { name: handle.name } }));
    return true;
  } catch (err) {
    if (err.name !== 'AbortError') console.error('[DB] connectDataFile error:', err);
    return false;
  }
};

// ─────────────────────────────────────────────────────────
//  PUBLIC: Disconnect file link
// ─────────────────────────────────────────────────────────
export const disconnectDataFile = async () => {
  _fileHandle = null;
  _fileReady = false;
  try {
    const db = await openIDB();
    const tx = db.transaction('handles', 'readwrite');
    tx.objectStore('handles').delete(FILE_HANDLE_KEY);
    await txDone(tx);
  } catch { }
  window.dispatchEvent(new CustomEvent('file-disconnected'));
};

// ─────────────────────────────────────────────────────────
//  PUBLIC: Get current file status
// ─────────────────────────────────────────────────────────
export const getFileStatus = () => ({
  connected: _fileReady && !!_fileHandle,
  fileName: _fileHandle ? _fileHandle.name : null
});

// ─────────────────────────────────────────────────────────
//  INIT: Try to restore file handle from previous session
// ─────────────────────────────────────────────────────────
export const initFileStorage = async () => {
  if (!window.showSaveFilePicker) return; // browser not supported
  try {
    const handle = await loadHandleFromIDB();
    if (!handle) return;

    // Check permission silently (won't prompt user)
    let perm = await handle.queryPermission({ mode: 'readwrite' });
    
    if (perm === 'prompt') {
      // Browser requires a user gesture (click) to show the prompt.
      // Wait for the user's first click anywhere on the page.
      perm = await new Promise(resolve => {
        const onFirstClick = async () => {
          window.removeEventListener('click', onFirstClick, true);
          try {
            const p = await handle.requestPermission({ mode: 'readwrite' });
            resolve(p);
          } catch (e) {
            resolve('denied');
          }
        };
        // Use capture phase to ensure we catch it early
        window.addEventListener('click', onFirstClick, true);
      });
    }

    if (perm === 'granted') {
      _fileHandle = handle;
      _fileReady = true;
      // Load file data into localStorage
      await loadFileDataIntoLocalStorage();
      window.dispatchEvent(new CustomEvent('file-connected', { detail: { name: handle.name } }));
      
      // If any local changes happened before this click, sync them to the file now
      writeToFile();
    }
  } catch (err) {
    console.warn('[DB] Could not restore file handle:', err);
  }
};

// ─────────────────────────────────────────────────────────
//  Core saveLocalData — writes to localStorage + file
// ─────────────────────────────────────────────────────────
const saveLocalData = (collectionName, data) => {
  setLocalData(collectionName, data);
  notifyChange(collectionName);
  scheduleSave(); // async write to file
};

// Listen for cross-tab localStorage changes
window.addEventListener('storage', (e) => {
  if (e.key && e.key.startsWith(DB_PREFIX)) {
    const collectionName = e.key.replace(DB_PREFIX, '');
    notifyChange(collectionName);
  }
});

// ─────────────────────────────────────────────────────────
//  Firestore-compatible API (unchanged interface)
// ─────────────────────────────────────────────────────────
export const db = {};

export const auth = {
  currentUser: { uid: 'local-user', displayName: 'Local User', email: 'admin@abuasim.com' },
  onAuthStateChanged: (callback) => {
    callback({ uid: 'local-user', displayName: 'Local User', email: 'admin@abuasim.com' });
    return () => {};
  },
  signOut: async () => Promise.resolve()
};

const createTimestamp = (date) => {
  const d = date ? new Date(date) : new Date();
  return {
    toDate: () => d,
    toMillis: () => d.getTime(),
    seconds: Math.floor(d.getTime() / 1000),
    nanoseconds: 0,
    toISOString: () => d.toISOString(),
    toDateString: () => d.toDateString()
  };
};

export const collection = (dbInstance, name) => name;

export const query = (collectionName, ...filters) => ({ collectionName, filters });
export const where = (field, op, value) => ({ field, op, value });
export const orderBy = (field, dir) => ({ type: 'orderBy', field, dir });
export const limit = (n) => ({ type: 'limit', n });

const wrapDoc = (item) => ({
  id: item.id,
  data: () => ({
    ...item,
    createdAt: item.createdAt ? createTimestamp(item.createdAt) : createTimestamp(),
    updatedAt: item.updatedAt ? createTimestamp(item.updatedAt) : createTimestamp(),
  })
});

export const onSnapshot = (q, callback) => {
  const collectionName = typeof q === 'string' ? q : q.collectionName;
  const handleUpdate = () => {
    let data = getLocalData(collectionName);
    if (q.filters) {
      q.filters.forEach(f => {
        if (f.op === '==') data = data.filter(item => item[f.field] === f.value);
      });
    }
    callback({
      docs: data.map(wrapDoc),
      size: data.length,
      forEach: (cb) => data.forEach(item => cb(wrapDoc(item)))
    });
  };
  handleUpdate();
  window.addEventListener('db-change-' + collectionName, handleUpdate);
  return () => window.removeEventListener('db-change-' + collectionName, handleUpdate);
};

export const addDoc = async (collectionName, data) => {
  const items = getLocalData(collectionName);
  const newItem = {
    ...data,
    id: Math.random().toString(36).substr(2, 9),
    createdAt: new Date().getTime(),
    updatedAt: new Date().getTime()
  };
  items.push(newItem);
  saveLocalData(collectionName, items);
  return { id: newItem.id };
};

export const updateDoc = async (docRef, data) => {
  const [collectionName, id] = docRef.split('/');
  const items = getLocalData(collectionName);
  const index = items.findIndex(item => item.id === id);
  if (index !== -1) {
    const updatedData = { ...data };
    for (const key in updatedData) {
      if (updatedData[key] && updatedData[key].type === 'increment') {
        updatedData[key] = (items[index][key] || 0) + updatedData[key].value;
      }
    }
    items[index] = { ...items[index], ...updatedData, updatedAt: new Date().getTime() };
    saveLocalData(collectionName, items);
  }
};

export const deleteDoc = async (docRef) => {
  const [collectionName, id] = docRef.split('/');
  const items = getLocalData(collectionName);
  saveLocalData(collectionName, items.filter(item => item.id !== id));
};

export const getDocs = async (q) => {
  const collectionName = typeof q === 'string' ? q : q.collectionName;
  let data = getLocalData(collectionName);
  if (q.filters) {
    q.filters.forEach(f => {
      if (f.op === '==') data = data.filter(item => item[f.field] === f.value);
    });
  }
  return {
    docs: data.map(wrapDoc),
    size: data.length,
    forEach: (cb) => data.forEach(item => cb(wrapDoc(item)))
  };
};

export const getDoc = async (docRef) => {
  const [collectionName, id] = docRef.split('/');
  const items = getLocalData(collectionName);
  const item = items.find(i => i.id === id);
  return {
    exists: () => !!item,
    data: () => item ? wrapDoc(item).data() : null
  };
};

export const setDoc = async (docRef, data) => {
  const [collectionName, id] = docRef.split('/');
  const items = getLocalData(collectionName);
  const index = items.findIndex(item => item.id === id);
  const timestamp = new Date().getTime();
  if (index !== -1) {
    items[index] = { ...items[index], ...data, updatedAt: timestamp };
  } else {
    items.push({ ...data, id, createdAt: timestamp, updatedAt: timestamp });
  }
  saveLocalData(collectionName, items);
};

export const runTransaction = async (dbInstance, callback) => {
  const transaction = {
    get: async (docRef) => getDoc(docRef),
    update: async (docRef, data) => updateDoc(docRef, data),
    set: async (docRef, data) => setDoc(docRef, data),
    delete: async (docRef) => deleteDoc(docRef)
  };
  return callback(transaction);
};

export const writeBatch = (dbInstance) => {
  let operations = [];
  return {
    set: (docRef, data) => operations.push({ type: 'set', docRef, data }),
    update: (docRef, data) => operations.push({ type: 'update', docRef, data }),
    delete: (docRef) => operations.push({ type: 'delete', docRef }),
    commit: async () => {
      for (const op of operations) {
        if (op.type === 'set') await setDoc(op.docRef, op.data);
        else if (op.type === 'update') await updateDoc(op.docRef, op.data);
        else if (op.type === 'delete') await deleteDoc(op.docRef);
      }
    }
  };
};

export const doc = (arg1, arg2, arg3) => {
  if (typeof arg2 === 'string' && typeof arg3 === 'string') return `${arg2}/${arg3}`;
  if (typeof arg1 === 'string' && typeof arg2 === 'string') return `${arg1}/${arg2}`;
  if (typeof arg1 === 'string' && !arg2) return `${arg1}/${Math.random().toString(36).substr(2, 9)}`;
  return 'unknown/unknown';
};

export const serverTimestamp = () => new Date().getTime();
export const increment = (n) => ({ type: 'increment', value: n });
