
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from './Button';
import { translations } from '../translations';
import { Language, ImageAdjustments } from '../types';
import { PromptAssistant } from './PromptAssistant';

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
  
  const INITIAL_ADJUSTMENTS: ImageAdjustments = {
    brightness: 100,
    contrast: 100,
    saturation: 100,
    sepia: 0,
    blur: 0
  };

  const [adjustments, setAdjustments] = useState<ImageAdjustments>(INITIAL_ADJUSTMENTS);

  const [history, setHistory] = useState<ImageAdjustments[]>([INITIAL_ADJUSTMENTS]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [showAssistant, setShowAssistant] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const filterString = `
    brightness(${adjustments.brightness}%) 
    contrast(${adjustments.contrast}%) 
    saturate(${adjustments.saturation}%) 
    sepia(${adjustments.sepia}%) 
    blur(${adjustments.blur}px)
  `;

  const pushHistory = useCallback((newAdjustments: ImageAdjustments) => {
    setHistory(prev => {
      const sliced = prev.slice(0, historyIndex + 1);
      const updated = [...sliced, newAdjustments];
      if (updated.length > 20) return updated.slice(updated.length - 20);
      return updated;
    });
    setHistoryIndex(prev => Math.min(prev + 1, 19));
  }, [historyIndex]);

  const updateAdjustments = (key: keyof ImageAdjustments, value: number) => {
    const newAdj = { ...adjustments, [key]: value };
    setAdjustments(newAdj);
  };

  const handleSliderCommit = () => {
    pushHistory(adjustments);
  };

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setAdjustments(prev);
      setHistoryIndex(historyIndex - 1);
    }
  }, [historyIndex, history]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setAdjustments(next);
      setHistoryIndex(historyIndex + 1);
    }
  }, [historyIndex, history]);

  const handleReset = useCallback(() => {
    setAdjustments(INITIAL_ADJUSTMENTS);
    pushHistory(INITIAL_ADJUSTMENTS);
  }, [pushHistory]);

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

  // Editor Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      }
      if (e.key.toLowerCase() === 'r') {
        e.preventDefault();
        handleReset();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo, handleReset]);

  const Slider = ({ label, value, min, max, onChange, onCommit, icon }: any) => (
    <div className="space-y-2 group/slider">
      <div className="flex justify-between items-center text-[10px] uppercase font-black text-gray-500 group-hover/slider:text-studio-neon transition-colors tracking-widest">
        <div className="flex items-center gap-3 relative">
           <div className="relative group/tooltip">
              {icon}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1 bg-black/90 text-white text-[9px] rounded-lg opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-white/10 backdrop-blur-md">
                 {label}
              </div>
           </div>
           <span className="hidden md:block">{label}</span>
        </div>
        <span className="text-studio-neon bg-studio-neon/5 px-3 py-1 rounded-lg font-mono border border-studio-neon/10">{value}{label === t.editBlur ? 'px' : '%'}</span>
      </div>
      <input 
        type="range" 
        min={min} 
        max={max} 
        value={value} 
        onChange={(e) => onChange(Number(e.target.value))}
        onMouseUp={onCommit}
        onTouchEnd={onCommit}
        className="w-full h-1.5 bg-white/5 rounded-full appearance-none cursor-pointer accent-studio-neon" 
      />
    </div>
  );

  return (
    <div className="flex flex-col h-full animate-fade-in gap-6 pb-12">
       <div className="flex-1 relative bg-black/40 rounded-[3rem] overflow-hidden mb-2 border border-white/5 shadow-glass group/editor min-h-[400px]">
          <div className="absolute inset-0 bg-noise opacity-[0.03] pointer-events-none"></div>
          
          <div className="absolute top-8 left-8 flex gap-3 z-20">
             <button 
               onClick={handleUndo} 
               disabled={historyIndex === 0}
               className="p-3 bg-black/60 rounded-xl border border-white/10 text-white disabled:opacity-20 hover:bg-studio-neon hover:text-black transition-all shadow-lg group relative"
               title={t.undo}
             >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M10 19l-7-7m0 0l7-7m-7 7h18" strokeWidth={2} /></svg>
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[8px] bg-black text-white px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">CTRL+Z</span>
             </button>
             <button 
               onClick={handleRedo} 
               disabled={historyIndex === history.length - 1}
               className="p-3 bg-black/60 rounded-xl border border-white/10 text-white disabled:opacity-20 hover:bg-studio-neon hover:text-black transition-all shadow-lg group relative"
               title={t.redo}
             >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M14 5l7 7m0 0l-7 7m7-7H3" strokeWidth={2} /></svg>
                <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[8px] bg-black text-white px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">CTRL+Y</span>
             </button>
          </div>

          <div className="absolute top-8 right-8 z-20">
             <button 
               onClick={() => setShowAssistant(!showAssistant)}
               className={`p-3 rounded-xl border backdrop-blur-xl transition-all shadow-lg group relative flex items-center gap-2 ${showAssistant ? 'bg-studio-neon text-black border-studio-neon' : 'bg-black/60 text-studio-neon border-studio-neon/30 hover:bg-studio-neon/10'}`}
             >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                <span className="text-[10px] font-black uppercase tracking-widest hidden md:block">{t.assistantTitle}</span>
             </button>
          </div>

          <div className="w-full h-full flex items-center justify-center p-8">
            <img 
              src={imageSrc} 
              alt="Preview"
              className="max-w-full max-h-full object-contain transition-all duration-300 shadow-2xl rounded-lg"
              style={{ filter: filterString }}
            />
          </div>
          <canvas ref={canvasRef} className="hidden" />

          {showAssistant && (
            <div className="absolute bottom-8 left-8 right-8 z-30 bg-black/80 backdrop-blur-3xl p-6 rounded-[2rem] border border-studio-neon/20 shadow-neon-blue/20 animate-slide-up">
               <PromptAssistant 
                 currentPrompt="" // Use adjustments as context primarily
                 imageContext={imageSrc}
                 adjustments={adjustments}
                 onSelectSuggestion={(s) => {
                   // In editor mode, we just copy the suggestion or show a Toast (future improvement)
                   // For now, let's keep it informative.
                   console.log("Cinematic Suggestion based on edits:", s);
                   navigator.clipboard.writeText(s);
                 }}
                 language={language}
               />
            </div>
          )}
       </div>

       <div className="bg-white/5 backdrop-blur-3xl p-8 rounded-[3.5rem] border border-white/10 space-y-8 shadow-glass animate-reveal">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
             <Slider 
                label={t.editBrightness} 
                value={adjustments.brightness} 
                min={0} max={200} 
                onChange={(v: number) => updateAdjustments('brightness', v)}
                onCommit={handleSliderCommit}
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707.707M12 7a5 5 0 100 10 5 5 0 000-10z" /></svg>}
             />
             <Slider 
                label={t.editContrast} 
                value={adjustments.contrast} 
                min={0} max={200} 
                onChange={(v: number) => updateAdjustments('contrast', v)}
                onCommit={handleSliderCommit}
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707.707M12 7a5 5 0 100 10 5 5 0 000-10z" /></svg>}
             />
             <Slider 
                label={t.editSaturation} 
                value={adjustments.saturation} 
                min={0} max={200} 
                onChange={(v: number) => updateAdjustments('saturation', v)}
                onCommit={handleSliderCommit}
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>}
             />
             <Slider 
                label={t.editSepia} 
                value={adjustments.sepia} 
                min={0} max={100} 
                onChange={(v: number) => updateAdjustments('sepia', v)}
                onCommit={handleSliderCommit}
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
             />
             <Slider 
                label={t.editBlur} 
                value={adjustments.blur} 
                min={0} max={10} 
                onChange={(v: number) => updateAdjustments('blur', v)}
                onCommit={handleSliderCommit}
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>}
             />
          </div>

          <div className="flex gap-6 pt-6 border-t border-white/5">
             <Button variant="secondary" onClick={handleReset} className="flex-1 h-16 rounded-2xl group relative hover:border-red-500/30">
               <svg className="w-5 h-5 mr-2 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
               {t.resetEdits}
               <span className="ml-2 opacity-30 text-[8px] group-hover:opacity-100 transition-opacity">(R)</span>
             </Button>
             <Button variant="gold" onClick={handleApply} className="flex-1 h-16 rounded-2xl">
               <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
               {t.applyEdits}
             </Button>
          </div>
       </div>
    </div>
  );
};
