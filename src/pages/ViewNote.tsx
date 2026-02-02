import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, Play, Pause, Heart, MessageCircle, ArrowLeft, AlertCircle, Instagram, Share2, Volume2, VolumeX } from 'lucide-react';
import { getNote, incrementViews } from '../services/noteService';
import { VIBES, NoteData, Vibe } from '../types';

// Vibe-specific gradients for story backgrounds
const VIBE_GRADIENTS: Record<string, string> = {
  love: 'from-rose-400 via-pink-300 to-red-400',
  gratitude: 'from-amber-300 via-yellow-200 to-orange-300',
  friendship: 'from-purple-400 via-indigo-300 to-blue-400',
  support: 'from-teal-400 via-cyan-300 to-blue-400',
  celebration: 'from-yellow-400 via-orange-300 to-pink-400',
  memory: 'from-slate-400 via-blue-300 to-indigo-400',
};

// Extend CanvasRenderingContext2D to include roundRect if not present
declare global {
  interface CanvasRenderingContext2D {
    roundRect?(x: number, y: number, width: number, height: number, radius: number): this;
  }
}

const ViewNote: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [note, setNote] = useState<NoteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!id) {
      setError('Invalid note ID');
      setLoading(false);
      return;
    }

    const fetchNote = async () => {
      try {
        const data = await getNote(id);
        if (data) {
          setNote(data);
          // Increment views in background, don't block on it
          incrementViews(id).catch(console.error);
        }
      } catch (error) {
        console.error('Error fetching note:', error);
        setError('Failed to load note. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchNote();

    return () => {
      audioRef.current?.pause();
    };
  }, [id]);

  // Auto-play song when note loads
  useEffect(() => {
    if (!note || loading) return;
    
    const previewUrl = note.songData?.preview || note.song?.preview;
    if (!previewUrl) return;
    
    // Stop any existing audio first
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = ''; // Clear src to free memory
      audioRef.current = null;
    }
    
    let interactionHandlerAdded = false;
    
    // Create audio element immediately
    const audio = new Audio(previewUrl);
    audioRef.current = audio;
    
    audio.ontimeupdate = () => {
      if (audioRef.current) {
        const currentProgress = (audioRef.current.currentTime / audioRef.current.duration) * 100;
        if (!isNaN(currentProgress)) {
          setProgress(currentProgress);
        }
      }
    };
    audio.onended = () => {
      setIsPlaying(false);
      setProgress(0);
    };
    
    // Handler for user interaction to enable audio
    const handleUserInteraction = () => {
      if (audioRef.current && !isPlaying) {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(console.error);
      }
      // Remove both listeners
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
    
    // Attempt auto-play immediately
    audio.play().then(() => {
      setIsPlaying(true);
    }).catch(() => {
      // Autoplay was blocked - wait for user interaction
      if (!interactionHandlerAdded) {
        document.addEventListener('click', handleUserInteraction, { once: true });
        document.addEventListener('touchstart', handleUserInteraction, { once: true });
        interactionHandlerAdded = true;
      }
    });
    
    return () => {
      if (interactionHandlerAdded) {
        document.removeEventListener('click', handleUserInteraction);
        document.removeEventListener('touchstart', handleUserInteraction);
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
      setProgress(0);
    };
  }, [note?.id, loading]); // Only depend on note.id and loading, not isPlaying

  // Check if audio playback is available (iTunes songs have preview)
  const hasAudioPreview = note?.songData?.preview || note?.song?.preview;
  
  // Check if it's a YouTube or Spotify link that should open externally
  const getExternalLink = () => {
    if (!note?.songData) return null;
    if (note.songData.type === 'youtube' && note.songData.videoId) {
      return `https://youtube.com/watch?v=${note.songData.videoId}`;
    }
    if (note.songData.type === 'spotify' && note.songData.trackId) {
      return `https://open.spotify.com/track/${note.songData.trackId}`;
    }
    return null;
  };

  const externalLink = note ? getExternalLink() : null;

  const togglePlay = () => {
    const previewUrl = note?.songData?.preview || note?.song?.preview;
    if (!previewUrl) {
      // If no preview, open external link in new tab
      if (externalLink) {
        window.open(externalLink, '_blank');
      }
      return;
    }

    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(console.error);
      }
      setIsPlaying(!isPlaying);
    } else {
      audioRef.current = new Audio(previewUrl);
      audioRef.current.ontimeupdate = () => {
        if (audioRef.current) {
          setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
        }
      };
      audioRef.current.onended = () => setIsPlaying(false);
      audioRef.current.play().catch(console.error);
      setIsPlaying(true);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-royal-gold" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 gap-4 px-6">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900">Something went wrong</h1>
        <p className="text-slate-500 text-center">{error}</p>
        <Link
          to="/"
          className="mt-4 px-6 py-3 bg-royal-gold text-white font-bold rounded-full"
        >
          Go Home
        </Link>
      </div>
    );
  }

  if (!note) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 gap-4 px-6">
        <div className="text-6xl">😢</div>
        <h1 className="text-2xl font-bold text-slate-900">Note not found</h1>
        <p className="text-slate-500 text-center">This note may have been removed or never existed</p>
        <Link
          to="/"
          className="mt-4 px-6 py-3 bg-royal-gold text-white font-bold rounded-full"
        >
          Create Your Own Note
        </Link>
      </div>
    );
  }

  const vibe: Vibe | undefined = VIBES.find((v) => v.id === note.vibe);

  // Generate shareable image for Instagram
  const shareToInstagram = async () => {
    try {
      // Create a canvas to generate the story image
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }
      
      // Polyfill for roundRect if not supported
      if (!ctx.roundRect) {
        ctx.roundRect = function(x: number, y: number, width: number, height: number, radius: number) {
          this.beginPath();
          this.moveTo(x + radius, y);
          this.lineTo(x + width - radius, y);
          this.quadraticCurveTo(x + width, y, x + width, y + radius);
          this.lineTo(x + width, y + height - radius);
          this.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
          this.lineTo(x + radius, y + height);
          this.quadraticCurveTo(x, y + height, x, y + height - radius);
          this.lineTo(x, y + radius);
          this.quadraticCurveTo(x, y, x + radius, y);
          this.closePath();
          return this;
        };
      }
      
      // Instagram story dimensions (1080x1920)
      canvas.width = 1080;
      canvas.height = 1920;
      
      // Background gradient - light, elegant white/rose theme
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, '#fff5f5');
      gradient.addColorStop(0.5, '#ffffff');
      gradient.addColorStop(1, '#fef2f2');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw decorative soft pink circles
      ctx.fillStyle = 'rgba(244, 114, 182, 0.08)';
      ctx.beginPath();
      ctx.arc(100, 200, 200, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(980, 1700, 250, 0, Math.PI * 2);
      ctx.fill();
      
      let yPos = 200;
      
      // Vibe emoji
      ctx.font = '100px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(vibe?.emoji || '💌', canvas.width / 2, yPos);
      yPos += 60;
      
      // Vibe label
      if (vibe?.label) {
        ctx.font = 'bold 32px Arial';
        ctx.fillStyle = '#be185d';
        ctx.fillText(vibe.label, canvas.width / 2, yPos);
        yPos += 60;
      }
      
      // "A note for" text
      ctx.font = '28px Arial';
      ctx.fillStyle = '#6b7280';
      ctx.fillText('A note for', canvas.width / 2, yPos);
      yPos += 50;
      
      // Recipient name
      ctx.font = 'bold 56px Georgia';
      ctx.fillStyle = '#be185d';
      ctx.fillText(note.recipientName, canvas.width / 2, yPos);
      yPos += 80;
      
      // Instagram-style Music Sticker
      if (note.song) {
        const stickerWidth = 680;
        const stickerHeight = 160;
        const stickerX = (canvas.width - stickerWidth) / 2;
        const stickerY = yPos;
        const albumSize = 120;
        
        // Create gradient background (Instagram music sticker style - dark with gradient)
        const stickerGradient = ctx.createLinearGradient(stickerX, stickerY, stickerX + stickerWidth, stickerY + stickerHeight);
        stickerGradient.addColorStop(0, '#1a1a2e');
        stickerGradient.addColorStop(0.5, '#16213e');
        stickerGradient.addColorStop(1, '#0f3460');
        
        // Draw rounded sticker background
        ctx.beginPath();
        ctx.roundRect(stickerX, stickerY, stickerWidth, stickerHeight, 24);
        ctx.fillStyle = stickerGradient;
        ctx.fill();
        
        // Add subtle inner glow/border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Album art placeholder (rounded square)
        const albumX = stickerX + 20;
        const albumY = stickerY + (stickerHeight - albumSize) / 2;
        
        // Draw album art background
        ctx.beginPath();
        ctx.roundRect(albumX, albumY, albumSize, albumSize, 12);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fill();
        
        // Try to load album cover
        const albumCover = note.song.albumCover || note.song.coverUrl || note.songData?.albumCover;
        if (albumCover) {
          try {
            const albumImg = new Image();
            albumImg.crossOrigin = 'anonymous';
            await new Promise((resolve, reject) => {
              albumImg.onload = resolve;
              albumImg.onerror = reject;
              setTimeout(reject, 3000); // 3s timeout
              albumImg.src = albumCover;
            });
            
            ctx.save();
            ctx.beginPath();
            ctx.roundRect(albumX, albumY, albumSize, albumSize, 12);
            ctx.clip();
            ctx.drawImage(albumImg, albumX, albumY, albumSize, albumSize);
            ctx.restore();
          } catch (e) {
            // Draw music note if album art fails
            ctx.font = '50px Arial';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.textAlign = 'center';
            ctx.fillText('🎵', albumX + albumSize / 2, albumY + albumSize / 2 + 15);
          }
        } else {
          // Draw music note placeholder
          ctx.font = '50px Arial';
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.textAlign = 'center';
          ctx.fillText('🎵', albumX + albumSize / 2, albumY + albumSize / 2 + 15);
        }
        
        // Song info section
        const textX = albumX + albumSize + 20;
        const textMaxWidth = stickerWidth - albumSize - 100;
        
        // Song title (white, bold)
        ctx.font = 'bold 32px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        const titleText = note.song.title.length > 22 ? note.song.title.substring(0, 22) + '...' : note.song.title;
        ctx.fillText(titleText, textX, stickerY + 55);
        
        // Artist name (light gray)
        ctx.font = '24px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        const artistText = note.song.artist.length > 28 ? note.song.artist.substring(0, 28) + '...' : note.song.artist;
        ctx.fillText(artistText, textX, stickerY + 88);
        
        // Animated waveform bars (Instagram style)
        const waveX = textX;
        const waveY = stickerY + 105;
        const barWidth = 6;
        const barGap = 4;
        const numBars = 28;
        const maxBarHeight = 35;
        
        // Create gradient for waveform
        const waveGradient = ctx.createLinearGradient(waveX, waveY, waveX + (barWidth + barGap) * numBars, waveY);
        waveGradient.addColorStop(0, '#f472b6');
        waveGradient.addColorStop(0.5, '#a855f7');
        waveGradient.addColorStop(1, '#6366f1');
        
        ctx.fillStyle = waveGradient;
        
        // Draw waveform bars with varying heights (simulating audio visualization)
        for (let i = 0; i < numBars; i++) {
          // Create organic wave pattern
          const progress = i / numBars;
          const wave1 = Math.sin(progress * Math.PI * 3) * 0.4 + 0.6;
          const wave2 = Math.sin(progress * Math.PI * 5 + 1) * 0.3;
          const wave3 = Math.cos(progress * Math.PI * 2) * 0.2;
          const height = Math.max(6, (wave1 + wave2 + wave3) * maxBarHeight);
          
          ctx.beginPath();
          ctx.roundRect(
            waveX + i * (barWidth + barGap),
            waveY + (maxBarHeight - height) / 2,
            barWidth,
            height,
            3
          );
          ctx.fill();
        }
        
        ctx.textAlign = 'center';
        yPos = stickerY + stickerHeight + 40;
      }
      
      // Photo if exists (now below song)
      if (note.photoUrl) {
        try {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = note.photoUrl!;
          });
          
          const imgSize = 400;
          const imgX = (canvas.width - imgSize) / 2;
          
          // Draw rounded rectangle clip
          ctx.save();
          ctx.beginPath();
          ctx.roundRect(imgX, yPos, imgSize, imgSize, 20);
          ctx.clip();
          ctx.drawImage(img, imgX, yPos, imgSize, imgSize);
          ctx.restore();
          
          // Rose border
          ctx.strokeStyle = '#f472b6';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.roundRect(imgX, yPos, imgSize, imgSize, 20);
          ctx.stroke();
          
          yPos += imgSize + 40;
        } catch (e) {
          console.log('Could not load photo for share');
        }
      }
      
      // Message (truncated)
      const maxMessageLength = 120;
      const displayMessage = note.message.length > maxMessageLength 
        ? note.message.substring(0, maxMessageLength) + '...' 
        : note.message;
      
      // Message box
      const msgBoxWidth = 900;
      const msgBoxX = (canvas.width - msgBoxWidth) / 2;
      const msgBoxY = yPos;
      
      ctx.font = '26px Arial';
      ctx.fillStyle = '#374151';
      ctx.textAlign = 'center';
      
      // Word wrap message
      const words = displayMessage.split(' ');
      let line = '';
      const maxWidth = 850;
      const lineHeight = 38;
      let messageLines: string[] = [];
      
      for (const word of words) {
        const testLine = line + word + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && line !== '') {
          messageLines.push(line.trim());
          line = word + ' ';
        } else {
          line = testLine;
        }
      }
      messageLines.push(line.trim());
      
      // Draw message with quotes
      ctx.font = '60px Georgia';
      ctx.fillStyle = 'rgba(190, 24, 93, 0.2)';
      ctx.fillText('"', canvas.width / 2 - 400, yPos + 20);
      
      ctx.font = '26px Arial';
      ctx.fillStyle = '#374151';
      for (const msgLine of messageLines) {
        ctx.fillText(msgLine, canvas.width / 2, yPos);
        yPos += lineHeight;
      }
      
      ctx.font = '60px Georgia';
      ctx.fillStyle = 'rgba(190, 24, 93, 0.2)';
      ctx.fillText('"', canvas.width / 2 + 400, yPos - 20);
      
      yPos += 50;
      
      // Sender
      ctx.font = 'italic 26px Arial';
      ctx.fillStyle = '#6b7280';
      if (note.isAnonymous) {
        ctx.fillText('Sent anonymously with ❤️', canvas.width / 2, yPos);
      } else {
        ctx.fillText('With love, ' + note.senderName, canvas.width / 2, yPos);
      }
      
      // Footer branding
      ctx.font = 'bold 36px Arial';
      ctx.fillStyle = '#be185d';
      ctx.fillText('Just A Note 💌', canvas.width / 2, canvas.height - 120);
      
      ctx.font = '22px Arial';
      ctx.fillStyle = '#9ca3af';
      ctx.fillText('justanote.me', canvas.width / 2, canvas.height - 70);
      
      // Convert to blob and download/share
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        
        const file = new File([blob], 'just-a-note.png', { type: 'image/png' });
        
        // Try native share first (works on mobile)
        if (navigator.share && navigator.canShare({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: 'Just A Note',
              text: `A special note for ${note.recipientName} 💌`,
            });
            return;
          } catch (err) {
            console.log('Share cancelled or failed');
          }
        }
        
        // Fallback: download the image
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'just-a-note.png';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Show instruction for Instagram
        alert('Image saved! Open Instagram and add it to your Story.');
      }, 'image/png', 0.95);
      
    } catch (error) {
      console.error('Error generating share image:', error);
      alert('Could not generate share image. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-black flex flex-col relative overflow-hidden">
      {/* Story-like gradient background */}
      <div className={`absolute inset-0 bg-gradient-to-br ${VIBE_GRADIENTS[note.vibe] || 'from-royal-gold via-amber-300 to-orange-400'} opacity-90`} />
      
      {/* Decorative blur circles */}
      <div className="absolute top-20 -left-20 w-64 h-64 bg-white/20 rounded-full blur-3xl" />
      <div className="absolute bottom-40 -right-20 w-80 h-80 bg-white/20 rounded-full blur-3xl" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
      
      {/* Story progress bar */}
      <div className="absolute top-0 left-0 right-0 z-50 px-3 pt-3 safe-area-top">
        <div className="h-1 bg-white/30 rounded-full overflow-hidden">
          <div 
            className="h-full bg-white rounded-full transition-all duration-200"
            style={{ width: `${progress || 100}%` }}
          />
        </div>
      </div>

      {/* Header - Instagram story style */}
      <header className="relative z-40 p-4 pt-8 flex justify-between items-center">
        <Link to="/" className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/30 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        
        <div className="flex items-center gap-2 bg-black/20 backdrop-blur-sm px-4 py-2 rounded-full">
          <span className="text-2xl">{vibe?.emoji || '💌'}</span>
          {vibe?.label && (
            <span className="text-sm font-semibold text-white">{vibe.label}</span>
          )}
        </div>
        
        <button 
          onClick={shareToInstagram}
          className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/30 transition-colors"
          title="Share to Instagram"
        >
          <Share2 size={20} />
        </button>
      </header>

      {/* Main content - Story card */}
      <main className="flex-1 relative z-30 flex flex-col items-center justify-center px-4 py-4">
        <div className="w-full max-w-sm">
          {/* Glass card container */}
          <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden">
            {/* Recipient header */}
            <div className="text-center pt-6 pb-4 px-6 border-b border-slate-100">
              <p className="text-slate-400 text-xs uppercase tracking-widest">A note for</p>
              <h1 className="text-2xl font-serif font-bold bg-gradient-to-r from-rose-500 via-pink-500 to-red-500 bg-clip-text text-transparent mt-1">
                {note.recipientName}
              </h1>
            </div>

            {/* Song player - sleek inline style */}
            {note.song && (
              <div className="mx-4 mt-4 p-3 bg-gradient-to-r from-slate-50 to-slate-100 rounded-2xl">
                <div className="flex items-center gap-3">
                  <div className="relative w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 shadow-md">
                    <img
                      src={note.song.albumCover || note.song.coverUrl || note.songData?.albumCover}
                      alt={note.song.title}
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={togglePlay}
                      className="absolute inset-0 bg-black/40 flex items-center justify-center hover:bg-black/50 transition-colors"
                      title={externalLink ? 'Open in app' : (hasAudioPreview ? 'Play preview' : 'No preview available')}
                    >
                      {isPlaying ? (
                        <Pause size={18} className="text-white" fill="white" />
                      ) : (
                        <Play size={18} className="text-white" fill="white" />
                      )}
                    </button>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-slate-800 truncate">{note.song.title}</p>
                      {note.songData?.type === 'youtube' && (
                        <span className="text-[9px] font-bold text-red-600 bg-red-100 px-1.5 py-0.5 rounded">YT</span>
                      )}
                      {note.songData?.type === 'spotify' && (
                        <span className="text-[9px] font-bold text-green-600 bg-green-100 px-1.5 py-0.5 rounded">●</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 truncate">{note.song.artist}</p>
                    {hasAudioPreview && (
                      <div className="mt-1.5 h-1 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-rose-400 to-pink-500 transition-all duration-200"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Photo */}
            {note.photoUrl && (
              <div className="mx-4 mt-4">
                <div className="relative rounded-2xl overflow-hidden shadow-lg">
                  <img
                    src={note.photoUrl}
                    alt="Memory"
                    className="w-full aspect-square object-cover"
                  />
                  {/* Subtle gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                </div>
              </div>
            )}

            {/* Message */}
            <div className="p-6">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center flex-shrink-0">
                  <MessageCircle size={16} className="text-white" />
                </div>
                <p className="text-slate-700 text-sm leading-relaxed flex-1">
                  {note.message}
                </p>
              </div>
            </div>

            {/* Sender */}
            <div className="px-6 pb-4 text-center">
              <div className="inline-block px-4 py-2 bg-slate-50 rounded-full">
                {note.isAnonymous ? (
                  <p className="text-xs text-slate-500 italic">Sent anonymously with ❤️</p>
                ) : (
                  <p className="text-xs text-slate-500">
                    With love, <span className="font-bold text-slate-700">{note.senderName}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <div className="px-4 pb-4 flex gap-3">
              <button
                onClick={shareToInstagram}
                className="flex-1 flex items-center justify-center gap-2 py-3 
                  bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 
                  text-white text-sm font-bold rounded-xl shadow-lg hover:scale-[1.02] 
                  active:scale-[0.98] transition-transform"
              >
                <Instagram size={18} />
                Share Story
              </button>
              <Link
                to="/"
                className="flex-1 flex items-center justify-center gap-2 py-3 
                  bg-gradient-to-r from-rose-500 to-pink-500 
                  text-white text-sm font-bold rounded-xl shadow-lg hover:scale-[1.02] 
                  active:scale-[0.98] transition-transform"
              >
                <Heart size={18} />
                Create Yours
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Footer - floating style */}
      <footer className="relative z-40 p-4 pb-6 text-center">
        <a 
          href="https://instagram.com/justanote.me" 
          target="_blank" 
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-white hover:bg-white/30 transition-colors"
        >
          <Instagram size={16} />
          <span className="text-sm font-medium">@justanote.me</span>
        </a>
      </footer>
    </div>
  );
};

export default ViewNote;
