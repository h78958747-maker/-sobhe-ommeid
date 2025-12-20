
import React, { useState } from 'react';
import { getPromptSuggestions } from '../services/geminiService';
import { Language, ImageAdjustments } from '../types';
import { translations } from '../translations';

interface PromptAssistantProps {
  currentPrompt: string;
  imageContext?: string | null;
  adjustments?: ImageAdjustments;
  onSelectSuggestion: (suggestion: string) => void;
  language: Language;
}

export const PromptAssistant: React.FC<PromptAssistantProps> = ({
  currentPrompt,
  imageContext,
  adjustments,
  onSelectSuggestion,
  language
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const t = translations[language];

  const handleSuggest = async () => {
    setLoading(true);
    try {
      const results = await getPromptSuggestions(currentPrompt, imageContext, adjustments);
      setSuggestions(results);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 animate-reveal">
      <div className="flex items-center justify-between px-2">
        <label className="text-[10px] text-gray-500 font-black uppercase tracking-[0.2em] flex items-center gap-2">
          <svg className="w-3 h-3 text-studio-neon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M13 10V3L4 14h7v7l9-11h-7z" strokeWidth={2} />
          </svg>
          {t.assistantTitle}
        </label>
        <button 
          onClick={handleSuggest}
          disabled={loading}
          className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-studio-neon hover:text-studio-gold transition-all duration-300 disabled:opacity-50 hover:scale-110 active:scale-95 bg-studio-neon/5 px-3 py-1.5 rounded-full border border-studio-neon/20 shadow-neon-blue/10"
        >
          <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {loading ? t.assistantLoading : t.assistantSuggest}
        </button>
      </div>

      <div className="flex flex-wrap gap-2.5">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-8 w-28 bg-white/5 rounded-full animate-pulse border border-white/5" />
          ))
        ) : suggestions.length > 0 ? (
          suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => onSelectSuggestion(s)}
              className="px-4 py-2 bg-white/5 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-full text-[10px] font-bold text-gray-500 dark:text-gray-400 hover:text-studio-neon hover:border-studio-neon hover:bg-studio-neon/10 transition-all duration-300 animate-reveal hover:scale-110 active:scale-90 shadow-sm hover:shadow-studio-neon/20"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <span className="opacity-40 mr-1.5 text-studio-neon">+</span>
              {s}
            </button>
          ))
        ) : (
          <div className="w-full text-center py-6 px-4 bg-black/5 dark:bg-white/5 rounded-[2rem] border border-dashed border-black/10 dark:border-white/10 opacity-30 text-[9px] font-black uppercase tracking-widest text-gray-500">
             Ready to analyze and enhance your cinematic brief
          </div>
        )}
      </div>
    </div>
  );
};
