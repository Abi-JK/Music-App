# Music App Fixes & Improvements Plan

## Goal
Address all reported issues regarding mobile PWA installation, API loading failures, autoplay loops, lyrics fetching, search improvements, and generate a new high-quality logo.

## Proposed Changes

### 1. Logo & PWA (Mobile Install)
- **New Logo**: Generate a brand new, stunning logo using `generate_image` (a premium, sleek icon suitable for a music app) and convert it to all necessary PNG sizes.
- **Mobile Icons**: Update `index.html` to include `<link rel="apple-touch-icon">` and `<meta name="theme-color">` to ensure mobile devices pick up the correct styling and icons.
- **Vite PWA Warning**: Suppress the glob warning in `vite.config.js` by disabling the manifest generation strict globbing in dev mode.

### 2. API & Loading Issues (`api.js`)
- **Fix Loading Issues**: The app is stuck on loading because the primary JioSaavn endpoints or proxies are failing. I will update `api.js` to use more reliable fallbacks (e.g., reputable Vercel JioSaavn wrappers) and optimize the proxy logic so it doesn't fail silently.
- **Lyrics Fix**: Update the lyrics fetching logic to reliably pull lyrics from alternative API endpoints when the primary one fails.

### 3. Search & Autocomplete (`Topbar.jsx` & `api.js`)
- **Search As You Type**: Update `Topbar.jsx` to use the `autocomplete` API endpoint specifically for the dropdown. This will allow partial queries (like "enn") to immediately show results without needing the full name.
- **Movie Albums**: Ensure that searching for a movie correctly groups all songs from that movie into an album card.
- **Width**: Increase the search dropdown width to make it look spacious like Spotify.

### 4. Autoplay Loop (`App.jsx`)
- **Fix Repeat Bug**: Update `playNext` in `App.jsx`. Currently, if the "fetch similar songs" API fails, it resets the index to 0, which plays the *same* song again. I will fix it so it stops playback or skips instead of looping.

## Verification Plan
- Verify API requests succeed without CORS or 500 errors.
- Ensure the autocomplete dropdown triggers on partial typing.
- Ensure the app provides the correct PWA manifest and mobile meta tags.
