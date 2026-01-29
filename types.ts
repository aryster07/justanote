export interface Song {
  id: string | number;
  title: string;
  artist: string;
  coverUrl?: string;
  albumCover?: string;
  duration: string | number;
  preview?: string;
  album?: string;
}

export interface SongData {
  type?: 'youtube' | 'itunes' | 'spotify';
  platform?: 'youtube' | 'youtube-music';
  preview?: string;
  title?: string;
  artist?: string;
  albumCover?: string;
  id?: number;
  url?: string;
  startTime?: number;
  endTime?: number;
  videoId?: string;
  youtubeVideoId?: string;
  youtubeStartTime?: number;
  youtubeEndTime?: number;
  trackId?: string;
}

export interface Vibe {
  id: string;
  label: string;
  emoji: string;
  icon?: string;
}

export interface NoteData {
  id?: string;
  recipientName: string;
  vibe: string;
  song: Song | null;
  songData?: SongData;
  message: string;
  photo: File | null;
  photoUrl?: string | null;
  isAnonymous: boolean;
  senderName: string;
  deliveryMethod: 'self' | 'admin' | 'deliver';
  recipientInstagram: string;
  senderEmail: string;
  createdAt?: any;
  status?: 'pending' | 'delivered';
  viewCount?: number;
  views?: number;
  deliveredAt?: any;
  viewedAt?: any;
  shareKey?: string;
  encryptedContent?: string;
  encryptedLogistics?: {
    senderEmail: string;
    recipientName: string;
    recipientInstagram: string;
  };
}

export interface QueueItem {
  id: string;
  handle: string;
  status: 'pending' | 'completed';
  date: string;
  noteId?: string;
}
