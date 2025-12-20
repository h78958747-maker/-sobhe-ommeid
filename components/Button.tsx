
import React from 'react';

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
  ...props 
}) => {
  const baseStyles = "relative overflow-hidden px-8 py-5 rounded-2xl font-black tracking-widest uppercase text-[11px] transition-all duration-500 ease-out flex items-center justify-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed group active:scale-95 select-none";
  
  const variants = {
    primary: "bg-white/10 text-white border border-white/10 hover:border-studio-neon/50 hover:bg-white/20 shadow-lg hover:shadow-studio-neon/20",
    secondary: "bg-black/60 dark:bg-white/5 text-gray-400 border border-black/10 dark:border-white/5 hover:text-studio-neon hover:border-studio-neon/30 hover:bg-studio-neon/5",
    gold: "bg-gradient-to-br from-studio-gold via-[#b8860b] to-[#8b4513] text-black shadow-[0_0_30px_rgba(255,215,0,0.2)] hover:shadow-[0_0_60px_rgba(255,215,0,0.5)] border-t border-white/30",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {/* Shine Effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer z-0 pointer-events-none"></div>
      
      {isLoading ? (
        <div className="flex items-center gap-3">
           <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
           <span className="animate-pulse">{children}</span>
        </div>
      ) : (
        <span className="relative z-10 flex items-center gap-2 group-hover:scale-105 transition-transform">{children}</span>
      )}
    </button>
  );
};
