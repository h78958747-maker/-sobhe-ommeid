
import React, { useState, useCallback, useEffect } from 'react';
import { ImageUpload } from './components/ImageUpload';
import { Button } from './components/Button';
import { ComparisonView } from './components/ComparisonView';
import { generateEditedImage, generateFaceSwap } from './services/geminiService';
import { generateInstantVideo } from './services/clientVideoService';
import { saveHistoryItem } from './services/storageService';
import { DEFAULT_PROMPT, QUALITY_MODIFIERS, LIGHTING_STYLES, COLOR_GRADING_STYLES, LOADING_MESSAGES, PROMPT_SUGGESTIONS } from './constants';
import { ProcessingState, AspectRatio, HistoryItem, Language, QualityMode, LightingIntensity, ColorGradingStyle, AppMode } from './types';
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
  const [activeTab, setActiveTab] = useState<'image' | 'video' | 'compare'>('image');
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("AUTO");
  const [lighting, setLighting] = useState<LightingIntensity>('cinematic');
  const [colorGrading, setColorGrading] = useState<ColorGradingStyle>('teal_orange');

  const LOGO_URL = "https://sobheommid.com/_nuxt/logo.BtixDU2P.svg";

  useEffect(() => {
    let interval: any;
    if (status.isLoading) {
      interval = setInterval(() => {
        setLoadingMessageIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [status.isLoading]);

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
      const errorMsg = error.message === "API_KEY_MISSING" 
        ? t.errorApiKeyMissing 
        : t.errorServer;
      setStatus({ isLoading: false, error: errorMsg });
    } finally {
      setStatus(prev => ({ ...prev, isLoading: false }));
    }
  };

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
          <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-4 rounded-2xl text-center animate-shake">
            <p className="font-bold">{status.error}</p>
            {status.error === t.errorApiKeyMissing && (
              <p className="text-xs mt-2 opacity-80">لطفاً API_KEY را در تنظیمات Vercel اضافه کنید.</p>
            )}
          </div>
        )}

        <main className="grid lg:grid-cols-[400px_1fr] gap-8">
          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 space-y-6">
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
            <Button variant="gold" onClick={handleGenerate} isLoading={status.isLoading} disabled={!selectedImage} className="w-full h-16 text-lg">
                {t.generate}
            </Button>
          </div>

          <div className="flex flex-col gap-4">
            <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] overflow-hidden min-h-[500px] flex items-center justify-center relative shadow-glass">
              {status.isLoading ? (
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 border-t-2 border-studio-neon rounded-full animate-spin mx-auto"></div>
                  <p className="text-studio-neon text-xs font-mono uppercase animate-pulse">{t[LOADING_MESSAGES[loadingMessageIndex]]}</p>
                </div>
              ) : resultImage ? (
                activeTab === 'compare' ? (
                  <ComparisonView original={selectedImage!} result={resultImage} />
                ) : (
                  <img src={resultImage} className="max-h-[70vh] object-contain rounded-xl animate-scale-up" />
                )
              ) : (
                <div className="text-center opacity-20">
                  <svg className="w-20 h-20 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                  <p className="text-sm font-light tracking-widest">{t.noResultDesc}</p>
                </div>
              )}
            </div>
            
            {resultImage && (
              <div className="flex gap-2 p-1 bg-white/5 rounded-2xl border border-white/10 w-fit mx-auto">
                 <button onClick={() => setActiveTab('image')} className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'image' ? 'bg-white/10 text-white' : 'text-gray-500'}`}>{t.viewImage}</button>
                 <button onClick={() => setActiveTab('compare')} className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'compare' ? 'bg-studio-neon/20 text-studio-neon' : 'text-gray-500'}`}>{t.viewCompare}</button>
                 <a href={resultImage} download="Cinema_Masterpiece.png" className="px-6 py-2 rounded-xl text-xs font-bold bg-studio-neon text-black transition-all hover:scale-105">{t.download}</a>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
