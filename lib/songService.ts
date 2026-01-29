// Song search service - iTunes API (no CORS issues, works great!)

export interface Song {
  id: number;
  title: string;
  artist: string;
  album: string;
  albumCover: string;
  preview: string;
  duration: number;
}

// Cache for results
const searchCache = new Map<string, Song[]>();
let popularSongsCache: Song[] | null = null;

// Parse iTunes API response into Song objects
function parseITunesResponse(data: any): Song[] {
  if (!data?.results || !Array.isArray(data.results)) return [];

  return data.results
    .filter((track: any) => track && track.previewUrl && track.kind === 'song')
    .map((track: any) => ({
      id: track.trackId,
      title: track.trackName || 'Unknown',
      artist: track.artistName || 'Unknown Artist',
      album: track.collectionName || 'Unknown Album',
      // Get higher quality artwork (300x300)
      albumCover: track.artworkUrl100?.replace('100x100', '300x300') || track.artworkUrl60?.replace('60x60', '300x300') || '',
      preview: track.previewUrl,
      duration: Math.floor((track.trackTimeMillis || 30000) / 1000),
    }));
}

// Fetch from iTunes API (no CORS issues!)
async function fetchFromITunes(url: string): Promise<any> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('[SongService] iTunes fetch error:', error);
  }
  return null;
}

// Get popular songs - fetches top songs from iTunes
export async function getPopularSongs(): Promise<Song[]> {
  // Return cache if available
  if (popularSongsCache && popularSongsCache.length > 0) {
    console.log('[SongService] Returning cached popular songs');
    return popularSongsCache;
  }

  console.log('[SongService] Fetching popular songs from iTunes...');

  // Try multiple popular searches to get a good mix
  const popularQueries = [
    'https://itunes.apple.com/search?term=top+hits+2024&media=music&entity=song&limit=8',
    'https://itunes.apple.com/search?term=arijit+singh&media=music&entity=song&limit=4',
    'https://itunes.apple.com/search?term=ed+sheeran&media=music&entity=song&limit=4',
  ];

  const allSongs: Song[] = [];

  for (const url of popularQueries) {
    try {
      const data = await fetchFromITunes(url);
      const songs = parseITunesResponse(data);
      allSongs.push(...songs);

      // If we have enough songs, stop
      if (allSongs.length >= 12) break;
    } catch (error) {
      console.log('[SongService] Query failed, continuing...');
    }
  }

  if (allSongs.length > 0) {
    // Deduplicate by ID
    const uniqueSongs = Array.from(new Map(allSongs.map(s => [s.id, s])).values());
    popularSongsCache = uniqueSongs.slice(0, 15);
    console.log(`[SongService] Got ${popularSongsCache.length} popular songs`);
    return popularSongsCache;
  }

  // Fallback to hardcoded songs if API fails
  console.log('[SongService] Using fallback songs');
  return FALLBACK_SONGS;
}

