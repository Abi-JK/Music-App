// Shared songs store — user-added songs visible to everyone
// Persisted via Netlify Blobs so entries survive cold starts.

import { getStore } from '@netlify/blobs';

interface SharedSong {
  id: string;
  title: string;
  artist: string;
  album?: string;
  genre?: string;
  coverUrl?: string;
  addedBy?: string;
  addedAt?: string;
}

const STORE_NAME = 'soundaura-shared-songs';
const LIST_KEY = 'shared-list';

const SEED_SONGS: SharedSong[] = [
  { id: 'shared-heeriye', title: 'Heeriye', artist: 'Jasmin Walia, Arijit Singh', album: 'Heeriye', genre: 'Hindi', addedBy: 'community', addedAt: '2024-01-01' },
  { id: 'shared-mayavi', title: 'Mayavi', artist: 'Sonu Nigam', album: 'Mayavi', genre: 'Kannada', addedBy: 'community', addedAt: '2024-01-01' },
  { id: 'shared-mayavi2', title: 'Mayavi Nanage', artist: 'Sonu Nigam', album: 'Mayavi', genre: 'Kannada', addedBy: 'community', addedAt: '2024-01-01' },
  { id: 'shared-kolaveri', title: 'Why This Kolaveri Di', artist: 'Dhanush, Shruti Haasan', album: '3', genre: 'Tamil', addedBy: 'community', addedAt: '2024-01-01' },
  { id: 'shared-hridayam', title: 'Hridayam Theme', artist: 'Hesham Abdul Wahab', album: 'Hridayam', genre: 'Malayalam', addedBy: 'community', addedAt: '2024-01-01' },
];

const MAX_SONGS = 500;
const MAX_BODY_SIZE = 8192;

function corsHeaders(contentType?: string): Record<string, string> {
  const h: Record<string, string> = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
  if (contentType) h['Content-Type'] = contentType;
  return h;
}

export default async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  let store;
  try {
    store = getStore(STORE_NAME);
  } catch {
    return new Response(JSON.stringify({ error: 'Storage unavailable' }), {
      status: 503,
      headers: corsHeaders('application/json'),
    });
  }

  const getSongs = async (): Promise<SharedSong[]> => {
    const data = await store.get(LIST_KEY, { type: 'json' }).catch(() => null);
    if (Array.isArray(data) && data.length > 0) return data as SharedSong[];
    if (Array.isArray(data)) return data as SharedSong[];
    return SEED_SONGS;
  };

  const url = new URL(request.url);

  if (request.method === 'GET') {
    const limit = parseInt(url.searchParams.get('limit') || '200');
    const search = url.searchParams.get('q')?.toLowerCase() || '';
    const songs = await getSongs();
    const filtered = search
      ? songs.filter(s =>
          s.title.toLowerCase().includes(search) ||
          s.artist.toLowerCase().includes(search) ||
          (s.album || '').toLowerCase().includes(search) ||
          (s.genre || '').toLowerCase().includes(search)
        )
      : songs;
    return new Response(JSON.stringify({ songs: filtered.slice(0, limit), total: filtered.length }), {
      status: 200,
      headers: corsHeaders('application/json'),
    });
  }

  if (request.method === 'POST') {
    try {
      const bodyText = await request.text();
      if (bodyText.length > MAX_BODY_SIZE) {
        return new Response(JSON.stringify({ error: 'Body too large' }), {
          status: 413,
          headers: corsHeaders('application/json'),
        });
      }
      const body = JSON.parse(bodyText);
      const { title, artist, album, genre, coverUrl, addedBy } = body;
      if (!title || !artist) {
        return new Response(JSON.stringify({ error: 'title and artist required' }), {
          status: 400,
          headers: corsHeaders('application/json'),
        });
      }
      const song: SharedSong = {
        id: `shared-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        title: String(title).slice(0, 200),
        artist: String(artist).slice(0, 200),
        album: album ? String(album).slice(0, 200) : '',
        genre: genre ? String(genre).slice(0, 50) : '',
        coverUrl: coverUrl ? String(coverUrl).slice(0, 500) : '',
        addedBy: addedBy ? String(addedBy).slice(0, 50) : 'user',
        addedAt: new Date().toISOString(),
      };
      const songs = await getSongs();
      const exists = songs.some(s =>
        s.title.toLowerCase() === song.title.toLowerCase() &&
        s.artist.toLowerCase() === song.artist.toLowerCase()
      );
      if (!exists) {
        const next = songs.length >= MAX_SONGS ? [...songs.slice(1), song] : [...songs, song];
        await store.set(LIST_KEY, JSON.stringify(next));
      }
      return new Response(JSON.stringify({ ok: true, song, duplicate: exists }), {
        status: 200,
        headers: corsHeaders('application/json'),
      });
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: corsHeaders('application/json'),
      });
    }
  }

  if (request.method === 'DELETE') {
    const songs = await getSongs();
    await store.set(LIST_KEY, JSON.stringify(songs.slice(0, Math.max(0, songs.length - 1))));
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: corsHeaders('application/json'),
    });
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: corsHeaders('application/json'),
  });
};

export const config = { path: '/api/shared-songs' };
