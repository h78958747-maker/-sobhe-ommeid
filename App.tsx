
import React, { useState, useEffect, useCallback } from 'react';
import { ImageUpload } from './components/ImageUpload';
import { Button } from './components/Button';
import { ComparisonView } from './components/ComparisonView';
import { generateEditedImage, sendChatMessage } from './services/geminiService';
import { saveHistoryItem } from './services/storageService';
import { DEFAULT_PROMPT, LIGHTING_STYLES, COLOR_GRADING_STYLES, PROMPT_SUGGESTIONS, LIGHTING_ICONS, COLOR_ICONS } from './constants';
import { ProcessingState, AspectRatio, Language, LightingIntensity, ColorGradingStyle, ChatMessage } from './types';
import { translations } from './translations';
import { LivingBackground } from './components/LivingBackground';
import { HistoryGallery } from './components/HistoryGallery';
import { ImageEditor } from './components/ImageEditor';
import { ChatInterface } from './components/ChatInterface';
import { playSuccess, playError, playClick } from './services/audioService';

const APP_LOGO = "https://dl1.negarestock.ir/S/p/2024/10/4/1728068570_31103_Untitled-1.jpg";

const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>('fa');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{width: number, height: number} | undefined>(undefined);
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
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });

  const t = translations[language];

  useEffect(() => {
    document.documentElement.dir = language === 'fa' ? 'rtl' : 'ltr';
    const handleMove = (e: MouseEvent) => {
      setMouseOffset({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20
      });
    };
    window.addEventListener('mousemove', handleMove);
    return () => window.removeEventListener('mousemove', handleMove);
  }, [language]);

  const handleGenerate = useCallback(async () => {
    if (!selectedImage || processing.isLoading) return;
    playClick();
    setProcessing({ isLoading: true, statusText: t.rendering, error: null });
    
    try {
      const prompt = `${DEFAULT_PROMPT} style: ${LIGHTING_STYLES[lighting]}, colors: ${COLOR_GRADING_STYLES[colorGrading]}. ${description}`;
      const result = await generateEditedImage(selectedImage, prompt, aspectRatio, imageDimensions);
      
      playSuccess();
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
      playError();
      const errorKey = err.message === "ERR_SAFETY" ? "ERR_SAFETY" : (err.message || "ERR_GENERIC");
      setProcessing(prev => ({ ...prev, error: errorKey }));
    } finally {
      setProcessing(prev => ({ ...prev, isLoading: false }));
    }
  }, [selectedImage, lighting, colorGrading, description, aspectRatio, imageDimensions, t, processing.isLoading]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isChatLoading) return;
    playClick();
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
    playClick();
    setSelectedImage(null);
    setImageDimensions(undefined);
    setResultImage(null);
    setComparisonMode(false);
    setChatMessages([]);
    setProcessing({ isLoading: false, statusText: '', error: null });
  };

  // STAGE 1: UPLOAD
  if (!selectedImage && !processing.error) {
    return (
      <div className="min-h-screen bg-black text-white relative overflow-hidden flex flex-col">
        <LivingBackground />
        <header className="relative z-50 p-8 flex justify-between items-center max-w-[1700px] mx-auto w-full">
          <div className="flex items-center gap-4 group transition-transform duration-500" style={{ transform: `translate(${mouseOffset.x * 0.2}px, ${mouseOffset.y * 0.2}px)` }}>
            <img src={APP_LOGO} alt="Logo" className="w-14 h-14 rounded-2xl shadow-neon-blue animate-logo-cinema object-cover border border-white/10" />
            <div>
              <h1 className="text-xl font-black tracking-tighter uppercase text-white">{t.appTitle}</h1>
              <span className="text-[9px] text-studio-neon uppercase tracking-[0.4em] font-bold opacity-70">STUDIO CRYSTAL v4.0</span>
            </div>
          </div>
          <div className="flex bg-white/5 backdrop-blur-2xl rounded-2xl p-1 border border-white/10">
            <button onClick={() => { playClick(); setLanguage('fa'); }} className={`px-5 py-2 rounded-xl text-[10px] font-black transition-all ${language === 'fa' ? 'bg-studio-neon text-black shadow-neon-blue' : 'text-gray-500 hover:text-white'}`}>FA</button>
            <button onClick={() => { playClick(); setLanguage('en'); }} className={`px-5 py-2 rounded-xl text-[10px] font-black transition-all ${language === 'en' ? 'bg-studio-neon text-black shadow-neon-blue' : 'text-gray-500 hover:text-white'}`}>EN</button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-6 relative z-10 animate-reveal">
          <div className="w-full max-w-4xl space-y-12" style={{ transform: `translate(${mouseOffset.x * -0.3}px, ${mouseOffset.y * -0.3}px)` }}>
            <div className="text-center space-y-4">
              <h2 className="text-6xl md:text-8xl font-black tracking-tighter uppercase leading-none bg-gradient-to-b from-white via-white to-white/20 bg-clip-text text-transparent italic drop-shadow-2xl">
                {language === 'fa' ? 'جادوی یخی سینما' : 'ICY CINEMA MAGIC'}
              </h2>
              <p className="text-studio-neon/60 text-[10px] uppercase tracking-[0.6em] font-bold animate-pulse">
                {language === 'fa' ? 'آغاز یک تجربه بصری فراتر از واقعیت' : 'START A VISUAL EXPERIENCE BEYOND REALITY'}
              </p>
            </div>
            <div className="bg-white/5 backdrop-blur-3xl rounded-[4rem] p-2 border border-white/10 shadow-glass-heavy transform transition-all hover:scale-[1.01] hover:border-studio-neon/20">
              <ImageUpload 
                title={t.uploadTitle}
                selectedImage={null}
                onImageSelected={(img) => { playClick(); setSelectedImage(img as string); }}
                onDimensionsDetected={(w, h) => setImageDimensions({width: w, height: h})}
                language={language}
                className="h-[450px]"
              />
            </div>
          </div>
        </main>
      </div>
    );
  }

  // STAGE 2: WORKSPACE
  if (selectedImage && !resultImage && !processing.error) {
    return (
      <div className="min-h-screen bg-[#020202] text-white relative overflow-hidden flex flex-col">
        <LivingBackground />
        <header className="relative z-50 p-6 flex justify-between items-center border-b border-white/10 backdrop-blur-3xl bg-black/60 shadow-glass">
           <div className="flex items-center gap-4 cursor-pointer group" onClick={reset}>
             <img src={APP_LOGO} className="w-10 h-10 rounded-xl shadow-neon-blue border border-white/20 group-hover:rotate-6 transition-transform animate-logo-cinema" alt="logo" />
             <div className="hidden md:block">
               <h1 className="text-sm font-black uppercase tracking-widest">{t.appTitle}</h1>
               <p className="text-[8px] text-studio-neon font-bold uppercase tracking-[0.3em] opacity-60 italic">Crystal Engine Rendering</p>
             </div>
           </div>
           
           <div className="flex items-center gap-4">
             <button onClick={reset} className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest bg-white/5 border border-white/10 rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-all backdrop-blur-xl btn-ripple">
               {language === 'fa' ? 'تغییر تصویر' : 'CHANGE SOURCE'}
             </button>
             <Button variant="gold" className="px-12 h-14 rounded-xl text-[11px] shadow-neon-gold border-0" onClick={handleGenerate} isLoading={processing.isLoading}>
               {t.generate}
             </Button>
           </div>
        </header>

        <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden relative z-10">
          <section className="lg:col-span-3 border-r border-white/10 p-8 space-y-10 overflow-y-auto bg-white/5 backdrop-blur-2xl custom-scrollbar animate-slide-in-left">
             <div className="space-y-8">
                <div className="flex items-center gap-3 text-studio-gold">
                   <svg className="w-5 h-5 animate-draw-svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" strokeWidth={2}/><path d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" strokeWidth={2}/></svg>
                   <h2 className="text-[11px] font-black uppercase tracking-[0.4em]">{t.configTitle}</h2>
                </div>

                <div className="space-y-4 bg-white/5 p-5 rounded-3xl border border-white/5">
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-studio-neon rounded-full shadow-neon-blue"></span>
                    {t.aspectRatio}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['AUTO', '1:1', '4:3', '16:9', '9:16', '3:4'] as AspectRatio[]).map(ratio => (
                      <button key={ratio} onClick={() => { playClick(); setAspectRatio(ratio); }} className={`py-3 text-[9px] font-black border rounded-xl transition-all btn-ripple ${aspectRatio === ratio ? 'border-studio-neon text-studio-neon bg-studio-neon/20 shadow-neon-blue/20' : 'border-white/5 bg-white/5 text-gray-500 hover:border-white/20'}`}>
                        {ratio === 'AUTO' ? t.ratioAuto : ratio}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{t.lightingIntensity}</label>
                  <div className="grid grid-cols-2 gap-3">
                    {(Object.keys(LIGHTING_STYLES) as LightingIntensity[]).map(l => (
                      <button key={l} onClick={() => { playClick(); setLighting(l); }} className={`p-5 border rounded-2xl flex flex-col items-center gap-3 transition-all group ${lighting === l ? 'border-studio-neon bg-studio-neon/20 text-studio-neon shadow-neon-blue' : 'border-white/5 bg-white/5 text-gray-400 hover:border-white/20'}`}>
                        <svg className={`w-7 h-7 transition-all duration-700 ${lighting === l ? 'animate-draw-svg' : 'group-hover:scale-110'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d={LIGHTING_ICONS[l]} strokeWidth={1.5} /></svg>
                        <span className="text-[8px] font-black uppercase tracking-widest">{t[`light${l.charAt(0).toUpperCase() + l.slice(1)}` as keyof typeof t]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                   <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{t.colorGrading}</label>
                   <div className="space-y-2">
                      {(Object.keys(COLOR_GRADING_STYLES) as ColorGradingStyle[]).map(style => (
                        <button key={style} onClick={() => { playClick(); setColorGrading(style); }} className={`w-full py-4 px-5 flex items-center gap-4 text-[9px] font-black border rounded-xl transition-all btn-ripple ${colorGrading === style ? 'border-studio-neon text-studio-neon bg-studio-neon/20' : 'border-white/5 bg-white/5 text-gray-500 hover:border-white/20'}`}>
                          <svg className="w-5 h-5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d={COLOR_ICONS[style]} strokeWidth={2}/></svg>
                          {style.replace('_', ' ').toUpperCase()}
                        </button>
                      ))}
                   </div>
                </div>
             </div>
          </section>

          <section className="lg:col-span-5 p-12 flex flex-col h-full items-center justify-center space-y-12 animate-reveal">
             <div className="w-full h-full max-h-[650px] relative rounded-[4rem] overflow-hidden shadow-glass-heavy border border-white/10 bg-black/40 p-6 group/monitor">
                <div className="absolute inset-0 bg-noise opacity-[0.05] pointer-events-none"></div>
                <img src={selectedImage} alt="Monitor" className="w-full h-full object-contain rounded-[3rem] transition-all duration-1000 group-hover/monitor:scale-105 group-hover/monitor:rotate-1" />
                
                <div className="absolute top-10 left-10 flex items-center gap-4">
                   <div className="w-3.5 h-3.5 bg-red-600 rounded-full animate-ping shadow-neon-red"></div>
                   <div className="bg-black/60 backdrop-blur-2xl px-5 py-2 rounded-full border border-white/10 text-[10px] font-black tracking-[0.4em] text-studio-neon uppercase">
                     CAPTURE STREAM 01
                   </div>
                </div>
             </div>

             <div className="w-full space-y-6">
                <div className="flex flex-wrap justify-center gap-4">
                   {PROMPT_SUGGESTIONS.map(s => (
                     <button key={s.id} onClick={() => { playClick(); setDescription(s.prompt); }} className={`px-10 py-4 rounded-full border text-[10px] font-black tracking-widest transition-all hover:scale-110 active:scale-90 flex items-center gap-3 btn-ripple ${description === s.prompt ? 'border-studio-neon text-studio-neon bg-studio-neon/20 shadow-neon-blue' : 'border-white/5 bg-white/5 text-gray-500 hover:border-white/20'}`}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d={s.icon} strokeWidth={2}/></svg>
                        {s.labelKey}
                     </button>
                   ))}
                </div>
             </div>
          </section>

          <section className="lg:col-span-4 border-l border-white/10 bg-white/5 backdrop-blur-2xl animate-slide-in-right">
             <ChatInterface 
                messages={chatMessages}
                onSendMessage={handleSendMessage}
                isLoading={isChatLoading}
                language={language}
                disabled={processing.isLoading}
             />
          </section>
        </main>
      </div>
    );
  }

  // ERROR & RESULT STAGES ... (Omitted for brevity, but same button style updates applied)
  if (processing.error) {
     const isSafety = processing.error === 'ERR_SAFETY';
     return (
       <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
         <LivingBackground />
         <div className="max-w-xl w-full bg-red-500/5 border border-red-500/20 rounded-[4rem] p-16 text-center space-y-10 relative z-10 backdrop-blur-3xl animate-reveal overflow-hidden shadow-glass-heavy">
           <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto shadow-2xl">
             <svg className="w-12 h-12 text-red-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth={2.5}/></svg>
           </div>
           <div className="space-y-4">
              <h2 className="text-3xl font-black uppercase tracking-tighter text-red-500">{isSafety ? t.ERR_SAFETY : t.ERR_GENERIC}</h2>
              <p className="text-gray-400 text-sm leading-relaxed">{isSafety ? t.ERR_SAFETY_DESC : processing.error}</p>
           </div>
           <div className="flex flex-col sm:flex-row gap-4 pt-6">
             <Button variant="gold" className="flex-1 h-16 rounded-2xl border-0 shadow-neon-gold" onClick={handleGenerate}>{t.TRY_AGAIN}</Button>
             <Button variant="secondary" className="flex-1 h-16 rounded-2xl" onClick={reset}>{t.BACK_TO_STUDIO}</Button>
           </div>
         </div>
       </div>
     );
  }

  if (resultImage) {
    return (
      <div className="min-h-screen bg-black text-white relative flex flex-col">
        <LivingBackground />
        <header className="relative z-50 p-6 flex justify-between items-center bg-black/60 backdrop-blur-3xl border-b border-white/10 shadow-glass">
           <div className="flex items-center gap-4 cursor-pointer group" onClick={reset}>
             <img src={APP_LOGO} className="w-10 h-10 rounded-xl shadow-neon-blue border border-white/20 animate-logo-cinema" alt="logo" />
             <h1 className="text-sm font-black uppercase tracking-widest">{t.appTitle}</h1>
           </div>
           <div className="flex gap-4">
              <Button variant="secondary" className="px-8 h-12 rounded-xl text-[10px] tracking-widest backdrop-blur-2xl border-white/10 btn-ripple" onClick={reset}>{t.newGeneration}</Button>
              <a href={resultImage} download="crystal_masterpiece.png">
                <Button variant="gold" className="px-12 h-12 rounded-xl text-[10px] tracking-widest border-0 shadow-neon-gold">{t.download}</Button>
              </a>
           </div>
        </header>

        <main className="flex-1 p-6 md:p-16 flex items-center justify-center animate-reveal">
           <div className="w-full max-w-7xl shadow-glass-heavy rounded-[5rem] overflow-hidden border border-white/20 relative group/master bg-black/40 backdrop-blur-3xl">
              {comparisonMode ? (
                <div className="h-[75vh]"><ComparisonView original={selectedImage!} result={resultImage!} /></div>
              ) : (
                <div className="relative aspect-auto max-h-[80vh] flex items-center justify-center p-8">
                   <img src={resultImage} alt="result" className="max-w-full max-h-[80vh] object-contain rounded-[3.5rem] transition-all duration-1000 group-hover/master:scale-105 shadow-2xl" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover/master:opacity-100 transition-all duration-700 flex items-end justify-center pb-20">
                      <Button variant="primary" onClick={() => { playClick(); setComparisonMode(true); }} className="px-20 h-20 rounded-full text-[13px] font-black tracking-[0.2em] shadow-neon-blue backdrop-blur-3xl bg-black/40 border-white/20 hover:scale-110 btn-ripple">
                        {t.viewCompare}
                      </Button>
                   </div>
                </div>
              )}
           </div>
        </main>
      </div>
    );
  }

  return null;
};

export default App;
