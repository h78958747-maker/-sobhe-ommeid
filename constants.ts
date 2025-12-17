
import { QualityMode, LightingIntensity, ColorGradingStyle, PromptSuggestion } from "./types";

export const DEFAULT_PROMPT = `Cinema style masterpiece. Cinematic lighting, ultra-realistic textures, professional movie set aesthetic, shallow depth of field, anamorphic lens flares, high dynamic range, stunning atmosphere, extremely detailed portrait, high-end Hollywood production quality.`;

export const QUALITY_MODIFIERS: Record<QualityMode, string> = {
  standard: "",
  high: ", 8k resolution, photorealistic, intricate details, sharp focus, masterpiece quality"
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
    id: 'noir', 
    labelKey: 'styleNoir', 
    prompt: 'film noir style, 1940s Hollywood cinema, dramatic shadows, intense monochrome, smoke and mystery', 
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
  { 
    id: 'fantasy', 
    labelKey: 'styleFantasy', 
    prompt: 'high fantasy cinematic epic, Lord of the Rings aesthetic, ethereal golden lighting, majestic atmosphere, hyper-detailed fantasy costume', 
    color: 'from-purple-500 to-indigo-500',
    icon: 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z'
  },
  { 
    id: 'vintage', 
    labelKey: 'styleVintage', 
    prompt: 'Classic 35mm film cinema style, authentic film grain, slightly muted colors, nostalgic 70s movie aesthetic, soft lens blur', 
    color: 'from-orange-700 to-yellow-600',
    icon: 'M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z'
  },
  { 
    id: 'fashion', 
    labelKey: 'styleFashion', 
    prompt: 'fashion cinema, Vogue style lighting, high-end professional studio production, minimalist luxury, sharp micro-details', 
    color: 'from-red-600 to-rose-500',
    icon: 'M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.077-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a16.001 16.001 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42'
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
