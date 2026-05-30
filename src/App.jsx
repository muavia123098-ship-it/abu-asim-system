import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import Dashboard from './Dashboard';
import Suppliers from './Suppliers';
import Products from './Products';
import Inventory from './Inventory';
import Purchases from './Purchases';
import Sales from './Sales';
import Customers from './Customers';
import Expenses from './Expenses';
import Reports from './Reports';
import Employees from './Employees';
import Settings from './Settings';
import SplashScreen from './SplashScreen';
import ErrorBoundary from './ErrorBoundary';
import ActivationLock from './ActivationLock';

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [alertInfo, setAlertInfo] = useState({ show: false, message: '', onClose: null });
  const [isActivated, setIsActivated] = useState(localStorage.getItem('abu_asim_system_activated') === 'true');

  useEffect(() => {
    const originalAlert = window.alert;
    
    // Override window.alert
    window.alert = (message, onClose) => {
      setAlertInfo({ 
        show: true, 
        message: String(message), 
        onClose: typeof onClose === 'function' ? onClose : null 
      });
    };

    return () => {
      window.alert = originalAlert;
    };
  }, []);

  const handleCloseAlert = () => {
    const callback = alertInfo.onClose;
    setAlertInfo({ show: false, message: '', onClose: null });
    if (callback) {
      callback();
    }
  };

  // Keyboard accessibility: dismiss with Enter or Escape
  useEffect(() => {
    if (!alertInfo.show) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        handleCloseAlert();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [alertInfo.show]);

  const styleTag = (
    <style>{`
      @keyframes alert-fadeInOverlay {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes alert-scaleInModal {
        from { opacity: 0; transform: scale(0.92) translateY(12px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
      }
      @keyframes alert-pulsePrimary {
        0% { box-shadow: 0 0 0 0px rgba(212, 175, 55, 0.4); }
        70% { box-shadow: 0 0 0 10px rgba(212, 175, 55, 0); }
        100% { box-shadow: 0 0 0 0px rgba(212, 175, 55, 0); }
      }
      .alert-btn:hover {
        transform: scale(1.03);
        filter: brightness(1.1);
        box-shadow: 0 6px 20px rgba(212, 175, 55, 0.4);
      }
      .alert-btn:active {
        transform: scale(0.98);
      }
    `}</style>
  );

  if (!isActivated) {
    return <ActivationLock onActivate={() => setIsActivated(true)} />;
  }

  return (
    <ErrorBoundary>
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      
      {/* Custom Premium Alert Modal */}
      {alertInfo.show && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999999,
          animation: 'alert-fadeInOverlay 0.2s ease-out',
        }}>
          {styleTag}
          <div style={{
            background: 'var(--bg-surface)',
            border: '1.5px solid var(--primary)',
            borderRadius: '24px',
            padding: '2.5rem 2rem',
            width: '90%',
            maxWidth: '420px',
            boxShadow: '0 20px 45px rgba(0, 0, 0, 0.6), 0 0 25px rgba(212, 175, 55, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            textAlign: 'center',
            animation: 'alert-scaleInModal 0.28s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}>
            <div style={{
              background: 'rgba(212, 175, 55, 0.1)',
              border: '1.5px solid var(--primary)',
              borderRadius: '50%',
              width: '64px',
              height: '64px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: '1.5rem',
              color: 'var(--primary)',
              animation: 'alert-pulsePrimary 2s infinite',
            }}>
              <AlertCircle size={32} />
            </div>
            
            <div style={{
              fontSize: '0.75rem',
              fontWeight: '700',
              color: 'var(--primary)',
              letterSpacing: '2px',
              marginBottom: '0.5rem',
              textTransform: 'uppercase',
            }}>
              System Alert
            </div>

            <p style={{
              fontSize: '1rem',
              color: 'var(--text-main)',
              lineHeight: '1.6',
              marginBottom: '2rem',
              fontWeight: '500',
              whiteSpace: 'pre-wrap',
            }}>
              {alertInfo.message}
            </p>

            <button 
              className="alert-btn"
              onClick={handleCloseAlert}
              style={{
                background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)',
                color: '#121212',
                fontWeight: '700',
                border: 'none',
                borderRadius: '12px',
                padding: '0.8rem 3rem',
                fontSize: '0.95rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease-out',
                letterSpacing: '0.5px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}

      <div style={{ opacity: showSplash ? 0 : 1, visibility: showSplash ? 'hidden' : 'visible', transition: 'opacity 0.5s ease-in', height: '100vh', width: '100vw' }}>
        <Router>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/products" element={<Products />} />
            <Route path="/inventory" element={<Inventory />} />
            <Route path="/purchases" element={<Purchases />} />
            <Route path="/sales" element={<Sales />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/expenses" element={<Expenses />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </Router>
      </div>
    </ErrorBoundary>
  );
}

export default App;
