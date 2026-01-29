import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BackButton, GoldCard } from '../components/UI';
import { Lock, Play, Music, Camera, Edit, Instagram, Sparkles, Loader2, AlertCircle } from 'lucide-react';
import { MOCK_SONGS } from '../constants';
import { getNote, incrementViews } from '../firebase';
import { NoteData } from '../types';

export const GiftReveal = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [recipientName, setRecipientName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchNote = async () => {
        if (!id) return;
        try {
            const data = await getNote(id);
            if (data) {
                setRecipientName(data.recipientName);
            } else {
                setError(true);
            }
        } catch (e) {
            console.error(e);
            setError(true);
        } finally {
            setLoading(false);
        }
    };
    fetchNote();
  }, [id]);

  if (loading) return <div className="h-full flex items-center justify-center bg-white"><Loader2 className="animate-spin text-royal-gold" size={40} /></div>;
  
  if (error) return (
      <div className="h-full flex flex-col items-center justify-center bg-white p-6 text-center">
          <AlertCircle className="text-red-400 mb-4" size={48} />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Note not found</h2>
          <p className="text-slate-500 mb-6">This note might have been deleted or the link is incorrect.</p>
          <button onClick={() => navigate('/')} className="px-6 py-3 bg-slate-100 rounded-full font-bold">Return Home</button>
      </div>
  );

  return (
    <div className="relative h-full w-full flex flex-col bg-white overflow-hidden">
        {/* Background Sparkles */}
        <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-[15%] left-[10%] text-royal-gold/30 animate-pulse"><Sparkles size={24} /></div>
            <div className="absolute top-[25%] right-[15%] text-royal-gold/40 animate-float-medium"><Sparkles size={32} /></div>
            <div className="absolute bottom-[20%] right-[5%] text-royal-gold/30 animate-pulse"><Sparkles size={40} /></div>
        </div>

        <header className="flex items-center p-4 justify-between w-full relative z-10">
            <BackButton onClick={() => navigate('/')} />
            <h2 className="text-lg font-bold text-slate-900">Just A Note</h2>
            <div className="w-10"></div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center px-5 sm:px-8 md:px-12 lg:px-16 xl:px-24 pb-20 relative z-10 w-full">
            <div className="text-center mb-10 sm:mb-12 md:mb-16 max-w-4xl mx-auto">
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold text-slate-900 drop-shadow-sm px-2">
                    A special note for <span className="gold-text-gradient">{recipientName}</span>
                </h1>
                <p className="text-slate-500 mt-3 md:mt-4 text-xs sm:text-sm md:text-base lg:text-lg font-medium tracking-wide uppercase">Wait until you see what's inside...</p>
            </div>

            <div 
                onClick={() => navigate(`/view/${id}`)}
                className="relative w-56 h-56 sm:w-64 sm:h-64 md:w-80 md:h-80 lg:w-96 lg:h-96 cursor-pointer group transition-transform duration-500 hover:scale-105 touch-manipulation"
            >
                <div className="absolute inset-4 bg-royal-gold/40 blur-3xl rounded-full animate-pulse"></div>
                <div 
                    className="relative w-full h-full bg-contain bg-center bg-no-repeat drop-shadow-xl"
                    style={{ backgroundImage: 'url(https://lh3.googleusercontent.com/aida-public/AB6AXuCiUhmm0xI9CgXY3taEGahGl3u2tqHYscAY3opVMdL3VqF4hKGcgpR1ddkuIKmG5POrCzjJ_ZX0NyNRPtlwfUuf3lRnsInkjlGhV2Vme2Mm6bCINhzPoEp7wGT3DpBzJhdnKjLFKtM6a8efZF1ll1jBjG6CuI4H-dGAOeKdD4-yy5vVNoQndL2ZfScfdJbWDQXo_eO5-TEUOQ46VA6BxVrfA3QPivC-4i3sY-mNP59NEMaFqwoNqWew_oH640mPwEBxqXUCLCKuxgOe)' }}
                ></div>
                <div className="absolute -top-2 -right-2 bg-white text-royal-gold p-3 rounded-full shadow-lg border border-royal-gold/20 animate-bounce">
                    <Lock size={24} fill="currentColor" />
                </div>
            </div>
            
            <button 
                onClick={() => navigate(`/view/${id}`)}
                className="mt-12 sm:mt-16 w-full max-w-[280px] h-14 sm:h-16 bg-gold-gradient text-white text-base sm:text-lg font-bold rounded-full shadow-gold-glow flex items-center justify-center gap-2 hover:scale-105 transition-transform touch-manipulation"
            >
                <span>Open Your Note</span>
            </button>
            <p className="mt-4 text-slate-400 text-xs sm:text-sm font-medium">Sent by Secret Admirer</p>
        </main>
    </div>
  );
};

