
import React, { useMemo } from 'react';

// Specialized SVG Icons
const Icons = {
  Star: () => (
    <svg viewBox="0 0 24 24" className="w-full h-full text-white fill-current">
      <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
    </svg>
  ),
  Planet: () => (
    <svg viewBox="0 0 100 100" className="w-full h-full text-studio-purple fill-current opacity-80">
      <circle cx="50" cy="50" r="40" />
      <path d="M 10 50 Q 50 10 90 50 Q 50 90 10 50" fill="none" stroke="#00f0ff" strokeWidth="2" opacity="0.6" />
      <path d="M 10 50 Q 50 20 90 50" fill="none" stroke="#00f0ff" strokeWidth="4" />
    </svg>
  ),
  Hexagon: () => (
    <svg viewBox="0 0 100 100" className="w-full h-full text-studio-neon stroke-current" fill="none" strokeWidth="1">
      <polygon points="50 5, 95 27, 95 73, 50 95, 5 73, 5 27" />
    </svg>
  ),
  DNA: () => (
    <svg viewBox="0 0 100 100" className="w-full h-full text-studio-violet stroke-current" fill="none" strokeWidth="3">
       <path d="M 30 5 Q 70 25 30 50 Q 70 75 30 95" opacity="0.5" />
       <path d="M 70 5 Q 30 25 70 50 Q 30 75 70 95" />
       <line x1="30" y1="20" x2="70" y2="20" strokeWidth="2" />
       <line x1="30" y1="40" x2="70" y2="40" strokeWidth="2" />
       <line x1="30" y1="60" x2="70" y2="60" strokeWidth="2" />
       <line x1="30" y1="80" x2="70" y2="80" strokeWidth="2" />
    </svg>
  ),
  Atom: () => (
    <svg viewBox="0 0 100 100" className="w-full h-full text-cyan-400 stroke-current" fill="none" strokeWidth="2">
      <circle cx="50" cy="50" r="5" fill="currentColor" />
      <ellipse cx="50" cy="50" rx="40" ry="10" transform="rotate(0 50 50)" />
      <ellipse cx="50" cy="50" rx="40" ry="10" transform="rotate(60 50 50)" />
      <ellipse cx="50" cy="50" rx="40" ry="10" transform="rotate(120 50 50)" />
    </svg>
  ),
  Wave: () => (
    <svg viewBox="0 0 100 50" className="w-full h-full text-studio-gold stroke-current" fill="none" strokeWidth="2">
      <path d="M0 25 Q 25 5, 50 25 T 100 25" />
    </svg>
  )
};

const IconTypes = [Icons.Star, Icons.Planet, Icons.Hexagon, Icons.DNA, Icons.Atom, Icons.Wave];

export const LivingBackground: React.FC = React.memo(() => {
  // Generate random icons with deeper integration
  const icons = useMemo(() => {
    return Array.from({ length: 18 }).map((_, i) => {
      const Icon = IconTypes[Math.floor(Math.random() * IconTypes.length)];
      return {
        id: i,
        Icon,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        size: Math.random() * 60 + 20,
        // Mixing float animation with pulse for "breathing" effect
        animation: Math.random() > 0.6 ? 'animate-float-fast' : Math.random() > 0.3 ? 'animate-float-medium' : 'animate-float-slow',
        pulse: Math.random() > 0.5 ? 'animate-pulse' : '', 
        delay: `${Math.random() * 5}s`,
        opacity: Math.random() * 0.15 + 0.05, 
        color: i % 3 === 0 ? 'text-studio-neon' : i % 3 === 1 ? 'text-studio-purple' : 'text-studio-gold',
      };
    });
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-black">
      {/* Deep Space Background */}
      <div className="absolute inset-0 bg-noise opacity-[0.08] mix-blend-overlay"></div>
      
      {/* Fluid Plasma Gradient - Replaces Flashlight */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-studio-purple/20 rounded-full blur-[120px] animate-blob mix-blend-screen"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-studio-neon/10 rounded-full blur-[130px] animate-blob animation-delay-2000 mix-blend-screen"></div>
      <div className="absolute top-[40%] left-[40%] w-[40%] h-[40%] bg-studio-gold/10 rounded-full blur-[100px] animate-blob animation-delay-4000 mix-blend-screen"></div>
      
      {/* Moving Grid - Subtle Floor */}
      <div className="absolute bottom-0 left-[-50%] w-[200%] h-[50%] opacity-20 transform-gpu perspective-1000 rotate-x-60">
        <div className="w-full h-full bg-[linear-gradient(rgba(0,240,255,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.1)_1px,transparent_1px)] bg-[size:50px_50px] animate-drift"></div>
      </div>

      {/* Floating Icons Layer - Sparse & Premium */}
      {icons.map((item) => (
        <div
          key={item.id}
          className={`absolute ${item.animation} ${item.pulse} ${item.color} transition-all duration-[2000ms] ease-in-out transform hover:scale-125 hover:brightness-125`}
          style={{
            left: item.left,
            top: item.top,
            width: `${item.size}px`,
            height: `${item.size}px`,
            animationDelay: item.delay,
            opacity: item.opacity,
          }}
        >
          <item.Icon />
        </div>
      ))}
      
      {/* Vignette Overlay for Focus */}
      <div className="absolute inset-0 bg-radial-gradient from-transparent via-black/40 to-black/90"></div>
    </div>
  );
});
