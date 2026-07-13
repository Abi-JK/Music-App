import { useState, useEffect, useRef, useCallback } from 'react';

export function useInstallPrompt() {
  const deferredPrompt = useRef(null);
  const [canInstall, setCanInstall] = useState(false);
  const [wasInstalled, setWasInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(display-mode: standalone)').matches ||
        window.navigator.standalone === true) {
      setWasInstalled(true);
      return;
    }

    const handleBeforeInstall = (e) => {
      e.preventDefault();
      deferredPrompt.current = e;
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setWasInstalled(true);
      deferredPrompt.current = null;
      setCanInstall(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    const prompt = deferredPrompt.current;
    if (!prompt) return false;
    prompt.prompt();
    // userChoice can say 'accepted' even when install silently fails
    // We do NOT rely on it. appinstalled event is the real signal.
    await prompt.userChoice;
    deferredPrompt.current = null;
    setCanInstall(false);
    return true; // dialog was shown — we told the user to check their phone
  }, []);

  return { canInstall: canInstall && !wasInstalled, wasInstalled, promptInstall };
}
