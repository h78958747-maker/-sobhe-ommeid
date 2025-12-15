

import { GoogleGenAI } from "@google/genai";
import { MODEL_NAME } from "../constants";
import { AspectRatio } from "../types";

let genAI: GoogleGenAI | null = null;

const getGenAI = () => {
  // Always create a new instance if the API key might have changed (e.g. via window.aistudio selection)
  // or if it hasn't been initialized.
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY environment variable is not set");
  }
  return new GoogleGenAI({ apiKey });
};

const cleanBase64 = (b64: string) => b64.split(',')[1] || b64;
const getMimeType = (b64: string) => {
  const match = b64.match(/^data:(.*);base64,/);
  return match && match[1] ? match[1] : 'image/jpeg';
};

/**
 * Optimizes an image by resizing it to a safe maximum dimension and converting to JPEG.
 * This prevents payload size limits and timeouts (XHR Error Code 6).
 */
const optimizeImage = (base64Str: string, maxWidth = 1536, quality = 0.9): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      
      // Calculate new dimensions if image is too large
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
      
      if (!ctx) {
        resolve(base64Str); // Fallback
        return;
      }

      // Draw with white background to handle transparency if converting to JPEG
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      
      // Convert to JPEG with specified quality
      resolve(canvas.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => {
      console.warn("Failed to optimize image, using original.");
      resolve(base64Str);
    };
    img.src = base64Str;
  });
};

/**
 * Sends an image and a text prompt to Gemini to generate an edited/transformed version.
 */
export const generateEditedImage = async (
  base64Image: string,
  prompt: string,
  aspectRatio: AspectRatio = "1:1"
): Promise<string> => {
  const ai = getGenAI();
  
  // Optimize input image to prevent XHR errors
  // 1536px @ 0.85 quality is a good balance
  const optimizedImage = await optimizeImage(base64Image, 1536, 0.85);

  // Handle AUTO aspect ratio
  const imageConfig: any = {};
  if (aspectRatio !== 'AUTO') {
      imageConfig.aspectRatio = aspectRatio;
  }

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: getMimeType(optimizedImage),
              data: cleanBase64(optimizedImage),
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        imageConfig: imageConfig
      }
    });

    return handleResponse(response);

  } catch (error: any) {
    handleError(error);
    return ""; // Unreachable due to throw, but satisfies TS
  }
};

/**
 * Performs a face swap by sending two images:
 * 1. Target Image (Body/Background)
 * 2. Source Image (Face)
 * And a text prompt instructing the swap.
 */
export const generateFaceSwap = async (
  targetBase64: string,
  sourceBase64: string,
  prompt: string
): Promise<string> => {
  const ai = getGenAI();

  // Optimize both images.
  // We use stricter limits (1024px, 0.8 quality) for face swap because sending 2 images
  // doubles the payload size, which is the primary cause of "RPC failed due to xhr error".
  const [optTarget, optSource] = await Promise.all([
      optimizeImage(targetBase64, 1024, 0.8), 
      optimizeImage(sourceBase64, 1024, 0.8)
  ]);

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: getMimeType(optTarget),
              data: cleanBase64(optTarget),
            },
          },
          {
            inlineData: {
              mimeType: getMimeType(optSource),
              data: cleanBase64(optSource),
            },
          },
          {
            text: prompt,
          },
        ],
      },
      // Face swap generally preserves the aspect ratio of the target.
      config: {} 
    });

    return handleResponse(response);

  } catch (error: any) {
    handleError(error);
    return ""; // Unreachable
  }
};

const handleResponse = (response: any): string => {
    const candidate = response.candidates?.[0];

    if (!candidate) {
       throw new Error("errorServer");
    }

    if (candidate.finishReason === "SAFETY") {
      throw new Error("errorSafety");
    }

    if (candidate.finishReason === "IMAGE_OTHER" || candidate.finishReason === "OTHER") {
         throw new Error("errorRefusal");
    }

    const parts = candidate.content?.parts;
    
    if (!parts || parts.length === 0) {
       // If finishReason exists but no parts, mapped to refusal or server error based on context
       throw new Error("errorUnknown");
    }

    // 1. Prioritize finding an image in the parts
    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
      }
    }

    // 2. If no image found, check for text (usually refusal explanation)
    for (const part of parts) {
      if (part.text) {
        throw new Error("errorRefusal");
      }
    }

    throw new Error("errorUnknown");
};

const handleError = (error: any) => {
    console.error("Gemini Service Error:", error);
    
    const msg = error.message || "";

    // Check for specific error keys already thrown by handleResponse
    if (msg.startsWith("error")) {
        throw error; // Re-throw localized keys
    }

    // Check for Network/API errors
    if (msg.includes("429") || msg.includes("Quota") || msg.includes("quota")) {
        throw new Error("errorQuota");
    }
    if (msg.includes("503") || msg.includes("500") || msg.includes("Overloaded")) {
        throw new Error("errorServer");
    }
    if (msg.includes("fetch") || msg.includes("network") || msg.includes("Failed to fetch")) {
        throw new Error("errorNetwork");
    }
    if (msg.includes("Safety") || msg.includes("blocked")) {
        throw new Error("errorSafety");
    }

    // Fallback
    throw new Error("errorUnknown");
}