import React from 'react';
import { ArrowRight, Music, Palette, EyeOff, Heart } from 'lucide-react';
import { PrimaryButton, GoldCard } from '../components/UI';
import { useNavigate } from 'react-router-dom';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen w-full overflow-hidden flex flex-col items-center">
      {/* Background Hearts */}
      <div className="absolute inset-0 overflow-hidden z-0 pointer-events-none opacity-60">
        {[...Array(8)].map((_, i) => (
          <div 
            key={i}
            className={`absolute text-royal-gold animate-float-${['slow', 'medium', 'fast'][i % 3]} opacity-40`}
            style={{ 
              left: `${5 + (i * 12)}%`, 
              animationDelay: `${i * 1.5}s`,
              transform: `scale(${0.5 + (i * 0.15)})`
            }}
          >
            <Heart fill="currentColor" size={24 + (i * 6)} />
          </div>
        ))}
      </div>

      <main className="relative z-10 flex-grow flex flex-col items-center justify-center w-full px-5 sm:px-8 md:px-12 lg:px-16 xl:px-24 py-8 md:py-16">
        <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-8 md:gap-12 lg:gap-16 xl:gap-20">
          {/* Left side - Hero content */}
          <div className="flex-1 flex flex-col items-center lg:items-start text-center lg:text-left gap-6 md:gap-8">
            <div className="relative group cursor-default">
              <div className="absolute inset-0 bg-royal-gold/10 blur-3xl rounded-full scale-150 animate-pulse-heart"></div>
              <Heart 
                className="text-royal-gold animate-pulse-heart drop-shadow-md" 
                size={100} 
                fill="currentColor" 
                strokeWidth={0}
              />
            </div>
            
            <div className="flex flex-col gap-3 md:gap-4">
              <h1 className="text-5xl md:text-6xl lg:text-7xl xl:text-8xl font-serif font-medium tracking-tight leading-[1.1] text-slate-900 drop-shadow-sm">
                Just A Note
              </h1>
              <h2 className="text-lg md:text-xl lg:text-2xl xl:text-3xl font-light text-slate-500 max-w-md lg:max-w-lg mx-auto lg:mx-0 leading-relaxed tracking-wide">
                Send anonymous love with a song.
              </h2>
            </div>

            <div className="w-full max-w-md lg:max-w-lg">
              <PrimaryButton onClick={() => navigate('/create/recipient')} icon={ArrowRight}>
                Create a Note
              </PrimaryButton>
            </div>
          </div>

          {/* Right side - Feature cards */}
          <div className="flex-1 w-full max-w-md lg:max-w-xl">
            <section className="grid grid-cols-1 gap-4 md:gap-5 lg:gap-6">
              <FeatureCard 
                icon={Music}
                title="Auto-play songs"
                desc="Set the mood with music"
              />
              <FeatureCard 
                icon={Palette}
                title="7 beautiful themes"
                desc="Customize your note's look"
              />
              <FeatureCard 
                icon={EyeOff}
                title="100% anonymous"
                desc="Your identity is safe"
              />
            </section>
          </div>
        </div>
      </main>

      <footer className="relative z-10 w-full py-6 md:py-8 text-center mt-auto bg-white/50 backdrop-blur-sm border-t border-slate-100">
        <p className="text-xs md:text-sm font-medium text-slate-400 opacity-90 font-serif italic px-4">
            Made with <span className="text-royal-gold">💛</span> by 7Frames_aryan
        </p>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon: Icon, title, desc }: any) => (
  <GoldCard className="p-4 md:p-5 flex items-center gap-4 hover:shadow-lg transition-shadow duration-300">
    <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-royal-gold/5 border border-royal-gold/20 flex items-center justify-center text-royal-gold shrink-0">
      <Icon size={24} className="md:w-7 md:h-7" />
    </div>
    <div className="flex flex-col text-left">
      <h3 className="text-base md:text-lg font-semibold text-slate-800">{title}</h3>
      <p className="text-sm md:text-base text-slate-500">{desc}</p>
    </div>
  </GoldCard>
);

export default Landing;
