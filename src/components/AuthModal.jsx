import React, { useState, useCallback } from 'react';

export default function AuthModal({ isOpen, onClose, onAuth, showToast }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('⚠️ Please fill in all fields');
      return;
    }
    if (mode === 'signup' && !name) {
      showToast('⚠️ Please enter your name');
      return;
    }
    // Store user data locally (no backend — local auth simulation)
    const user = {
      name: name || email.split('@')[0],
      email,
      joinedAt: Date.now(),
    };
    localStorage.setItem('saaura_user', JSON.stringify(user));
    onAuth(user);
    showToast(mode === 'login' ? '✅ Welcome back!' : '✅ Account created!');
    onClose();
  }, [mode, name, email, password, onAuth, showToast, onClose]);

  if (!isOpen) return null;

  return (
    <div className="overlay" onClick={onClose}>
      <div className="modal auth-modal" onClick={e => e.stopPropagation()}>
        <div className="auth-header">
          <div className="auth-logo">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5">
              <path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>
            </svg>
            <span>SoundAura</span>
          </div>
          <h3>{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h3>
          <p>{mode === 'login' ? 'Sign in to personalize your experience' : 'Join SoundAura for a personalized experience'}</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div className="auth-field">
              <label>Name</label>
              <input type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
            </div>
          )}
          <div className="auth-field">
            <label>Email</label>
            <input type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="auth-field">
            <label>Password</label>
            <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn-primary auth-submit">
            {mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="auth-switch">
          {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
          <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}>
            {mode === 'login' ? 'Sign Up' : 'Sign In'}
          </button>
        </div>

        <button className="m-cancel" style={{ marginTop: 12, width: '100%' }} onClick={onClose}>
          Continue as Guest
        </button>
      </div>
    </div>
  );
}
