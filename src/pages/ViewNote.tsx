import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Loader2, Play, Pause, Heart, MessageCircle, ArrowLeft, AlertCircle, Instagram, Download, Share2 } from 'lucide-react';
import { getNote, incrementViews } from '../services/noteService';
import { VIBES, NoteData, Vibe } from '../types';

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
      audioRef.current = null;
    }
    
    // Auto-play function that handles user interaction requirement
    const attemptAutoPlay = () => {
      const audio = new Audio(previewUrl);
      audioRef.current = audio;
      
      audio.ontimeupdate = () => {
        if (audioRef.current) {
          setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100);
        }
      };
      audio.onended = () => setIsPlaying(false);
      
      audio.play().then(() => {
        setIsPlaying(true);
        // Remove event listeners once autoplay succeeds
        document.removeEventListener('click', handleUserInteraction);
        document.removeEventListener('touchstart', handleUserInteraction);
      }).catch((err) => {
        // Autoplay was blocked - wait for user interaction
        console.log('Autoplay blocked, waiting for user interaction:', err.message);
      });
    };
    
    // Handler for user interaction to enable audio
    const handleUserInteraction = () => {
      if (!isPlaying && audioRef.current) {
        audioRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(console.error);
      } else if (!audioRef.current) {
        attemptAutoPlay();
      }
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
    };
    
    // Small delay to let the page render first
    const timer = setTimeout(() => {
      attemptAutoPlay();
      // Add listeners for user interaction as fallback
      document.addEventListener('click', handleUserInteraction, { once: true });
      document.addEventListener('touchstart', handleUserInteraction, { once: true });
    }, 300);
    
    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleUserInteraction);
      document.removeEventListener('touchstart', handleUserInteraction);
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [note, loading]);

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
      const ctx = canvas.getContext('2d')!;
      
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
      
      // Song section - Song bar (now above photo)
      if (note.song) {
        const barWidth = 700;
        const barHeight = 90;
        const barX = (canvas.width - barWidth) / 2;
        const barY = yPos;
        
        // Bar background
        ctx.beginPath();
        ctx.roundRect(barX, barY, barWidth, barHeight, 16);
        ctx.fillStyle = 'rgba(190, 24, 93, 0.08)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(190, 24, 93, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Music note icon
        ctx.font = '36px Arial';
        ctx.fillStyle = '#be185d';
        ctx.textAlign = 'left';
        ctx.fillText('🎵', barX + 25, barY + 55);
        
        // Song title
        ctx.font = 'bold 30px Arial';
        ctx.fillStyle = '#1f2937';
        const titleText = note.song.title.length > 28 ? note.song.title.substring(0, 28) + '...' : note.song.title;
        ctx.fillText(titleText, barX + 80, barY + 40);
        
        // Artist name
        ctx.font = '24px Arial';
        ctx.fillStyle = '#6b7280';
        const artistText = note.song.artist.length > 35 ? note.song.artist.substring(0, 35) + '...' : note.song.artist;
        ctx.fillText(artistText, barX + 80, barY + 70);
        
        ctx.textAlign = 'center';
        yPos = barY + barHeight + 40;
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
    <div className="min-h-screen bg-gradient-to-b from-slate-100 to-white flex flex-col">
      {/* Header */}
      <header className="p-4 flex justify-between items-center">
        <Link to="/" className="text-slate-400 hover:text-slate-600">
          <ArrowLeft size={24} />
        </Link>
        <div className="flex flex-col items-center">
          <span className="text-4xl">{vibe?.emoji || '💌'}</span>
          {vibe?.label && (
            <span className="text-xs font-medium text-royal-gold mt-1">{vibe.label}</span>
          )}
        </div>
        <button 
          onClick={shareToInstagram}
          className="text-royal-gold hover:text-royal-gold-dark transition-colors"
          title="Share to Instagram"
        >
          <Share2 size={24} />
        </button>
      </header>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center px-6 py-8">
        <div className="max-w-md w-full">
          {/* Recipient */}
          <div className="text-center mb-8">
            <p className="text-slate-500 text-sm">A note for</p>
            <h1 className="text-3xl font-serif font-bold gold-text-gradient mt-1">
              {note.recipientName}
            </h1>
          </div>

          {/* Song player - Now above photo */}
          {note.song && (
            <div className="mb-6 bg-white rounded-2xl p-4 shadow-md border border-slate-100">
              <div className="flex items-center gap-4">
                <div className="relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                  <img
                    src={note.song.albumCover || note.song.coverUrl || note.songData?.albumCover}
                    alt={note.song.title}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={togglePlay}
                    className="absolute inset-0 bg-black/30 flex items-center justify-center 
                      hover:bg-black/40 transition-colors"
                    title={externalLink ? 'Open in app' : (hasAudioPreview ? 'Play preview' : 'No preview available')}
                  >
                    {isPlaying ? (
                      <Pause size={24} className="text-white" fill="white" />
                    ) : (
                      <Play size={24} className="text-white" fill="white" />
                    )}
                  </button>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-900 truncate">{note.song.title}</p>
                    {note.songData?.type === 'youtube' && (
                      <span className="text-[10px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">YT</span>
                    )}
                    {note.songData?.type === 'spotify' && (
                      <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">Spotify</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 truncate">{note.song.artist}</p>
                  {/* Progress bar - only show for audio preview */}
                  {hasAudioPreview && (
                    <div className="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-royal-gold transition-all duration-200"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  )}
                  {/* External link hint for YouTube/Spotify */}
                  {externalLink && !hasAudioPreview && (
                    <p className="mt-2 text-xs text-slate-400">Tap to open in app</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Photo and Message together */}
          <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden mb-8">
            {/* Photo */}
            {note.photoUrl && (
              <div className="relative">
                <img
                  src={note.photoUrl}
                  alt="Memory"
                  className="w-full aspect-square object-cover"
                />
              </div>
            )}

            {/* Message */}
            <div className="p-6">
              <MessageCircle size={24} className="text-royal-gold mb-4" />
              <p className="text-slate-700 whitespace-pre-wrap leading-relaxed line-clamp-[12]">
                {note.message}
              </p>
              {note.message.length > 400 && (
                <p className="text-royal-gold text-sm mt-2 font-medium">...</p>
              )}
            </div>
          </div>

          {/* Sender */}
          <div className="text-center text-slate-500">
            {note.isAnonymous ? (
              <p className="italic">Sent anonymously with ❤️</p>
            ) : (
              <p>
                With love, <span className="font-bold text-slate-700">{note.senderName}</span>
              </p>
            )}
          </div>

          {/* Share to Instagram Button */}
          <div className="mt-8">
            <button
              onClick={shareToInstagram}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 
                bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500 
                text-white font-bold rounded-xl shadow-lg hover:scale-[1.02] 
                active:scale-[0.98] transition-transform"
            >
              <Instagram size={24} />
              Share to Instagram Story
            </button>
            <p className="text-center text-xs text-slate-400 mt-2">
              Save the image and add it to your Instagram Story
            </p>
          </div>

          {/* CTA */}
          <div className="mt-8 text-center">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gold-gradient text-white 
                font-bold rounded-full shadow-gold-glow hover:scale-105 transition-transform"
            >
              <Heart size={20} />
              Create Your Own Note
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-xs text-slate-400">
        Made with ❤️ by Just A Note
      </footer>
    </div>
  );
};

export default ViewNote;
