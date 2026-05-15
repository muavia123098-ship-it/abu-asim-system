import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          height: '100vh', width: '100vw', display: 'flex', flexDirection: 'column', 
          alignItems: 'center', justifyContent: 'center', backgroundColor: '#0a0a0a', color: 'white',
          textAlign: 'center', padding: '2rem' 
        }}>
          <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '3rem', borderRadius: '24px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <AlertTriangle size={64} color="#ef4444" style={{ marginBottom: '1.5rem' }} />
            <h1 style={{ margin: '0 0 1rem 0' }}>Something went wrong</h1>
            <p style={{ color: 'rgba(255,255,255,0.6)', maxWidth: '400px', marginBottom: '2rem' }}>
              The application encountered an unexpected error. Don't worry, your data is safe.
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button 
                onClick={() => window.location.reload()}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.8rem 1.5rem', 
                  backgroundColor: '#d4af37', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' 
                }}
              >
                <RefreshCw size={18} /> Refresh App
              </button>
              <button 
                onClick={() => window.location.href = '/'}
                style={{ 
                  display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.8rem 1.5rem', 
                  backgroundColor: 'rgba(255,255,255,0.05)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' 
                }}
              >
                <Home size={18} /> Back to Safety
              </button>
            </div>
            {process.env.NODE_ENV === 'development' && (
              <pre style={{ marginTop: '2rem', textAlign: 'left', fontSize: '0.8rem', backgroundColor: 'black', padding: '1rem', borderRadius: '8px', overflow: 'auto', maxWidth: '600px' }}>
                {this.state.error?.toString()}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
