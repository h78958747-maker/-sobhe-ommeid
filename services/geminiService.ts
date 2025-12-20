
import { GoogleGenAI, Type } from "@google/genai";
import { MODEL_NAME } from "../constants";
import { AspectRatio, ImageAdjustments } from "../types";

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

const getClosestAspectRatio = (width: number, height: number): AspectRatio => {
  const ratio = width / height;
  const supported: { label: AspectRatio, value: number }[] = [
    { label: '1:1', value: 1 },
    { label: '3:4', value: 3/4 },
    { label: '4:3', value: 4/3 },
    { label: '9:16', value: 9/16 },
    { label: '16:9', value: 16/9 },
  ];
  
  let closest = supported[0];
  let minDiff = Math.abs(ratio - closest.value);
  
  for (const s of supported) {
    const diff = Math.abs(ratio - s.value);
    if (diff < minDiff) {
      minDiff = diff;
      closest = s;
    }
  }
  return closest.label;
};

export const analyzeImage = async (base64Image: string): Promise<string> => {
  const ai = getGenAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: getMimeType(base64Image), data: cleanBase64(base64Image) } },
          { text: "Describe this image in detail focusing on the main subject, setting, and lighting for a cinematic transformation prompt. Keep it concise (max 30 words)." },
        ],
      },
    });
    return response.text || "";
  } catch (error) {
    console.error("Analysis Error:", error);
    return "";
  }
};

export const getPromptSuggestions = async (
  currentPrompt: string, 
  base64Image?: string | null,
  adjustments?: ImageAdjustments
): Promise<string[]> => {
  const ai = getGenAI();
  try {
    let adjustmentContext = "";
    if (adjustments) {
      adjustmentContext = `The user has manually adjusted the image with: 
      Brightness: ${adjustments.brightness}%, 
      Contrast: ${adjustments.contrast}%, 
      Saturation: ${adjustments.saturation}%, 
      Sepia: ${adjustments.sepia}%, 
      Blur: ${adjustments.blur}px.`;
    }

    const parts: any[] = [
      { text: `Act as a world-class senior cinematographer and AI prompt engineer. 
      Based on the current prompt: "${currentPrompt}" ${adjustmentContext ? `and these visual edits: ${adjustmentContext}` : ""}, 
      suggest 8 professional cinematic keywords or short phrases that would enhance the visual quality, realism, and artistic impact.
      
      If adjustments are provided, try to suggest terms that mirror the intent (e.g., if saturation is high, suggest "vibrant", "technicolor", "neon").
      If an image is provided, analyze its content to ensure suggestions are relevant (e.g., if it's a forest, suggest "volumetric forest light", "mossy textures").
      
      Return ONLY a JSON array of strings.` }
    ];
    
    if (base64Image) {
      parts.push({ inlineData: { mimeType: getMimeType(base64Image), data: cleanBase64(base64Image) } });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });

    const text = response.text || "[]";
    return JSON.parse(text);
  } catch (error) {
    console.error("Suggestion Error:", error);
    return ["Anamorphic", "Moody Lighting", "8k Resolution", "Hyper-realistic", "Cinematic"];
  }
};

const handleGenAIError = (error: any) => {
  const message = error.message || "";
  console.error("GenAI Detailed Error:", error);

  if (message.includes("429") || message.toLowerCase().includes("quota") || message.toLowerCase().includes("rate limit")) {
    return "ERR_RATE_LIMIT";
  }
  if (message.includes("403") || message.toLowerCase().includes("permission") || message.toLowerCase().includes("api key")) {
    return "ERR_AUTH";
  }
  if (message.toLowerCase().includes("safety") || message.toLowerCase().includes("blocked")) {
    return "ERR_SAFETY";
  }
  return "ERR_GENERIC";
};

export const generateEditedImage = async (
  base64Image: string,
  prompt: string,
  aspectRatio: AspectRatio = "1:1",
  dimensions?: { width: number, height: number }
): Promise<string> => {
  const ai = getGenAI();
  
  let finalRatio: any = aspectRatio;
  if (aspectRatio === 'AUTO' && dimensions) {
    finalRatio = getClosestAspectRatio(dimensions.width, dimensions.height);
  } else if (aspectRatio === 'AUTO') {
    finalRatio = '1:1';
  }

  const config: any = {
    imageConfig: {
      aspectRatio: finalRatio
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

    const candidate = response.candidates?.[0];
    
    if (!candidate) {
      throw new Error("No candidates returned.");
    }

    if (candidate.finishReason === 'SAFETY') {
      throw new Error("SAFETY_BLOCKED");
    }

    const parts = candidate.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData?.data) {
          return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        }
      }
    }
    
    throw new Error("No image data in response.");
  } catch (error: any) {
    if (error.message === "SAFETY_BLOCKED") throw new Error("ERR_SAFETY");
    throw new Error(handleGenAIError(error));
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

    const candidate = response.candidates?.[0];
    if (!candidate) throw new Error("No response from model.");
    
    if (candidate.finishReason === 'SAFETY') {
      throw new Error("SAFETY_BLOCKED");
    }

    const parts = candidate.content?.parts;
    if (parts) {
      for (const part of parts) {
        if (part.inlineData?.data) return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image data in response.");
  } catch (error: any) {
    if (error.message === "SAFETY_BLOCKED") throw new Error("ERR_SAFETY");
    throw new Error(handleGenAIError(error));
  }
};
