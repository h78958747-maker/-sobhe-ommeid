
// Import React to resolve 'Cannot find namespace React' errors
import React, { useRef, useState } from 'react';
import { Button } from './Button';
import { AspectRatio, BatchItem, Language } from '../types';
import { PromptAssistant } from './PromptAssistant';
import { playUpload, playClick } from '../services/audioService';
import { translations } from '../translations';

interface ImageUploadProps {
  onImageSelected: (base64: string | string[]) => void;
  onDimensionsDetected?: (width: number, height: number) => void;
  onDescriptionChange?: (text: string) => void;
  selectedImage: string | null;
  batchImages?: BatchItem[];
  description?: string;
  title?: string;
  className?: string;
  onOpenCamera?: () => void;
  currentAspectRatio?: AspectRatio;
  onAspectRatioChange?: (ratio: AspectRatio) => void;
  descriptionLabel?: string;
  descriptionPlaceholder?: string;
  allowMultiple?: boolean;
  language: Language;
}

// Fixed: Added React import to satisfy React.FC type
export const ImageUpload: React.FC<ImageUploadProps> = ({ 
  onImageSelected, 
  onDimensionsDetected,
  onDescriptionChange,
  selectedImage, 
  batchImages = [],
  description = "",
  title,
  className = "",
  onOpenCamera,
  currentAspectRatio = "AUTO",
  onAspectRatioChange,
  descriptionLabel = "Description",
  descriptionPlaceholder = "Describe image...",
  allowMultiple = false,
  language
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const t = translations[language];

  // Fixed: Added React.ChangeEvent type
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files);
  };

  const getImageDimensions = (base64: string): Promise<{w: number, h: number}> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.width, h: img.height });
      img.src = base64;
    });
  };

  const handleFiles = (files: FileList) => {
    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/')).slice(0, allowMultiple ? 20 : 1);
    
    if (validFiles.length > 0) {
      playUpload(); 
    }

    if (validFiles.length > 1) {
       const readers: Promise<string>[] = [];
       validFiles.forEach(file => {
         readers.push(new Promise(resolve => {
           const reader = new FileReader();
           reader.onload = () => resolve(reader.result as string);
           reader.readAsDataURL(file);
         }));
       });
       Promise.all(readers).then(async results => {
         if (results[0] && onDimensionsDetected) {
            const dims = await getImageDimensions(results[0]);
            onDimensionsDetected(dims.w, dims.h);
         }
         onImageSelected(results);
       });
    } else if (validFiles[0]) {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const result = reader.result as string;
        if (onDimensionsDetected) {
          const dims = await getImageDimensions(result);
          onDimensionsDetected(dims.w, dims.h);
        }
        onImageSelected(result);
      };
      reader.readAsDataURL(validFiles[0]);
    }
  };

  // Fixed: Added React.DragEvent type
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  // Fixed: Added React.DragEvent type
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.length > 0) handleFiles(e.dataTransfer.files);
  };

  const handleAddSuggestion = (suggestion: string) => {
    if (!onDescriptionChange) return;
    const cleanDesc = description.trim();
    const newDesc = cleanDesc ? `${cleanDesc}, ${suggestion}` : suggestion;
    onDescriptionChange(newDesc);
  };

  const ratios: AspectRatio[] = ['AUTO', '1:1', '4:3', '16:9', '9:16', '3:4'];

  return (
    <div className={`w-full group/container space-y-4 ${className}`}>
      <input ref={fileInputRef} type="file" accept="image/*" multiple={allowMultiple} onChange={handleFileChange} className="hidden" />
      
      {!selectedImage && batchImages.length === 0 ? (
        <div className="relative">
            <div 
              onClick={() => fileInputRef.current?.click()}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              className={`
                  relative h-64 md:h-80 rounded-[3rem] flex flex-col items-center justify-center cursor-pointer transition-all duration-700
                  border border-dashed backdrop-blur-xl overflow-hidden shadow-glass
                  ${dragActive 
                  ? 'border-studio-neon bg-studio-neon/20 scale-[1.02]' 
                  : 'border-black/10 dark:border-white/10 hover:border-studio-neon/40 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10'}
              `}
              onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
            >
            <div className="absolute inset-0 bg-noise opacity-[0.05] pointer-events-none"></div>
            
            <div className={`
                relative z-10 w-24 h-24 mb-6 rounded-[2rem] flex items-center justify-center transition-all duration-500
                ${isHovered ? 'bg-studio-neon text-black scale-110 shadow-neon-blue' : 'bg-black/10 dark:bg-white/10 text-gray-400'}
            `}>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-10 h-10">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
            </div>
            
            <div className="relative z-10 text-center space-y-2 px-6">
                <p className="text-xl font-black tracking-tighter uppercase">{title || "Upload Reference"}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-bold">
                  {allowMultiple ? t.batchLimitInfo : (language === 'fa' ? 'بکشید و رها کنید یا کلیک کنید' : "Drag & drop or click to browse")}
                </p>
            </div>
            </div>

            {onOpenCamera && (
               <button 
                 onClick={(e) => { e.stopPropagation(); onOpenCamera(); }}
                 className="absolute bottom-6 right-6 z-20 bg-black/60 dark:bg-white/10 hover:bg-studio-neon hover:text-black border border-white/10 text-white p-5 rounded-full backdrop-blur-md transition-all duration-300 shadow-xl hover:scale-110 active:scale-95"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                   <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                   <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                 </svg>
               </button>
            )}
        </div>
      ) : (
        <div className="space-y-6">
          {batchImages.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {batchImages.map((img) => (
                <div key={img.id} className="relative aspect-square rounded-[2rem] overflow-hidden border border-black/10 dark:border-white/10 group shadow-lg hover:scale-105 transition-transform">
                  <img src={img.original} className="w-full h-full object-cover" alt="Batch item" />
                  <div className={`absolute inset-0 flex items-center justify-center transition-all ${img.status === 'processing' ? 'bg-black/60 opacity-100' : 'opacity-0 hover:opacity-100 bg-black/40'}`}>
                    {img.status === 'processing' && <div className="w-8 h-8 border-2 border-studio-neon border-t-transparent rounded-full animate-spin"></div>}
                    {img.status === 'done' && <div className="p-2 bg-green-500 rounded-full shadow-lg"><svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" /></svg></div>}
                  </div>
                </div>
              ))}
              {batchImages.length < 20 && (
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-[2rem] border-2 border-dashed border-black/10 dark:border-white/10 flex items-center justify-center cursor-pointer hover:border-studio-neon hover:bg-studio-neon/5 transition-all active:scale-95"
                >
                  <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 4v16m8-8H4" strokeWidth={2} /></svg>
                </div>
              )}
            </div>
          ) : (
            <div className="relative rounded-[3.5rem] overflow-hidden shadow-2xl border border-black/5 dark:border-white/10 bg-black/5 dark:bg-black/60 group h-[450px] animate-reveal">
              <img src={selectedImage || ""} alt="Selected" className="w-full h-full object-contain" />
              <button 
                onClick={() => onImageSelected('')}
                className="absolute top-6 right-6 bg-red-500 hover:bg-red-600 text-white p-4 rounded-full shadow-xl transition-all hover:scale-110 active:scale-90"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          )}

          {/* Ratio Selector Integrated into Upload Area */}
          <div className="space-y-3">
             <label className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5z" /></svg>
                {t.aspectRatio}
             </label>
             <div className="flex flex-wrap gap-2">
                {ratios.map(ratio => (
                  <button 
                    key={ratio} 
                    onClick={() => { playClick(); onAspectRatioChange?.(ratio); }} 
                    className={`px-4 py-2 text-[9px] font-black border rounded-xl transition-all ${currentAspectRatio === ratio ? 'border-studio-neon text-studio-neon bg-studio-neon/10' : 'border-white/5 bg-white/5 text-gray-500 hover:border-white/20'}`}
                  >
                    {ratio === 'AUTO' ? t.ratioAuto : ratio}
                  </button>
                ))}
             </div>
          </div>
          
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-3">
              <label className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] px-2 flex items-center gap-2">
                 <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                 {descriptionLabel}
              </label>
              <textarea 
                value={description}
                onChange={(e) => onDescriptionChange?.(e.target.value)}
                placeholder={descriptionPlaceholder}
                rows={2}
                className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-3xl px-6 py-5 text-sm text-gray-800 dark:text-white placeholder:text-gray-500 focus:outline-none focus:border-studio-neon transition-all backdrop-blur-2xl resize-none shadow-glass hover:bg-black/10 dark:hover:bg-white/10"
              />
            </div>

            {onDescriptionChange && (
              <PromptAssistant 
                currentPrompt={description}
                imageContext={selectedImage}
                onSelectSuggestion={handleAddSuggestion}
                language={language}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};
