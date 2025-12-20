
import { GoogleGenAI, Type } from "@google/genai";
import { MODEL_NAME } from "../constants";
import { AspectRatio, ImageAdjustments, ChatMessage } from "../types";

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

export const generateEditedImage = async (
  base64Image: string,
  prompt: string,
  aspectRatio: AspectRatio = "1:1",
  dimensions?: { width: number, height: number }
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  let finalRatio: any = aspectRatio;
  if (aspectRatio === 'AUTO' && dimensions) {
    finalRatio = getClosestAspectRatio(dimensions.width, dimensions.height);
  } else if (aspectRatio === 'AUTO') {
    finalRatio = '1:1';
  }

  // Strengthened instruction to ensure image output
  const systemInstruction = "You are an expert cinematic image synthesizer. Your sole purpose is to transform input images into cinematic masterpieces. You MUST always output a new image part. Do not engage in conversation or provide text-only refusals unless the content is strictly prohibited by safety filters.";

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          { inlineData: { mimeType: getMimeType(base64Image), data: cleanBase64(base64Image) } },
          { text: `TASK: Transform this image into a cinematic masterpiece. REQUIREMENTS: ${prompt}` },
        ],
      },
      config: {
        systemInstruction,
        imageConfig: {
          aspectRatio: finalRatio
        }
      }
    });

    const candidate = response.candidates?.[0];
    if (!candidate) {
      throw new Error("ERR_NO_CANDIDATE");
    }
    
    if (candidate.finishReason === 'SAFETY') {
      throw new Error("ERR_SAFETY");
    }

    const parts = candidate.content?.parts || [];
    let textRefusal = "";

    // Iterate through all parts to find the image
    for (const part of parts) {
      if (part.inlineData?.data) {
        return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
      }
      if (part.text) {
        textRefusal += part.text;
      }
    }

    // Handle cases where the model only returns text
    if (textRefusal.length > 0) {
      throw new Error(textRefusal);
    }

    throw new Error("The creative engine failed to synthesize a valid frame. Please try a simpler prompt or a clearer source image.");
  } catch (error: any) {
    if (error.message?.toUpperCase().includes("SAFETY")) {
      throw new Error("ERR_SAFETY");
    }
    throw error;
  }
};

export const getPromptSuggestions = async (
  currentPrompt: string,
  imageContext?: string | null,
  adjustments?: ImageAdjustments
): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const systemInstruction = "Analyze the image and prompt. Return exactly 8 cinematic keywords as a JSON array of strings.";

  const parts: any[] = [];
  if (imageContext) {
    parts.push({ inlineData: { mimeType: getMimeType(imageContext), data: cleanBase64(imageContext) } });
  }
  parts.push({ text: `Current Prompt: ${currentPrompt}. Technical Context: ${JSON.stringify(adjustments)}` });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
        },
      },
    });

    const parsed = JSON.parse(response.text || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
};

export const sendChatMessage = async (
  history: ChatMessage[],
  newMessage: string,
  imageContext?: string | null
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const systemInstruction = "You are a professional Cinematic Director. Help the user refine their artistic vision. Keep responses concise and creative.";

  const parts: any[] = [];
  if (imageContext) {
    parts.push({ inlineData: { mimeType: getMimeType(imageContext), data: cleanBase64(imageContext) } });
  }
  parts.push({ text: newMessage });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        ...history.map(m => ({ role: m.role, parts: [{ text: m.text }] })),
        { role: 'user', parts }
      ],
      config: { systemInstruction }
    });

    return response.text || "Connection lost.";
  } catch (error) {
    return "Error communicating with the director.";
  }
};
