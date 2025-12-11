
import React, { useState, useRef, useEffect } from 'react';

interface ComparisonViewProps {
  original: string;
  result: string;
}

export const ComparisonView: React.FC<ComparisonViewProps> = ({ original, result }) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMove = (clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = Math.max(0, Math.min((x / rect.width) * 100, 100));
    setSliderPosition(percent);
  };

  const onMouseDown = () => { isDragging.current = true; };
  const onMouseUp = () => { isDragging.current = false; };
  const onMouseMove = (e: React.MouseEvent) => { if (isDragging.current) handleMove(e.clientX); };
  
  const onTouchStart = () => { isDragging.current = true; };
  const onTouchEnd = () => { isDragging.current = false; };
  const onTouchMove = (e: React.TouchEvent) => { if (isDragging.current) handleMove(e.touches[0].clientX); };

  // Global event listeners to handle dragging outside the container
  useEffect(() => {
    const handleGlobalMouseUp = () => { isDragging.current = false; };
    const handleGlobalMouseMove = (e: MouseEvent) => { if (isDragging.current) handleMove(e.clientX); };
    
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('mousemove', handleGlobalMouseMove);

    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, []);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 animate-fade-in select-none">
      
      <div 
        ref={containerRef}
        className="relative w-full h-full max-h-[70vh] rounded-2xl overflow-hidden shadow-2xl border border-white/10 group cursor-col-resize bg-black"
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Background Image (Original) */}
        <img 
          src={original} 
          alt="Original" 
          className="absolute inset-0 w-full h-full object-contain pointer-events-none opacity-80 blur-[1px] grayscale-[30%]" 
        />
        
        {/* Overlay Image (Result) - Clipped */}
        <div 
          className="absolute inset-0 w-full h-full overflow-hidden"
          style={{ clipPath: `polygon(${sliderPosition}% 0, 100% 0, 100% 100%, ${sliderPosition}% 100%)` }}
        >
          <img 
            src={result} 
            alt="Result" 
            className="absolute inset-0 w-full h-full object-contain pointer-events-none" 
          />
        </div>

        {/* Slider Handle Line */}
        <div 
          className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize shadow-[0_0_20px_rgba(0,0,0,0.5)] z-20 flex items-center justify-center"
          style={{ left: `${sliderPosition}%` }}
        >
           {/* Handle Button */}
           <div className="w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center transform hover:scale-125 transition-transform">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="black" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />
              </svg>
           </div>
        </div>

        {/* Labels */}
        <div className="absolute top-4 left-4 bg-black/60 backdrop-blur text-white px-3 py-1 rounded text-xs font-bold pointer-events-none">ORIGINAL</div>
        <div className="absolute top-4 right-4 bg-studio-neon/80 backdrop-blur text-black px-3 py-1 rounded text-xs font-bold pointer-events-none">RESULT</div>

      </div>
    </div>
  );
};
