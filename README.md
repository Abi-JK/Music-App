# SoundAura

Spotify-like PWA music app with parallel JioSaavn + YouTube search, offline downloads, background playback, lyrics, and full Indian language support.

## Features

- **Parallel Search**: JioSaavn + YouTube search simultaneously via `searchAndResolve()`
- **Background Playback**: Wake Lock + visibility auto-resume, MediaSession integration
- **Offline Downloads**: OPFS primary storage with IndexedDB fallback
- **Lyrics**: 5-source lyrics fetcher (JioSaavn, LRCLIB, Lyrics.ovh, NetEase)
- **Auto-play**: Spotify-like genre-based auto-play when playlist ends
- **Indian Languages**: 15 languages — Tamil, Hindi, Telugu, Malayalam, Kannada, Bengali, Punjabi, Marathi, Gujarati, Bhojpuri, Odia, Assamese, Sanskrit, Urdu, Rajasthani
- **Artist Pages**: Full discography with language filters (100+ songs per artist)
- **Album/Movie Pages**: All songs from a movie displayed together
- **Data Export/Import**: Backup and restore via OPFS, IndexedDB, or file export

## Tech Stack

- React 19 + Vite 8
- VitePWA (service worker, offline support)
- Netlify Edge Functions (audio proxy)
- No backend — all client-side

## Setup

```bash
npm install
cp .env.example .env
# Add your JioSaavn/YouTube API keys to .env
npm run dev
```

## Build

```bash
npm run build
```

## Deploy

```bash
npx netlify deploy --prod --dir=dist
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VITE_YT_KEY` | YouTube/YouTube Music API key |
| `VITE_SAAVN_API` | JioSaavn API base URL |

## Project Structure

```
src/
  components/     # UI components (PlayerBar, MiniPlayer, Sidebar, etc.)
  screens/        # Page components (Home, Search, Liked, Downloads, ArtistPage, AlbumPage)
  utils/          # API, storage, constants, helpers
netlify/
  edge-functions/ # Audio proxy (stream-audio.ts)
  functions/      # Serverless functions (jiosaavn.js)
public/           # Static assets, icons, manifest
```
