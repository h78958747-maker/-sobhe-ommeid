

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
const optimizeImage = (base64Str: string, maxWidth = 1536): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      let width = img.width;
      let height = img.height;
      
      // Calculate new dimensions if image is too large
      // 1536px is a good balance for high quality (approx 2MP) without hitting typical 10MB+ payload limits
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

      ctx.drawImage(img, 0, 0, width, height);
      // Convert to JPEG with 0.90 quality - significantly smaller than PNG
      resolve(canvas.toDataURL('image/jpeg', 0.90));
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
  const optimizedImage = await optimizeImage(base64Image);

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
    console.error("Gemini API Error:", error);
    if (error.message && (error.message.includes("Model Refusal") || error.message.includes("Finish Reason") || error.message.includes("safety"))) {
        throw error;
    }
    throw new Error(error.message || "Failed to generate image.");
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
  // We use slightly lower max resolution for face swap inputs to ensure the combined payload stays safe.
  const [optTarget, optSource] = await Promise.all([
      optimizeImage(targetBase64, 1280), 
      optimizeImage(sourceBase64, 1280)
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
    console.error("Gemini Face Swap Error:", error);
    throw new Error(error.message || "Failed to swap faces.");
  }
};

const handleResponse = (response: any): string => {
    const candidate = response.candidates?.[0];

    if (!candidate) {
       throw new Error("No candidates returned from the model. The service might be temporarily unavailable.");
    }

    if (candidate.finishReason === "SAFETY") {
      throw new Error("Generation was blocked due to safety settings. The model detected potential policy violations.");
    }

    if (candidate.finishReason === "IMAGE_OTHER" || candidate.finishReason === "OTHER") {
         throw new Error("The AI model refused to process this request (Refusal). Please modify your prompt or images.");
    }

    const parts = candidate.content?.parts;
    
    if (!parts || parts.length === 0) {
       throw new Error(`The model returned no content. Finish reason: ${candidate.finishReason || 'Unknown'}`);
    }

    // 1. Prioritize finding an image in the parts
    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
      }
    }

    // 2. If no image found, check for text
    for (const part of parts) {
      if (part.text) {
        throw new Error(`Model Refusal: ${part.text}`);
      }
    }

    throw new Error("No image data found in the response.");
};