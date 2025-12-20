
import { GoogleGenAI, Type } from "@google/genai";
import { MODEL_NAME } from "../constants";
import { AspectRatio, ImageAdjustments, ChatMessage } from "../types";

// Helper to clean base64 string
const cleanBase64 = (b64: string) => b64.split(',')[1] || b64;

// Helper to get mime type from base64
const getMimeType = (b64: string) => {
  const match = b64.match(/^data:(.*);base64,/);
  return match && match[1] ? match[1] : 'image/jpeg';
};

// Helper to find closest supported aspect ratio for AUTO mode
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

/**
 * Generates an edited image using Gemini models.
 */
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
    if (!candidate) throw new Error("No candidates returned.");
    if (candidate.finishReason === 'SAFETY') throw new Error("ERR_SAFETY");

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
    if (error.message?.includes("SAFETY")) throw new Error("ERR_SAFETY");
    throw error;
  }
};

/**
 * Generates AI suggestions for image prompt keywords based on current context.
 */
export const getPromptSuggestions = async (
  currentPrompt: string,
  imageContext?: string | null,
  adjustments?: ImageAdjustments
): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const parts: any[] = [
    { text: "Analyze the current cinematic prompt and studio adjustments. Suggest 8 hyper-relevant, creative keywords (max 3 words each) that enhance finer textures, subtle lighting nuances, or artistic mood. If adjustments show high contrast, suggest keywords like 'Chiaroscuro' or 'Noir'. If high saturation, suggest 'Vibrant' or 'Technicolor'. Return only a JSON array of strings." }
  ];

  if (currentPrompt) {
    parts.push({ text: `User's Current Textual Brief: ${currentPrompt}` });
  }

  if (adjustments) {
    parts.push({ text: `Current Manual Visual Calibration: ${JSON.stringify(adjustments)}` });
  }

  if (imageContext) {
    parts.push({
      inlineData: {
        mimeType: getMimeType(imageContext),
        data: cleanBase64(imageContext)
      }
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: { parts },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
          },
        },
      },
    });

    const text = response.text;
    if (!text) return [];
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error("Error generating suggestions:", error);
    return [];
  }
};

/**
 * Conversational AI assistant for refining cinematic goals.
 */
export const sendChatMessage = async (
  history: ChatMessage[],
  newMessage: string,
  imageContext?: string | null
): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const systemInstruction = `You are a professional Cinematic Director and Master Prompt Engineer for "Cinematic AI Studio Pro". 
  Your goal is to help users translate their artistic vision into highly detailed, texture-rich prompts. 
  Focus on lighting (volumetric, rim, rembrandt), textures (skin pores, fabric weave), and mood (ethereal, gritty, glamorous). 
  Analyze any provided image context to suggest identity-preserving enhancements. 
  Keep responses concise, artistic, and encouraging.`;

  const parts: any[] = [];
  if (imageContext) {
    parts.push({
      inlineData: {
        mimeType: getMimeType(imageContext),
        data: cleanBase64(imageContext)
      }
    });
  }
  parts.push({ text: newMessage });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        ...history.map(m => ({ 
          role: m.role, 
          parts: [{ text: m.text }] 
        })),
        { role: 'user', parts }
      ],
      config: { systemInstruction }
    });

    return response.text || "I'm sorry, I couldn't synthesize a response at this moment.";
  } catch (error) {
    console.error("Chat Error:", error);
    return "The creative link was interrupted. Please try rephrasing your goal.";
  }
};
