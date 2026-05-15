// Local Storage Database Layer
// This replaces Firebase and stores data locally on the device.

const DB_PREFIX = 'abu_asim_';

// Helper to get data from localStorage
const getLocalData = (collectionName) => {
  try {
    const data = localStorage.getItem(DB_PREFIX + collectionName);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    return [];
  }
};

// Helper to save data to localStorage
const saveLocalData = (collectionName, data) => {
  try {
    localStorage.setItem(DB_PREFIX + collectionName, JSON.stringify(data));
    window.dispatchEvent(new CustomEvent('db-change-' + collectionName, { detail: data }));
  } catch (e) {}
};

// Listen for cross-tab changes
window.addEventListener('storage', (e) => {
  if (e.key && e.key.startsWith(DB_PREFIX)) {
    const collectionName = e.key.replace(DB_PREFIX, '');
    window.dispatchEvent(new CustomEvent('db-change-' + collectionName));
  }
});

export const db = {};

// Mock Auth
export const auth = {
  currentUser: { uid: 'local-user', displayName: 'Local User', email: 'admin@abuasim.com' },
  onAuthStateChanged: (callback) => {
    callback({ uid: 'local-user', displayName: 'Local User', email: 'admin@abuasim.com' });
    return () => {};
  },
  signOut: async () => Promise.resolve()
};

// Mock Timestamp
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

export const query = (collectionName, ...filters) => {
  return { collectionName, filters };
};

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
  const newItems = items.filter(item => item.id !== id);
  saveLocalData(collectionName, newItems);
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
  // Handle doc(db, 'col', 'id')
  if (typeof arg2 === 'string' && typeof arg3 === 'string') return `${arg2}/${arg3}`;
  // Handle doc(collectionRef, 'id')
  if (typeof arg1 === 'string' && typeof arg2 === 'string') return `${arg1}/${arg2}`;
  // Handle doc(collectionRef) -> generates ID
  if (typeof arg1 === 'string' && !arg2) return `${arg1}/${Math.random().toString(36).substr(2, 9)}`;
  return 'unknown/unknown';
};

export const serverTimestamp = () => new Date().getTime();
export const increment = (n) => ({ type: 'increment', value: n });
