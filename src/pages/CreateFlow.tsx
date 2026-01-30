import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ArrowLeft, Search, Edit2, Check, Play, Image as ImageIcon, Loader2, X, Mail } from 'lucide-react';
import { NoteData, VIBES, Song, SongData } from '../types';
import { PrimaryButton, StepIndicator, SongPlayer, ImagePreview, BackButton } from '../components/UI';
import { saveNote } from '../services/noteService';
import { getPopularSongs, searchSongs, processMusicLink } from '../services/songService';

interface StepProps {
  data: NoteData;
  updateData: (data: Partial<NoteData>) => void;
}

// Step 1: Recipient & Theme
export const RecipientStep: React.FC<StepProps> = ({ data, updateData }) => {
  const navigate = useNavigate();
  const canProceed = data.recipientName.trim() && data.vibe;

  return (
    <div className="flex flex-col h-screen relative">
      <div className="w-full max-w-4xl mx-auto px-5 sm:px-8 lg:px-16 pt-4 md:pt-8 pb-2">
        <div className="flex items-center gap-4 mb-4">
          <BackButton onClick={() => navigate('/')} />
          <div className="flex-1">
            <StepIndicator step={1} total={4} label="Recipient" />
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto w-full max-w-4xl mx-auto px-5 sm:px-8 lg:px-16 pb-32">
        <section className="pt-4 pb-2">
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-slate-900 mb-4">
            Who are you<br />thinking of?
          </h1>
          <div className="relative mt-4">
            <input
              type="text"
              placeholder="Enter name here..."
              value={data.recipientName}
              onChange={(e) => updateData({ recipientName: e.target.value })}
              className="w-full h-14 px-0 border-b-2 border-slate-200 bg-transparent 
                focus:border-royal-gold focus:ring-0 text-xl placeholder:text-slate-300 
                outline-none font-serif text-slate-800"
            />
            <Edit2 size={20} className="absolute right-0 top-1/2 -translate-y-1/2 text-royal-gold" />
          </div>
        </section>

        <section className="pt-8">
          <h2 className="text-xl font-serif font-bold text-slate-900 mb-5">What's the vibe?</h2>
          <div className="grid grid-cols-2 gap-3">
            {VIBES.map((vibe) => (
              <button
                key={vibe.id}
                onClick={() => updateData({ vibe: vibe.id })}
                className={`relative w-full aspect-[4/3] rounded-xl flex flex-col items-center justify-center gap-2 
                  transition-all active:scale-95 ${
                    data.vibe === vibe.id
                      ? 'bg-white shadow-gold-glow border-2 border-royal-gold'
                      : 'bg-white border border-slate-200 hover:border-royal-gold/60'
                  }`}
              >
                {data.vibe === vibe.id && (
                  <div className="absolute top-2 right-2 bg-royal-gold text-white rounded-full p-0.5">
                    <Check size={12} strokeWidth={3} />
                  </div>
                )}
                <span className="text-3xl">{vibe.emoji}</span>
                <span className="font-bold text-sm">{vibe.label}</span>
              </button>
            ))}
          </div>
        </section>
      </main>

      {canProceed && (
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent pt-12">
          <div className="w-full max-w-4xl mx-auto px-5 sm:px-8 lg:px-16">
            <PrimaryButton onClick={() => navigate('/create/song')} icon={ArrowRight}>
              Next Step
            </PrimaryButton>
          </div>
        </div>
      )}
    </div>
  );
};

