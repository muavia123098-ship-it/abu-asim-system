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
      {/* Brand Logo Top Left */}
      <div style={{ position: 'absolute', top: '2rem', left: '2rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <img src="/logo.png" alt="Logo" style={{ width: '60px', height: '60px', objectFit: 'contain', filter: 'drop-shadow(0 0 5px rgba(212,175,55,0.4))' }} onError={(e) => { e.target.style.display = 'none'; }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 style={{ fontSize: '1.2rem', fontWeight: '800', margin: '0 0 0.1rem 0', color: 'var(--text-main)', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>Abu Asim</h2>
          <div style={{ fontSize: '0.6rem', color: '#d4af37', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap', textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>MANAGEMENT SYSTEM</div>
        </div>
      </div>

      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <div style={{ width: '80px', height: '80px', borderRadius: '50%', backgroundColor: 'rgba(212, 175, 55, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', boxShadow: '0 0 30px rgba(212, 175, 55, 0.2)' }}>
          {error ? <ShieldAlert size={36} color="var(--danger)" /> : <Lock size={36} color="var(--primary)" />}
        </div>
        <h1 style={{ margin: 0, fontSize: '1.8rem', fontWeight: '800', letterSpacing: '2px', color: 'var(--text-main)' }}>SYSTEM LOCKED</h1>
        <p style={{ color: error ? 'var(--danger)' : 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.5rem', transition: 'color 0.3s' }}>
          {error ? 'Incorrect PIN entered' : 'Enter your 4-digit security PIN'}
        </p>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '3rem' }}>
        {[0, 1, 2, 3].map(i => (
          <div key={i} style={{ 
            width: '20px', height: '20px', 
            borderRadius: '50%', 
            backgroundColor: pin.length > i ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
            boxShadow: pin.length > i ? '0 0 15px var(--primary)' : 'none',
            transition: 'all 0.2s',
            border: pin.length > i ? 'none' : '2px solid rgba(255,255,255,0.2)'
          }} />
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', width: '280px' }}>
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
          <button 
            key={num} 
            onClick={() => handleKeyPress(num.toString())}
            style={{ 
              width: '75px', height: '75px', 
              borderRadius: '50%', 
              backgroundColor: 'rgba(255,255,255,0.03)', 
              border: '1px solid rgba(255,255,255,0.08)', 
              color: 'white', 
              fontSize: '1.8rem', 
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.2s',
              backdropFilter: 'blur(10px)'
            }}
            onMouseOver={e => { e.currentTarget.style.backgroundColor = 'rgba(212,175,55,0.15)'; e.currentTarget.style.borderColor = 'rgba(212,175,55,0.4)'; }}
            onMouseOut={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
          >
            {num}
          </button>
        ))}
        <div /> {/* Empty space bottom left */}
        <button 
          onClick={() => handleKeyPress('0')}
          style={{ 
            width: '75px', height: '75px', 
            borderRadius: '50%', 
            backgroundColor: 'rgba(255,255,255,0.03)', 
            border: '1px solid rgba(255,255,255,0.08)', 
            color: 'white', 
            fontSize: '1.8rem', 
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s',
            backdropFilter: 'blur(10px)'
          }}
          onMouseOver={e => { e.currentTarget.style.backgroundColor = 'rgba(212,175,55,0.15)'; e.currentTarget.style.borderColor = 'rgba(212,175,55,0.4)'; }}
          onMouseOut={e => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
        >
          0
        </button>
        <button 
          onClick={handleBackspace}
          style={{ 
            width: '75px', height: '75px', 
            borderRadius: '50%', 
            backgroundColor: 'transparent', 
            border: 'none', 
            color: 'var(--text-muted)', 
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all 0.2s'
          }}
          onMouseOver={e => { e.currentTarget.style.color = 'var(--text-main)' }}
          onMouseOut={e => { e.currentTarget.style.color = 'var(--text-muted)' }}
        >
          <Delete size={28} />
        </button>
      </div>
    </div>
  );
}
