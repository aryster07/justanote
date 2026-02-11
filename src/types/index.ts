export interface Song {
  id: string | number;
  title: string;
  artist: string;
  album?: string;
  albumCover?: string;
  coverUrl?: string;
  preview?: string;
  duration?: number;
}

export interface SongData {
  type: 'youtube' | 'spotify' | 'itunes';
  title: string;
  artist: string;
  albumCover?: string;
  preview?: string;
  videoId?: string;
  trackId?: string;
  startTime?: number;
  endTime?: number;
}

export interface Vibe {
  id: string;
  label: string;
  emoji: string;
}

export interface NoteData {
  id?: string;
  recipientName: string;
  vibe: string | null;
  song: Song | null;
  songData?: SongData | null;
  message: string;
  photo: File | null;
  photoBase64?: string | null;
  photoUrl?: string | null;
  isAnonymous: boolean;
  senderName: string;
  deliveryMethod: 'self' | 'admin';
  recipientInstagram: string;
  senderEmail: string;
  createdAt?: any;
  status?: 'pending' | 'delivered';
  viewCount?: number;
  // Privacy tracking fields
  firstViewedAt?: any;
  wasViewedBefore?: boolean;
}

export const VIBES: Vibe[] = [
  { id: '1', label: 'Crush', emoji: '😍' },
  { id: '2', label: 'Partner', emoji: '❤️' },
  { id: '3', label: 'Friend', emoji: '✌️' },
  { id: '4', label: 'Best Friend', emoji: '👯' },
  { id: '5', label: 'Parents', emoji: '🏡' },
  { id: '6', label: 'Relative', emoji: '🌟' },
];
