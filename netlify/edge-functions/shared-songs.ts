// Shared songs store — user-added songs visible to everyone
// Uses in-memory storage (resets on cold start but works for active sessions)

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

const sharedSongs: SharedSong[] = [
  { id: 'shared-heeriye', title: 'Heeriye', artist: 'Jasmin Walia, Arijit Singh', album: 'Heeriye', genre: 'Hindi', addedBy: 'community', addedAt: '2024-01-01' },
  { id: 'shared-mayavi', title: 'Mayavi', artist: 'Sonu Nigam', album: 'Mayavi', genre: 'Kannada', addedBy: 'community', addedAt: '2024-01-01' },
  { id: 'shared-mayavi2', title: 'Mayavi Nanage', artist: 'Sonu Nigam', album: 'Mayavi', genre: 'Kannada', addedBy: 'community', addedAt: '2024-01-01' },
  { id: 'shared-kolaveri', title: 'Why This Kolaveri Di', artist: 'Dhanush, Shruti Haasan', album: '3', genre: 'Tamil', addedBy: 'community', addedAt: '2024-01-01' },
  { id: 'shared-hridayam', title: 'Hridayam Theme', artist: 'Hesham Abdul Wahab', album: 'Hridayam', genre: 'Malayalam', addedBy: 'community', addedAt: '2024-01-01' },
];

const MAX_SONGS = 500;
const MAX_BODY_SIZE = 8192;

export default async (request: Request) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders as Record<string, string> });
  }

  const url = new URL(request.url);

  if (request.method === 'GET') {
    const limit = parseInt(url.searchParams.get('limit') || '200');
    const search = url.searchParams.get('q')?.toLowerCase() || '';
    let songs = sharedSongs;
    if (search) {
      songs = songs.filter(s =>
        s.title.toLowerCase().includes(search) ||
        s.artist.toLowerCase().includes(search) ||
        (s.album || '').toLowerCase().includes(search) ||
        (s.genre || '').toLowerCase().includes(search)
      );
    }
    return new Response(JSON.stringify({ songs: songs.slice(0, limit), total: songs.length }), {
      status: 200,
      headers: corsHeaders as Record<string, string>,
    });
  }

  if (request.method === 'POST') {
    try {
      const bodyText = await request.text();
      if (bodyText.length > MAX_BODY_SIZE) {
        return new Response(JSON.stringify({ error: 'Body too large' }), {
          status: 413,
          headers: corsHeaders as Record<string, string>,
        });
      }
      const body = JSON.parse(bodyText);
      const { title, artist, album, genre, coverUrl, addedBy } = body;
      if (!title || !artist) {
        return new Response(JSON.stringify({ error: 'title and artist required' }), {
          status: 400,
          headers: corsHeaders as Record<string, string>,
        });
      }
      const songId = `shared-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const song: SharedSong = {
        id: songId,
        title: String(title).slice(0, 200),
        artist: String(artist).slice(0, 200),
        album: album ? String(album).slice(0, 200) : '',
        genre: genre ? String(genre).slice(0, 50) : '',
        coverUrl: coverUrl ? String(coverUrl).slice(0, 500) : '',
        addedBy: addedBy ? String(addedBy).slice(0, 50) : 'user',
        addedAt: new Date().toISOString(),
      };
      const exists = sharedSongs.some(s =>
        s.title.toLowerCase() === song.title.toLowerCase() &&
        s.artist.toLowerCase() === song.artist.toLowerCase()
      );
      if (!exists) {
        if (sharedSongs.length >= MAX_SONGS) sharedSongs.shift();
        sharedSongs.push(song);
      }
      return new Response(JSON.stringify({ ok: true, song, duplicate: exists }), {
        status: 200,
        headers: corsHeaders as Record<string, string>,
      });
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
        status: 400,
        headers: corsHeaders as Record<string, string>,
      });
    }
  }

  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: corsHeaders as Record<string, string>,
  });
};

export const config = { path: '/api/shared-songs' };
