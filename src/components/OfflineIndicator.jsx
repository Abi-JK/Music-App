import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

export default function OfflineIndicator() {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="offline-indicator">
      <span className="offline-indicator-dot" />
      <span>Offline Mode — Showing downloaded songs & cached assets</span>
    </div>
  );
}
