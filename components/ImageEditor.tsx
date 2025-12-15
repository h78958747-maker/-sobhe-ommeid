import React, { useState, useRef, useEffect } from 'react';
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

  const Slider = ({ label, value, min, max, onChange }: any) => (
    <div className="space-y-1">
      <div className="flex justify-between text-[10px] uppercase font-bold text-gray-400">
        <span>{label}</span>
        <span className="text-white">{value}</span>
      </div>
      <input 
        type="range" 
        min={min} 
        max={max} 
        value={value} 
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer" 
      />
    </div>
  );

  return (
    <div className="flex flex-col h-full animate-fade-in">
       {/* Preview Area */}
       <div className="flex-1 relative bg-black/50 rounded-xl overflow-hidden mb-4 border border-white/5">
          <img 
            src={imageSrc} 
            className="w-full h-full object-contain"
            style={{ filter: filterString }}
          />
          {/* Hidden canvas for processing */}
          <canvas ref={canvasRef} className="hidden" />
       </div>

       {/* Controls */}
       <div className="bg-black/40 p-4 rounded-xl border border-white/5 space-y-4 backdrop-blur-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <Slider label={t.editBrightness} value={adjustments.brightness} min={0} max={200} onChange={(v: number) => setAdjustments({...adjustments, brightness: v})} />
             <Slider label={t.editContrast} value={adjustments.contrast} min={0} max={200} onChange={(v: number) => setAdjustments({...adjustments, contrast: v})} />
             <Slider label={t.editSaturation} value={adjustments.saturation} min={0} max={200} onChange={(v: number) => setAdjustments({...adjustments, saturation: v})} />
             <Slider label={t.editSepia} value={adjustments.sepia} min={0} max={100} onChange={(v: number) => setAdjustments({...adjustments, sepia: v})} />
             <Slider label={t.editBlur} value={adjustments.blur} min={0} max={10} onChange={(v: number) => setAdjustments({...adjustments, blur: v})} />
          </div>

          <div className="flex gap-3 pt-2">
             <Button variant="secondary" onClick={handleReset} className="flex-1 text-xs">
               {t.resetEdits}
             </Button>
             <Button variant="primary" onClick={handleApply} className="flex-1 text-xs">
               {t.applyEdits}
             </Button>
          </div>
       </div>
    </div>
  );
};