import { useState, useEffect, useRef, useCallback } from 'react';

export function useSleepTimer(onTimerEnd) {
  const [remaining, setRemaining] = useState(0); // seconds remaining
  const [isActive, setIsActive] = useState(false);
  const intervalRef = useRef(null);

  const startTimer = useCallback((minutes) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    const seconds = minutes * 60;
    setRemaining(seconds);
    setIsActive(true);

    intervalRef.current = setInterval(() => {
      setRemaining(prev => {
        if (prev <= 1) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
          setIsActive(false);
          if (onTimerEnd) onTimerEnd();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [onTimerEnd]);

  const cancelTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setRemaining(0);
    setIsActive(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const formatRemaining = () => {
    if (remaining <= 0) return '';
    const m = Math.floor(remaining / 60);
    const s = remaining % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return {
    remaining,
    isActive,
    startTimer,
    cancelTimer,
    formatRemaining,
  };
}