export const NoteDisplay = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const [note, setNote] = useState<NoteData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchNote = async () => {
            if (!id) return;
            try {
                const data = await getNote(id);
                if (data) {
                    setNote(data);
                    // Increment view count
                    await incrementViews(id);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        fetchNote();
    }, [id]);

    if (loading) return <div className="h-full flex items-center justify-center bg-white"><Loader2 className="animate-spin text-royal-gold" size={40} /></div>;
    if (!note) return null;

    const song = note.song || MOCK_SONGS[3];

    return (
        <div className="h-full bg-slate-50 flex flex-col relative">
             <header className="sticky top-0 z-20 px-4 pt-6 pb-2 bg-slate-50/90 backdrop-blur-md">
                <div className="bg-white border border-royal-gold/30 shadow-sm rounded-full px-4 py-2 flex items-center justify-between max-w-md mx-auto">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-cover bg-center border-2 border-slate-100 bg-slate-100 flex items-center justify-center text-xl">🤫</div>
                            <div className="absolute -bottom-1 -right-1 bg-royal-gold text-white p-0.5 rounded-full border-2 border-white">
                                <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-royal-gold uppercase tracking-wider">From</span>
                            <h2 className="text-slate-900 text-sm font-bold leading-none">
                                {note.isAnonymous ? "Secret Admirer" : note.senderName || "Someone Special"}
                            </h2>
                        </div>
                    </div>
                     <BackButton onClick={() => navigate('/')} />
                </div>
             </header>

             <main className="px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 mt-4 sm:mt-6 flex flex-col gap-3 sm:gap-4 md:gap-5 max-w-5xl mx-auto overflow-y-auto no-scrollbar pb-32 w-full">
                 {/* Song Card with Player */}
                 <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-100">
                     <div className="flex items-center gap-3 sm:gap-4 mb-4">
                         <div className="relative shrink-0">
                             <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-cover bg-center animate-spin-slow border-4 border-slate-50 shadow-md" style={{ backgroundImage: `url(${song.coverUrl || song.albumCover})` }}></div>
                             <div className="absolute inset-0 flex items-center justify-center">
                                 <div className="w-2 h-2 bg-white rounded-full shadow-inner"></div>
                             </div>
                         </div>
                         <div className="flex-1 min-w-0">
                             <div className="flex items-center gap-2 text-royal-gold mb-0.5">
                                 <Music size={14} className="animate-pulse" />
                                 <span className="text-xs font-bold uppercase tracking-wide">Song For You</span>
                                 {note.songData?.type && (
                                     <span className="px-2 py-0.5 bg-royal-gold/10 text-royal-gold text-[10px] font-bold rounded-full uppercase">
                                         {note.songData.type}
                                     </span>
                                 )}
                             </div>
                             <h3 className="font-bold text-slate-900 truncate">{song.title}</h3>
                             <p className="text-sm text-slate-500 truncate">{song.artist}</p>
                         </div>
                     </div>
                     
                     {/* Music Player */}
                     {note.songData?.type === 'youtube' && note.songData.videoId && (
                         <div className="w-full aspect-video rounded-xl overflow-hidden">
                             <iframe
                                 width="100%"
                                 height="100%"
                                 src={`https://www.youtube.com/embed/${note.songData.videoId}?start=${note.songData.startTime || 0}&end=${note.songData.endTime || 30}`}
                                 title="YouTube player"
                                 frameBorder="0"
                                 allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                 allowFullScreen
                             ></iframe>
                         </div>
                     )}
                     
                     {note.songData?.type === 'spotify' && note.songData.trackId && (
                         <div className="w-full rounded-xl overflow-hidden">
                             <iframe
                                 style={{ borderRadius: '12px' }}
                                 src={`https://open.spotify.com/embed/track/${note.songData.trackId}?utm_source=generator`}
                                 width="100%"
                                 height="152"
                                 frameBorder="0"
                                 allowFullScreen
                                 allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                                 loading="lazy"
                             ></iframe>
                         </div>
                     )}
                     
                     {(!note.songData || note.songData.type === 'itunes') && note.songData?.preview && (
                         <audio controls className="w-full mt-2">
                             <source src={note.songData.preview} type="audio/mpeg" />
                         </audio>
                     )}
                 </div>

                 {/* Message Card */}
                 <div className="bg-white p-6 rounded-2xl shadow-sm border border-royal-gold/20 relative overflow-hidden">
                     <div className="absolute -top-10 -right-10 w-32 h-32 bg-royal-gold/5 rounded-full blur-2xl"></div>
                     <div className="relative z-10">
                         <p className="text-royal-gold text-xs font-bold uppercase tracking-widest mb-2">Dedication</p>
                         <p className="text-slate-800 text-lg font-medium leading-relaxed font-serif whitespace-pre-wrap">
                            {note.message}
                         </p>
                     </div>
                 </div>

                 {/* Photo Card */}
                 {note.photoUrl && (
                    <div className="bg-white p-3 rounded-2xl rotate-1 shadow-sm border border-slate-200">
                        <div className="w-full aspect-[4/3] rounded-xl overflow-hidden relative group">
                            <div className="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-105" style={{ backgroundImage: `url(${note.photoUrl})` }}></div>
                            <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-white text-xs font-medium flex items-center gap-1">
                                <Camera size={12} /> Attached
                            </div>
                        </div>
                    </div>
                 )}
             </main>

             <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-white via-white/95 to-transparent pt-12 z-30">
                 <div className="max-w-md mx-auto flex flex-col gap-3">
                     <button onClick={() => navigate('/story-preview')} className="w-full h-14 bg-white border-2 border-royal-gold text-royal-gold font-bold rounded-full flex items-center justify-center gap-2 hover:bg-royal-gold/5 transition-colors">
                         <Instagram size={20} />
                         Share to Instagram Story
                     </button>
                     <button onClick={() => navigate('/')} className="w-full h-14 bg-gold-gradient text-white font-bold rounded-full flex items-center justify-center gap-2 shadow-lg shadow-royal-gold/20">
                         <Edit size={20} />
                         Create Your Own
                     </button>
                 </div>
             </div>
        </div>
    )
}