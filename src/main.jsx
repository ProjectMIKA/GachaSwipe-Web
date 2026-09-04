import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './core/index.css';
import JSZip from 'jszip';

// Export JSZip to window for deck archiving
window.JSZip = JSZip;

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("M.I.K.A. Matrix Crash caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh', width: '100vw', background: '#0B0914', color: '#ff77a9',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '24px', fontFamily: 'monospace', textAlign: 'center'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🐾⚠️</div>
          <h2 style={{ color: '#00F5D4', margin: '0 0 12px 0' }}>M.I.K.A. OS Exception Intercepted</h2>
          <p style={{ color: '#fff', maxWidth: '500px', lineHeight: 1.5, marginBottom: '20px' }}>
            {this.state.error?.message || 'An unexpected error occurred in the card deck.'}
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px', borderRadius: '12px', border: 'none',
              background: 'linear-gradient(135deg, #ff77a9, #a370f7)',
              color: '#fff', fontWeight: 'bold', cursor: 'pointer'
            }}
          >
            Reboot Matrix
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
