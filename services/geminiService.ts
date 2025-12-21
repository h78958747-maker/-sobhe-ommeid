
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
  GOAL: Transform the input portrait into a high-end masterpiece, whether it's ultra-photorealistic or a professional digital painting.
  CRITICAL CONSTRAINTS:
  1. ABSOLUTE IDENTITY: Maintain 100% of the person's identity, exact likeness, and facial structure from the reference image.
  2. TEXTURE PRECISION: Focus on authentic textures—if photorealistic, show skin pores and hair strands. If painted, show smooth airbrushed skin and painterly defined hair strands as requested.
  3. MASTERPIECE QUALITY: Every output must be 4K, noise-free, and artistic in its specific style.
  4. LIGHTING: Use professional studio-grade lighting with realistic falloff and shadows.
  5. SAFETY: Strictly adhere to safety guidelines; if an image cannot be generated, provide a concise explanation.
  ALWAYS prioritize the person's identity and the specific style request in the user prompt.`;

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
          { text: `MASTER TASK: Synthesize a high-end masterpiece portrait based on the reference. 
          REQUIREMENTS: Preserving the person's exact identity and facial structure with extreme accuracy. 
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
    if (!candidate) {
      throw new Error("ERR_ENGINE_FAILURE");
    }
    
    if (candidate.finishReason === 'SAFETY') {
      throw new Error("ERR_SAFETY");
    }

    const parts = candidate.content?.parts || [];
    let textRefusal = "";

    // Iterate through all parts to find the image part
    for (const part of parts) {
      if (part.inlineData?.data) {
        return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
      }
      if (part.text) {
        textRefusal += part.text;
      }
    }

    // If no image part was found, check if there's a textual refusal
    if (textRefusal.trim().length > 0) {
      const lowerText = textRefusal.toLowerCase();
      if (lowerText.includes("safety") || lowerText.includes("cannot generate") || lowerText.includes("unable to")) {
        throw new Error("ERR_SAFETY");
      }
      throw new Error(textRefusal);
    }

    throw new Error("ERR_ENGINE_FAILURE");
  } catch (error: any) {
    const errorMsg = error.message?.toUpperCase() || "";
    
    if (errorMsg.includes("SAFETY")) throw new Error("ERR_SAFETY");
    if (errorMsg.includes("RESOURCE_EXHAUSTED") || errorMsg.includes("429")) throw new Error("ERR_QUOTA");
    if (errorMsg.includes("INVALID_ARGUMENT")) throw new Error("ERR_INVALID_REQUEST");
    if (errorMsg.includes("ERR_FORMAT")) throw new Error("ERR_FORMAT");
    if (errorMsg.includes("ERR_ENGINE_FAILURE")) throw new Error("ERR_ENGINE_FAILURE");
    
    // Catch-all for other API errors
    throw new Error("ERR_GENERIC");
  }
};

export const getPromptSuggestions = async (
  currentPrompt: string,
  imageContext?: string | null,
  adjustments?: ImageAdjustments
): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const systemInstruction = "Analyze the image and request for cinematic enhancement. Return exactly 8 high-end professional photography or artistic keywords focusing on textures and mood (e.g., 'digital airbrushing', 'anamorphic bokeh', 'hyper-realistic skin pores', 'painterly hair strands') as a JSON array of strings.";

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
  const systemInstruction = "You are a professional Artistic Director helping a user refine their portrait prompts for maximum quality. Focus on technical terms like lighting, depth of field, and textures—whether photorealistic or painterly.";

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
