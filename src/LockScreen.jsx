import React, { useState, useEffect, useRef } from 'react';
import { Lock, Eye, EyeOff, CornerDownLeft, Delete } from 'lucide-react';

export default function LockScreen({ onUnlock }) {
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState(false);
  const cardRef = useRef(null);

  // Retrieve and decode stored passcode (obfuscated in Base64)
  const getStoredPasscode = () => {
    try {
      const encoded = localStorage.getItem('abu_asim_master_passcode');
      return encoded ? atob(encoded) : null;
    } catch {
      return null;
    }
  };

  const handleUnlock = () => {
    const correctPasscode = getStoredPasscode();
    if (!correctPasscode || pin === correctPasscode) {
      setError(false);
      onUnlock();
    } else {
      setError(true);
      setPin('');
      // Trigger shaking animation
      if (cardRef.current) {
        cardRef.current.style.animation = 'none';
        // Force reflow
        void cardRef.current.offsetHeight;
        cardRef.current.style.animation = 'lock-shake 0.4s cubic-bezier(.36,.07,.19,.97) both';
      }
      setTimeout(() => setError(false), 2000);
    }
  };

  const handleKeyPress = (num) => {
    if (pin.length < 16) {
      setPin(prev => prev + num);
    }
  };

  const handleBackspace = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const handleClear = () => {
    setPin('');
  };

  // Keyboard support
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key >= '0' && e.key <= '9') {
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        handleUnlock();
      } else if (e.key === 'Escape') {
        handleClear();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pin]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'radial-gradient(circle at center, #161616 0%, #0a0a0a 100%)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 999999,
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <style>{`
        @keyframes lock-shake {
          10%, 90% { transform: translate3d(-2px, 0, 0); }
          20%, 80% { transform: translate3d(4px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-6px, 0, 0); }
          40%, 60% { transform: translate3d(6px, 0, 0); }
        }
        @keyframes lock-pulseGold {
          0% { box-shadow: 0 0 0 0px rgba(212, 175, 55, 0.3); }
          70% { box-shadow: 0 0 0 12px rgba(212, 175, 55, 0); }
          100% { box-shadow: 0 0 0 0px rgba(212, 175, 55, 0); }
        }
        .keypad-btn {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(212, 175, 55, 0.15);
          color: var(--text-main, #ffffff);
          font-size: 1.4rem;
          font-weight: 700;
          border-radius: 16px;
          height: 60px;
          cursor: pointer;
          transition: all 0.15s ease-out;
          display: flex;
          alignItems: center;
          justifyContent: center;
        }
        .keypad-btn:hover {
          background: rgba(212, 175, 55, 0.1);
          border-color: #d4af37;
          transform: scale(1.05);
          color: #d4af37;
        }
        .keypad-btn:active {
          transform: scale(0.95);
        }
        .lock-input::placeholder {
          color: rgba(255, 255, 255, 0.2);
        }
      `}</style>

      <div 
        ref={cardRef}
        style={{
          background: 'rgba(26, 26, 26, 0.65)',
          border: error ? '1.5px solid #ef4444' : '1.5px solid #d4af37',
          borderRadius: '32px',
          padding: '3rem 2.5rem',
          width: '90%',
          maxWidth: '400px',
          boxShadow: '0 30px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(212, 175, 55, 0.08)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          textAlign: 'center',
          transition: 'border-color 0.25s ease'
        }}
      >
        {/* Glowing Golden Lock Header */}
        <div style={{
          background: 'rgba(212, 175, 55, 0.08)',
          border: '1.5px solid #d4af37',
          borderRadius: '50%',
          width: '72px',
          height: '72px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          margin: '0 auto 1.5rem',
          color: '#d4af37',
          animation: 'lock-pulseGold 2s infinite'
        }}>
          <Lock size={34} />
        </div>

        {/* Business Title */}
        <h1 style={{
          fontSize: '1.6rem',
          fontWeight: '800',
          margin: '0 0 0.4rem',
          background: 'linear-gradient(135deg, #ffffff 0%, #d4af37 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '1px'
        }}>
          Abu Asim Perfumery
        </h1>
        <p style={{
          fontSize: '0.85rem',
          color: error ? '#ef4444' : 'rgba(255, 255, 255, 0.5)',
          marginBottom: '2rem',
          fontWeight: '500',
          transition: 'color 0.25s ease'
        }}>
          {error ? 'Ghalat passcode! Dobara koshish karein.' : 'System ko unlock karne ke liye passcode enter karein.'}
        </p>

        {/* PIN Input Display */}
        <div style={{
          position: 'relative',
          marginBottom: '2rem'
        }}>
          <input
            type={showPin ? 'text' : 'password'}
            value={pin}
            readOnly
            placeholder="••••••"
            className="lock-input"
            style={{
              width: '100%',
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1.5px solid rgba(212, 175, 55, 0.25)',
              borderRadius: '16px',
              padding: '1.1rem 3.5rem 1.1rem 1.5rem',
              fontSize: '1.4rem',
              fontWeight: '700',
              color: '#d4af37',
              textAlign: 'center',
              letterSpacing: showPin ? '2px' : '6px',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
          <button
            onClick={() => setShowPin(!showPin)}
            style={{
              position: 'absolute',
              right: '15px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'none',
              border: 'none',
              color: 'rgba(212, 175, 55, 0.6)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            {showPin ? <EyeOff size={20} /> : <Eye size={20} />}
          </button>
        </div>

        {/* Premium PIN Keypad Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0.8rem',
          marginBottom: '2rem'
        }}>
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button
              key={num}
              onClick={() => handleKeyPress(String(num))}
              className="keypad-btn"
            >
              {num}
            </button>
          ))}
          <button
            onClick={handleClear}
            className="keypad-btn"
            style={{ fontSize: '0.9rem', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.15)' }}
          >
            CLR
          </button>
          <button
            onClick={() => handleKeyPress('0')}
            className="keypad-btn"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="keypad-btn"
            style={{ color: 'rgba(255, 255, 255, 0.6)' }}
          >
            <Delete size={20} />
          </button>
        </div>

        {/* Unlock Button */}
        <button
          onClick={handleUnlock}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #d4af37 0%, #aa8822 100%)',
            color: '#000000',
            border: 'none',
            borderRadius: '16px',
            padding: '1.1rem',
            fontSize: '1rem',
            fontWeight: '800',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.6rem',
            boxShadow: '0 8px 24px rgba(212, 175, 55, 0.25)',
            transition: 'all 0.2s ease-out'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 12px 30px rgba(212, 175, 55, 0.35)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(212, 175, 55, 0.25)';
          }}
        >
          <CornerDownLeft size={18} /> UNLOCK SYSTEM
        </button>
      </div>
    </div>
  );
}
