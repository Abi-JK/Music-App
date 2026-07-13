import React, { useState, useEffect, useCallback } from 'react';

function isMobile() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function isAndroid() {
  return /Android/i.test(navigator.userAgent);
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
}

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [userDismissed, setUserDismissed] = useState(false);
  const [showDownloadOption, setShowDownloadOption] = useState(false);

  useEffect(() => {
    const onBeforeInstall = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const onAppInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    window.addEventListener('appinstalled', onAppInstalled);

    if (isStandalone()) setIsInstalled(true);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (deferredPrompt) {
      try {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setDeferredPrompt(null);
        } else {
          // User cancelled the native install prompt
          setUserDismissed(true);
          setShowDownloadOption(true);
        }
      } catch {
        // Fallback: show download option
        setShowDownloadOption(true);
      }
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    setUserDismissed(true);
    setShowDownloadOption(true);
  }, []);

  const handleDownloadApp = useCallback(() => {
    // On Android, try to trigger APK-style download via direct link
    // This opens the PWA URL which can be added to homescreen
    if (isAndroid()) {
      // Open in new tab — Android will prompt to add to homescreen
      window.open(window.location.href, '_blank');
    } else {
      // For iOS/desktop, open the app URL
      window.open(window.location.href, '_blank');
    }
  }, []);

  const handleCloseBanner = useCallback(() => {
    setUserDismissed(true);
    setShowDownloadOption(false);
  }, []);

  if (isInstalled) return null;

  // Show the compact "Download App" option after user dismissed the native prompt
  if (showDownloadOption && userDismissed) {
    return (
      <div className="install-banner download-option-banner">
        <div className="install-banner-content">
          <span className="install-logo-badge">⚡</span>
          <div>
            <h4>Download SoundAura</h4>
            <p>Add to home screen for the best experience</p>
          </div>
        </div>
        <div className="install-banner-actions">
          <button className="btn-install" onClick={handleDownloadApp}>
            Download App
          </button>
          <button className="btn-dismiss" onClick={handleCloseBanner}>✕</button>
        </div>
      </div>
    );
  }

  // Don't show banner if user dismissed and not showing download option
  if (userDismissed) return null;

  return (
    <div className="install-banner">
      <div className="install-banner-content">
        <span className="install-logo-badge">⚡</span>
        <div>
          <h4>Install SoundAura</h4>
          {deferredPrompt ? (
            <p>Tap Install to add to your device</p>
          ) : isMobile() ? (
            <p>Tap the browser menu (⋮) then &quot;Add to Home Screen&quot;</p>
          ) : (
            <p>Install this app on your device for offline access</p>
          )}
        </div>
      </div>
      <div className="install-banner-actions">
        {deferredPrompt && (
          <button className="btn-install" onClick={handleInstall}>
            Install Now
          </button>
        )}
        <button className="btn-dismiss" onClick={handleDismiss}>✕</button>
      </div>
    </div>
  );
}
