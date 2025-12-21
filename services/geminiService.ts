
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

  const systemInstruction = `You are a world-class Cinematic Portrait Director and Visionary Artist.
  GOAL: Transform the input portrait into a high-end masterpiece.
  CRITICAL CONSTRAINTS:
  1. ABSOLUTE IDENTITY: Maintain 100% of the person's identity and exact facial structure from the reference image.
  2. TEXTURE PRECISION: Focus on authentic high-fidelity textures based on the chosen style.
  3. MASTERPIECE QUALITY: Output must be 4K, artistic, and cinematic.
  4. LIGHTING: Use professional studio lighting with realistic falloff.
  ALWAYS prioritize identity preservation above all else.`;

  try {
    const mimeType = getMimeType(base64Image);
    const supportedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif'];
    
    if (!supportedTypes.includes(mimeType)) {
      throw new Error("ERR_FORMAT");
    }

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          { inlineData: { mimeType, data: cleanBase64(base64Image) } },
          { text: `MASTER TASK: Synthesize a high-end masterpiece portrait preserving 100% facial structure. 
          STYLING: ${prompt}` },
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
    if (!candidate || !candidate.content) {
      throw new Error("ERR_ENGINE_FAILURE");
    }
    
    if (candidate.finishReason === 'SAFETY') {
      throw new Error("ERR_SAFETY");
    }

    const parts = candidate.content.parts || [];
    let textRefusal = "";

    // Comprehensive search for image data in all response parts
    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        const data = part.inlineData.data;
        const mType = part.inlineData.mimeType || 'image/png';
        return `data:${mType};base64,${data}`;
      }
      if (part.text) {
        textRefusal += part.text;
      }
    }

    // Handle cases where the model only returns text (refusal or description)
    if (textRefusal.trim().length > 0) {
      const lower = textRefusal.toLowerCase();
      if (lower.includes("safety") || lower.includes("cannot") || lower.includes("unable")) {
        throw new Error("ERR_SAFETY");
      }
      // If it's just a description without an image, it's a failure for our purpose
      throw new Error("ERR_ENGINE_FAILURE");
    }

    throw new Error("ERR_ENGINE_FAILURE");
  } catch (error: any) {
    const errorMsg = error.message?.toUpperCase() || "";
    
    if (errorMsg.includes("SAFETY")) throw new Error("ERR_SAFETY");
    if (errorMsg.includes("RESOURCE_EXHAUSTED") || errorMsg.includes("429")) throw new Error("ERR_QUOTA");
    if (errorMsg.includes("INVALID_ARGUMENT")) throw new Error("ERR_INVALID_REQUEST");
    if (errorMsg.includes("ERR_FORMAT")) throw new Error("ERR_FORMAT");
    
    // Explicitly re-throw our internal errors
    if (["ERR_ENGINE_FAILURE", "ERR_SAFETY", "ERR_FORMAT", "ERR_QUOTA", "ERR_INVALID_REQUEST"].includes(error.message)) {
      throw error;
    }
    
    throw new Error("ERR_GENERIC");
  }
};

export const getPromptSuggestions = async (
  currentPrompt: string,
  imageContext?: string | null,
  adjustments?: ImageAdjustments
): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const systemInstruction = "Analyze the image and request. Return 8 professional cinematic keywords as a JSON array of strings.";

  const parts: any[] = [];
  if (imageContext) {
    parts.push({ inlineData: { mimeType: getMimeType(imageContext), data: cleanBase64(imageContext) } });
  }
  parts.push({ text: `Current Prompt: ${currentPrompt}. Adjustments: ${JSON.stringify(adjustments)}` });

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
  const systemInstruction = "You are a professional Artistic Director helping a user refine their portrait prompts.";

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
