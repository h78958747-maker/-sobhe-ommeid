import React, { useState, useRef } from 'react';
import { Button } from './Button';
import { translations } from '../translations';
import { Language, ImageAdjustments } from '../types';

interface ImageEditorProps {
  imageSrc: string;
  onSave: (newImage: string) => void;
  language: Language;
}

export const ImageEditor: React.FC<ImageEditorProps> = ({
  imageSrc,
  onSave,
  language
}) => {
  const t = translations[language];
  const [adjustments, setAdjustments] = useState<ImageAdjustments>({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    sepia: 0,
    blur: 0
  });
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Generate CSS filter string for preview
  const filterString = `
    brightness(${adjustments.brightness}%) 
    contrast(${adjustments.contrast}%) 
    saturate(${adjustments.saturation}%) 
    sepia(${adjustments.sepia}%) 
    blur(${adjustments.blur}px)
  `;

  const handleReset = () => {
    setAdjustments({
      brightness: 100,
      contrast: 100,
      saturation: 100,
      sepia: 0,
      blur: 0
    });
  };

  const handleApply = () => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageSrc;
    
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      if (ctx) {
        // Apply filters to context
        ctx.filter = `
          brightness(${adjustments.brightness}%) 
          contrast(${adjustments.contrast}%) 
          saturate(${adjustments.saturation}%) 
          sepia(${adjustments.sepia}%) 
          blur(${adjustments.blur}px)
        `;
        ctx.drawImage(img, 0, 0);
        onSave(canvas.toDataURL('image/png'));
      }
    };
  };

  const Slider = ({ label, value, min, max, onChange, icon }: any) => (
    <div className="space-y-2 group/slider">
      <div className="flex justify-between items-center text-[10px] uppercase font-bold text-gray-400 group-hover/slider:text-studio-neon transition-colors">
        <div className="flex items-center gap-2">
           {icon}
           <span>{label}</span>
        </div>
        <span className="text-white bg-white/10 px-2 py-0.5 rounded-md font-mono">{value}{label === t.editBlur ? 'px' : '%'}</span>
      </div>
      <input 
        type="range" 
        min={min} 
        max={max} 
        value={value} 
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer accent-studio-neon" 
      />
    </div>
  );

  return (
    <div className="flex flex-col h-full animate-fade-in gap-4">
       {/* Preview Area */}
       <div className="flex-1 relative bg-black/60 rounded-3xl overflow-hidden mb-2 border border-white/5 shadow-inner">
          <div className="absolute inset-0 bg-noise opacity-[0.03] pointer-events-none"></div>
          <img 
            src={imageSrc} 
            alt="Preview"
            className="w-full h-full object-contain transition-all duration-300"
            style={{ filter: filterString }}
          />
          {/* Hidden canvas for processing */}
          <canvas ref={canvasRef} className="hidden" />
       </div>

       {/* Controls Card */}
       <div className="bg-black/40 backdrop-blur-xl p-6 rounded-3xl border border-white/10 space-y-6 shadow-glass">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             <Slider 
                label={t.editBrightness} 
                value={adjustments.brightness} 
                min={0} max={200} 
                onChange={(v: number) => setAdjustments({...adjustments, brightness: v})}
                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707.707M12 7a5 5 0 100 10 5 5 0 000-10z" /></svg>}
             />
             <Slider 
                label={t.editContrast} 
                value={adjustments.contrast} 
                min={0} max={200} 
                onChange={(v: number) => setAdjustments({...adjustments, contrast: v})}
                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707.707M12 7a5 5 0 100 10 5 5 0 000-10z" /></svg>}
             />
             <Slider 
                label={t.editSaturation} 
                value={adjustments.saturation} 
                min={0} max={200} 
                onChange={(v: number) => setAdjustments({...adjustments, saturation: v})}
                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>}
             />
             <Slider 
                label={t.editSepia} 
                value={adjustments.sepia} 
                min={0} max={100} 
                onChange={(v: number) => setAdjustments({...adjustments, sepia: v})}
                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
             />
             <Slider 
                label={t.editBlur} 
                value={adjustments.blur} 
                min={0} max={10} 
                onChange={(v: number) => setAdjustments({...adjustments, blur: v})}
                icon={<svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
             />
          </div>

          <div className="flex gap-4 pt-2 border-t border-white/5">
             <Button variant="secondary" onClick={handleReset} className="flex-1">
               {t.resetEdits}
             </Button>
             <Button variant="gold" onClick={handleApply} className="flex-1">
               {t.applyEdits}
             </Button>
          </div>
       </div>
    </div>
  );
};