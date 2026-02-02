import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Instagram } from 'lucide-react';

const Landing: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="h-screen flex flex-col bg-white relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[10%] left-[5%] text-royal-gold/20 animate-pulse">
          <Sparkles size={32} />
        </div>
        <div className="absolute top-[30%] right-[10%] text-royal-gold/30 animate-bounce">
          <Sparkles size={24} />
        </div>
        <div className="absolute bottom-[20%] left-[15%] text-royal-gold/25">
          <Sparkles size={28} />
        </div>
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 relative z-10">
        <div className="text-center max-w-md">
          <img 
            src="/logo.png" 
            alt="Just A Note" 
            className="w-24 h-24 mx-auto mb-6 object-contain"
          />
          <h1 className="text-4xl sm:text-5xl font-serif font-bold text-slate-900 mb-4">
            Just A <span className="gold-text-gradient">Note</span>
          </h1>
          <p className="text-slate-600 text-lg mb-8">
            Send beautiful, personalized notes to the people you care about
          </p>

          <button
            onClick={() => navigate('/create/recipient')}
            className="w-full max-w-xs h-14 bg-gold-gradient text-white font-bold rounded-full 
              shadow-gold-glow hover:scale-105 transition-transform"
          >
            Create Your Note
          </button>

          <p className="mt-6 text-sm text-slate-400">
            ✨ Add music, photos & heartfelt messages
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-xs text-slate-400">
        <div className="mb-2">
          <a 
            href="https://instagram.com/justanote.me" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-royal-gold hover:underline font-medium"
          >
            <Instagram size={14} />
            @justanote.me
          </a>
        </div>
        Made with <span className="text-royal-gold">💛</span> by{' '}
        <a 
          href="https://instagram.com/7frames_aryan" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-royal-gold hover:underline"
        >
          7frames_aryan
        </a>
      </footer>
    </div>
  );
};

export default Landing;
