import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { NoteData, Vibe } from '../types';
import { BackButton, StepIndicator, SongPlayer, PrimaryButton } from '../components/UI';
import { ArrowRight, Search, Edit2, Check, Play, Image as ImageIcon, Sparkles, X, Loader2 } from 'lucide-react';
import { storage, saveNote } from '../firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface Props {
  data: NoteData;
  updateData: (data: Partial<NoteData>) => void;
}

const VIBES: Vibe[] = [
  { id: '1', label: 'Crush', emoji: '😍' },
  { id: '2', label: 'Partner', emoji: '❤️' },
  { id: '3', label: 'Friend', emoji: '✌️' },
  { id: '4', label: 'Best Friend', emoji: '👯' },
  { id: '5', label: 'Parents', emoji: '🏡' },
  { id: '6', label: 'Relative', emoji: '🌟' },
];

export const RecipientTheme = ({ data, updateData }: Props) => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col h-full relative">
      <div className="w-full max-w-4xl mx-auto px-5 sm:px-8 md:px-12 lg:px-16 pt-4 md:pt-8 pb-2">
        <StepIndicator step={2} total={8} label="25%" />
      </div>
      <main className="flex-1 overflow-y-auto no-scrollbar w-full max-w-4xl mx-auto px-5 sm:px-8 md:px-12 lg:px-16 pb-32">
        <section className="pt-4 sm:pt-6 pb-2">
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-slate-900 mb-4 tracking-tight leading-tight">
            Who are you <br/>thinking of?
          </h1>
          <div className="relative group mt-4">
            <input 
              className="w-full h-14 sm:h-16 px-0 rounded-none border-b-2 border-slate-200 bg-transparent focus:border-royal-gold focus:ring-0 text-lg sm:text-xl placeholder:text-slate-300 transition-all outline-none font-serif text-slate-800 touch-manipulation" 
              placeholder="Enter name here..." 
              type="text"
              value={data.recipientName}
              onChange={(e) => updateData({ recipientName: e.target.value })}
            />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 text-royal-gold pointer-events-none">
              <Edit2 size={20} />
            </div>
          </div>
        </section>

        <section className="pt-8 sm:pt-10">
          <h2 className="text-xl sm:text-2xl font-serif font-bold text-slate-900 mb-5 sm:mb-6 tracking-tight">What's the vibe?</h2>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {VIBES.map((vibe) => (
              <button 
                key={vibe.id}
                onClick={() => updateData({ vibe: vibe.id })}
                className={`relative w-full aspect-[4/3] rounded-xl flex flex-col items-center justify-center gap-2 transition-all active:scale-95 touch-manipulation
                  ${data.vibe === vibe.id 
                    ? 'bg-white shadow-gold-glow border-2 border-royal-gold text-slate-900' 
                    : 'bg-white border border-slate-200 text-slate-600 hover:border-royal-gold/60'}`}
              >
                {data.vibe === vibe.id && (
                  <div className="absolute top-2 right-2 bg-royal-gold text-white rounded-full p-0.5">
                    <Check size={12} strokeWidth={3} />
                  </div>
                )}
                <span className="text-3xl sm:text-4xl filter drop-shadow-sm">{vibe.emoji}</span>
                <span className={`font-bold text-sm sm:text-base tracking-wide ${data.vibe === vibe.id ? 'font-serif' : 'font-sans'}`}>
                  {vibe.label}
                </span>
              </button>
            ))}
            <button className="col-span-2 w-full h-24 rounded-xl bg-white flex flex-row items-center justify-between px-8 text-slate-600 border border-slate-200 hover:border-royal-gold/60 transition-all active:scale-95 mt-1 hover:shadow-lg hover:shadow-royal-gold/10 group">
              <div className="flex flex-col items-start">
                <span className="font-bold text-lg font-serif text-slate-800 group-hover:text-royal-gold transition-colors">Someone Special</span>
                <span className="text-xs text-slate-400 font-medium font-sans">It's complicated?</span>
              </div>
              <span className="text-4xl filter drop-shadow-sm opacity-90">✨</span>
            </button>
          </div>
        </section>
      </main>
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent pt-12">
        <div className="w-full max-w-4xl mx-auto px-5 sm:px-8 md:px-12 lg:px-16">
          <PrimaryButton onClick={() => navigate('/create/song')} icon={ArrowRight}>Next Step</PrimaryButton>
        </div>
      </div>
    </div>
  );
};

