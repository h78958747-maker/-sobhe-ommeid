
import { QualityMode, LightingIntensity, ColorGradingStyle, PromptSuggestion } from "./types";

export const DEFAULT_PROMPT = `Cinematic studio masterpiece, 8k ultra-detailed, professional color grading, anamorphic lens flares, volumetric lighting, high-end cinema camera textures, hyper-realistic skin and fabric, masterpiece composition.`;

export const QUALITY_MODIFIERS: Record<QualityMode, string> = {
  standard: ", sharp focus, cinematic photography",
  high: ", masterpiece cinematic rendering, photorealistic, extreme 8k detail, flawless movie finish, ray-traced reflections"
};

export const LIGHTING_STYLES: Record<LightingIntensity, string> = {
  soft: "ethereal soft cinematic lighting, professional wrap-around light, beauty glow, low contrast",
  cinematic: "Hollywood blockbuster lighting, moody rim light, volumetric cinematic depth, balanced highlights",
  dramatic: "dark cinematic shadows, intense chiaroscuro studio lighting, dramatic character highlights, high contrast",
  intense: "vivid cinematic lighting, sharp high-contrast highlights, electric atmosphere, hard edge light"
};

export const LIGHTING_ICONS: Record<LightingIntensity, string> = {
  soft: "M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.263l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z",
  cinematic: "M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z",
  dramatic: "M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z",
  intense: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z"
};

export const COLOR_ICONS: Record<ColorGradingStyle, string> = {
  none: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  warm_vintage: "M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.263l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636",
  cool_noir: "M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z",
  teal_orange: "M9.53 16.122a3 3 0 00-3.035 3.678 10.47 10.47 0 01-1.99-1.99 3 3 0 003.678-3.035m9.74 9.74a3 3 0 11-4.243 4.242 3 3 0 014.243-4.242z",
  classic_bw: "M12 3v18m9-9H3"
};

export const COLOR_GRADING_STYLES: Record<ColorGradingStyle, string> = {
  none: "natural film colors, professional cinematic color balance",
  warm_vintage: "warm vintage movie grade, nostalgic cinema tones, 35mm film look, sepia undertones",
  cool_noir: "cool blue cinematic grading, high contrast noir, moody film tone, desaturated shadows",
  teal_orange: "classic teal and orange cinematic color grade, blockbuster aesthetic, vibrant complementary tones",
  classic_bw: "elegant black and white cinematography, deep blacks, classic movie grain, silver halide look"
};

export const MODEL_NAME = 'gemini-2.5-flash-image';

export const PROMPT_SUGGESTIONS: PromptSuggestion[] = [
  { 
    id: 'glamour', 
    labelKey: 'GLAMOUR', 
    prompt: 'High-end fashion glamour cinematic style, luxury studio lighting, magazine aesthetic, flawless skin, soft focus background', 
    color: 'from-purple-500 to-studio-violet',
    icon: 'M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z'
  },
  { 
    id: 'blockbuster', 
    labelKey: 'BLOCKBUSTER', 
    prompt: 'Hollywood action blockbuster style, teal and orange color grading, epic lighting, cinematic flare, high dynamic range', 
    color: 'from-orange-500 to-red-600',
    icon: 'M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z'
  },
  { 
    id: 'editorial', 
    labelKey: 'EDITORIAL', 
    prompt: 'Professional editorial cinematic portrait, sharp details, minimalist studio mood, artistic framing, muted tones', 
    color: 'from-studio-neon to-studio-gold',
    icon: 'M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z'
  }
];

export const LOADING_MESSAGES = [
  "loadAnalyzing",
  "loadLighting",
  "loadFinalizing"
];
