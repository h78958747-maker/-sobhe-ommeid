
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'gold';
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  isLoading = false, 
  className = '',
  disabled,
  ...props 
}) => {
  // Base: Glassmorphism + Liquid Physics
  const baseStyles = "relative overflow-hidden px-6 py-4 rounded-xl font-bold tracking-widest uppercase text-xs transition-all duration-300 ease-out transform active:scale-[0.95] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none group backdrop-blur-md select-none";
  
  const variants = {
    primary: "bg-white/10 text-white shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:shadow-[0_0_30px_rgba(0,240,255,0.3)] border border-white/10 hover:border-studio-neon/50 hover:bg-white/20",
    secondary: "bg-black/40 text-gray-300 border border-white/5 hover:border-white/20 hover:text-white shadow-glass hover:shadow-lg hover:bg-black/60",
    danger: "bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.1)]",
    ghost: "bg-transparent hover:bg-white/5 text-gray-400 hover:text-white border border-transparent",
    // Premium Luxury Gold - Refined
    gold: "bg-gradient-to-br from-[#FFD700] via-[#F59E0B] to-[#B45309] text-black border-t border-yellow-200/40 border-b border-yellow-800/40 shadow-[0_4px_30px_rgba(255,215,0,0.15)] hover:shadow-[0_0_50px_rgba(255,215,0,0.4)] hover:brightness-110",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {/* Animated Shine for Primary */}
      {variant === 'primary' && !disabled && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer z-0"></div>
      )}
      
      {/* Glow Effect for Primary */}
      {variant === 'primary' && (
        <div className="absolute -inset-1 bg-gradient-to-r from-studio-neon via-studio-purple to-studio-neon opacity-0 group-hover:opacity-20 blur-lg transition-opacity duration-500"></div>
      )}

      {/* Metallic Shine for Gold */}
      {variant === 'gold' && !disabled && (
        <>
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent translate-x-[-150%] group-hover:animate-[shimmer_1.2s_infinite] z-0 mix-blend-overlay transform skew-x-12"></div>
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-soft-light"></div>
            <div className="absolute inset-0 shadow-[inset_0_1px_1px_rgba(255,255,255,0.4),inset_0_-2px_4px_rgba(0,0,0,0.2)] rounded-xl pointer-events-none"></div>
        </>
      )}

      {/* Content */}
      <span className="relative z-10 flex items-center gap-2 group-hover:scale-[1.02] transition-transform duration-300">
        {isLoading ? (
          <>
            <div className="relative w-4 h-4">
              <div className="absolute inset-0 border-2 border-current opacity-20 rounded-full"></div>
              <div className="absolute inset-0 border-2 border-t-transparent border-current rounded-full animate-spin"></div>
            </div>
            <span className={`animate-pulse tracking-widest text-[10px] uppercase ${variant === 'gold' ? 'text-black/80' : 'text-studio-neon'}`}>Processing</span>
          </>
        ) : children}
      </span>
    </button>
  );
};
