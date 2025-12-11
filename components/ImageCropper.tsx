
import React, { useRef, useState, useEffect } from 'react';
import { Button } from './Button';

interface ImageCropperProps {
  imageSrc: string;
  onCropComplete: (croppedBase64: string) => void;
  onCancel: () => void;
  confirmLabel: string;
  cancelLabel: string;
  instructions: string;
}

type CropAspectRatio = 'FREE' | 1 | 0.8 | 1.33 | 1.77 | 0.56 | 0.75 | 2.33; // Free, 1:1, 4:5, 4:3, 16:9, 9:16, 3:4, 21:9

export const ImageCropper: React.FC<ImageCropperProps> = ({
  imageSrc,
  onCropComplete,
  onCancel,
  confirmLabel,
  cancelLabel,
  instructions
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState({ x: 10, y: 10, width: 80, height: 80 }); // Percentages
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [dragType, setDragType] = useState<'move' | 'nw' | 'ne' | 'sw' | 'se' | null>(null);
  const [aspectRatio, setAspectRatio] = useState<CropAspectRatio>('FREE');

  // Helper to handle coordinate conversion
  const getMousePos = (e: React.MouseEvent | MouseEvent | React.TouchEvent | TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
    
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * 100,
      y: ((clientY - rect.top) / rect.height) * 100
    };
  };

  const handleMouseDown = (e: React.MouseEvent | React.TouchEvent, type: 'move' | 'nw' | 'ne' | 'sw' | 'se') => {
    e.preventDefault();
    setIsDragging(true);
    setDragType(type);
    setDragStart(getMousePos(e.nativeEvent));
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !dragType || !containerRef.current) return;
      e.preventDefault();

      const currentPos = getMousePos(e);
      let dx = currentPos.x - dragStart.x;
      let dy = currentPos.y - dragStart.y;

      // Container Dimensions for aspect ratio calculation
      const rect = containerRef.current.getBoundingClientRect();
      const containerAspect = rect.width / rect.height;

      setCrop(prev => {
        let newCrop = { ...prev };

        if (dragType === 'move') {
          newCrop.x = Math.max(0, Math.min(100 - prev.width, prev.x + dx));
          newCrop.y = Math.max(0, Math.min(100 - prev.height, prev.y + dy));
        } else {
          // Resizing logic
          let newWidth = prev.width;
          let newHeight = prev.height;
          let newX = prev.x;
          let newY = prev.y;

          if (aspectRatio === 'FREE') {
            if (dragType.includes('w')) {
              newWidth = Math.max(10, prev.width - dx);
              newX = Math.max(0, prev.x + (prev.width - newWidth));
            }
            if (dragType.includes('e')) {
              newWidth = Math.max(10, Math.min(100 - prev.x, prev.width + dx));
            }
            if (dragType.includes('n')) {
              newHeight = Math.max(10, prev.height - dy);
              newY = Math.max(0, prev.y + (prev.height - newHeight));
            }
            if (dragType.includes('s')) {
              newHeight = Math.max(10, Math.min(100 - prev.y, prev.height + dy));
            }
          } else {
             const ratioFactor = containerAspect / aspectRatio;

             if (dragType === 'se') {
               newWidth = Math.max(10, Math.min(100 - prev.x, prev.width + dx));
               newHeight = newWidth * ratioFactor;
               if (prev.y + newHeight > 100) {
                 newHeight = 100 - prev.y;
                 newWidth = newHeight / ratioFactor;
               }
             } else if (dragType === 'sw') {
               newWidth = Math.max(10, prev.width - dx); // Actually dx is negative when growing left
               // Check bounds left
               if (prev.x + prev.width - newWidth < 0) newWidth = prev.x + prev.width;
               
               newHeight = newWidth * ratioFactor;
               if (prev.y + newHeight > 100) {
                  newHeight = 100 - prev.y;
                  newWidth = newHeight / ratioFactor;
               }
               newX = prev.x + prev.width - newWidth;
             }
             else if (dragType === 'ne') {
               newWidth = Math.max(10, Math.min(100 - prev.x, prev.width + dx));
               newHeight = newWidth * ratioFactor;
               // Growing Up
               if (prev.y + prev.height - newHeight < 0) {
                 newHeight = prev.y + prev.height;
                 newWidth = newHeight / ratioFactor;
               }
               newY = prev.y + prev.height - newHeight;
             }
             else if (dragType === 'nw') {
               newWidth = Math.max(10, prev.width - dx);
               if (prev.x + prev.width - newWidth < 0) newWidth = prev.x + prev.width;

               newHeight = newWidth * ratioFactor;
               if (prev.y + prev.height - newHeight < 0) {
                 newHeight = prev.y + prev.height;
                 newWidth = newHeight / ratioFactor;
               }
               newX = prev.x + prev.width - newWidth;
               newY = prev.y + prev.height - newHeight;
             }
          }

          newCrop = { x: newX, y: newY, width: newWidth, height: newHeight };
        }
        return newCrop;
      });

      setDragStart(currentPos);
    };

    const handleUp = () => {
      setIsDragging(false);
      setDragType(null);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [isDragging, dragType, dragStart, aspectRatio]);

  const performCrop = () => {
    if (!imageRef.current) return;
    
    const canvas = document.createElement('canvas');
    const img = imageRef.current;
    
    // Calculate actual pixel coordinates
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;
    
    const pixelX = (crop.x / 100) * naturalWidth;
    const pixelY = (crop.y / 100) * naturalHeight;
    const pixelW = (crop.width / 100) * naturalWidth;
    const pixelH = (crop.height / 100) * naturalHeight;

    canvas.width = pixelW;
    canvas.height = pixelH;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, pixelX, pixelY, pixelW, pixelH, 0, 0, pixelW, pixelH);
      onCropComplete(canvas.toDataURL('image/png'));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 animate-fadeIn">
      <div className="w-full max-w-2xl bg-gray-900 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center">
          <h3 className="text-white font-semibold">{confirmLabel.replace('Apply ', '')}</h3>
          
          {/* Ratio Selector */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {[
              { label: 'Free', val: 'FREE' },
              { label: '1:1', val: 1 },
              { label: '9:16', val: 0.56 },
              { label: '16:9', val: 1.77 },
              { label: '21:9', val: 2.33 },
              { label: '4:3', val: 1.33 },
              { label: '3:4', val: 0.75 },
            ].map(r => (
              <button
                key={String(r.val)}
                onClick={() => setAspectRatio(r.val as CropAspectRatio)}
                className={`px-3 py-1 text-xs rounded-full border whitespace-nowrap transition-colors ${aspectRatio === r.val ? 'bg-blue-600 border-blue-600 text-white' : 'bg-transparent border-gray-700 text-gray-400 hover:border-gray-500 hover:text-gray-200'}`}
              >
                {r.label}
              </button>
            ))}
          </div>

          <button onClick={onCancel} className="text-gray-400 hover:text-white ml-2">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="flex-1 overflow-hidden relative bg-black flex items-center justify-center select-none" ref={containerRef}>
           {/* Image */}
           <img 
             ref={imageRef}
             src={imageSrc} 
             alt="Crop Source" 
             className="max-h-[60vh] max-w-full object-contain pointer-events-none select-none"
             onDragStart={(e) => e.preventDefault()}
           />
           
           {/* Crop Box */}
           <div 
             className="absolute border-2 border-blue-500 shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] cursor-move"
             style={{
               left: `${crop.x}%`,
               top: `${crop.y}%`,
               width: `${crop.width}%`,
               height: `${crop.height}%`,
               touchAction: 'none'
             }}
             onMouseDown={(e) => handleMouseDown(e, 'move')}
             onTouchStart={(e) => handleMouseDown(e, 'move')}
           >
              {/* Grid Lines */}
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-50">
                 <div className="border-r border-gray-300/30"></div>
                 <div className="border-r border-gray-300/30"></div>
                 <div></div>
                 <div className="border-r border-gray-300/30 border-t border-gray-300/30 col-span-3"></div>
                 <div className="border-r border-gray-300/30 border-t border-gray-300/30 col-span-3"></div>
              </div>

              {/* Resize Handles */}
              <div 
                className="absolute -top-2 -left-2 w-6 h-6 bg-blue-500 rounded-full border-2 border-white cursor-nw-resize z-10"
                onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'nw'); }}
                onTouchStart={(e) => { e.stopPropagation(); handleMouseDown(e, 'nw'); }}
              />
              <div 
                className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full border-2 border-white cursor-ne-resize z-10"
                onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'ne'); }}
                onTouchStart={(e) => { e.stopPropagation(); handleMouseDown(e, 'ne'); }}
              />
              <div 
                className="absolute -bottom-2 -left-2 w-6 h-6 bg-blue-500 rounded-full border-2 border-white cursor-sw-resize z-10"
                onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'sw'); }}
                onTouchStart={(e) => { e.stopPropagation(); handleMouseDown(e, 'sw'); }}
              />
              <div 
                className="absolute -bottom-2 -right-2 w-6 h-6 bg-blue-500 rounded-full border-2 border-white cursor-se-resize z-10"
                onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'se'); }}
                onTouchStart={(e) => { e.stopPropagation(); handleMouseDown(e, 'se'); }}
              />
           </div>
        </div>

        <div className="p-4 bg-gray-900 border-t border-gray-800 flex flex-col gap-2">
          <p className="text-center text-sm text-gray-400 mb-2">{instructions}</p>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={onCancel} className="flex-1">
              {cancelLabel}
            </Button>
            <Button onClick={performCrop} className="flex-1">
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
