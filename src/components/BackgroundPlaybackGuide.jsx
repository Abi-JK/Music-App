import React, { useMemo, useState } from 'react';

function detectRom() {
  const ua = navigator.userAgent;
  if (/HyperOS|MIUI|Xiaomi|Redmi|POCO/i.test(ua)) return 'miui';
  if (/OPPO|Realme|OnePlus|ColorOS/i.test(ua)) return 'coloros';
  if (/vivo|Funtouch|Origin/i.test(ua)) return 'vivo';
  if (/Samsung/i.test(ua)) return 'samsung';
  if (/Moto|Motorola/i.test(ua)) return 'moto';
  return 'generic';
}

function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
}

const GUIDES = {
  miui: {
    name: 'Redmi / Xiaomi / POCO (HyperOS / MIUI)',
    note: 'MIUI aggressively freezes apps in the background. You must allow background activity:',
    steps: [
      'Open phone Settings → Apps → Manage apps',
      'Find "SoundAura" (or "Chrome") and tap it',
      'Tap "Battery saver" / "Battery" → select "No restrictions"',
      'Tap "Other permissions" → turn ON "Background" permission',
      'In Settings → Battery → App battery management → find SoundAura/Chrome → select "No restrictions"',
      'Also: Settings → Apps → SoundAura → "Autostart" → turn ON',
    ],
  },
  coloros: {
    name: 'OPPO / Realme (ColorOS)',
    note: 'ColorOS stops background apps to save battery. Allow the app to run freely:',
    steps: [
      'Open Settings → Battery → App battery management',
      'Find "SoundAura" (or "Chrome")',
      'Select "Allow background activity" (and disable "Deep clean" if shown)',
      'Settings → Apps → SoundAura → Allow "Background activity"',
      'Settings → Battery → More battery options → turn OFF "Intelligent battery optimization" (optional)',
    ],
  },
  vivo: {
    name: 'vivo (Funtouch / OriginOS)',
    note: 'vivo pauses background apps for battery saving:',
    steps: [
      'Settings → Battery → Background power consumption management',
      'Find SoundAura / Chrome → select "Allow background running"',
      'Settings → Apps → App management → SoundAura → "Background running" → Allow',
      'Lock the app in the recent apps list (swipe down on the app card)',
    ],
  },
  samsung: {
    name: 'Samsung (One UI)',
    note: 'Samsung battery optimization may pause playback:',
    steps: [
      'Settings → Apps → SoundAura (or Chrome) → Battery → "Unrestricted"',
      'Settings → Apps → SoundAura → "Allow background activity"',
      'Open the app in Recents and tap the app icon → "Keep open"',
    ],
  },
  moto: {
    name: 'Motorola',
    note: 'Motorola rarely blocks background audio, but Chrome may still need the right setting:',
    steps: [
      'Settings → Apps → Chrome → Battery → "Unrestricted"',
      'If SoundAura shows in Apps, set its Battery to "Unrestricted" too',
      'Make sure "Adaptive Battery" does not restrict Chrome (Settings → Battery → Adaptive battery)',
    ],
  },
  generic: {
    name: 'Android',
    note: 'Allow SoundAura / Chrome to run unrestricted in the background:',
    steps: [
      'Settings → Apps → SoundAura (or Chrome) → Battery → "Unrestricted"',
      'Turn ON "Allow background activity" if the option exists',
      'Settings → Battery → turn OFF battery optimization for SoundAura/Chrome',
      'Open the app in Recent apps and lock it (tap its icon → Keep open)',
    ],
  },
};

const row = { display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'var(--bg-elevated)', borderRadius: 10, marginBottom: 6, fontSize: 13, color: 'var(--text)' };

export default function BackgroundPlaybackGuide({ showToast }) {
  const [rom, setRom] = useState(detectRom);
  const guide = GUIDES[rom] || GUIDES.generic;
  const installed = useMemo(isStandalone, []);

  return (
    <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-dim)', marginBottom: 10 }}>
        ▶ Background Playback
      </div>

      {!installed && (
        <div style={{ ...row, background: 'rgba(255,180,0,0.12)', border: '1px solid rgba(255,180,0,0.35)' }}>
          <span>⚠️</span>
          <span>
            Music stops when you switch apps because the app is <b>not installed</b> yet. Install it first
            (Home screen → Install) — the installed app keeps playing in the background.
          </span>
        </div>
      )}

      <select
        value={rom}
        onChange={e => setRom(e.target.value)}
        style={{ width: '100%', padding: '10px 12px', borderRadius: 8, background: 'var(--bg-elevated)', color: 'var(--text)', border: '1px solid var(--border)', fontSize: 13, marginBottom: 10, fontFamily: 'inherit' }}
      >
        <option value="miui">Redmi / Xiaomi / POCO</option>
        <option value="coloros">OPPO / Realme</option>
        <option value="vivo">vivo</option>
        <option value="samsung">Samsung</option>
        <option value="moto">Motorola</option>
        <option value="generic">Other Android</option>
      </select>

      <div style={{ fontSize: 12, color: 'var(--text-dim)', marginBottom: 8, lineHeight: 1.5 }}>{guide.note}</div>
      {guide.steps.map((s, i) => (
        <div key={i} style={row}>
          <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: '50%', background: 'var(--accent)', color: '#000', fontSize: 11, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
          <span>{s}</span>
        </div>
      ))}

      {!installed && (
        <button
          onClick={() => { window.__installPrompt?.prompt?.(); if (showToast) showToast('Install the app to keep music playing in the background.'); }}
          style={{ marginTop: 10, width: '100%', padding: '11px 0', borderRadius: 500, background: 'var(--accent)', color: '#000', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          📱 Install App Now
        </button>
      )}
    </div>
  );
}
