
import React, { useMemo, useState, useEffect } from 'react';

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
    </svg>
  ),
  Atom: () => (
    <svg viewBox="0 0 100 100" className="w-full h-full text-cyan-400 stroke-current" fill="none" strokeWidth="2">
      <circle cx="50" cy="50" r="5" fill="currentColor" />
      <ellipse cx="50" cy="50" rx="40" ry="10" transform="rotate(0 50 50)" />
      <ellipse cx="50" cy="50" rx="40" ry="10" transform="rotate(60 50 50)" />
      <ellipse cx="50" cy="50" rx="40" ry="10" transform="rotate(120 50 50)" />
    </svg>
  )
};

const IconTypes = [Icons.Star, Icons.Planet, Icons.Hexagon, Icons.DNA, Icons.Atom];

export const LivingBackground: React.FC = React.memo(() => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth - 0.5) * 40,
        y: (e.clientY / window.innerHeight - 0.5) * 40
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const icons = useMemo(() => {
    return Array.from({ length: 22 }).map((_, i) => {
      const Icon = IconTypes[Math.floor(Math.random() * IconTypes.length)];
      return {
        id: i,
        Icon,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        size: Math.random() * 50 + 15,
        parallax: Math.random() * 1.5 + 0.5,
        delay: `${Math.random() * 5}s`,
        opacity: Math.random() * 0.12 + 0.04, 
        color: i % 3 === 0 ? 'text-studio-neon' : i % 3 === 1 ? 'text-studio-purple' : 'text-studio-gold',
      };
    });
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-black dark:bg-black bg-white transition-colors duration-1000">
      {/* Background Gradients */}
      <div className="absolute inset-0 bg-noise opacity-[0.05] dark:opacity-[0.1]"></div>
      
      {/* Dynamic Glows */}
      <div 
        className="absolute w-[60%] h-[60%] rounded-full blur-[150px] opacity-20 dark:opacity-30 bg-studio-purple transition-transform duration-700 ease-out"
        style={{ transform: `translate(${mousePos.x * -0.5}px, ${mousePos.y * -0.5}px)`, top: '10%', left: '10%' }}
      ></div>
      <div 
        className="absolute w-[50%] h-[50%] rounded-full blur-[120px] opacity-10 dark:opacity-20 bg-studio-neon transition-transform duration-700 ease-out"
        style={{ transform: `translate(${mousePos.x * 0.8}px, ${mousePos.y * 0.8}px)`, bottom: '10%', right: '10%' }}
      ></div>

      {/* Grid Floor */}
      <div className="absolute bottom-[-100px] left-[-50%] w-[200%] h-[50%] opacity-[0.03] dark:opacity-[0.08] perspective-[1000px] rotate-x-[60deg]">
        <div 
          className="w-full h-full bg-[linear-gradient(rgba(0,240,255,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(0,240,255,0.2)_1px,transparent_1px)] bg-[size:60px_60px]"
          style={{ transform: `translate(${mousePos.x * 0.1}px, ${mousePos.y * 0.1}px)` }}
        ></div>
      </div>

      {/* Floating Elements */}
      {icons.map((item) => (
        <div
          key={item.id}
          className={`absolute ${item.color} transition-all duration-1000 ease-out animate-float`}
          style={{
            left: item.left,
            top: item.top,
            width: `${item.size}px`,
            height: `${item.size}px`,
            opacity: item.opacity,
            transform: `translate(${mousePos.x * item.parallax}px, ${mousePos.y * item.parallax}px)`,
            animationDelay: item.delay
          }}
        >
          <item.Icon />
        </div>
      ))}
      
      {/* Vignette */}
      <div className="absolute inset-0 bg-radial-gradient from-transparent via-transparent dark:to-black/80 to-white/60"></div>
    </div>
  );
});
