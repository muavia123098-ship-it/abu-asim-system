import React, { useEffect, useState } from 'react';

export default function SplashScreen({ onFinish }) {
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Keep it for 5 seconds total as requested
    const timer1 = setTimeout(() => {
      setIsFadingOut(true);
    }, 4500);

    const timer2 = setTimeout(() => {
      onFinish();
    }, 5000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [onFinish]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: '#0c0c0c',
      backgroundImage: 'radial-gradient(circle, #1a1a1a 0%, #0c0c0c 100%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      transition: 'opacity 0.5s ease-out',
      opacity: isFadingOut ? 0 : 1,
      fontFamily: '"Inter", sans-serif'
    }}>
      <style>
        {`
          @keyframes pulseGlow {
            0%, 100% { transform: scale(1); filter: drop-shadow(0 0 10px rgba(186, 146, 86, 0.2)); }
            50% { transform: scale(1.05); filter: drop-shadow(0 0 20px rgba(186, 146, 86, 0.4)); }
          }
          @keyframes loadingProgress {
            0% { width: 0%; }
            100% { width: 100%; }
          }
        `}
      </style>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <img 
          src="/logo.png" 
          alt="Abu Asim Perfumery"
          style={{
            width: '180px',
            height: '180px',
            objectFit: 'contain',
            animation: 'pulseGlow 2s infinite ease-in-out'
          }}
          onError={(e) => { e.target.style.display = 'none'; }}
        />

        <h1 style={{ 
          color: '#ba9256', 
          marginTop: '2rem', 
          fontSize: '1.5rem', 
          fontWeight: '700', 
          letterSpacing: '2px',
          textTransform: 'uppercase',
          textShadow: '0 0 10px rgba(186, 146, 86, 0.3)'
        }}>
          Abu Asim Perfumery
        </h1>
        
        <p style={{ color: '#8a8d93', marginTop: '1rem', fontSize: '0.75rem', letterSpacing: '4px', textTransform: 'uppercase', fontWeight: '500', opacity: 0.8 }}>
          Starting System...
        </p>
      </div>
    </div>
  );
}
