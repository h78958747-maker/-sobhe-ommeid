
import React, { useState, useEffect, useCallback } from 'react';
import { ImageUpload } from './components/ImageUpload';
import { Button } from './components/Button';
import { ComparisonView } from './components/ComparisonView';
import { generateEditedImage, sendChatMessage } from './services/geminiService';
import { saveHistoryItem } from './services/storageService';
import { DEFAULT_PROMPT, LIGHTING_STYLES, COLOR_GRADING_STYLES, PROMPT_SUGGESTIONS, LIGHTING_ICONS } from './constants';
import { ProcessingState, AspectRatio, Language, LightingIntensity, ColorGradingStyle, ChatMessage } from './types';
import { translations } from './translations';
import { LivingBackground } from './components/LivingBackground';
import { HistoryGallery } from './components/HistoryGallery';
import { ImageEditor } from './components/ImageEditor';
import { ChatInterface } from './components/ChatInterface';

const APP_LOGO = "https://dl1.negarestock.ir/S/p/2024/10/4/1728068570_31103_Untitled-1.jpg";

const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>('fa');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [processing, setProcessing] = useState<ProcessingState>({
    isLoading: false,
    statusText: '',
    error: null
  });
  const [lighting, setLighting] = useState<LightingIntensity>('soft');
  const [colorGrading, setColorGrading] = useState<ColorGradingStyle>('none');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('AUTO');
  const [showHistory, setShowHistory] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [showChat, setShowChat] = useState(true); // Default chat open in workspace
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [comparisonMode, setComparisonMode] = useState(false);

  const t = translations[language];

  useEffect(() => {
    document.documentElement.dir = language === 'fa' ? 'rtl' : 'ltr';
  }, [language]);

  const handleGenerate = useCallback(async () => {
    if (!selectedImage || processing.isLoading) return;
    
    setProcessing({ isLoading: true, statusText: t.rendering, error: null });
    
    try {
      const prompt = `${DEFAULT_PROMPT} style: ${LIGHTING_STYLES[lighting]}, colors: ${COLOR_GRADING_STYLES[colorGrading]}. ${description}`;
      const result = await generateEditedImage(selectedImage, prompt, aspectRatio);
      setResultImage(result);
      
      await saveHistoryItem({
        id: Date.now().toString(),
        imageUrl: result,
        prompt: prompt,
        aspectRatio,
        timestamp: Date.now(),
        mode: 'portrait',
        lighting,
        colorGrading
      });

    } catch (err: any) {
      console.error(err);
      const errorKey = err.message === "ERR_SAFETY" ? "ERR_SAFETY" : "ERR_GENERIC";
      setProcessing(prev => ({ ...prev, error: errorKey }));
    } finally {
      setProcessing(prev => ({ ...prev, isLoading: false }));
    }
  }, [selectedImage, lighting, colorGrading, description, aspectRatio, t, processing.isLoading]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isChatLoading) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text, timestamp: Date.now() };
    setChatMessages(prev => [...prev, userMsg]);
    setIsChatLoading(true);
    try {
      const response = await sendChatMessage(chatMessages, text, selectedImage);
      const assistantMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: response, timestamp: Date.now() };
      setChatMessages(prev => [...prev, assistantMsg]);
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsChatLoading(false);
    }
  };

  const reset = () => {
    setSelectedImage(null);
    setResultImage(null);
    setComparisonMode(false);
    setShowEditor(false);
    setChatMessages([]);
    setProcessing({ isLoading: false, statusText: '', error: null });
  };

  // Add missing retry function to allow re-running the generation
  const retry = () => {
    handleGenerate();
  };

  // --------------------------------------------------------------------------
  // UI STAGES
  // --------------------------------------------------------------------------

  // STAGE 1: UPLOAD
  if (!selectedImage && !processing.error) {
    return (
      <div className="min-h-screen bg-black text-white relative overflow-hidden flex flex-col">
        <LivingBackground />
        <header className="relative z-50 p-8 flex justify-between items-center max-w-[1700px] mx-auto w-full">
          <div className="flex items-center gap-4 group">
            <img src={APP_LOGO} alt="Logo" className="w-14 h-14 rounded-xl shadow-neon-blue animate-logo-cinema object-cover" />
            <div>
              <h1 className="text-xl font-black tracking-tighter uppercase text-white">{t.appTitle}</h1>
              <span className="text-[9px] text-studio-neon uppercase tracking-[0.4em] font-bold opacity-70">Studio Master Pro v3.0</span>
            </div>
          </div>
          <div className="flex bg-white/5 rounded-xl p-1 border border-white/10">
            <button onClick={() => setLanguage('fa')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${language === 'fa' ? 'bg-studio-neon text-black' : 'text-gray-500'}`}>FA</button>
            <button onClick={() => setLanguage('en')} className={`px-4 py-1.5 rounded-lg text-[10px] font-black transition-all ${language === 'en' ? 'bg-studio-neon text-black' : 'text-gray-500'}`}>EN</button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-6 relative z-10 animate-reveal">
          <div className="w-full max-w-4xl space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-5xl md:text-7xl font-black tracking-tighter uppercase leading-none bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent italic">{language === 'fa' ? 'خلق جادوی سینما' : 'CREATE CINEMA MAGIC'}</h2>
              <p className="text-gray-500 text-sm uppercase tracking-[0.5em] font-bold">{language === 'fa' ? 'تصویر خود را برای تبدیل حرفه‌ای وارد کنید' : 'IMPORT YOUR SHOT FOR PROFESSIONAL SYNTHESIS'}</p>
            </div>
            <div className="shadow-neon-blue rounded-[4rem] p-1 border border-studio-neon/30">
              <ImageUpload 
                title={t.uploadTitle}
                selectedImage={null}
                onImageSelected={(img) => setSelectedImage(img as string)}
                language={language}
                className="h-[400px]"
              />
            </div>
            <div className="flex justify-center gap-8 pt-4">
              <button onClick={() => setShowHistory(true)} className="flex items-center gap-3 text-gray-500 hover:text-studio-neon transition-colors font-black uppercase text-[10px] tracking-widest">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" strokeWidth={2}/></svg>
                {t.galleryTitle}
              </button>
            </div>
          </div>
        </main>
        {showHistory && <HistoryGallery title={t.galleryTitle} emptyMessage={t.galleryEmpty} onClose={() => setShowHistory(false)} onSelect={(item) => { setResultImage(item.imageUrl); setSelectedImage(item.imageUrl); }} />}
      </div>
    );
  }

  // STAGE 2: WORKSPACE (Config & Preview)
  if (selectedImage && !resultImage && !processing.error) {
    return (
      <div className="min-h-screen bg-[#050505] text-white relative overflow-hidden flex flex-col">
        <LivingBackground />
        
        {/* Workspace Header */}
        <header className="relative z-50 p-6 flex justify-between items-center border-b border-white/5 backdrop-blur-3xl bg-black/40">
           <div className="flex items-center gap-4 cursor-pointer" onClick={reset}>
             <img src={APP_LOGO} className="w-10 h-10 rounded-lg shadow-neon-blue" alt="logo" />
             <div className="hidden md:block">
               <h1 className="text-sm font-black uppercase tracking-widest">{t.appTitle}</h1>
               <p className="text-[8px] text-studio-neon font-bold uppercase tracking-[0.3em]">Cinematic Studio Editor</p>
             </div>
           </div>
           
           <div className="flex items-center gap-4">
             <button onClick={reset} className="px-6 py-2 text-[10px] font-black uppercase tracking-widest bg-white/5 border border-white/10 rounded-lg hover:bg-red-500/10 hover:text-red-500 transition-all">
               {language === 'fa' ? 'تغییر عکس' : 'CHANGE IMAGE'}
             </button>
             <Button variant="gold" className="px-10 h-12 rounded-lg text-[11px]" onClick={handleGenerate} isLoading={processing.isLoading}>
               {t.generate}
             </Button>
           </div>
        </header>

        <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden relative z-10">
          
          {/* Left: Studio Settings */}
          <section className="lg:col-span-3 border-r border-white/5 p-8 space-y-10 overflow-y-auto bg-black/20 custom-scrollbar animate-slide-in-left">
             <div className="space-y-8">
                <div className="flex items-center gap-3 text-studio-gold">
                   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" strokeWidth={2}/></svg>
                   <h2 className="text-[11px] font-black uppercase tracking-[0.4em]">{t.configTitle}</h2>
                </div>

                {/* Aspect Ratio */}
                <div className="space-y-4">
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{t.aspectRatio}</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['AUTO', '1:1', '4:3', '16:9', '9:16', '3:4'] as AspectRatio[]).map(ratio => (
                      <button key={ratio} onClick={() => setAspectRatio(ratio)} className={`py-3 text-[9px] font-black border rounded-lg transition-all ${aspectRatio === ratio ? 'border-studio-neon text-studio-neon bg-studio-neon/5' : 'border-white/5 bg-white/5 text-gray-500 hover:border-white/20'}`}>
                        {ratio === 'AUTO' ? t.ratioAuto : ratio}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lighting Styles */}
                <div className="space-y-4">
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{t.lightingIntensity}</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(Object.keys(LIGHTING_STYLES) as LightingIntensity[]).map(l => (
                      <button key={l} onClick={() => setLighting(l)} className={`p-4 border rounded-xl flex flex-col items-center gap-3 transition-all ${lighting === l ? 'border-studio-neon bg-studio-neon/5 text-studio-neon scale-[1.02]' : 'border-white/5 bg-white/5 text-gray-500 hover:border-white/20'}`}>
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d={LIGHTING_ICONS[l]} strokeWidth={2} /></svg>
                        <span className="text-[8px] font-black uppercase">{t[`light${l.charAt(0).toUpperCase() + l.slice(1)}` as keyof typeof t]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Color Grading */}
                <div className="space-y-4">
                   <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{t.colorGrading}</label>
                   <div className="space-y-2">
                      {Object.keys(COLOR_GRADING_STYLES).map(style => (
                        <button key={style} onClick={() => setColorGrading(style as ColorGradingStyle)} className={`w-full py-3 px-4 text-start text-[9px] font-black border rounded-lg transition-all ${colorGrading === style ? 'border-studio-neon text-studio-neon bg-studio-neon/5' : 'border-white/5 bg-white/5 text-gray-500 hover:border-white/20'}`}>
                          {style.replace('_', ' ').toUpperCase()}
                        </button>
                      ))}
                   </div>
                </div>
             </div>
          </section>

          {/* Center: Image Monitor */}
          <section className="lg:col-span-5 p-10 flex flex-col h-full items-center justify-center space-y-8 animate-reveal">
             <div className="w-full h-full max-h-[600px] relative rounded-[3rem] overflow-hidden shadow-2xl border border-white/5 bg-black/40 p-4">
                <img src={selectedImage} alt="Monitor" className="w-full h-full object-contain rounded-[2.5rem]" />
                <div className="absolute top-8 left-8 bg-black/60 backdrop-blur px-4 py-1.5 rounded-full border border-white/10 text-[9px] font-black tracking-widest text-studio-neon animate-pulse">
                  PREVIEW MONITOR 01
                </div>
             </div>

             {/* Style Library (Small) */}
             <div className="w-full space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">{t.styleLibrary}</h3>
                <div className="flex justify-center gap-4">
                   {PROMPT_SUGGESTIONS.map(s => (
                     <button key={s.id} onClick={() => setDescription(s.prompt)} className={`px-6 py-2 rounded-full border text-[9px] font-black transition-all ${description === s.prompt ? 'border-studio-neon text-studio-neon bg-studio-neon/5' : 'border-white/5 text-gray-500 hover:border-white/20'}`}>
                        {s.labelKey}
                     </button>
                   ))}
                </div>
             </div>
          </section>

          {/* Right: AI Director Chat */}
          <section className="lg:col-span-4 border-l border-white/5 bg-black/10 animate-slide-in-right">
             <ChatInterface 
                messages={chatMessages}
                onSendMessage={handleSendMessage}
                isLoading={isChatLoading}
                language={language}
                disabled={processing.isLoading}
             />
          </section>
        </main>
        
        {/* Loading Overlay Integration */}
        {processing.isLoading && (
          <div className="fixed inset-0 z-[1000] bg-black/95 backdrop-blur-[40px] flex flex-col items-center justify-center space-y-12">
            <div className="w-48 h-48 relative">
              <div className="absolute inset-0 border-8 border-studio-neon/10 rounded-full"></div>
              <div className="absolute inset-0 border-8 border-studio-neon border-t-transparent rounded-full animate-spin"></div>
              <img src={APP_LOGO} className="absolute inset-8 w-32 h-32 rounded-full object-cover animate-logo-cinema" alt="loading" />
            </div>
            <div className="text-center space-y-4">
              <h2 className="text-4xl font-black italic tracking-tighter text-studio-neon animate-pulse">{t.rendering}</h2>
              <p className="text-gray-500 text-[10px] uppercase tracking-[0.4em]">Rendering ultra-realistic 8K cinematic textures...</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // STAGE 3: RESULT VIEW
  if (resultImage && !processing.error) {
    return (
      <div className="min-h-screen bg-black text-white relative flex flex-col">
        <LivingBackground />
        <header className="relative z-50 p-6 flex justify-between items-center bg-black/40 backdrop-blur-3xl border-b border-white/5">
           <div className="flex items-center gap-4 cursor-pointer" onClick={reset}>
             <img src={APP_LOGO} className="w-10 h-10 rounded-lg shadow-neon-blue" alt="logo" />
             <h1 className="text-sm font-black uppercase tracking-widest">{t.appTitle}</h1>
           </div>
           <div className="flex gap-4">
              <Button variant="secondary" className="px-8 h-12 rounded-lg text-[10px]" onClick={reset}>{t.newGeneration}</Button>
              <Button variant="secondary" className="px-8 h-12 rounded-lg text-[10px]" onClick={() => setShowEditor(true)}>{t.viewEdit}</Button>
              <a href={resultImage} download="cinema_masterpiece.png">
                <Button variant="gold" className="px-10 h-12 rounded-lg text-[10px]">{t.download}</Button>
              </a>
           </div>
        </header>

        <main className="flex-1 p-6 md:p-12 flex items-center justify-center animate-reveal">
           <div className="w-full max-w-6xl shadow-[0_0_100px_rgba(0,0,0,0.8)] rounded-[4rem] overflow-hidden border border-white/10 relative group/master">
              {comparisonMode ? (
                <div className="h-[75vh]"><ComparisonView original={selectedImage!} result={resultImage!} /></div>
              ) : (
                <div className="relative aspect-auto max-h-[80vh] flex items-center justify-center">
                   <img src={resultImage} alt="result" className="max-w-full max-h-[80vh] object-contain transition-all duration-1000 group-hover/master:scale-[1.02]" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover/master:opacity-100 transition-all duration-500 flex items-end justify-center pb-12">
                      <Button variant="primary" onClick={() => setComparisonMode(true)} className="px-12 h-16 rounded-full text-[11px] shadow-2xl backdrop-blur-xl bg-black/50 border-white/20">
                        {t.viewCompare}
                      </Button>
                   </div>
                </div>
              )}
           </div>
        </main>
        
        {showEditor && (
          <div className="fixed inset-0 z-[500] bg-black/98 backdrop-blur-3xl p-6">
            <ImageEditor imageSrc={resultImage} language={language} onSave={(newImg) => { setResultImage(newImg); setShowEditor(false); }} />
            <button onClick={() => setShowEditor(false)} className="absolute top-10 right-10 p-5 bg-white/10 rounded-full hover:bg-red-500 transition-all"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M6 18L18 6M6 6l12 12" strokeWidth={2}/></svg></button>
          </div>
        )}
      </div>
    );
  }

  // ERROR VIEW
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <LivingBackground />
      <div className="max-w-xl w-full bg-red-500/5 border border-red-500/20 rounded-[3rem] p-12 text-center space-y-8 relative z-10 backdrop-blur-3xl animate-reveal">
        <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6"><svg className="w-10 h-10 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth={2}/></svg></div>
        <h2 className="text-3xl font-black uppercase text-red-500">{t[processing.error || 'ERR_GENERIC']}</h2>
        <p className="text-gray-400">{t[`${processing.error || 'ERR_GENERIC'}_DESC`]}</p>
        <div className="flex gap-4 pt-6">
          <Button variant="gold" className="flex-1 h-16 rounded-2xl" onClick={retry}>{t.TRY_AGAIN}</Button>
          <Button variant="secondary" className="flex-1 h-16 rounded-2xl" onClick={reset}>{t.BACK_TO_STUDIO}</Button>
        </div>
      </div>
    </div>
  );
};

export default App;