export const SelectSong = ({ data, updateData }: Props) => {
  const navigate = useNavigate();
  const [playing, setPlaying] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'search' | 'link'>('search');
  const [linkInput, setLinkInput] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [popularSongs, setPopularSongs] = useState<any[]>([]);
  const [showClipSelector, setShowClipSelector] = useState(false);
  const [clipStart, setClipStart] = useState(0);
  const [clipEnd, setClipEnd] = useState(30);
  const [tempMusicSource, setTempMusicSource] = useState<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    import('../lib/songService').then(module => {
      module.getPopularSongs().then(songs => setPopularSongs(songs));
    });
  }, []);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const timeoutId = setTimeout(() => {
        import('../lib/songService').then(module => {
          module.searchSongs(searchQuery).then(songs => setSearchResults(songs));
        });
      }, 500);
      return () => clearTimeout(timeoutId);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const togglePlay = (id: string, previewUrl?: string) => {
    if (playing === id) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
      setPlaying(null);
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
      }
      if (previewUrl) {
        audioRef.current = new Audio(previewUrl);
        audioRef.current.play().catch(err => console.error('Audio play error:', err));
        audioRef.current.onended = () => setPlaying(null);
      }
      setPlaying(id);
    }
  };

  const handleLinkSubmit = async () => {
    if (!linkInput.trim()) return;
    setLinkLoading(true);
    setLinkError('');

    try {
      const { processMusicLink } = await import('../lib/musicService');
      const musicSource = await processMusicLink(linkInput);

      if (musicSource) {
        setTempMusicSource(musicSource);
        setClipStart(musicSource.startTime);
        setClipEnd(musicSource.endTime);
        setShowClipSelector(true);
      } else {
        setLinkError('Invalid link. Please use YouTube or Spotify URLs.');
      }
    } catch (error) {
      setLinkError('Failed to process link. Please try again.');
    } finally {
      setLinkLoading(false);
    }
  };

  const handleSelectSongFromList = (song: any) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setPlaying(null);

    const songData = {
      type: 'itunes' as const,
      title: song.title,
      artist: song.artist,
      albumCover: song.albumCover,
      preview: song.preview,
      startTime: 0,
      endTime: 30,
      id: song.id,
    };
    updateData({ song, songData });
  };

  const handleSaveClip = () => {
    if (tempMusicSource) {
      const songData = {
        ...tempMusicSource,
        startTime: clipStart,
        endTime: clipEnd,
      };

      const song = {
        id: tempMusicSource.videoId || tempMusicSource.trackId || Date.now(),
        title: tempMusicSource.title,
        artist: tempMusicSource.artist,
        coverUrl: tempMusicSource.albumCover,
        albumCover: tempMusicSource.albumCover,
        duration: clipEnd - clipStart,
      };

      updateData({ song, songData });
      setShowClipSelector(false);
      setTempMusicSource(null);
      setLinkInput('');
    }
  };

  const displaySongs = searchQuery.trim() ? searchResults : popularSongs;

  if (showClipSelector && tempMusicSource) {
    return (
      <div className="flex flex-col h-full bg-surface-light relative">
        <div className="w-full max-w-4xl mx-auto px-5 sm:px-8 md:px-12 lg:px-16 pt-4 md:pt-8">
          <button onClick={() => setShowClipSelector(false)} className="flex items-center gap-2 text-slate-600 hover:text-royal-gold mb-4">
            <ArrowRight size={20} className="rotate-180" />
            <span>Back</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Select Your 30-Second Clip</h1>
          <p className="text-slate-600 mb-6">Choose which part of the song you want to share</p>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-6">
            <div className="flex items-center gap-4 mb-6">
              <img src={tempMusicSource.albumCover} alt={tempMusicSource.title} className="w-16 h-16 rounded-lg" />
              <div>
                <h3 className="font-bold text-lg text-slate-900">{tempMusicSource.title}</h3>
                <p className="text-slate-600">{tempMusicSource.artist}</p>
                <span className="inline-block mt-1 px-2 py-0.5 bg-royal-gold/10 text-royal-gold text-xs font-bold rounded-full">
                  {tempMusicSource.type.toUpperCase()}
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  Start Time: {Math.floor(clipStart / 60)}:{(clipStart % 60).toString().padStart(2, '0')}
                </label>
                <input
                  type="range"
                  min="0"
                  max="180"
                  value={clipStart}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setClipStart(val);
                    if (val + 30 > 180) {
                      setClipEnd(180);
                    } else {
                      setClipEnd(val + 30);
                    }
                  }}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-royal-gold"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  End Time: {Math.floor(clipEnd / 60)}:{(clipEnd % 60).toString().padStart(2, '0')}
                </label>
                <input
                  type="range"
                  min={clipStart + 10}
                  max="180"
                  value={clipEnd}
                  onChange={(e) => setClipEnd(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-royal-gold"
                />
              </div>

              <div className="bg-royal-gold/10 rounded-lg p-4 text-center">
                <p className="text-sm text-slate-600">Clip Duration</p>
                <p className="text-2xl font-bold text-royal-gold">{clipEnd - clipStart} seconds</p>
              </div>
            </div>
          </div>

          <PrimaryButton onClick={handleSaveClip} icon={Check}>
            Save & Continue
          </PrimaryButton>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-surface-light relative">
      <div className="w-full max-w-4xl mx-auto px-5 sm:px-8 md:px-12 lg:px-16 pt-4 md:pt-8 pb-2">
        <StepIndicator step={3} total={8} label="38%" />
      </div>

      <div className="w-full max-w-4xl mx-auto px-5 sm:px-8 md:px-12 lg:px-16 py-3">
        <div className="flex gap-2 p-1 bg-white rounded-lg border border-slate-200">
          <button
            onClick={() => setActiveTab('search')}
            className={`flex-1 py-2 px-4 rounded-md font-bold text-sm transition-all ${
              activeTab === 'search'
                ? 'bg-royal-gold text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Search Songs
          </button>
          <button
            onClick={() => setActiveTab('link')}
            className={`flex-1 py-2 px-4 rounded-md font-bold text-sm transition-all ${
              activeTab === 'link'
                ? 'bg-royal-gold text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            YouTube / Spotify
          </button>
        </div>
      </div>

      {activeTab === 'search' ? (
        <>
          <div className="w-full max-w-4xl mx-auto px-4 sm:px-8 md:px-12 lg:px-16 py-2 sticky top-0 z-10 bg-surface-light/95 backdrop-blur-sm">
            <div className="flex w-full h-12 items-center rounded-full shadow-sm border border-royal-gold/50 overflow-hidden bg-white">
              <div className="pl-4 text-royal-gold">
                <Search size={20} />
              </div>
              <input 
                className="w-full h-full border-none bg-transparent px-4 focus:ring-0 placeholder:text-slate-400"
                placeholder="Search artists, songs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <main className="flex-1 overflow-y-auto no-scrollbar pb-48">
            <h3 className="px-6 pt-4 pb-2 text-lg font-bold text-slate-800">
              {searchQuery.trim() ? 'Search Results' : 'Popular Songs'}
            </h3>
            <div className="flex flex-col gap-2 px-2">
              {displaySongs.map((song) => (
                <div 
                  key={song.id}
                  className={`flex items-center justify-between p-3 rounded-xl transition-colors
                    ${data.song?.id === song.id ? 'bg-royal-gold/10 border border-royal-gold/40' : 'hover:bg-white'}`}
                >
                  <div 
                    className="flex items-center gap-4 flex-1 cursor-pointer"
                    onClick={() => handleSelectSongFromList(song)}
                  >
                    <div 
                      className="size-14 rounded-xl bg-cover bg-center shadow-sm relative overflow-hidden"
                      style={{ backgroundImage: `url(${song.albumCover || song.coverUrl})` }}
                    >
                      {playing === song.id.toString() && (
                        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                          <div className="flex gap-0.5 items-end h-4">
                            <div className="w-1 bg-white animate-[pulse_0.5s_ease-in-out_infinite] h-2"></div>
                            <div className="w-1 bg-white animate-[pulse_0.7s_ease-in-out_infinite] h-4"></div>
                            <div className="w-1 bg-white animate-[pulse_0.6s_ease-in-out_infinite] h-3"></div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div>
                      <p className={`font-bold text-base ${data.song?.id === song.id ? 'text-royal-gold' : 'text-slate-800'}`}>{song.title}</p>
                      <p className="text-sm text-slate-500">{song.artist}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pr-2">
                    {song.preview && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePlay(song.id.toString(), song.preview);
                        }}
                        className="size-8 rounded-full bg-royal-gold/10 text-royal-gold hover:bg-royal-gold hover:text-white flex items-center justify-center transition-all"
                      >
                        {playing === song.id.toString() ? (
                          <div className="w-2 h-2 bg-current"></div>
                        ) : (
                          <Play size={14} fill="currentColor" className="ml-0.5" />
                        )}
                      </button>
                    )}
                    {data.song?.id === song.id ? (
                      <div className="size-6 rounded-full bg-royal-gold flex items-center justify-center">
                        <Check size={14} className="text-white" strokeWidth={3} />
                      </div>
                    ) : (
                      <div className="size-6 rounded-full border-2 border-slate-200"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </main>
        </>
      ) : (
        <main className="flex-1 overflow-y-auto no-scrollbar pb-48 w-full max-w-4xl mx-auto px-5 sm:px-8 md:px-12 lg:px-16">
          <div className="py-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Add from YouTube or Spotify</h2>
            <p className="text-slate-600 mb-6">Paste a YouTube or Spotify link to add your favorite song</p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Song URL</label>
                <input
                  type="text"
                  value={linkInput}
                  onChange={(e) => {
                    setLinkInput(e.target.value);
                    setLinkError('');
                  }}
                  placeholder="https://youtube.com/watch?v=... or https://open.spotify.com/track/..."
                  className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-royal-gold focus:ring-1 focus:ring-royal-gold outline-none"
                  onKeyPress={(e) => e.key === 'Enter' && handleLinkSubmit()}
                />
                {linkError && (
                  <p className="mt-2 text-sm text-red-500">{linkError}</p>
                )}
              </div>

              <button
                onClick={handleLinkSubmit}
                disabled={linkLoading || !linkInput.trim()}
                className="w-full py-3 px-4 bg-royal-gold text-white font-bold rounded-lg hover:bg-royal-gold-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
              >
                {linkLoading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Check size={20} />
                    <span>Add Song</span>
                  </>
                )}
              </button>

              <div className="mt-8 space-y-3">
                <h3 className="text-sm font-bold text-slate-700">Supported Platforms:</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200">
                    <div className="size-10 bg-red-500 rounded-lg flex items-center justify-center text-white font-bold">▶</div>
                    <div>
                      <p className="font-bold text-sm text-slate-900">YouTube</p>
                      <p className="text-xs text-slate-500">Any video link</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200">
                    <div className="size-10 bg-green-500 rounded-lg flex items-center justify-center text-white font-bold text-xl">♫</div>
                    <div>
                      <p className="font-bold text-sm text-slate-900">Spotify</p>
                      <p className="text-xs text-slate-500">Track links</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      <div className="absolute bottom-0 left-0 right-0 z-30 p-6 pb-8 pt-12 bg-gradient-to-t from-white via-white to-transparent pointer-events-none">
        <div className="pointer-events-auto w-full max-w-4xl mx-auto px-5 sm:px-8 md:px-12 lg:px-16 flex flex-col gap-4">
          {data.song && (
            <div className="animate-in slide-in-from-bottom-5 fade-in duration-300">
              <SongPlayer 
                song={data.song} 
                isPlaying={playing === data.song.id?.toString()} 
                onToggle={() => data.song && data.songData?.preview && togglePlay(data.song.id?.toString(), data.songData.preview)} 
              />
            </div>
          )}
          <PrimaryButton 
            onClick={() => navigate('/create/message')} 
            icon={ArrowRight}
            disabled={!data.song}
          >
            Next Step
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
};

export const ComposeMessage = ({ data, updateData }: Props) => {
  const navigate = useNavigate();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (data.photo) {
      const url = URL.createObjectURL(data.photo);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setPreviewUrl(null);
    }
  }, [data.photo]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      updateData({ photo: file });
    }
  };

  const handleRemovePhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    updateData({ photo: null });
  };

  return (
    <div className="flex flex-col h-full bg-surface-light relative">
      <div className="w-full max-w-4xl mx-auto px-5 sm:px-8 md:px-12 lg:px-16 pt-4 md:pt-8 pb-2">
        <StepIndicator step={5} total={8} label="Message & Photo" />
      </div>
      <main className="flex-1 overflow-y-auto no-scrollbar w-full max-w-4xl mx-auto px-5 sm:px-8 md:px-12 lg:px-16 pb-32">
        <div className="py-4 sm:py-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Pour your heart out</h1>
          <p className="mt-2 text-sm sm:text-base text-slate-500">Share your thoughts or a favorite memory to make this note truly personal.</p>
        </div>

        <div className="flex flex-col gap-6">
          <div>
            <label className="block text-sm font-bold text-slate-800 mb-2 ml-1">Your Message</label>
            <textarea 
              className="w-full resize-none rounded-xl border border-royal-gold/40 bg-white p-4 text-base text-slate-800 focus:border-royal-gold focus:ring-1 focus:ring-royal-gold min-h-[160px] shadow-sm outline-none"
              placeholder={`Dear ${data.recipientName || 'Name'},\nI just wanted to say...`}
              value={data.message}
              onChange={(e) => updateData({ message: e.target.value })}
            ></textarea>
            <div className="flex justify-between items-center mt-2 px-1">
              <button className="text-royal-gold text-sm font-semibold flex items-center gap-1.5 hover:text-royal-gold-dark transition-colors">
                <Sparkles size={16} />
                <span>Inspire me</span>
              </button>
              <p className="text-slate-400 text-xs font-medium">{data.message.length} / 500</p>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2 px-1">
              <label className="block text-sm font-bold text-slate-800">Add a memory</label>
              <span className="bg-royal-gold/10 text-royal-gold text-[10px] font-bold px-2 py-1 rounded-full uppercase">Optional</span>
            </div>
            
            {previewUrl ? (
              <div className="relative w-full aspect-[3/2] rounded-xl overflow-hidden shadow-sm border border-slate-200 group">
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors"></div>
                <button 
                  onClick={handleRemovePhoto}
                  className="absolute top-3 right-3 p-1.5 rounded-full bg-white/90 text-slate-700 hover:text-red-500 hover:bg-white transition-all shadow-sm"
                >
                  <X size={18} />
                </button>
                <div className="absolute bottom-3 left-3 px-3 py-1 rounded-full bg-black/60 text-white text-xs font-medium backdrop-blur-md">
                  Photo attached
                </div>
              </div>
            ) : (
              <div className="relative w-full aspect-[3/2] rounded-xl border border-dashed border-royal-gold/60 bg-white hover:bg-slate-50 transition-all cursor-pointer flex flex-col items-center justify-center gap-2 group">
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                />
                <div className="size-12 rounded-full border border-royal-gold/20 bg-white shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ImageIcon className="text-royal-gold" size={24} />
                </div>
                <div className="text-center">
                  <h3 className="text-sm font-bold text-slate-800">Upload a photo</h3>
                  <p className="text-xs text-slate-400">Tap to browse your library</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent pt-12">
        <div className="w-full max-w-4xl mx-auto px-5 sm:px-8 md:px-12 lg:px-16">
          <PrimaryButton onClick={() => navigate('/create/delivery')} icon={ArrowRight}>Next Step</PrimaryButton>
        </div>
      </div>
    </div>
  );
};

export const DeliverySettings = ({ data, updateData }: Props) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      let photoUrl = '';

      if (data.photo) {
        const timestamp = Date.now();
        const photoRef = ref(storage, `notes/${timestamp}_${data.photo.name}`);
        await uploadBytes(photoRef, data.photo);
        photoUrl = await getDownloadURL(photoRef);
      }

      const noteId = await saveNote({
        ...data,
        photoUrl: photoUrl || null,
        photo: null,
      });

      navigate(`/success/${noteId}`);
    } catch (error) {
      console.error('Error saving note:', error);
      alert('Failed to save note. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-surface-light relative">
      <div className="w-full max-w-4xl mx-auto px-5 sm:px-8 md:px-12 lg:px-16 pt-4 md:pt-8 pb-2">
        <StepIndicator step={7} total={8} label="Delivery" />
      </div>
      <main className="flex-1 overflow-y-auto no-scrollbar w-full max-w-4xl mx-auto px-5 sm:px-8 md:px-12 lg:px-16 pb-32">
        <div className="py-4 sm:py-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">How should we deliver?</h1>
          <p className="mt-2 text-sm sm:text-base text-slate-500">Choose how you'd like to share this note</p>
        </div>

        <div className="flex flex-col gap-4">
          <button
            onClick={() => updateData({ deliveryMethod: 'self', isAnonymous: true })}
            className={`w-full p-5 rounded-xl border-2 transition-all text-left ${
              data.deliveryMethod === 'self'
                ? 'border-royal-gold bg-royal-gold/5'
                : 'border-slate-200 hover:border-royal-gold/50'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`size-6 rounded-full border-2 mt-1 flex items-center justify-center ${
                data.deliveryMethod === 'self' ? 'border-royal-gold bg-royal-gold' : 'border-slate-300'
              }`}>
                {data.deliveryMethod === 'self' && <Check size={14} className="text-white" strokeWidth={3} />}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-slate-900 mb-1">Share Link Myself</h3>
                <p className="text-sm text-slate-600">Get a unique link to share however you'd like</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => updateData({ deliveryMethod: 'admin' })}
            className={`w-full p-5 rounded-xl border-2 transition-all text-left ${
              data.deliveryMethod === 'admin'
                ? 'border-royal-gold bg-royal-gold/5'
                : 'border-slate-200 hover:border-royal-gold/50'
            }`}
          >
            <div className="flex items-start gap-4">
              <div className={`size-6 rounded-full border-2 mt-1 flex items-center justify-center ${
                data.deliveryMethod === 'admin' ? 'border-royal-gold bg-royal-gold' : 'border-slate-300'
              }`}>
                {data.deliveryMethod === 'admin' && <Check size={14} className="text-white" strokeWidth={3} />}
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg text-slate-900 mb-1">Let Us Deliver</h3>
                <p className="text-sm text-slate-600 mb-3">We'll send it via Instagram DM for you</p>
                {data.deliveryMethod === 'admin' && (
                  <div className="space-y-3 mt-4">
                    <input
                      type="text"
                      placeholder="Recipient's Instagram @username"
                      value={data.recipientInstagram}
                      onChange={(e) => updateData({ recipientInstagram: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-royal-gold focus:ring-1 focus:ring-royal-gold outline-none text-sm"
                    />
                    <input
                      type="email"
                      placeholder="Your email (for confirmation)"
                      value={data.senderEmail}
                      onChange={(e) => updateData({ senderEmail: e.target.value })}
                      className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:border-royal-gold focus:ring-1 focus:ring-royal-gold outline-none text-sm"
                    />
                  </div>
                )}
              </div>
            </div>
          </button>

          {data.deliveryMethod === 'self' && (
            <div className="mt-4 p-4 bg-white rounded-xl border border-slate-200">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.isAnonymous}
                  onChange={(e) => updateData({ isAnonymous: e.target.checked })}
                  className="size-5 rounded border-slate-300 text-royal-gold focus:ring-royal-gold"
                />
                <div>
                  <span className="font-bold text-slate-900">Send Anonymously</span>
                  <p className="text-xs text-slate-500">Hide your name from the recipient</p>
                </div>
              </label>
              {!data.isAnonymous && (
                <input
                  type="text"
                  placeholder="Your name"
                  value={data.senderName}
                  onChange={(e) => updateData({ senderName: e.target.value })}
                  className="w-full mt-3 px-4 py-2 rounded-lg border border-slate-300 focus:border-royal-gold focus:ring-1 focus:ring-royal-gold outline-none text-sm"
                />
              )}
            </div>
          )}
        </div>
      </main>
      <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-white via-white to-transparent pt-12">
        <div className="w-full max-w-4xl mx-auto px-5 sm:px-8 md:px-12 lg:px-16">
          <PrimaryButton 
            onClick={handleSave} 
            icon={ArrowRight}
            disabled={loading || (data.deliveryMethod === 'admin' && (!data.recipientInstagram || !data.senderEmail))}
          >
            {loading ? 'Saving...' : 'Create Note'}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
};

export const Success = ({ data }: Props) => {
  const navigate = useNavigate();
  const [shareUrl, setShareUrl] = React.useState('');

  React.useEffect(() => {
    if (data.id) {
      const url = `${window.location.origin}/view/${data.id}`;
      setShareUrl(url);
    }
  }, [data.id]);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    alert('Link copied to clipboard!');
  };

  const handleShareWhatsApp = () => {
    const message = `Someone sent you a special note! 🎁 Open it here: ${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="flex flex-col h-full bg-surface-light relative">
      <main className="flex-1 overflow-y-auto no-scrollbar w-full max-w-4xl mx-auto px-5 sm:px-8 md:px-12 lg:px-16 pb-32">
        <div className="py-12 text-center">
          <div className="text-6xl mb-6">🎉</div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-4">Your Note is Ready!</h1>
          <p className="text-lg text-slate-600 mb-8">
            {data.deliveryMethod === 'self' 
              ? 'Share the link below with your recipient'
              : 'We\'ll deliver your note to the recipient'}
          </p>

          {data.deliveryMethod === 'self' && shareUrl && (
            <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 px-4 py-3 border border-slate-300 rounded-lg bg-slate-50 text-sm"
                />
                <button
                  onClick={handleCopyLink}
                  className="px-6 py-3 bg-royal-gold text-white rounded-lg font-bold hover:bg-royal-gold/90 transition-all"
                >
                  Copy
                </button>
              </div>
              <button
                onClick={handleShareWhatsApp}
                className="w-full py-3 bg-green-500 text-white rounded-lg font-bold hover:bg-green-600 transition-all"
              >
                Share on WhatsApp
              </button>
            </div>
          )}

          <button
            onClick={() => navigate('/')}
            className="inline-block px-8 py-3 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-all"
          >
            Create Another Note
          </button>
        </div>
      </main>
    </div>
  );
};

export default function CreateFlow() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [noteData, setNoteData] = useState<NoteData>({
    recipientName: '',
    vibe: '',
    song: null,
    message: '',
    photo: null,
    isAnonymous: true,
    senderName: '',
    deliveryMethod: 'self',
    recipientInstagram: '',
    senderEmail: '',
  });

  const updateData = (data: Partial<NoteData>) => {
    setNoteData(prev => ({ ...prev, ...data }));
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {step === 1 && <RecipientTheme data={noteData} updateData={updateData} />}
      {step === 2 && <SelectSong data={noteData} updateData={updateData} />}
      {step === 3 && <ComposeMessage data={noteData} updateData={updateData} />}
      {step === 4 && <DeliverySettings data={noteData} updateData={updateData} />}
    </div>
  );
}
