

import React, { useRef, useState } from 'react';
import { Button } from './Button';
import { BatchItem } from '../types';

interface ImageUploadProps {
  onImageSelected: (base64: string | string[]) => void;
  selectedImage: string | null;
  queue?: BatchItem[];
  title?: string;
  className?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({ 
  onImageSelected, 
  selectedImage, 
  queue = [],
  title,
  className = ""
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) handleFiles(e.target.files);
  };

  const handleFiles = (files: FileList) => {
    if (files.length > 1) {
       const readers: Promise<string>[] = [];
       Array.from(files).forEach(file => {
         if (file.type.startsWith('image/')) {
           readers.push(new Promise(resolve => {
             const reader = new FileReader();
             reader.onload = () => resolve(reader.result as string);
             reader.readAsDataURL(file);
           }));
         }
       });
       Promise.all(readers).then(results => onImageSelected(results));
    } else if (files[0] && files[0].type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => onImageSelected(reader.result as string);
      reader.readAsDataURL(files[0]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.length > 0) handleFiles(e.dataTransfer.files);
  };

  return (
    <div className={`w-full perspective-1000 group/container space-y-4 ${className}`}>
      <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
      
      {!selectedImage ? (
        <div 
          onClick={() => fileInputRef.current?.click()}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          className={`
            relative h-64 md:h-80 rounded-[2rem] flex flex-col items-center justify-center cursor-pointer transition-all duration-500 ease-cinematic transform-style-3d
            border border-dashed backdrop-blur-md overflow-hidden
            ${dragActive 
              ? 'border-cyan-400 bg-cyan-900/20 scale-[1.02] shadow-neon-blue' 
              : 'border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10'}
          `}
          onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
          style={{ transform: isHovered ? 'rotateX(2deg) translateY(-5px)' : 'rotateX(0deg)' }}
        >
          {/* Animated Noise Texture */}
          <div className="absolute inset-0 bg-noise opacity-[0.05] pointer-events-none"></div>
          
          {/* Floating Particles */}
          <div className={`absolute top-10 left-10 w-20 h-20 bg-blue-500/20 rounded-full blur-xl transition-all duration-1000 ${isHovered ? 'translate-x-4' : ''}`}></div>
          <div className={`absolute bottom-10 right-10 w-32 h-32 bg-purple-500/20 rounded-full blur-xl transition-all duration-1000 ${isHovered ? '-translate-x-4' : ''}`}></div>

          {/* Icon */}
          <div className={`
            relative z-10 w-20 h-20 mb-6 rounded-full flex items-center justify-center transition-all duration-500
            ${isHovered ? 'bg-white text-black scale-110 shadow-[0_0_30px_rgba(255,255,255,0.4)]' : 'bg-white/10 text-white/50'}
          `}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
          </div>
          
          <div className="relative z-10 text-center space-y-2">
            <p className="text-lg font-bold tracking-tight text-white group-hover/container:tracking-wide transition-all">{title || "Upload Reference"}</p>
            <p className="text-xs text-gray-400">Drag & drop or click to browse</p>
          </div>
        </div>
      ) : (
        <div className="relative rounded-[2rem] overflow-hidden shadow-2xl border border-white/10 bg-black/40 animate-scale-up group h-[350px]">
          <img src={selectedImage} alt="Original" className="w-full h-full object-contain transition-transform duration-700 group-hover:scale-105" />
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-between p-6">
             <div className="flex justify-end gap-2">
                <button 
                  onClick={(e) => { e.stopPropagation(); onImageSelected(''); }}
                  className="bg-red-500/20 hover:bg-red-500/80 text-white p-3 rounded-full backdrop-blur-md transition-all duration-300 hover:scale-110 border border-white/10"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
             </div>
             <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/80">
               <div className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse shadow-[0_0_10px_#4ade80]"></div>
               {title || "Active Source"}
             </span>
          </div>
        </div>
      )}

      {/* Batch Queue Thumbnails */}
      {queue.length > 0 && (
         <div className="bg-white/5 border border-white/10 rounded-2xl p-4 backdrop-blur-sm animate-fade-in-up">
           <div className="flex justify-between items-center mb-3">
             <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Processing Queue</h3>
             <span className="text-[10px] font-mono text-studio-neon">{queue.length} files</span>
           </div>
           <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide snap-x">
             {queue.map((item) => (
               <div key={item.id} className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border border-white/10 group cursor-pointer snap-start transition-transform hover:scale-110">
                 <img src={item.original} className={`w-full h-full object-cover transition-all ${item.status === 'processing' ? 'opacity-50 blur-[1px]' : 'opacity-80 group-hover:opacity-100'}`} />
                 <div className="absolute inset-0 flex items-center justify-center">
                    {item.status === 'processing' && <div className="w-5 h-5 border-2 border-studio-neon border-t-transparent rounded-full animate-spin"></div>}
                    {item.status === 'done' && <div className="bg-green-500/20 p-1 rounded-full"><svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg></div>}
                    {item.status === 'error' && <div className="bg-red-500/20 p-1 rounded-full"><svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg></div>}
                 </div>
               </div>
             ))}
           </div>
         </div>
      )}
    </div>
  );
};