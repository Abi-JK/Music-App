import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[SoundAura] ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', height: '100vh', background: '#070b14',
          color: '#f1f5f9', fontFamily: "'Inter', sans-serif", padding: 20,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>😵</div>
          <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, color: '#00d4e8' }}>
            Something went wrong
          </h2>
          <p style={{ fontSize: 14, color: '#94a3b8', marginBottom: 24, maxWidth: 400 }}>
            The app encountered an unexpected error. Please refresh the page to continue.
          </p>
          <button
            onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload(); }}
            style={{
              background: '#00d4e8', color: '#000', border: 'none',
              padding: '12px 32px', borderRadius: 500, fontSize: 14,
              fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            Refresh App
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
