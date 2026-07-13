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
            <svg width="32" height="32" viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="512" height="512" rx="96" fill="#0a0e1a"/>
              <path d="M140 290 C140 155, 372 155, 372 290" fill="none" stroke="var(--accent)" stroke-width="30" strokeLinecap="round"/>
              <rect x="110" y="260" width="62" height="86" rx="18" fill="var(--accent)"/>
              <rect x="340" y="260" width="62" height="86" rx="18" fill="var(--accent)"/>
              <rect x="215" y="278" width="10" height="36" rx="5" fill="var(--accent-light)" opacity="0.7"/>
              <rect x="235" y="268" width="10" height="56" rx="5" fill="var(--accent-light)" opacity="0.85"/>
              <rect x="255" y="260" width="10" height="72" rx="5" fill="var(--accent)"/>
              <rect x="275" y="268" width="10" height="56" rx="5" fill="var(--accent-light)" opacity="0.85"/>
              <rect x="295" y="278" width="10" height="36" rx="5" fill="var(--accent-light)" opacity="0.7"/>
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
