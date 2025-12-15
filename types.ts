

export interface GeneratedImageResult {
  imageUrl: string;
  timestamp: number;
}

export interface ProcessingState {
  isLoading: boolean;
  error: string | null;
}

export type AspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9' | '21:9' | 'AUTO';

export type QualityMode = 'standard' | 'high';

export type LightingIntensity = 'soft' | 'cinematic' | 'dramatic' | 'intense';

export type ColorGradingStyle = 'none' | 'warm_vintage' | 'cool_noir' | 'teal_orange' | 'classic_bw';

export type AppMode = 'portrait' | 'faceswap';

export interface HistoryItem {
  id: string;
  imageUrl: string;
  prompt: string;
  aspectRatio: AspectRatio;
  timestamp: number;
  // Restore state
  skinTexture?: boolean;
  faceDetail?: number;
  creativityLevel?: number;
  lighting?: LightingIntensity;
  colorGrading?: ColorGradingStyle;
  mode?: AppMode;
}

export type Language = 'en' | 'fa';
export type Theme = 'light' | 'dark';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface SavedPrompt {
  id: string;
  name: string;
  text: string;
}

export interface PromptSuggestion {
  id: string;
  labelKey: string;
  prompt: string;
  color: string;
  icon: string;
}

export interface BatchItem {
  id: string;
  original: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  result?: string;
}

export interface ImageAdjustments {
  brightness: number; // 0-200, default 100
  contrast: number;   // 0-200, default 100
  saturation: number; // 0-200, default 100
  sepia: number;      // 0-100, default 0
  blur: number;       // 0-10, default 0
}

declare global {
  interface AIStudio {
    hasSelectedApiKey: () => Promise<boolean>;
    openSelectKey: () => Promise<void>;
  }
  interface Window {
    aistudio?: AIStudio;
  }
}