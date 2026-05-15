import React, { useState, useEffect } from 'react';
import Layout from './Layout';
import { 
  Settings as SettingsIcon, Building, Image as ImageIcon, 
  Coins, FileText, Database, Download, Upload, 
  Save, Trash2, ShieldCheck, RefreshCw
} from 'lucide-react';
import { db, auth, doc, getDoc, setDoc, updateDoc, collection, getDocs, writeBatch, query, where } from './db';

export default function Settings() {
  const [settings, setSettings] = useState({
    businessName: 'Abu Asim Perfumery',
    currency: 'PKR',
    invoiceNote: 'Thank you for shopping with us!',
    lowStockThreshold: 5
  });
  const [isLoading, setIsLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [restoreConfirm, setRestoreConfirm] = useState(null); // holds the parsed backup data
  const [pendingFile, setPendingFile] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const docRef = doc(db, 'settings', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) setSettings(docSnap.data());
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setIsLoading(true);
    try {
      await setDoc(doc(db, 'settings', user.uid), settings);
      alert("Settings saved successfully!");
    } catch (err) { console.error(err); alert("Error saving settings"); }
    finally { setIsLoading(false); }
  };

  const handleBackup = () => {
    setBackupLoading(true);
    try {
      const backupData = { 
        exportedAt: new Date().toISOString(), 
        version: '2.0',
        content: {} 
      };

      // Dynamically catch ALL abu_asim_ data
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('abu_asim_')) {
          const collName = key.replace('abu_asim_', '');
          const raw = localStorage.getItem(key);
          if (raw) backupData.content[collName] = JSON.parse(raw);
        }
      });

      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const fileName = `AbuAsim_Backup_${new Date().toISOString().split('T')[0]}.json`;
      
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 100);

      alert('✅ Backup file generated! Check your downloads folder.');
      
    } catch (err) {
      console.error(err);
      alert('Backup failed!');
    } finally {
      setBackupLoading(false);
    }
  };

  const handleRestoreSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = '';
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result);
        // Compatibility check: check for content (v2) or top-level keys (v1)
        const collections = data.content || data;
        if (!collections || Object.keys(collections).length === 0) {
          alert('This backup file appears to be empty!');
          return;
        }
        setPendingFile(data);
        setRestoreConfirm(true);
      } catch {
        alert('Invalid file format.');
      }
    };
    reader.readAsText(file);
  };

  const confirmRestore = () => {
    if (!pendingFile) return;
    setIsLoading(true);
    try {
      // Support both old (v1) and new (v2) backup structures
      const collections = pendingFile.content || pendingFile;
      
      // Clear current data first to avoid mix-ups
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('abu_asim_')) localStorage.removeItem(key);
      });

      // Inject backup data
      Object.keys(collections).forEach(coll => {
        if (coll === 'exportedAt' || coll === 'version') return; // skip metadata
        localStorage.setItem('abu_asim_' + coll, JSON.stringify(collections[coll]));
      });

      setRestoreConfirm(null);
      setPendingFile(null);
      alert('✅ Data restored successfully! App will now reload.');
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Restore failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const confirmReset = () => {
    setIsLoading(true);
    try {
      // Clear all keys starting with abu_asim_
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith('abu_asim_')) {
          localStorage.removeItem(key);
        }
      });
      alert('⚠️ All data has been deleted. System is now reset.');
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert('Reset failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout>
      <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
        
        <div style={{ marginBottom: '2.5rem' }}>
          <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: '800' }}>System Settings</h1>
          <p style={{ color: 'var(--text-muted)' }}>Configure your business profile and data preferences.</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', alignItems: 'start' }}>
          
          {/* General Settings */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.2rem' }}><Building size={20} color="var(--primary)" /> Business Profile</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.6rem' }}>Business Name</label>
                <input className="input-field w-full" style={{ padding: '0.8rem 1rem' }} value={settings.businessName} onChange={e => setSettings({...settings, businessName: e.target.value})} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.2rem' }}>
                <div>
                  <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.6rem' }}>Currency Symbol</label>
                  <input className="input-field w-full" style={{ padding: '0.8rem 1rem' }} value={settings.currency} onChange={e => setSettings({...settings, currency: e.target.value})} />
                </div>
                <div>
                  <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.6rem' }}>Low Stock Alert</label>
                  <input type="number" className="input-field w-full" style={{ padding: '0.8rem 1rem' }} value={settings.lowStockThreshold} onChange={e => setSettings({...settings, lowStockThreshold: parseInt(e.target.value)})} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.6rem' }}>Invoice Footer Note</label>
                <textarea className="input-field w-full" rows="3" style={{ height: 'auto', padding: '1rem' }} value={settings.invoiceNote} onChange={e => setSettings({...settings, invoiceNote: e.target.value})} />
              </div>

              <button disabled={isLoading} onClick={handleSave} className="btn-primary" style={{ marginTop: '0.5rem', justifyContent: 'center', padding: '1rem', fontSize: '0.95rem' }}>
                <Save size={20} /> {isLoading ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>

          {/* Data Management Refined */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div className="glass-panel" style={{ padding: '2rem' }}>
              <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.2rem' }}><Database size={20} color="var(--success)" /> Data Management</h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div style={{ backgroundColor: 'rgba(255,255,255,0.02)', padding: '1.2rem', borderRadius: '15px', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: 'bold', marginBottom: '0.8rem' }}>Export & Import Backup</div>
                  <div style={{ display: 'flex', gap: '1rem' }}>
                    <button disabled={backupLoading} onClick={handleBackup} className="btn-primary" style={{ flex: 1, padding: '0.8rem', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
                      <Download size={18} /> {backupLoading ? '...' : 'Export'}
                    </button>
                    <label className="btn-primary" style={{ flex: 1, padding: '0.8rem', cursor: 'pointer', backgroundColor: 'var(--bg-main)', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
                      <Upload size={18} /> Restore
                      <input type="file" hidden accept=".json" onChange={handleRestoreSelect} />
                    </label>
                  </div>
                </div>

                <div style={{ padding: '1rem', backgroundColor: 'rgba(212, 175, 55, 0.05)', borderRadius: '15px', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  <ShieldCheck size={22} color="var(--primary)" style={{ flexShrink: 0 }} />
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: '1.4' }}>Aapka data local hai. Safety ke liye waqtan fawaqtan backup export kar liya karein.</p>
                </div>

                {/* Danger Zone Refined */}
                <div style={{ marginTop: '1rem', paddingTop: '1.2rem', borderTop: '1px solid var(--border-color)' }}>
                   <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '0.9rem', color: 'var(--danger)', fontWeight: 'bold' }}>Factory Reset</div>
                      <button 
                        onClick={() => setShowDeleteConfirm(true)}
                        style={{ padding: '0.6rem 1.2rem', borderRadius: '10px', backgroundColor: 'transparent', color: 'var(--danger)', border: '1px solid var(--danger)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}
                      >
                        Reset System
                      </button>
                   </div>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Restore Confirmation Modal */}
      {restoreConfirm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div className="glass-panel" style={{ width: '460px', padding: '2.5rem', textAlign: 'center', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
            <div style={{ width: '70px', height: '70px', borderRadius: '50%', backgroundColor: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--danger)' }}>
              <RefreshCw size={36} className="spin-slow" />
            </div>
            <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.6rem', fontWeight: '800' }}>Restore System Data?</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '1rem' }}>
              Dhiyaan dein! Is backup ko restore karne se aapka <strong style={{ color: '#ef4444' }}>मौजूदा सारा डेटा (Current Data) डिलीट</strong> ho jayega aur backup file wala data load ho jayega.
            </p>
            <div style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '12px', marginBottom: '2rem' }}>
               <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.2rem' }}>Backup Created On</div>
               <div style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                 {pendingFile?.exportedAt ? new Date(pendingFile.exportedAt).toLocaleString('en-PK', { dateStyle: 'full', timeStyle: 'short' }) : 'Unknown Date'}
               </div>
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => { setRestoreConfirm(null); setPendingFile(null); }}
                style={{ flex: 1, padding: '1rem', borderRadius: '14px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', color: 'var(--text-main)', cursor: 'pointer', fontWeight: '600', transition: '0.2s' }}
              >
                Nahi, Cancel!
              </button>
              <button
                onClick={confirmRestore}
                disabled={isLoading}
                style={{ flex: 1.2, padding: '1rem', borderRadius: '14px', backgroundColor: 'var(--danger)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: '800', transition: '0.2s', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)' }}
              >
                {isLoading ? 'Restoring...' : 'Haan, Restore Karo!'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Reset Confirmation Modal */}
      {showDeleteConfirm && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
          <div className="glass-panel" style={{ width: '420px', padding: '2.5rem', textAlign: 'center', border: '1px solid var(--danger)' }}>
            <div style={{ width: '70px', height: '70px', borderRadius: '50%', backgroundColor: 'rgba(239,68,68,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', color: 'var(--danger)' }}>
              <Trash2 size={36} />
            </div>
            <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.6rem', fontWeight: '800', color: 'white' }}>Delete All Data?</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.5', marginBottom: '2rem' }}>
              Kya aap waqai sara data delete karna chahte hain? Isse aapki <strong style={{ color: '#ef4444' }}>Inventory, Sales, Customers aur Settings</strong> sab saaf ho jayengi. Yeh action wapas nahi liya ja sakta.
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{ flex: 1, padding: '1rem', borderRadius: '14px', border: '1px solid var(--border-color)', backgroundColor: 'transparent', color: 'var(--text-main)', cursor: 'pointer', fontWeight: '600' }}
              >
                Cancel
              </button>
              <button
                onClick={confirmReset}
                disabled={isLoading}
                style={{ flex: 1.2, padding: '1rem', borderRadius: '14px', backgroundColor: 'var(--danger)', color: 'white', border: 'none', cursor: 'pointer', fontWeight: '800', boxShadow: '0 4px 15px rgba(239, 68, 68, 0.4)' }}
              >
                {isLoading ? 'Resetting...' : 'Haan, Sab Delete Karo!'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
