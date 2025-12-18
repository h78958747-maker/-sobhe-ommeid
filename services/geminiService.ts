
import { GoogleGenAI } from "@google/genai";
import { MODEL_NAME } from "../constants";
import { AspectRatio } from "../types";

const getGenAI = () => {
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

export const generateEditedImage = async (
  base64Image: string,
  prompt: string,
  aspectRatio: AspectRatio = "1:1"
): Promise<string> => {
  const ai = getGenAI();
  
  const config: any = {
    imageConfig: {
      aspectRatio: aspectRatio === 'AUTO' ? "1:1" : aspectRatio,
      imageSize: "1K"
    }
  };

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          { inlineData: { mimeType: getMimeType(base64Image), data: cleanBase64(base64Image) } },
          { text: prompt },
        ],
      },
      config
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData?.data) {
          return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("errorUnknown");
  } catch (error: any) {
    console.error("Gemini Error:", error);
    if (error.message?.includes("entity was not found") || error.message?.includes("API_KEY_MISSING")) {
      throw new Error("API_KEY_MISSING");
    }
    throw new Error("errorServer");
  }
};

export const generateFaceSwap = async (
  targetBase64: string,
  sourceBase64: string,
  prompt: string
): Promise<string> => {
  const ai = getGenAI();
  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          { inlineData: { mimeType: getMimeType(targetBase64), data: cleanBase64(targetBase64) } },
          { inlineData: { mimeType: getMimeType(sourceBase64), data: cleanBase64(sourceBase64) } },
          { text: prompt },
        ],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData?.data) return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("errorUnknown");
  } catch (error: any) {
    if (error.message?.includes("entity was not found") || error.message?.includes("API_KEY_MISSING")) {
      throw new Error("API_KEY_MISSING");
    }
    throw error;
  }
};
