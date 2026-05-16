import React, { useState, useEffect } from 'react';
import { db, auth, doc, getDoc } from './db';
import { Lock, Unlock, ShieldAlert, Delete } from 'lucide-react';

export default function PinScreen({ onUnlock }) {
  const [pin, setPin] = useState('');
  const [correctPin, setCorrectPin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const checkSecurity = async () => {
      const user = auth.currentUser;
      if (user) {
        const docSnap = await getDoc(doc(db, 'settings', user.uid));
        if (docSnap.exists() && docSnap.data().appLockEnabled && docSnap.data().appPin) {
          setCorrectPin(docSnap.data().appPin);
          setLoading(false);
        } else {
          // No lock enabled
          onUnlock();
        }
      } else {
        // Not logged in? App will redirect to login soon anyway if you had one,
        // but for now, just unlock to let the layout load.
        onUnlock();
      }
    };
    
    // Slight delay to ensure auth is ready if using local persistence wrapper
    setTimeout(checkSecurity, 500);
  }, [onUnlock]);

  useEffect(() => {
    if (loading) return;

    const handleKeyDown = (e) => {
      if (e.key >= '0' && e.key <= '9') {
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin, correctPin, loading]);

  const handleKeyPress = (num) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      setError(false);
      
      if (newPin.length === 4) {
        if (newPin === correctPin) {
          setTimeout(() => onUnlock(), 300);
        } else {
          setError(true);
          setTimeout(() => setPin(''), 500);
        }
      }
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  if (loading) {
    return (
      <div style={{ position: 'fixed', inset: 0, backgroundColor: '#0a0a0a', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="animate-spin" style={{ width: '40px', height: '40px', borderRadius: '50%', border: '3px solid rgba(212,175,55,0.3)', borderTopColor: '#d4af37' }} />
      </div>
    );
  }

  return (
    <div style={{ 
      position: 'fixed', inset: 0, 
      backgroundColor: '#0a0a0a', 
      backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(212, 175, 55, 0.15) 0%, transparent 60%)', 
      zIndex: 9999, 
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' 
    }}>
      <div style={{ textAlign: 'center', marginBottom: '2.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <img src="/logo.png" alt="Logo" style={{ width: '100px', height: '100px', objectFit: 'contain', filter: 'drop-shadow(0 0 10px rgba(212,175,55,0.4))', marginBottom: '0.8rem' }} onError={(e) => { e.target.style.display = 'none'; }} />
        <h2 style={{ fontSize: '1.8rem', fontWeight: '800', margin: '0 0 0.2rem 0', color: 'var(--text-main)', letterSpacing: '1px' }}>Abu Asim</h2>
        <div style={{ fontSize: '0.8rem', color: '#d4af37', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '2.5rem', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>MANAGEMENT SYSTEM</div>

        <div style={{ width: '70px', height: '70px', borderRadius: '50%', backgroundColor: 'rgba(212, 175, 55, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: '0 0 30px rgba(212, 175, 55, 0.2)' }}>
          {error ? <ShieldAlert size={32} color="var(--danger)" /> : <Lock size={32} color="var(--primary)" />}
        </div>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800', letterSpacing: '2px', color: 'var(--text-main)' }}>SYSTEM LOCKED</h1>
        <p style={{ color: error ? 'var(--danger)' : 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem', transition: 'color 0.3s' }}>
          {error ? 'Incorrect PIN entered' : 'Type your 4-digit security PIN on keyboard'}
        </p>
      </div>

      <div style={{ display: 'flex', gap: '1.2rem', marginBottom: '2rem' }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ 
            width: '24px', height: '24px', 
            borderRadius: '50%', 
            backgroundColor: pin.length > i ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
            boxShadow: pin.length > i ? '0 0 20px var(--primary)' : 'none',
            transition: 'all 0.2s',
            border: pin.length > i ? 'none' : '2px solid rgba(255,255,255,0.1)'
          }} />
        ))}
      </div>
    </div>
  );
}
