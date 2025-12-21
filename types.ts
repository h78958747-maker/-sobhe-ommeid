
export interface GeneratedImageResult {
  imageUrl: string;
  timestamp: number;
}

export interface ProcessingState {
  isLoading: boolean;
  statusText: string;
  error: string | null;
  progress?: number; // 0-100
  batchTotal?: number;
  batchCurrent?: number;
  currentStageKey?: string;
}

export type AspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9' | 'AUTO';

export type QualityMode = 'standard' | 'high';

export type LightingIntensity = 'soft' | 'cinematic' | 'dramatic' | 'intense';

export type ColorGradingStyle = 'none' | 'warm_vintage' | 'cool_noir' | 'teal_orange' | 'classic_bw';

export type AppMode = 'portrait' | 'faceswap' | 'batch';

export interface HistoryItem {
  id: string;
  imageUrl: string;
  prompt: string;
  description?: string;
  aspectRatio: AspectRatio;
  timestamp: number;
  mode?: AppMode;
  lighting?: LightingIntensity;
  colorGrading?: ColorGradingStyle;
}

export type Language = 'en' | 'fa';
export type Theme = 'light' | 'dark';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

export interface BatchItem {
  id: string;
  original: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  result?: string;
  error?: string;
}

export interface ImageAdjustments {
  brightness: number;
  contrast: number;
  saturation: number;
  sepia: number;
  blur: number;
}

export interface PromptSuggestion {
  id: string;
  labelKey: string;
  prompt: string;
  color: string;
  icon: string;
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