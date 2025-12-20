
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
  const baseStyles = "relative overflow-hidden px-10 py-6 rounded-[2rem] font-black tracking-widest uppercase text-[12px] transition-all duration-500 ease-out flex items-center justify-center gap-4 disabled:opacity-30 disabled:cursor-not-allowed group active:scale-95 select-none border-2";
  
  const variants = {
    primary: "bg-white/10 text-white border-white/10 hover:border-studio-neon/50 hover:bg-studio-neon/10 shadow-lg hover:shadow-studio-neon/30 hover:brightness-110",
    secondary: "bg-black/60 dark:bg-white/5 text-gray-400 border-white/5 hover:text-studio-neon hover:border-studio-neon/30 hover:bg-studio-neon/5 hover:brightness-110",
    gold: "bg-gradient-to-br from-studio-gold via-[#b8860b] to-[#8b4513] text-black border-[#ffd700]/30 shadow-neon-gold hover:shadow-[0_0_50px_rgba(255,215,0,0.5)] hover:brightness-125",
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {/* Dynamic Shine Layer */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-glow-line z-0 pointer-events-none opacity-50 group-hover:opacity-100 transition-opacity"></div>
      
      {isLoading ? (
        <div className="flex items-center gap-4">
           <div className="w-6 h-6 border-3 border-current border-t-transparent rounded-full animate-spin"></div>
           <span className="animate-pulse">{children}</span>
        </div>
      ) : (
        <span className="relative z-10 flex items-center gap-3 transition-transform duration-500 group-hover:scale-105">
          {children}
        </span>
      )}
    </button>
  );
};
