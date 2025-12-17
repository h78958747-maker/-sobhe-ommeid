
import { GoogleGenAI } from "@google/genai";
import { MODEL_NAME } from "../constants";
import { AspectRatio } from "../types";

const getGenAI = () => {
  // Access the API key exclusively from process.env.API_KEY as per guidelines
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    throw new Error("API_KEY_MISSING"); 
  }
  return new GoogleGenAI({ apiKey });
};

const cleanBase64 = (b64: string) => b64.split(',')[1] || b64;
const getMimeType = (b64: string) => {
  const match = b64.match(/^data:(.*);base64,/);
  return match && match[1] ? match[1] : 'image/jpeg';
};

const optimizeImage = (base64Str: string, maxWidth = 1536, quality = 0.9): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      if (width > maxWidth || height > maxWidth) {
        if (width > height) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxWidth) / height);
          height = maxWidth;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { resolve(base64Str); return; }
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => resolve(base64Str);
    img.src = base64Str;
  });
};

export const generateEditedImage = async (
  base64Image: string,
  prompt: string,
  aspectRatio: AspectRatio = "1:1"
): Promise<string> => {
  const ai = getGenAI();
  const optimizedImage = await optimizeImage(base64Image, 1536, 0.85);
  
  const config: any = {
    imageConfig: {
      aspectRatio: aspectRatio === 'AUTO' ? undefined : aspectRatio
    }
  };

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { mimeType: getMimeType(optimizedImage), data: cleanBase64(optimizedImage) } },
          { text: prompt },
        ],
      },
      config
    });

    const candidate = response.candidates?.[0];
    if (!candidate) throw new Error("errorServer");
    
    const parts = candidate.content?.parts;
    if (!parts || parts.length === 0) throw new Error("errorUnknown");

    for (const part of parts) {
      if (part.inlineData?.data) {
        return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
      }
    }
    
    throw new Error("errorUnknown");
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error.message === "API_KEY_MISSING") throw error;
    throw new Error("errorServer");
  }
};

export const generateFaceSwap = async (
  targetBase64: string,
  sourceBase64: string,
  prompt: string
): Promise<string> => {
  const ai = getGenAI();
  const [optTarget, optSource] = await Promise.all([
      optimizeImage(targetBase64, 1024, 0.8), 
      optimizeImage(sourceBase64, 1024, 0.8)
  ]);

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { mimeType: getMimeType(optTarget), data: cleanBase64(optTarget) } },
          { inlineData: { mimeType: getMimeType(optSource), data: cleanBase64(optSource) } },
          { text: prompt },
        ],
      },
    });

    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData?.data) return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("errorUnknown");
  } catch (error: any) {
    throw error;
  }
};
