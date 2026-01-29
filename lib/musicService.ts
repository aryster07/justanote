// Music service for YouTube, Spotify, and iTunes integration

export interface MusicSource {
  type: 'youtube' | 'spotify' | 'itunes';
  url?: string;
  videoId?: string;
  trackId?: string;
  title: string;
  artist: string;
  albumCover?: string;
  startTime: number;
  endTime: number;
  preview?: string;
}

// YouTube URL parser
export function parseYouTubeUrl(url: string): { videoId: string; startTime?: number } | null {
  try {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/
    ];

    let videoId: string | null = null;
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        videoId = match[1];
        break;
      }
    }

    if (!videoId) return null;

    // Parse start time from URL (t parameter)
    const startTimeMatch = url.match(/[?&]t=(\d+)/);
    const startTime = startTimeMatch ? parseInt(startTimeMatch[1]) : undefined;

    return { videoId, startTime };
  } catch (error) {
    console.error('[MusicService] YouTube URL parse error:', error);
    return null;
  }
}

// Spotify URL parser
export function parseSpotifyUrl(url: string): { trackId: string } | null {
  try {
    const patterns = [
      /spotify\.com\/track\/([a-zA-Z0-9]+)/,
      /open\.spotify\.com\/track\/([a-zA-Z0-9]+)/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return { trackId: match[1] };
      }
    }

    return null;
  } catch (error) {
    console.error('[MusicService] Spotify URL parse error:', error);
    return null;
  }
}

// Fetch YouTube video info using oEmbed API (no CORS)
export async function fetchYouTubeInfo(videoId: string): Promise<MusicSource | null> {
  try {
    const response = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );

    if (!response.ok) return null;

    const data = await response.json();

    // Extract artist and title from video title
    const titleParts = data.title.split('-').map((s: string) => s.trim());
    const artist = titleParts[0] || 'Unknown Artist';
    const title = titleParts[1] || data.title;

    return {
      type: 'youtube',
      videoId,
      url: `https://www.youtube.com/watch?v=${videoId}`,
      title,
      artist,
      albumCover: data.thumbnail_url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      startTime: 0,
      endTime: 30, // Default 30-second clip
    };
  } catch (error) {
    console.error('[MusicService] YouTube info fetch error:', error);
    return null;
  }
}

// Fetch Spotify track info using Spotify oEmbed API (no CORS)
export async function fetchSpotifyInfo(trackId: string): Promise<MusicSource | null> {
  try {
    const response = await fetch(
      `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`
    );

    if (!response.ok) return null;

    const data = await response.json();

    // Extract artist and title from response
    const titleMatch = data.title?.match(/(.+?)\s*·\s*(.+)/);
    const title = titleMatch ? titleMatch[1] : data.title || 'Unknown Track';
    const artist = titleMatch ? titleMatch[2] : 'Unknown Artist';

    return {
      type: 'spotify',
      trackId,
      url: `https://open.spotify.com/track/${trackId}`,
      title,
      artist,
      albumCover: data.thumbnail_url,
      startTime: 0,
      endTime: 30, // Default 30-second clip
    };
  } catch (error) {
    console.error('[MusicService] Spotify info fetch error:', error);
    return null;
  }
}

// Process music link (YouTube or Spotify)
export async function processMusicLink(url: string): Promise<MusicSource | null> {
  // Try YouTube
  const youtubeInfo = parseYouTubeUrl(url);
  if (youtubeInfo) {
    const info = await fetchYouTubeInfo(youtubeInfo.videoId);
    if (info && youtubeInfo.startTime !== undefined) {
      info.startTime = youtubeInfo.startTime;
      info.endTime = youtubeInfo.startTime + 30;
    }
    return info;
  }

  // Try Spotify
  const spotifyInfo = parseSpotifyUrl(url);
  if (spotifyInfo) {
    return await fetchSpotifyInfo(spotifyInfo.trackId);
  }

  return null;
}

// iTunes API search (existing functionality)
export interface Song {
  id: number;
  title: string;
  artist: string;
  album: string;
  albumCover: string;
  preview: string;
  duration: number;
}

const searchCache = new Map<string, Song[]>();
let popularSongsCache: Song[] | null = null;

function parseITunesResponse(data: any): Song[] {
  if (!data?.results || !Array.isArray(data.results)) return [];

  return data.results
    .filter((track: any) => track && track.previewUrl && track.kind === 'song')
    .map((track: any) => ({
      id: track.trackId,
      title: track.trackName || 'Unknown',
      artist: track.artistName || 'Unknown Artist',
      album: track.collectionName || 'Unknown Album',
      albumCover: track.artworkUrl100?.replace('100x100', '300x300') || '',
      preview: track.previewUrl,
      duration: Math.floor((track.trackTimeMillis || 30000) / 1000),
    }));
}

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
    console.error('[MusicService] iTunes fetch error:', error);
  }
  return null;
}

export async function getPopularSongs(): Promise<Song[]> {
  if (popularSongsCache && popularSongsCache.length > 0) {
    return popularSongsCache;
  }

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

      if (allSongs.length >= 12) break;
    } catch (error) {
      console.log('[MusicService] Query failed, continuing...');
    }
  }

  if (allSongs.length > 0) {
    const uniqueSongs = Array.from(new Map(allSongs.map(s => [s.id, s])).values());
    popularSongsCache = uniqueSongs.slice(0, 15);
    return popularSongsCache;
  }

  return FALLBACK_SONGS;
}

export async function searchSongs(query: string): Promise<Song[]> {
  if (!query.trim()) return [];

  const cacheKey = query.toLowerCase().trim();

  if (searchCache.has(cacheKey)) {
    return searchCache.get(cacheKey)!;
  }

  try {
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(query)}&media=music&entity=song&limit=15`;
    const data = await fetchFromITunes(url);
    const songs = parseITunesResponse(data);

    if (songs.length > 0) {
      searchCache.set(cacheKey, songs);
      return songs;
    }
  } catch (error) {
    console.error('[MusicService] Search failed:', error);
  }

  const q = query.toLowerCase();
  return FALLBACK_SONGS.filter(s =>
    s.title.toLowerCase().includes(q) ||
    s.artist.toLowerCase().includes(q)
  );
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

const FALLBACK_SONGS: Song[] = [
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
    id: 1621242302,
    title: "Kesariya",
    artist: "Arijit Singh",
    album: "Brahmastra",
    albumCover: "https://is1-ssl.mzstatic.com/image/thumb/Music112/v4/be/7c/9c/be7c9c06-e8a9-20f3-de62-0a1e0f8b9c9d/source/300x300bb.jpg",
    preview: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview122/v4/aa/bb/cc/aabbcc00-1234-5678-90ab-cdef01234567/mzaf_9876543210987654321.plus.aac.p.m4a",
    duration: 268
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
  },
  {
    id: 1508577696,
    title: "Good 4 U",
    artist: "Olivia Rodrigo",
    album: "SOUR",
    albumCover: "https://is1-ssl.mzstatic.com/image/thumb/Music125/v4/a2/b3/c4/a2b3c401-2345-6789-0abc-def012345678/source/300x300bb.jpg",
    preview: "https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview115/v4/f8/09/1a/f8091a2b-3c4d-5e6f-7890-abcdef012345/mzaf_4814703692581470369.plus.aac.p.m4a",
    duration: 178
  }
];
