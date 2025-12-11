
/**
 * Generates a simple "Cinematic" video effect (Zoom/Breathe) from an image 
 * entirely in the browser using HTML5 Canvas and MediaRecorder.
 * This replaces the heavier server-side Veo generation.
 */
export const generateInstantVideo = async (imageUrl: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        // Set resolution (cap at 1080p for performance/compatibility)
        const maxDim = 1080;
        let width = img.naturalWidth;
        let height = img.naturalHeight;
        
        if (width > maxDim || height > maxDim) {
          const ratio = width / height;
          if (width > height) {
            width = maxDim;
            height = maxDim / ratio;
          } else {
            height = maxDim;
            width = maxDim * ratio;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Supported mime types for recording
        const mimeTypes = [
          'video/webm;codecs=vp9', 
          'video/webm;codecs=vp8', 
          'video/webm'
        ];
        const mimeType = mimeTypes.find(type => MediaRecorder.isTypeSupported(type)) || '';

        if (!mimeType) {
          reject(new Error("Video recording not supported in this browser"));
          return;
        }

        // 30 FPS stream
        const stream = canvas.captureStream(30);
        const recorder = new MediaRecorder(stream, { 
          mimeType,
          videoBitsPerSecond: 5000000 // 5 Mbps
        });
        
        const chunks: Blob[] = [];
        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunks.push(e.data);
        };

        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: mimeType });
          const url = URL.createObjectURL(blob);
          resolve(url);
        };

        recorder.start();

        // Animation Parameters
        const duration = 6000; // 6 seconds for a very slow, cinematic breathe
        const startTime = performance.now();
        
        const animate = (now: number) => {
          const elapsed = now - startTime;
          const progress = Math.min(elapsed / duration, 1);

          // Effect: Subtle Breathe (1.00x -> 1.02x -> 1.00x)
          // Uses (1 - cos(2πt)) / 2 to go 0 -> 1 -> 0 smoothly
          // Amplitude reduced to 0.02 for extremely subtle "breathing" effect
          const ease = (1 - Math.cos(progress * Math.PI * 2)) / 2;
          
          const scale = 1 + (ease * 0.02); 
          
          // Clear and Draw
          ctx.clearRect(0, 0, width, height);
          
          // Draw image centered with scale
          ctx.save();
          ctx.translate(width / 2, height / 2);
          ctx.scale(scale, scale);
          ctx.translate(-width / 2, -height / 2);
          ctx.drawImage(img, 0, 0, width, height);
          ctx.restore();

          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            recorder.stop();
          }
        };

        requestAnimationFrame(animate);

      } catch (error) {
        reject(error);
      }
    };

    img.onerror = () => reject(new Error("Failed to load image for animation"));
    img.src = imageUrl;
  });
};