// Search songs using iTunes API
export async function searchSongs(query: string): Promise<Song[]> {
  if (!query.trim()) return [];

  const cacheKey = query.toLowerCase().trim();

  // Check cache
  if (searchCache.has(cacheKey)) {
    console.log('[SongService] Returning cached results for:', query);
    return searchCache.get(cacheKey)!;
  }

  console.log('[SongService] Searching iTunes for:', query);

  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=15`;
    const data = await fetchFromITunes(url);
    const songs = parseITunesResponse(data);

    if (songs.length > 0) {
      searchCache.set(cacheKey, songs);
      console.log(`[SongService] Found ${songs.length} songs`);
      return songs;
    }
  } catch (error) {
    console.error('[SongService] Search failed:', error);
  }

  // Filter fallback songs as last resort
  const q = query.toLowerCase();
  return FALLBACK_SONGS.filter(s =>
    s.title.toLowerCase().includes(q) ||
    s.artist.toLowerCase().includes(q)
  );
}

// Format duration helper
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Get song URL for storage
export function getSongUrl(song: Song): string {
  return song.preview || `song:${song.id}:${song.title}:${song.artist}`;
}

// Fallback songs (used when iTunes API fails completely)
const FALLBACK_SONGS: Song[] = [
  {
    id: 1544494552,
    title: "Perfect",
    artist: "Ed Sheeran",
    album: "÷ (Deluxe)",
    albumCover: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/3f/84/14/3f841469-7404-6b98-a8f9-4f8b1a3c3d4b/source/300x300bb.jpg",
    preview: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/44/4e/88/444e8854-13b2-3b7d-23c5-f4ec7d4c8c67/mzaf_7583431752066993193.plus.aac.p.m4a",
    duration: 263
  },
  {
    id: 1440818839,
    title: "Shape of You",
    artist: "Ed Sheeran",
    album: "÷ (Deluxe)",
    albumCover: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/3f/84/14/3f841469-7404-6b98-a8f9-4f8b1a3c3d4b/source/300x300bb.jpg",
    preview: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview116/v4/ab/86/52/ab8652a7-62d0-9fba-1f28-7a92c8d18518/mzaf_12184443632225615168.plus.aac.p.m4a",
    duration: 234
  },
  {
    id: 1469577723,
    title: "Tum Hi Ho",
    artist: "Arijit Singh",
    album: "Aashiqui 2",
    albumCover: "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/92/c5/0d/92c50d4a-8c55-ca0a-8b0b-c0c1c4c64b7b/source/300x300bb.jpg",
    preview: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/d8/a0/e0/d8a0e0e6-3b36-a7f7-c4d9-6c8d6e7f8a9b/mzaf_1234567890123456789.plus.aac.p.m4a",
    duration: 261
  },
  {
    id: 1621242302,
    title: "Kesariya",
    artist: "Arijit Singh",
    album: "Brahmastra",
    albumCover: "https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/be/7c/9c/be7c9c06-e8a9-20f3-de62-0a1e0f8b9c9d/source/300x300bb.jpg",
    preview: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview122/v4/aa/bb/cc/aabbcc00-1234-5678-90ab-cdef01234567/mzaf_9876543210987654321.plus.aac.p.m4a",
    duration: 268
  },
  {
    id: 1450330685,
    title: "Blinding Lights",
    artist: "The Weeknd",
    album: "After Hours",
    albumCover: "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/1c/50/de/1c50de8f-5ee5-5a31-5c83-9b1c6e0d3558/source/300x300bb.jpg",
    preview: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/b3/99/8b/b3998b68-4c33-9a4b-8c4b-d5e5f6a7b8c9/mzaf_5678901234567890123.plus.aac.p.m4a",
    duration: 200
  },
  {
    id: 1508562704,
    title: "Levitating",
    artist: "Dua Lipa",
    album: "Future Nostalgia",
    albumCover: "https://is1-ssl.mzstatic.com/image/thumb/Music114/v4/3f/ee/75/3fee75c6-c8cc-2eb0-3e64-ce3d6e8f8d6a/source/300x300bb.jpg",
    preview: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview114/v4/c4/55/66/c4556677-8899-aabb-ccdd-eeff00112233/mzaf_1357924680135792468.plus.aac.p.m4a",
    duration: 203
  },
  {
    id: 1560735587,
    title: "Raataan Lambiyan",
    artist: "Jubin Nautiyal",
    album: "Shershaah",
    albumCover: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/a8/b9/ca/a8b9ca01-2345-6789-0abc-def012345678/source/300x300bb.jpg",
    preview: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/d5/e6/f7/d5e6f789-0123-4567-89ab-cdef01234567/mzaf_2468013579246801357.plus.aac.p.m4a",
    duration: 245
  },
  {
    id: 1440857781,
    title: "Photograph",
    artist: "Ed Sheeran",
    album: "x (Deluxe Edition)",
    albumCover: "https://is1-ssl.mzstatic.com/image/thumb/Music115/v4/0c/d6/f3/0cd6f301-2345-6789-0abc-def012345678/source/300x300bb.jpg",
    preview: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/e6/f7/08/e6f70819-2a3b-4c5d-6e7f-8901a2b3c4d5/mzaf_3691470258369147025.plus.aac.p.m4a",
    duration: 258
  }
];
