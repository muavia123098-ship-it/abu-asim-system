import React, { useState } from 'react';
import { ShieldAlert, Key, Eye, EyeOff, CheckCircle } from 'lucide-react';

export default function ActivationLock({ onActivate }) {
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);

  // Master Activation Keys
  const VALID_KEYS = ['AbuAsim786', 'ABUASIM-GOLD-2026', 'abu-asim-premium-secure'];

  const handleActivate = (e) => {
    e.preventDefault();
    if (VALID_KEYS.includes(keyInput.trim())) {
      setSuccess(true);
      setError(false);
      setTimeout(() => {
        localStorage.setItem('abu_asim_system_activated', 'true');
        onActivate();
      }, 1500);
    } else {
      setError(true);
      setKeyInput('');
      setTimeout(() => setError(false), 3000);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'radial-gradient(circle at center, #141414 0%, #050505 100%)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 9999999,
      fontFamily: 'system-ui, -apple-system, sans-serif'
    }}>
      <style>{`
        @keyframes act-pulseGold {
          0% { box-shadow: 0 0 0 0px rgba(212, 175, 55, 0.4); }
          70% { box-shadow: 0 0 0 16px rgba(212, 175, 55, 0); }
          100% { box-shadow: 0 0 0 0px rgba(212, 175, 55, 0); }
        }
        @keyframes act-shake {
          10%, 90% { transform: translate3d(-3px, 0, 0); }
          20%, 80% { transform: translate3d(5px, 0, 0); }
          30%, 50%, 70% { transform: translate3d(-8px, 0, 0); }
          40%, 60% { transform: translate3d(8px, 0, 0); }
        }
        .act-card {
          background: rgba(22, 22, 22, 0.7);
          border: 1.5px solid #d4af37;
          border-radius: 36px;
          padding: 3.5rem 3rem;
          width: 90%;
          maxWidth: 440px;
          boxShadow: 0 40px 80px rgba(0, 0, 0, 0.9), 0 0 50px rgba(212, 175, 55, 0.12);
          backdropFilter: blur(25px);
          WebkitBackdropFilter: blur(25px);
          textAlign: 'center';
          transition: all 0.3s ease;
        }
        .act-card.shake {
          animation: act-shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
          border-color: #ef4444;
          box-shadow: 0 40px 80px rgba(0, 0, 0, 0.9), 0 0 50px rgba(239, 68, 68, 0.2);
        }
        .act-card.success {
          border-color: #10b981;
          box-shadow: 0 40px 80px rgba(0, 0, 0, 0.9), 0 0 50px rgba(16, 185, 129, 0.2);
        }
        .act-input::placeholder {
          color: rgba(255, 255, 255, 0.25);
        }
        .act-input:focus {
          border-color: #d4af37 !important;
          box-shadow: 0 0 15px rgba(212, 175, 55, 0.15) !important;
        }
      `}</style>

      <div className={`act-card ${error ? 'shake' : ''} ${success ? 'success' : ''}`}>
        
        {/* Animated Security Status Badge */}
        <div style={{
          background: success ? 'rgba(16, 185, 129, 0.08)' : 'rgba(212, 175, 55, 0.08)',
          border: success ? '1.5px solid #10b981' : '1.5px solid #d4af37',
          borderRadius: '50%',
          width: '84px',
          height: '84px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          margin: '0 auto 2rem',
          color: success ? '#10b981' : '#d4af37',
          animation: success ? 'none' : 'act-pulseGold 2s infinite',
          transition: 'all 0.3s ease'
        }}>
          {success ? <CheckCircle size={40} /> : <ShieldAlert size={40} />}
        </div>

        {/* Brand/System Title */}
        <h1 style={{
          fontSize: '1.8rem',
          fontWeight: '900',
          margin: '0 0 0.5rem',
          background: 'linear-gradient(135deg, #ffffff 0%, #d4af37 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          letterSpacing: '1.5px'
        }}>
          ABU ASIM SYSTEM
        </h1>
        <p style={{
          fontSize: '0.8rem',
          fontWeight: '700',
          color: '#d4af37',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          marginBottom: '1rem'
        }}>
          Software Activation Lock
        </p>

        {/* Activation Description */}
        <p style={{
          fontSize: '0.85rem',
          lineHeight: '1.5',
          color: 'rgba(255, 255, 255, 0.55)',
          marginBottom: '2.5rem',
          padding: '0 10px'
        }}>
          {success ? (
            <span style={{ color: '#10b981', fontWeight: 'bold' }}>License Verified! Activating premium system...</span>
          ) : error ? (
            <span style={{ color: '#ef4444', fontWeight: 'bold' }}>Ghalat Key! Aap ko software use karne ki ijazat nahi hai.</span>
          ) : (
            'Aap ka custom software premium licensing se secured hai. Is device par system ko activate karne ke liye Activation Passcode enter karein.'
          )}
        </p>

        {/* Password / Activation Key Form */}
        <form onSubmit={handleActivate}>
          <div style={{ position: 'relative', marginBottom: '2rem' }}>
            <input
              type={showKey ? 'text' : 'password'}
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder="Enter Activation Passcode"
              className="act-input"
              required
              disabled={success}
              style={{
                width: '100%',
                background: 'rgba(0, 0, 0, 0.5)',
                border: error ? '1.5px solid #ef4444' : '1.5px solid rgba(212, 175, 55, 0.25)',
                borderRadius: '18px',
                padding: '1.2rem 4rem 1.2rem 1.5rem',
                fontSize: '1.1rem',
                fontWeight: '600',
                color: '#ffffff',
                textAlign: 'center',
                outline: 'none',
                boxSizing: 'border-box',
                transition: 'all 0.25s ease'
              }}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              style={{
                position: 'absolute',
                right: '18px',
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
              {showKey ? <EyeOff size={22} /> : <Eye size={22} />}
            </button>
          </div>

          <button
            type="submit"
            disabled={success}
            style={{
              width: '100%',
              background: success 
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' 
                : 'linear-gradient(135deg, #d4af37 0%, #aa8822 100%)',
              color: '#000000',
              border: 'none',
              borderRadius: '18px',
              padding: '1.1rem',
              fontSize: '1rem',
              fontWeight: '800',
              cursor: success ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.8rem',
              boxShadow: success 
                ? '0 8px 24px rgba(16, 185, 129, 0.25)' 
                : '0 8px 24px rgba(212, 175, 55, 0.25)',
              transition: 'all 0.25s ease-out'
            }}
            onMouseEnter={(e) => {
              if (!success) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 30px rgba(212, 175, 55, 0.35)';
              }
            }}
            onMouseLeave={(e) => {
              if (!success) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(212, 175, 55, 0.25)';
              }
            }}
          >
            <Key size={18} /> {success ? 'ACTIVATED' : 'ACTIVATE SYSTEM'}
          </button>
        </form>

        {/* Brand Copyright footer */}
        <p style={{
          fontSize: '0.7rem',
          color: 'rgba(255,255,255,0.25)',
          marginTop: '2.5rem',
          letterSpacing: '0.5px'
        }}>
          Abu Asim Perfumery © 2026. All Rights Reserved.
        </p>

      </div>
    </div>
  );
}
