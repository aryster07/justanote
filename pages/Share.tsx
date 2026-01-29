import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Crown, Share2, Edit, Disc } from 'lucide-react';
import { MOCK_SONGS } from '../constants';

export const StoryPreview = () => {
    const navigate = useNavigate();
    const song = MOCK_SONGS[0]; // Dua Lipa

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
             <div className="sticky top-0 z-50 flex items-center bg-white/80 backdrop-blur-sm p-4 border-b border-slate-100 justify-between">
                <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <ChevronLeft size={24} />
                </button>
                <h2 className="font-bold text-lg">Story Preview</h2>
                <div className="w-10"></div>
            </div>

            <main className="flex-1 flex flex-col items-center py-8 px-4 gap-8">
                {/* Story Card */}
                <div className="relative w-full max-w-[340px] aspect-[9/16] bg-white shadow-2xl flex flex-col border-[8px] border-white box-border group">
                    <div className="absolute inset-2 border border-royal-gold/40 pointer-events-none z-20"></div>
                    <div className="absolute inset-3 border border-royal-gold pointer-events-none z-20"></div>
                    
                    <div className="relative z-10 flex flex-col h-full w-full p-8 text-slate-900 justify-between items-center">
                        <div className="mt-4">
                            <Crown size={24} className="text-royal-gold" fill="currentColor" />
                        </div>
                        
                        <div className="flex flex-col items-center gap-8 w-full">
                            <div className="relative p-1 rounded-full bg-gold-gradient shadow-gold-glow">
                                <div 
                                    className="w-48 h-48 rounded-full overflow-hidden bg-cover bg-center border-4 border-white"
                                    style={{ backgroundImage: `url(${song.coverUrl})` }}
                                ></div>
                            </div>
                            
                            <div className="flex flex-col items-center gap-1 text-center">
                                <h3 className="text-3xl font-serif italic font-bold tracking-tight">{song.title}</h3>
                                <p className="text-royal-gold uppercase tracking-[0.2em] text-xs font-bold">{song.artist}</p>
                            </div>

                            <div className="w-full max-w-[260px] text-center">
                                <p className="text-xl font-serif text-royal-gold leading-relaxed italic">
                                    “Thinking of you every time this plays...”
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-col items-center gap-2 mb-6">
                            <div className="flex items-center gap-3 w-48 mb-4">
                                <span className="text-[10px] font-medium text-royal-gold/60">1:17</span>
                                <div className="h-[1px] flex-1 bg-royal-gold/20">
                                    <div className="h-full w-[45%] bg-royal-gold"></div>
                                </div>
                                <span className="text-[10px] font-medium text-royal-gold/60">3:04</span>
                            </div>
                            <span className="font-serif text-3xl gold-text-gradient italic font-bold">Just A Note</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-4 w-full max-w-[340px]">
                    <div className="flex gap-3 w-full">
                        <button className="flex-1 flex items-center justify-center gap-2 h-12 bg-white border border-slate-200 rounded-full shadow-sm hover:bg-slate-50 transition-colors font-bold text-sm text-slate-800">
                            <Edit size={18} className="text-royal-gold" /> Edit Text
                        </button>
                        <button className="flex-1 flex items-center justify-center gap-2 h-12 bg-white border border-slate-200 rounded-full shadow-sm hover:bg-slate-50 transition-colors font-bold text-sm text-slate-800">
                            <Disc size={18} className="text-royal-gold" /> Swap Song
                        </button>
                    </div>
                    <button className="w-full flex items-center justify-center gap-2 h-14 bg-gold-gradient text-white rounded-full shadow-gold-glow hover:scale-[1.02] transition-transform font-bold">
                        <Share2 size={24} /> Share to Instagram
                    </button>
                </div>
            </main>
        </div>
    )
}
