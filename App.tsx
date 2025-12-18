
import React, { useState, useCallback, useEffect } from 'react';
import { ImageUpload } from './components/ImageUpload';
import { Button } from './components/Button';
import { ComparisonView } from './components/ComparisonView';
import { generateEditedImage, generateFaceSwap } from './services/geminiService';
import { saveHistoryItem } from './services/storageService';
import { DEFAULT_PROMPT, QUALITY_MODIFIERS, LIGHTING_STYLES, COLOR_GRADING_STYLES, LOADING_MESSAGES } from './constants';
import { ProcessingState, AspectRatio, HistoryItem, Language, LightingIntensity, ColorGradingStyle, AppMode } from './types';
import { translations } from './translations';
import { LivingBackground } from './components/LivingBackground';
import { HistoryGallery } from './components/HistoryGallery';

function App() {
  const [language, setLanguage] = useState<Language>('fa');
  const t = translations[language];
  const [appMode, setAppMode] = useState<AppMode>('portrait');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [swapFaceImage, setSwapFaceImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [status, setStatus] = useState<ProcessingState>({ isLoading: false, error: null });
  const [activeTab, setActiveTab] = useState<'image' | 'compare'>('image');
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [lighting, setLighting] = useState<LightingIntensity>('cinematic');
  const [colorGrading, setColorGrading] = useState<ColorGradingStyle>('teal_orange');
  const [hasKey, setHasKey] = useState(true);

  const LOGO_URL = "https://sobheommid.com/_nuxt/logo.BtixDU2P.svg";

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected);
      }
    };
    checkKey();
  }, []);

  useEffect(() => {
    let interval: any;
    if (status.isLoading) {
      interval = setInterval(() => {
        setLoadingMessageIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
      }, 2500);
    }
    return () => clearInterval(interval);
  }, [status.isLoading]);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasKey(true); // Assume success per instructions
    }
  };

  const handleGenerate = async () => {
    if (!selectedImage) return;
    setStatus({ isLoading: true, error: null });
    setResultImage(null);
    
    try {
      let finalPrompt = DEFAULT_PROMPT;
      finalPrompt += `, ${LIGHTING_STYLES[lighting]}`;
      if (colorGrading !== 'none') finalPrompt += `, ${COLOR_GRADING_STYLES[colorGrading]}`;
      finalPrompt += QUALITY_MODIFIERS['high'];

      const img = appMode === 'faceswap' && swapFaceImage
        ? await generateFaceSwap(selectedImage, swapFaceImage, t.swapPrompt)
        : await generateEditedImage(selectedImage, finalPrompt, aspectRatio);
      
      setResultImage(img);
      const historyItem: HistoryItem = {
        id: Date.now().toString(),
        imageUrl: img,
        prompt: finalPrompt,
        aspectRatio,
        timestamp: Date.now(),
        mode: appMode
      };
      saveHistoryItem(historyItem);
    } catch (error: any) {
      console.error(error);
      if (error.message === "API_KEY_MISSING") {
        setHasKey(false);
        setStatus({ isLoading: false, error: t.errorApiKeyMissing });
      } else {
        setStatus({ isLoading: false, error: t.errorServer });
      }
    } finally {
      setStatus(prev => ({ ...prev, isLoading: false }));
    }
  };

  if (!hasKey) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 text-center" dir={language === 'fa' ? 'rtl' : 'ltr'}>
        <LivingBackground />
        <div className="relative z-10 bg-white/5 backdrop-blur-3xl border border-white/10 p-10 rounded-[3rem] max-w-lg space-y-8 animate-scale-up">
           <img src={LOGO_URL} alt="Logo" className="w-20 h-20 mx-auto" />
           <div className="space-y-4">
              <h2 className="text-3xl font-black text-studio-neon">{language === 'fa' ? 'اتصال به استودیو' : 'Connect to Studio'}</h2>
              <p className="text-gray-400 text-sm leading-relaxed">
                {language === 'fa' 
                  ? 'برای استفاده از هوش مصنوعی پیشرفته سینمایی، باید کلید اختصاصی خود را متصل کنید. لطفاً از یک پروژه با قابلیت پرداخت (Paid Project) استفاده کنید.' 
                  : 'To use advanced cinematic AI, you must connect your API key. Please use a key from a paid GCP project.'}
              </p>
              <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="text-studio-neon hover:underline text-xs block">
                {language === 'fa' ? 'مشاهده مستندات پرداخت گوگل' : 'View Google Billing Docs'}
              </a>
           </div>
           <Button variant="gold" onClick={handleSelectKey} className="w-full h-16 text-lg">
             {language === 'fa' ? 'انتخاب کلید API' : 'Select API Key'}
           </Button>
        </div>
      </div>
    );
  }

  return (
    <div dir={language === 'fa' ? 'rtl' : 'ltr'} className="min-h-screen bg-black text-white font-sans selection:bg-studio-neon/30">
      <LivingBackground />
      {isGalleryOpen && <HistoryGallery onSelect={(item) => setResultImage(item.imageUrl)} onClose={() => setIsGalleryOpen(false)} title={t.galleryTitle} emptyMessage={t.galleryEmpty} />}

      <div className="relative z-10 max-w-7xl mx-auto p-4 md:p-8 flex flex-col gap-8">
        <header className="flex items-center justify-between pb-6 border-b border-white/10">
           <div className="flex items-center gap-4">
              <img src={LOGO_URL} alt="Logo" className="w-12 h-12" />
              <div>
                 <h1 className="text-xl md:text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white to-studio-neon">{t.instituteName}</h1>
                 <p className="text-[10px] text-studio-neon uppercase tracking-[0.2em]">{t.appTitle}</p>
              </div>
           </div>
           <div className="flex gap-2">
              <button onClick={() => setLanguage(language === 'fa' ? 'en' : 'fa')} className="px-3 py-1 bg-white/5 rounded-lg text-xs border border-white/10 hover:bg-white/10 transition-all">{language.toUpperCase()}</button>
              <button onClick={() => setIsGalleryOpen(true)} className="p-2 bg-white/5 rounded-lg border border-white/10 hover:text-studio-neon transition-all"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></button>
           </div>
        </header>

        {status.error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-2xl text-center">
            <p className="font-bold">{status.error}</p>
          </div>
        )}

        <main className="grid lg:grid-cols-[400px_1fr] gap-8">
          <div className="space-y-6 animate-stagger-1">
            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-6 space-y-6">
              <ImageUpload 
                onImageSelected={(img) => setSelectedImage(Array.isArray(img) ? img[0] : img)} 
                selectedImage={selectedImage} 
                title={t.uploadTitle} 
              />
              <div className="flex bg-black/40 rounded-xl p-1 border border-white/5">
                <button onClick={() => setAppMode('portrait')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${appMode === 'portrait' ? 'bg-studio-neon text-black' : 'text-gray-400'}`}>{t.modePortrait}</button>
                <button onClick={() => setAppMode('faceswap')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${appMode === 'faceswap' ? 'bg-studio-purple text-white' : 'text-gray-400'}`}>{t.modeFaceSwap}</button>
              </div>
              {appMode === 'faceswap' && <ImageUpload onImageSelected={(img) => setSwapFaceImage(Array.isArray(img) ? img[0] : img)} selectedImage={swapFaceImage} title={t.labelSource} />}
            </div>
            
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
               <div className="flex justify-between items-center">
                 <span className="text-xs text-gray-400 uppercase tracking-widest">{t.lightingIntensity}</span>
                 <div className="flex gap-2">
                   {(['soft', 'cinematic', 'dramatic'] as LightingIntensity[]).map(l => (
                     <button key={l} onClick={() => setLighting(l)} className={`p-2 rounded-lg border transition-all ${lighting === l ? 'border-studio-neon bg-studio-neon/10 text-studio-neon' : 'border-white/5 text-gray-500'}`}>
                       <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.263l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>
                     </button>
                   ))}
                 </div>
               </div>
               <div className="flex justify-between items-center">
                 <span className="text-xs text-gray-400 uppercase tracking-widest">{t.colorGrading}</span>
                 <select value={colorGrading} onChange={(e) => setColorGrading(e.target.value as ColorGradingStyle)} className="bg-black/50 border border-white/10 rounded-lg text-xs p-2 text-white outline-none">
                    <option value="teal_orange">{t.gradeTealOrange}</option>
                    <option value="warm_vintage">{t.gradeVintage}</option>
                    <option value="cool_noir">{t.gradeNoir}</option>
                    <option value="classic_bw">{t.gradeBW}</option>
                    <option value="none">{t.gradeNone}</option>
                 </select>
               </div>
            </div>

            <Button variant="gold" onClick={handleGenerate} isLoading={status.isLoading} disabled={!selectedImage} className="w-full h-16 text-lg">
                {t.generate}
            </Button>
          </div>

          <div className="flex flex-col gap-4 animate-stagger-2">
            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[3rem] overflow-hidden min-h-[600px] flex items-center justify-center relative shadow-glass group/result">
              {status.isLoading ? (
                <div className="text-center space-y-4">
                  <div className="relative w-20 h-20 mx-auto">
                    <div className="absolute inset-0 border-4 border-studio-neon/20 rounded-full"></div>
                    <div className="absolute inset-0 border-4 border-t-studio-neon rounded-full animate-spin"></div>
                  </div>
                  <p className="text-studio-neon text-sm font-black uppercase animate-pulse tracking-widest">{t[LOADING_MESSAGES[loadingMessageIndex]]}</p>
                </div>
              ) : resultImage ? (
                activeTab === 'compare' ? (
                  <ComparisonView original={selectedImage!} result={resultImage} />
                ) : (
                  <div className="relative w-full h-full flex items-center justify-center p-4">
                    <img src={resultImage} className="max-h-[75vh] object-contain rounded-2xl shadow-2xl animate-scale-up" />
                    <div className="absolute top-8 left-8 bg-studio-neon text-black px-4 py-1 rounded-full text-[10px] font-black tracking-widest uppercase">Cinema Masterpiece</div>
                  </div>
                )
              ) : (
                <div className="text-center opacity-10">
                   <div className="w-32 h-32 mx-auto mb-6 border-4 border-white/20 rounded-full flex items-center justify-center">
                      <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                   </div>
                  <p className="text-xl font-light tracking-[0.3em] uppercase">{t.noResultDesc}</p>
                </div>
              )}
            </div>
            
            {resultImage && (
              <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/10 w-fit mx-auto animate-fade-in">
                 <button onClick={() => setActiveTab('image')} className={`px-8 py-3 rounded-xl text-xs font-black transition-all uppercase tracking-widest ${activeTab === 'image' ? 'bg-white/10 text-white shadow-inner' : 'text-gray-500'}`}>{t.viewImage}</button>
                 <button onClick={() => setActiveTab('compare')} className={`px-8 py-3 rounded-xl text-xs font-black transition-all uppercase tracking-widest ${activeTab === 'compare' ? 'bg-studio-neon/20 text-studio-neon' : 'text-gray-500'}`}>{t.viewCompare}</button>
                 <a href={resultImage} download="Cinema_Masterpiece.png" className="px-8 py-3 rounded-xl text-xs font-black bg-studio-neon text-black transition-all hover:scale-105 uppercase tracking-widest">{t.download}</a>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