// Step 2: Song Selection
export const SongStep: React.FC<StepProps> = ({ data, updateData }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'search' | 'link'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Song[]>([]);
  const [popularSongs, setPopularSongs] = useState<Song[]>([]);
  const [playing, setPlaying] = useState<string | null>(null);
  const [linkInput, setLinkInput] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState('');
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    getPopularSongs().then(setPopularSongs);
    return () => { audioRef.current?.pause(); };
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    const timeout = setTimeout(() => {
      searchSongs(searchQuery).then(setSearchResults);
    }, 500);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const togglePlay = (id: string, preview?: string) => {
    if (playing === id) {
      audioRef.current?.pause();
      setPlaying(null);
    } else {
      audioRef.current?.pause();
      if (preview) {
        audioRef.current = new Audio(preview);
        audioRef.current.play().catch(console.error);
        audioRef.current.onended = () => setPlaying(null);
      }
      setPlaying(id);
    }
  };

  const selectSong = (song: Song) => {
    audioRef.current?.pause();
    const songData: SongData = {
      type: 'itunes',
      title: song.title,
      artist: song.artist,
      albumCover: song.albumCover,
      preview: song.preview,
      startTime: 0,
      endTime: 30,
    };
    updateData({ song, songData });
    
    // Auto-play the selected song
    if (song.preview) {
      audioRef.current = new Audio(song.preview);
      audioRef.current.play().catch(console.error);
      audioRef.current.onended = () => setPlaying(null);
      setPlaying(String(song.id));
    }
  };

  const handleLinkSubmit = async () => {
    if (!linkInput.trim()) return;
    setLinkLoading(true);
    setLinkError('');

    const result = await processMusicLink(linkInput);
    if (result) {
      const song: Song = {
        id: result.videoId || result.trackId || Date.now(),
        title: result.title,
        artist: result.artist,
        albumCover: result.albumCover,
      };
      updateData({ song, songData: result });
      setLinkInput('');
    } else {
      setLinkError('Invalid link. Use YouTube or Spotify URLs.');
    }
    setLinkLoading(false);
  };

  const displaySongs = searchQuery.trim() ? searchResults : popularSongs;

  return (
    <div className="flex flex-col h-screen bg-slate-50 relative">
      <div className="w-full max-w-4xl mx-auto px-5 sm:px-8 lg:px-16 pt-4 md:pt-8 pb-2">
        <div className="flex items-center gap-4 mb-4">
          <BackButton onClick={() => navigate('/create/recipient')} />
          <div className="flex-1">
            <StepIndicator step={2} total={4} label="Song" />
          </div>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="w-full max-w-4xl mx-auto px-5 sm:px-8 lg:px-16 py-3">
        <div className="flex gap-2 p-1 bg-white rounded-lg border border-slate-200">
          {(['search', 'link'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 px-4 rounded-md font-bold text-sm transition-all ${
                activeTab === tab ? 'bg-royal-gold text-white' : 'text-slate-600'
              }`}
            >
              {tab === 'search' ? 'Search Songs' : 'YouTube / Spotify'}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'search' ? (
        <>
          {/* Search bar */}
          <div className="w-full max-w-4xl mx-auto px-5 sm:px-8 lg:px-16 py-2">
            <div className="flex h-12 items-center rounded-full border border-royal-gold/50 bg-white overflow-hidden">
              <Search size={20} className="ml-4 text-royal-gold" />
              <input
                placeholder="Search artists, songs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 h-full border-none bg-transparent px-4 focus:ring-0 placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Song list */}
          <main className="flex-1 overflow-y-auto pb-48">
            <h3 className="px-6 pt-4 pb-2 text-lg font-bold text-slate-800">
              {searchQuery.trim() ? 'Search Results' : 'Popular Songs'}
            </h3>
            <div className="flex flex-col gap-2 px-4">
              {displaySongs.map((song) => (
                <div
                  key={song.id}
                  onClick={() => selectSong(song)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-colors ${
                    data.song?.id === song.id ? 'bg-royal-gold/10 border border-royal-gold/40' : 'hover:bg-white'
                  }`}
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div
                      className="w-14 h-14 rounded-xl bg-cover bg-center flex-shrink-0"
                      style={{ backgroundImage: `url(${song.albumCover})` }}
                    />
                    <div className="min-w-0">
                      <p className={`font-bold truncate ${data.song?.id === song.id ? 'text-royal-gold' : 'text-slate-800'}`}>
                        {song.title}
                      </p>
                      <p className="text-sm text-slate-500 truncate">{song.artist}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {song.preview && (
                      <button
                        onClick={(e) => { e.stopPropagation(); togglePlay(String(song.id), song.preview); }}
                        className="w-8 h-8 rounded-full bg-royal-gold/10 text-royal-gold hover:bg-royal-gold 
                          hover:text-white flex items-center justify-center transition-all"
                      >
                        <Play size={14} fill="currentColor" className={playing === String(song.id) ? 'hidden' : ''} />
                        <div className={`w-2 h-2 bg-current ${playing !== String(song.id) ? 'hidden' : ''}`} />
                      </button>
                    )}
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      data.song?.id === song.id ? 'bg-royal-gold border-royal-gold' : 'border-slate-200'
                    }`}>
                      {data.song?.id === song.id && <Check size={14} className="text-white" strokeWidth={3} />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </main>
        </>
      ) : (
        <main className="flex-1 overflow-y-auto px-5 sm:px-8 lg:px-16 pb-48">
          <div className="py-4">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Paste a link</h2>
            <p className="text-slate-500 text-sm mb-4">
              Share a YouTube or Spotify link to your special song
            </p>
            <div className="flex flex-col gap-3">
              <input
                placeholder="https://youtube.com/watch?v=... or spotify.com/track/..."
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                className="w-full h-12 px-4 border border-slate-300 rounded-lg focus:border-royal-gold outline-none"
              />
              {linkError && <p className="text-red-500 text-sm">{linkError}</p>}
              <button
                onClick={handleLinkSubmit}
                disabled={linkLoading || !linkInput.trim()}
                className="w-full py-3 bg-royal-gold text-white font-bold rounded-lg disabled:opacity-50 
                  flex items-center justify-center gap-2"
              >
                {linkLoading ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />}
                {linkLoading ? 'Processing...' : 'Add Song'}
              </button>
            </div>
          </div>
        </main>
      )}

      {data.song && (
        <div className="absolute bottom-0 left-0 right-0 z-30 p-6 bg-gradient-to-t from-white via-white to-transparent pt-12">
          <div className="w-full max-w-4xl mx-auto px-5 sm:px-8 lg:px-16 flex flex-col gap-4">
            <SongPlayer
              song={data.song}
              isPlaying={playing === String(data.song.id)}
              onToggle={() => {
                const previewUrl = data.songData?.preview || data.song?.preview;
                if (data.song && previewUrl) {
                  togglePlay(String(data.song.id), previewUrl);
                }
              }}
            />
            <PrimaryButton onClick={() => navigate('/create/message')} icon={ArrowRight}>
              Next Step
            </PrimaryButton>
          </div>
        </div>
      )}

      {/* Skip button when no song selected */}
      {!data.song && (
        <div className="absolute bottom-0 left-0 right-0 z-30 p-6 bg-gradient-to-t from-slate-50 via-slate-50 to-transparent pt-12">
          <div className="w-full max-w-4xl mx-auto px-5 sm:px-8 lg:px-16">
            <button
              onClick={() => navigate('/create/message')}
              className="w-full h-12 text-slate-500 font-medium hover:text-slate-700 transition-colors"
            >
              Skip for now
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Step 3: Message & Photo
export const MessageStep: React.FC<StepProps> = ({ data, updateData }) => {
  const navigate = useNavigate();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPreviewUrl(reader.result as string);
      reader.readAsDataURL(file);
      updateData({ photo: file });
    }
  };

  const handleRemovePhoto = () => {
    setPreviewUrl(null);
    updateData({ photo: null });
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 relative">
      <div className="w-full max-w-4xl mx-auto px-5 sm:px-8 lg:px-16 pt-4 md:pt-8 pb-2">
        <div className="flex items-center gap-4 mb-4">
          <BackButton onClick={() => navigate('/create/song')} />
          <div className="flex-1">
            <StepIndicator step={3} total={4} label="Message" />
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto w-full max-w-4xl mx-auto px-5 sm:px-8 lg:px-16 pb-32">
        <div className="py-4">
          <h1 className="text-2xl font-bold text-slate-900">Pour your heart out</h1>
          <p className="text-slate-500 text-sm mt-1">Write a heartfelt message</p>
        </div>

        <div className="flex flex-col gap-6">
          {/* Message textarea */}
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-2">Your Message</label>
            <textarea
              placeholder={`Dear ${data.recipientName || 'Name'},\nI just wanted to say...`}
              value={data.message}
              onChange={(e) => {
                if (e.target.value.length <= 500) {
                  updateData({ message: e.target.value });
                }
              }}
              maxLength={500}
              className="w-full min-h-[160px] p-4 border border-royal-gold/40 rounded-xl bg-white 
                focus:border-royal-gold focus:ring-1 focus:ring-royal-gold outline-none resize-none"
            />
            <p className={`text-right text-xs mt-1 ${data.message.length >= 450 ? 'text-amber-500' : 'text-slate-400'}`}>
              {data.message.length} / 500
            </p>
          </div>

          {/* Photo upload */}
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="text-sm font-bold text-slate-800">Add a memory</label>
              <span className="text-[10px] font-bold text-royal-gold bg-royal-gold/10 px-2 py-1 rounded-full">
                OPTIONAL
              </span>
            </div>

            {previewUrl ? (
              <ImagePreview src={previewUrl} onRemove={handleRemovePhoto} />
            ) : (
              <label className="relative w-full aspect-[3/2] rounded-xl border-2 border-dashed border-royal-gold/60 
                bg-white hover:bg-slate-50 cursor-pointer flex flex-col items-center justify-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="w-12 h-12 rounded-full border border-royal-gold/20 bg-white shadow-sm 
                  flex items-center justify-center">
                  <ImageIcon className="text-royal-gold" size={24} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-slate-800">Upload a photo</p>
                  <p className="text-xs text-slate-400">Tap to browse</p>
                </div>
              </label>
            )}
          </div>
        </div>
      </main>

      {data.message.trim() && (
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent pt-12">
          <div className="w-full max-w-4xl mx-auto px-5 sm:px-8 lg:px-16">
            <PrimaryButton onClick={() => navigate('/create/delivery')} icon={ArrowRight}>
              Next Step
            </PrimaryButton>
          </div>
        </div>
      )}
    </div>
  );
};

// Step 4: Delivery & Save
export const DeliveryStep: React.FC<StepProps> = ({ data, updateData }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  // Email validation
  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Instagram handle validation (remove @ if present)
  const handleInstagramChange = (value: string) => {
    // Remove @ if user types it, we'll add it in display
    const cleaned = value.replace(/^@/, '').trim();
    updateData({ recipientInstagram: cleaned });
  };

  const handleSave = async () => {
    // Validate before saving
    if (data.deliveryMethod === 'admin') {
      if (!data.recipientInstagram.trim()) {
        alert('Please enter recipient\'s Instagram handle');
        return;
      }
      if (!isValidEmail(data.senderEmail)) {
        alert('Please enter a valid email address');
        return;
      }
    }

    setLoading(true);
    try {
      const noteId = await saveNote(data);
      navigate(`/success/${noteId}`);
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Failed to save note. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const canSave = data.deliveryMethod === 'self' || 
    (data.recipientInstagram.trim() && isValidEmail(data.senderEmail));

  return (
    <div className="flex flex-col h-screen bg-slate-50 relative">
      <div className="w-full max-w-4xl mx-auto px-5 sm:px-8 lg:px-16 pt-4 md:pt-8 pb-2">
        <div className="flex items-center gap-4 mb-4">
          <BackButton onClick={() => navigate('/create/message')} />
          <div className="flex-1">
            <StepIndicator step={4} total={4} label="Delivery" />
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-y-auto w-full max-w-4xl mx-auto px-5 sm:px-8 lg:px-16 pb-32">
        <div className="py-4">
          <h1 className="text-2xl font-bold text-slate-900">How should we deliver?</h1>
          <p className="text-slate-500 text-sm mt-1">Choose how you'd like to share</p>
        </div>

        <div className="flex flex-col gap-4">
          {/* Self delivery */}
          <button
            onClick={() => updateData({ deliveryMethod: 'self', isAnonymous: true })}
            className={`w-full p-5 rounded-xl border-2 text-left transition-all ${
              data.deliveryMethod === 'self' ? 'border-royal-gold bg-royal-gold/5' : 'border-slate-200'
            }`}
          >
            <h3 className="font-bold text-lg text-slate-900">Share link myself</h3>
            <p className="text-sm text-slate-500 mt-1">Get a link to share directly</p>
          </button>

          {/* Admin delivery */}
          <button
            onClick={() => updateData({ deliveryMethod: 'admin' })}
            className={`w-full p-5 rounded-xl border-2 text-left transition-all ${
              data.deliveryMethod === 'admin' ? 'border-royal-gold bg-royal-gold/5' : 'border-slate-200'
            }`}
          >
            <h3 className="font-bold text-lg text-slate-900">We'll deliver it</h3>
            <p className="text-sm text-slate-500 mt-1">We'll send it via Instagram DM</p>
          </button>

          {data.deliveryMethod === 'admin' && (
            <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">
                  Recipient's Instagram
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">@</span>
                  <input
                    placeholder="username"
                    value={data.recipientInstagram}
                    onChange={(e) => handleInstagramChange(e.target.value)}
                    className="w-full h-12 pl-8 pr-4 border border-slate-300 rounded-lg focus:border-royal-gold outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-800 mb-2">
                  Your Email (for updates)
                </label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={data.senderEmail}
                  onChange={(e) => updateData({ senderEmail: e.target.value })}
                  className={`w-full h-12 px-4 border rounded-lg focus:border-royal-gold outline-none ${
                    data.senderEmail && !isValidEmail(data.senderEmail) ? 'border-red-300' : 'border-slate-300'
                  }`}
                />
                {data.senderEmail && !isValidEmail(data.senderEmail) && (
                  <p className="text-red-500 text-xs mt-1">Please enter a valid email</p>
                )}
              </div>
            </div>
          )}

          {data.deliveryMethod === 'self' && (
            <div className="bg-white p-4 rounded-xl border border-slate-200">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.isAnonymous}
                  onChange={(e) => updateData({ isAnonymous: e.target.checked })}
                  className="w-5 h-5 rounded border-slate-300 text-royal-gold focus:ring-royal-gold"
                />
                <div>
                  <span className="font-bold text-slate-900">Send Anonymously</span>
                  <p className="text-xs text-slate-500">Hide your name from the recipient</p>
                </div>
              </label>
              {!data.isAnonymous && (
                <input
                  placeholder="Your name"
                  value={data.senderName}
                  onChange={(e) => updateData({ senderName: e.target.value })}
                  className="w-full mt-3 h-12 px-4 border border-slate-300 rounded-lg focus:border-royal-gold outline-none"
                />
              )}
            </div>
          )}
        </div>
      </main>

      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent pt-12">
        <div className="w-full max-w-4xl mx-auto px-5 sm:px-8 lg:px-16">
          <PrimaryButton onClick={handleSave} icon={ArrowRight} disabled={loading || !canSave}>
            {loading ? 'Saving...' : 'Create Note'}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
};

// Success page
export const SuccessPage: React.FC<{ data: NoteData }> = ({ data }) => {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const shareUrl = `${window.location.origin}/view/${data.id}`;

  const previewNote = () => {
    // Open the note in a new tab so creator can preview it
    window.open(`/view/${data.id}`, '_blank');
  };

  const copyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Different UI for admin delivery vs self delivery
  if (data.deliveryMethod === 'admin') {
    return (
      <div className="flex flex-col h-screen bg-white items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-gold-gradient rounded-full flex items-center justify-center mx-auto mb-6 shadow-gold-glow">
            <span className="text-4xl">💌</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-4">We're on it!</h1>
          <p className="text-slate-600 mb-4">
            We'll deliver your note to <span className="font-semibold text-royal-gold">@{data.recipientInstagram}</span> shortly via Instagram DM.
          </p>
          <div className="bg-white rounded-xl p-4 border border-royal-gold/30 mb-8 shadow-gold-soft">
            <div className="flex items-center gap-3 text-left">
              <div className="w-10 h-10 bg-royal-gold/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Mail size={20} className="text-royal-gold" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-sm">Keep an eye on your email</p>
                <p className="text-slate-500 text-xs">We'll send a confirmation to {data.senderEmail} once delivered</p>
              </div>
            </div>
          </div>
          <button
            onClick={() => navigate('/')}
            className="px-8 py-3 bg-gold-gradient text-white font-bold rounded-full shadow-gold-glow hover:scale-105 transition-transform"
          >
            Create Another Note
          </button>
        </div>
      </div>
    );
  }

  // Self delivery UI
  return (
    <div className="flex flex-col h-screen bg-white items-center justify-center px-6">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-gold-gradient rounded-full flex items-center justify-center mx-auto mb-6 shadow-gold-glow">
          <span className="text-4xl">🎉</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-900 mb-4">Your Note is Ready!</h1>
        <p className="text-slate-600 mb-8">
          Share the link below with your recipient
        </p>

        <div className="bg-white rounded-xl p-4 border border-royal-gold/30 mb-6 shadow-gold-soft">
          <div className="flex gap-2">
            <input
              readOnly
              value={shareUrl}
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm"
            />
            <button
              onClick={copyLink}
              className="px-4 py-2 bg-gold-gradient text-white font-bold rounded-lg shadow-gold-glow"
            >
              {copied ? '✓ Copied' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Preview button */}
        <button
          onClick={previewNote}
          className="w-full mb-4 px-8 py-3 bg-white border-2 border-royal-gold text-royal-gold font-bold rounded-full hover:bg-royal-gold/5 transition-colors flex items-center justify-center gap-2"
        >
          <span>👁️</span> Preview Your Note
        </button>

        <button
          onClick={() => navigate('/')}
          className="px-8 py-3 bg-gold-gradient text-white font-bold rounded-full shadow-gold-glow hover:scale-105 transition-transform"
        >
          Create Another Note
        </button>
      </div>
    </div>
  );
};
