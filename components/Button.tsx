
import React from 'react';
import { playClick } from '../services/audioService';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'gold';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading = false, 
  className = '',
  disabled,
  onClick,
  ...props 
}) => {
  const baseStyles = "relative overflow-hidden px-10 py-6 rounded-[2rem] font-black tracking-widest uppercase text-[12px] transition-all duration-500 ease-out flex items-center justify-center gap-4 disabled:opacity-30 disabled:cursor-not-allowed group active:scale-95 select-none border btn-ripple";
  
  const variants = {
    primary: "bg-white/5 text-white border-white/10 hover:border-studio-neon/50 hover:bg-studio-neon/5 shadow-lg hover:shadow-studio-neon/20 hover:text-studio-neon",
    secondary: "bg-black/60 dark:bg-white/5 text-gray-400 border-white/5 hover:text-studio-neon hover:border-studio-neon/20 hover:bg-studio-neon/5 hover:shadow-inner-glow",
    gold: "bg-gradient-to-br from-studio-gold via-[#b8860b] to-[#8b4513] text-black border-transparent shadow-neon-gold hover:shadow-[0_0_60px_rgba(255,215,0,0.4)] hover:brightness-110",
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !isLoading) {
      playClick();
      if (onClick) onClick(e);
    }
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className} ${isLoading ? 'cursor-wait' : ''}`}
      disabled={disabled || isLoading}
      onClick={handleClick}
      {...props}
    >
      {/* Animated Glow Border */}
      <div className="absolute inset-0 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none border border-studio-neon/30 blur-[2px]"></div>

      {/* Cinema Sweep Effect */}
      <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full transition-transform duration-1000 ${isLoading ? 'animate-shimmer-fast' : 'group-hover:translate-x-full'} z-0 pointer-events-none opacity-40`}></div>
      
      {isLoading ? (
        <div className="relative z-10 flex items-center gap-4">
           <div className="relative w-5 h-5">
              <div className="absolute inset-0 border-[3px] border-current/10 rounded-full"></div>
              <div className="absolute inset-0 border-[3px] border-current border-t-transparent rounded-full animate-spin"></div>
           </div>
           <span className="animate-pulse tracking-[0.25em] font-black opacity-80">
             {children}
           </span>
        </div>
      ) : (
        <span className="relative z-10 flex items-center gap-3 transition-all duration-500 group-hover:scale-105 group-hover:tracking-[0.15em]">
          {children}
        </span>
      )}

      {/* Inner Glow (Gold only) */}
      {variant === 'gold' && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
      )}
    </button>
  );
};
