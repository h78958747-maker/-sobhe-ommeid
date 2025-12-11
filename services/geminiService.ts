
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

/**
 * Sends an image and a text prompt to Gemini to generate an edited/transformed version.
 */
export const generateEditedImage = async (
  base64Image: string,
  prompt: string,
  aspectRatio: AspectRatio = "1:1"
): Promise<string> => {
  const ai = getGenAI();

  // Remove data URL prefix if present (e.g., "data:image/png;base64,")
  const cleanBase64 = base64Image.split(',')[1] || base64Image;
  
  // Determine mime type roughly or default to png, though the API is flexible.
  let mimeType = 'image/jpeg';
  const match = base64Image.match(/^data:(.*);base64,/);
  if (match && match[1]) {
    mimeType = match[1];
  }

  // Handle AUTO aspect ratio: The API does not support 'AUTO'.
  // We default to undefined (letting API use its default, usually 1:1) or pass the explicit ratio.
  const apiAspectRatio = aspectRatio === 'AUTO' ? undefined : aspectRatio;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType,
              data: cleanBase64,
            },
          },
          {
            text: prompt,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: apiAspectRatio,
        }
      }
    });

    const candidate = response.candidates?.[0];

    if (!candidate) {
       throw new Error("No candidates returned from the model. The service might be temporarily unavailable.");
    }

    // Check for safety finish reason
    if (candidate.finishReason === "SAFETY") {
      throw new Error("Generation was blocked due to safety settings. The model detected potential policy violations in the image or prompt.");
    }

    // Check for OTHER/IMAGE_OTHER which is common for person generation refusals
    if (candidate.finishReason === "IMAGE_OTHER" || candidate.finishReason === "OTHER") {
         throw new Error("The AI model refused to process this request (Finish Reason: IMAGE_OTHER). This usually happens when the prompt explicitly asks to 'preserve identity' or 'likeness'. Please try removing phrases like 'exact likeness' from your prompt and focus on the visual style instead.");
    }

    const parts = candidate.content?.parts;
    
    // Sometimes the model refuses by returning text instead of an image, or returns nothing if completely blocked.
    if (!parts || parts.length === 0) {
       throw new Error(`The model returned no content. Finish reason: ${candidate.finishReason || 'Unknown'}`);
    }

    // 1. Prioritize finding an image in the parts
    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        return `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
      }
    }

    // 2. If no image found, check for text (which usually contains the refusal explanation)
    for (const part of parts) {
      if (part.text) {
        throw new Error(`Model Refusal: ${part.text}`);
      }
    }

    // 3. Fallback if parts exist but contain neither valid image nor text
    throw new Error("No image data found in the response.");

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    // If it's one of our specific errors, throw it as is.
    if (error.message && (error.message.includes("Model Refusal") || error.message.includes("Finish Reason") || error.message.includes("safety"))) {
        throw error;
    }
    // Return a clean error message to the UI
    throw new Error(error.message || "Failed to generate image.");
  }
};