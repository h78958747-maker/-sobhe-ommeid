
import { QualityMode, LightingIntensity, ColorGradingStyle, PromptSuggestion } from "./types";

export const DEFAULT_PROMPT = `Cinema Masterpiece, high-end cinematic studio portrait. Extremely detailed and ultra realistic facial features with natural skin pores, fine textures, and authentic identity preservation. Soft and professional editorial photography style, Vogue aesthetic. Focus on high-end commercial finish, sharp eyes, and ethereal atmosphere. Three-dimensional depth, volumetric soft lighting, 8K resolution, hyper-detailed lifelike masterpiece quality.`;

export const QUALITY_MODIFIERS: Record<QualityMode, string> = {
  standard: ", ultra-sharp focus, professional photography",
  high: ", masterpiece quality, photorealistic excellence, extreme texture detail, 8k resolution, high-end high-fashion editorial finish, flawless skin rendering"
};

export const LIGHTING_STYLES: Record<LightingIntensity, string> = {
  soft: "ethereal soft-box lighting, professional beauty glow, wrap-around soft light, minimal harsh shadows, high-end editorial soft-focus atmosphere",
  cinematic: "professional Hollywood cinematic lighting, balanced rim light, volumetric soft fog, high-end studio look, three-dimensional cinematic depth",
  dramatic: "moody chiaroscuro, intense professional studio shadows, dramatic rim lighting, deep cinematic contrast, strong character highlights",
  intense: "vibrant high-contrast studio lights, sharp professional fashion highlights, energetic cinematic glow, sharp high-end editorial look"
};

export const LIGHTING_ICONS: Record<LightingIntensity, string> = {
  soft: "M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.263l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z",
  cinematic: "M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z",
  dramatic: "M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z",
  intense: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
};

export const COLOR_GRADING_STYLES: Record<ColorGradingStyle, string> = {
  none: "natural professional film stock, neutral cinematic color, authentic movie tones, realistic editorial colors",
  warm_vintage: "warm vintage movie grading, sepia highlights, 1970s film look, nostalgic luxury cinema",
  cool_noir: "cool blue cinematic grading, high contrast, moody noir tones, cold professional atmosphere",
  teal_orange: "teal and orange blockbuster color grade, modern high-end cinema aesthetic, vibrant editorial style",
  classic_bw: "high-end black and white cinematography, rich film grain, classic movie style, elegant professional monochrome"
};

export const MODEL_NAME = 'gemini-2.5-flash-image';

export const PROMPT_SUGGESTIONS: PromptSuggestion[] = [
  { 
    id: 'cinema_editorial', 
    labelKey: 'styleFashion', 
    prompt: 'High-end editorial fashion photography, Vogue style, studio masterpiece, luxury lighting, soft skin textures', 
    color: 'from-amber-400 to-yellow-600',
    icon: 'M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z'
  },
  { 
    id: 'cinema_blockbuster', 
    labelKey: 'styleFashion', 
    prompt: 'Hollywood action blockbuster cinema style, dynamic composition, cinematic rim lighting, IMAX quality', 
    color: 'from-orange-500 to-red-600',
    icon: 'M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z'
  },
  { 
    id: 'cinema_glamour', 
    labelKey: 'styleFantasy', 
    prompt: 'Luxury glamour portrait, soft ethereal glow, professional beauty lighting, high-end commercial aesthetic', 
    color: 'from-purple-500 to-indigo-600',
    icon: 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z'
  }
];

export const CINEMATIC_KEYWORDS = ["editorial", "4k", "masterpiece", "studio", "realistic face", "skin pores", "vogue", "soft lighting"];

export const LOADING_MESSAGES = [
  "loadAnalyzing",
  "loadEnhancing",
  "loadLighting",
  "loadColor",
  "loadFinalizing"
];
