import React, { useState, useEffect, useCallback } from 'react';

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled]       = useState(false);
  const [dismissed, setDismissed]           = useState(false);
  const [installing, setInstalling]         = useState(false);

  useEffect(() => {
    // Already permanently dismissed
    if (localStorage.getItem('sa_install_dismissed') === '1') {
      setDismissed(true);
      return;
    }

    // Already running as installed PWA (standalone mode)
    if (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    ) {
      setIsInstalled(true);
      return;
    }

    // Pick up the prompt captured early in index.html (avoids race condition)
    if (window.__installPrompt) {
      setDeferredPrompt(window.__installPrompt);
    }

    // Also listen in case it fires after React mounts
    const onReady = () => {
      if (window.__installPrompt) setDeferredPrompt(window.__installPrompt);
    };
    const onPrompt = (e) => {
      e.preventDefault();
      window.__installPrompt = e;
      setDeferredPrompt(e);
    };
    const onInstalled = () => {
      window.__installPrompt = null;
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener('installpromptready', onReady);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('installpromptready', onReady);
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt || installing) return;
    setInstalling(true);
    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        window.__installPrompt = null;
        setDeferredPrompt(null);
        setIsInstalled(true);
      }
    } catch (err) {
      console.error('[InstallBanner] prompt error:', err);
    } finally {
      setInstalling(false);
    }
  }, [deferredPrompt, installing]);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('sa_install_dismissed', '1');
  };

  // Only show banner when browser install prompt is ready
  if (isInstalled || dismissed || !deferredPrompt) return null;

  return (
    <div className="install-banner">
      <div className="install-banner-content">
        <span className="install-logo-badge">⚡</span>
        <div>
          <h4>Install SoundAura</h4>
          <p>Add to your home screen for the best experience</p>
        </div>
      </div>
      <div className="install-banner-actions">
        <button
          id="btn-install-now"
          className="btn-install"
          onClick={handleInstall}
          disabled={installing}
        >
          {installing ? 'Installing…' : 'Install Now'}
        </button>
        <button id="btn-install-dismiss" className="btn-dismiss" onClick={handleDismiss}>✕</button>
      </div>
    </div>
  );
}
