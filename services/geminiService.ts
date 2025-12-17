
import { GoogleGenAI } from "@google/genai";
import { MODEL_NAME } from "../constants";
import { AspectRatio } from "../types";

const getGenAI = () => {
  // Use environment variable if available (for Vercel), otherwise use the provided hardcoded key
  const apiKey = process.env.API_KEY || "vck_3xFHk7YyVDukZURnZSxk2xn9ofxXBv8QjJDv4VKpiTOpGUjjjl0C6BBW";

  if (!apiKey) {
    console.error("API_KEY_MISSING: Please ensure an API Key is provided.");
    throw new Error("errorApiKeyMissing"); 
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
  const imageConfig: any = {};
  if (aspectRatio !== 'AUTO') {
      imageConfig.aspectRatio = aspectRatio;
  }

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          { inlineData: { mimeType: getMimeType(optimizedImage), data: cleanBase64(optimizedImage) } },
          { text: prompt },
        ],
      },
      config: { imageConfig }
    });
    return handleResponse(response);
  } catch (error: any) {
    handleError(error);
    return "";
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
      model: MODEL_NAME,
      contents: {
        parts: [
          { inlineData: { mimeType: getMimeType(optTarget), data: cleanBase64(optTarget) } },
          { inlineData: { mimeType: getMimeType(optSource), data: cleanBase64(optSource) } },
          { text: prompt },
        ],
      },
      config: {} 
    });
    return handleResponse(response);
  } catch (error: any) {
    handleError(error);
    return "";
  }
};

const handleResponse = (response: any): string => {
    const candidate = response.candidates?.[0];
    if (!candidate) throw new Error("errorServer");
    if (candidate.finishReason === "SAFETY") throw new Error("errorSafety");
    if (candidate.finishReason === "IMAGE_OTHER" || candidate.finishReason === "OTHER") throw new Error("errorRefusal");
    const parts = candidate.content?.parts;
    if (!parts || parts.length === 0) throw new Error("errorUnknown");
    for (const part of parts) {
      if (part.inlineData?.data) return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
    }
    for (const part of parts) {
      if (part.text) throw new Error("errorRefusal");
    }
    throw new Error("errorUnknown");
};

const handleError = (error: any) => {
    const msg = error.message || "";
    if (msg.startsWith("error")) throw error;
    if (msg.includes("429") || msg.includes("Quota")) throw new Error("errorQuota");
    if (msg.includes("503") || msg.includes("500")) throw new Error("errorServer");
    if (msg.includes("fetch") || msg.includes("network")) throw new Error("errorNetwork");
    throw new Error("errorUnknown");
}
