
import { QualityMode, LightingIntensity, ColorGradingStyle, PromptSuggestion } from "./types";

export const DEFAULT_PROMPT = `Cinema style masterpiece. Cinematic lighting, ultra-realistic textures, professional movie set aesthetic, shallow depth of field, anamorphic lens flares, high dynamic range, stunning atmosphere, extremely detailed portrait, high-end Hollywood production quality, 8k resolution.`;

export const QUALITY_MODIFIERS: Record<QualityMode, string> = {
  standard: "",
  high: ", photorealistic, intricate details, sharp focus, masterpiece quality"
};

export const LIGHTING_STYLES: Record<LightingIntensity, string> = {
  soft: "diffused studio lighting, soft glow, gentle rim light",
  cinematic: "dramatic Hollywood cinematic lighting, volumetric fog, three-point lighting setup",
  dramatic: "high-contrast chiaroscuro lighting, deep mysterious shadows, moody noir lighting",
  intense: "vibrant backlight, high intensity dramatic studio lights, sharp highlights"
};

export const LIGHTING_ICONS: Record<LightingIntensity, string> = {
  soft: "M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.263l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z",
  cinematic: "M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z",
  dramatic: "M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z",
  intense: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
};

export const COLOR_GRADING_STYLES: Record<ColorGradingStyle, string> = {
  none: "",
  warm_vintage: "warm cinematic grading, golden hour tones, retro film look",
  cool_noir: "cool blue cinematic grading, high contrast, moody film noir tones",
  teal_orange: "classic teal and orange hollywood color grading, high saturation contrast",
  classic_bw: "masterpiece black and white cinematic photography, rich silver tones, timeless movie look"
};

export const MODEL_NAME = 'gemini-2.5-flash-image';

export const PROMPT_SUGGESTIONS: PromptSuggestion[] = [
  { 
    id: 'cinema_standard', 
    labelKey: 'styleNoir', 
    prompt: 'Cinema style, blockbuster movie aesthetic, high-end cinematography, dramatic lighting', 
    color: 'from-gray-900 to-black',
    icon: 'M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918'
  },
  { 
    id: 'cyberpunk', 
    labelKey: 'styleCyberpunk', 
    prompt: 'Blade Runner 2049 cinema style, neon lights, foggy futuristic night, rainy cinematic reflections, teal and pink highlights', 
    color: 'from-pink-600 to-blue-600',
    icon: 'M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z'
  },
];

export const CINEMATIC_KEYWORDS = [
  "anamorphic", "bokeh", "panavision", "hollywood", "technicolor", "imax", "35mm film",
  "rim lighting", "lens flare", "dynamic range", "studio quality", "color grade",
  "8k resolution", "hyper-realistic", "masterpiece", "cinematography"
];

export const LOADING_MESSAGES = [
  "loadAnalyzing",
  "loadEnhancing",
  "loadLighting",
  "loadColor",
  "loadFinalizing"
];
