import React, { useRef, useEffect, useState } from 'react';
import { Button } from './Button';

interface CameraCaptureProps {
  onCapture: (imageSrc: string) => void;
  onCancel: () => void;
  labelCapture: string;
  labelCancel: string;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  onCapture,
  onCancel,
  labelCapture,
  labelCancel
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1080 } } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Camera access denied:", err);
        setError("Could not access camera. Please check permissions.");
      }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1); // Mirror effect
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        onCapture(dataUrl);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center p-4 animate-fadeIn">
      <div className="relative w-full max-w-3xl aspect-[4/3] bg-gray-900 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
        {error ? (
           <div className="absolute inset-0 flex items-center justify-center text-red-400 p-4 text-center">
             <p>{error}</p>
           </div>
        ) : (
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="w-full h-full object-cover transform -scale-x-100"
          />
        )}
        <canvas ref={canvasRef} className="hidden" />
        
        {/* Overlay Guides */}
        <div className="absolute inset-0 pointer-events-none opacity-30">
           <div className="absolute inset-10 border border-white/50 rounded-lg"></div>
           <div className="absolute top-1/2 left-0 right-0 h-px bg-white/30"></div>
           <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/30"></div>
        </div>
      </div>

      <div className="mt-6 flex gap-4 w-full max-w-md">
        <Button variant="secondary" onClick={onCancel} className="flex-1">
           {labelCancel}
        </Button>
        <Button variant="primary" onClick={handleCapture} disabled={!!error} className="flex-1">
           <div className="w-3 h-3 bg-red-500 rounded-full mr-2 animate-pulse"></div>
           {labelCapture}
        </Button>
      </div>
    </div>
  );
};