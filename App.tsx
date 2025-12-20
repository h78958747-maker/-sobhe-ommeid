
import React, { useState, useEffect, useCallback } from 'react';
import { ImageUpload } from './components/ImageUpload';
import { Button } from './components/Button';
import { ComparisonView } from './components/ComparisonView';
import { generateEditedImage, sendChatMessage } from './services/geminiService';
import { saveHistoryItem } from './services/storageService';
import { DEFAULT_PROMPT, LIGHTING_STYLES, COLOR_GRADING_STYLES, PROMPT_SUGGESTIONS, LIGHTING_ICONS, COLOR_ICONS } from './constants';
import { ProcessingState, AspectRatio, Language, LightingIntensity, ColorGradingStyle, ChatMessage, BatchItem } from './types';
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
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [imageDimensions, setImageDimensions] = useState<{width: number, height: number} | undefined>(undefined);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [batchResults, setBatchResults] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [processing, setProcessing] = useState<ProcessingState>({
    isLoading: false,
    statusText: '',
    error: null,
    batchCurrent: 0,
    batchTotal: 0
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
      setProcessing(prev => ({ ...prev, error: err.message === "ERR_SAFETY" ? "ERR_SAFETY" : err.message }));
    } finally {
      setProcessing(prev => ({ ...prev, isLoading: false }));
    }
  }, [selectedImage, lighting, colorGrading, description, aspectRatio, imageDimensions, t, processing.isLoading]);

  const handleBatchGenerate = useCallback(async () => {
    if (batchItems.length === 0 || processing.isLoading) return;
    playClick();
    
    setProcessing({ 
      isLoading: true, 
      statusText: t.rendering, 
      error: null,
      batchTotal: batchItems.length,
      batchCurrent: 1
    });

    const results: string[] = [];
    const updatedBatch = [...batchItems];

    try {
      for (let i = 0; i < batchItems.length; i++) {
        setProcessing(prev => ({ ...prev, batchCurrent: i + 1 }));
        updatedBatch[i].status = 'processing';
        setBatchItems([...updatedBatch]);

        const prompt = `${DEFAULT_PROMPT} style: ${LIGHTING_STYLES[lighting]}, colors: ${COLOR_GRADING_STYLES[colorGrading]}. ${description}`;
        try {
          const result = await generateEditedImage(batchItems[i].original, prompt, aspectRatio);
          results.push(result);
          updatedBatch[i].status = 'done';
          updatedBatch[i].result = result;
          
          await saveHistoryItem({
            id: `batch-${Date.now()}-${i}`,
            imageUrl: result,
            prompt: prompt,
            aspectRatio,
            timestamp: Date.now(),
            mode: 'batch',
            lighting,
            colorGrading
          });
        } catch (itemErr: any) {
          updatedBatch[i].status = 'error';
          updatedBatch[i].error = itemErr.message;
        }
        setBatchItems([...updatedBatch]);
      }
      playSuccess();
      setBatchResults(results);
      if (results.length > 0) setResultImage(results[0]);
    } catch (err: any) {
      playError();
      setProcessing(prev => ({ ...prev, error: "Batch processing failed." }));
    } finally {
      setProcessing(prev => ({ ...prev, isLoading: false }));
    }
  }, [batchItems, lighting, colorGrading, description, aspectRatio, t, processing.isLoading]);

  const handleImageSelected = (img: string | string[]) => {
    playClick();
    if (Array.isArray(img)) {
      setBatchItems(img.map((b64, idx) => ({
        id: `img-${idx}-${Date.now()}`,
        original: b64,
        status: 'pending'
      })));
      setSelectedImage(img[0]);
    } else {
      setSelectedImage(img);
      setBatchItems([]);
    }
  };

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
    setBatchItems([]);
    setBatchResults([]);
    setImageDimensions(undefined);
    setResultImage(null);
    setComparisonMode(false);
    setChatMessages([]);
    setProcessing({ isLoading: false, statusText: '', error: null });
  };

  // --- UI RENDER SECTIONS ---

  if (!selectedImage && !processing.error) {
    return (
      <div className="min-h-screen bg-black text-white relative overflow-hidden flex flex-col">
        <LivingBackground />
        <header className="relative z-50 p-8 flex justify-between items-center max-w-[1700px] mx-auto w-full">
          <div className="flex items-center gap-4 group transition-transform duration-500" style={{ transform: `translate(${mouseOffset.x * 0.2}px, ${mouseOffset.y * 0.2}px)` }}>
            <img src={APP_LOGO} alt="Logo" className="w-14 h-14 rounded-2xl shadow-neon-blue animate-logo-cinema object-cover border border-white/10" />
            <div>
              <h1 className="text-xl font-black tracking-tighter uppercase text-white">موسسه صبح امید</h1>
              <span className="text-[9px] text-studio-neon uppercase tracking-[0.4em] font-bold opacity-70">STUDIO CRYSTAL v4.2</span>
            </div>
          </div>
          <div className="flex bg-white/5 backdrop-blur-2xl rounded-2xl p-1 border border-white/10">
            <button onClick={() => setLanguage('fa')} className={`px-5 py-2 rounded-xl text-[10px] font-black transition-all ${language === 'fa' ? 'bg-studio-neon text-black' : 'text-gray-500'}`}>FA</button>
            <button onClick={() => setLanguage('en')} className={`px-5 py-2 rounded-xl text-[10px] font-black transition-all ${language === 'en' ? 'bg-studio-neon text-black' : 'text-gray-500'}`}>EN</button>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center p-6 relative z-10 animate-reveal">
          <div className="w-full max-w-4xl space-y-12">
            <div className="text-center space-y-4">
              <h2 className="text-6xl md:text-8xl font-black tracking-tighter uppercase leading-none italic drop-shadow-2xl">
                {language === 'fa' ? 'موسسه صبح امید' : 'SOBH-E OMID INSTITUTION'}
              </h2>
              <p className="text-studio-neon/60 text-[10px] uppercase tracking-[0.6em] font-bold animate-pulse">
                {language === 'fa' ? 'آغاز یک تجربه بصری فراتر از واقعیت' : 'START A VISUAL EXPERIENCE BEYOND REALITY'}
              </p>
            </div>
            <div className="bg-white/5 backdrop-blur-3xl rounded-[4rem] p-4 border border-white/10 shadow-glass-heavy transform transition-all hover:scale-[1.01]">
              <ImageUpload 
                title={t.uploadTitle}
                selectedImage={null}
                onImageSelected={handleImageSelected}
                onDimensionsDetected={(w, h) => setImageDimensions({width: w, height: h})}
                language={language}
                allowMultiple={true}
                className="h-[400px]"
              />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (selectedImage && !resultImage && !processing.error) {
    const isBatch = batchItems.length > 0;
    return (
      <div className="min-h-screen bg-[#020202] text-white relative overflow-hidden flex flex-col">
        <LivingBackground />
        <header className="relative z-50 p-6 flex justify-between items-center border-b border-white/10 backdrop-blur-3xl bg-black/60 shadow-glass">
           <div className="flex items-center gap-4 cursor-pointer group" onClick={reset}>
             <img src={APP_LOGO} className="w-10 h-10 rounded-xl shadow-neon-blue border border-white/20 animate-logo-cinema" alt="logo" />
             <div className="hidden md:block">
               <h1 className="text-sm font-black uppercase tracking-widest">موسسه صبح امید</h1>
               <p className="text-[8px] text-studio-neon font-bold uppercase opacity-60 italic">Crystal Engine Rendering</p>
             </div>
           </div>
           
           <div className="flex items-center gap-4">
             {isBatch && (
                <div className="bg-studio-neon/10 border border-studio-neon/20 px-4 py-2 rounded-xl flex items-center gap-2">
                   <span className="w-1.5 h-1.5 bg-studio-neon rounded-full animate-pulse"></span>
                   <span className="text-[9px] font-black text-studio-neon uppercase tracking-widest">{t.batchMode} ({batchItems.length})</span>
                </div>
             )}
             <Button variant="gold" className="px-10 h-12 rounded-xl text-[10px]" onClick={isBatch ? handleBatchGenerate : handleGenerate} isLoading={processing.isLoading}>
               {isBatch ? t.batchGenerate : t.generate}
             </Button>
             <button onClick={reset} className="p-3 bg-white/5 border border-white/10 rounded-xl hover:text-red-500 transition-colors">
               <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
             </button>
           </div>
        </header>

        <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden relative z-10">
          {/* Settings Sidebar */}
          <aside className="lg:col-span-3 border-r border-white/10 p-8 space-y-8 overflow-y-auto bg-white/5 backdrop-blur-3xl animate-slide-in-left custom-scrollbar">
             <div className="space-y-6">
                <div className="flex items-center gap-3 text-studio-gold">
                   <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m10 0a2 2 0 100-4m0 4a2 2 0 110-4" strokeWidth={2}/></svg>
                   <h2 className="text-[11px] font-black uppercase tracking-[0.4em]">{t.configTitle}</h2>
                </div>

                <div className="space-y-4">
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{t.aspectRatio}</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['AUTO', '1:1', '4:3', '16:9', '9:16', '3:4'] as AspectRatio[]).map(ratio => (
                      <button key={ratio} onClick={() => setAspectRatio(ratio)} className={`py-3 text-[9px] font-black border rounded-xl transition-all ${aspectRatio === ratio ? 'border-studio-neon text-studio-neon bg-studio-neon/10' : 'border-white/5 bg-white/5 text-gray-500 hover:border-white/20'}`}>
                        {ratio === 'AUTO' ? t.ratioAuto : ratio}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{t.lightingIntensity}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(LIGHTING_STYLES) as LightingIntensity[]).map(l => (
                      <button key={l} onClick={() => setLighting(l)} className={`p-4 border rounded-2xl flex flex-col items-center gap-2 transition-all ${lighting === l ? 'border-studio-neon bg-studio-neon/10 text-studio-neon' : 'border-white/5 bg-white/5 text-gray-400 hover:border-white/20'}`}>
                        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d={LIGHTING_ICONS[l]} strokeWidth={1.5} /></svg>
                        <span className="text-[8px] font-black uppercase tracking-widest">{t[`light${l.charAt(0).toUpperCase() + l.slice(1)}` as keyof typeof t]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                   <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{t.colorGrading}</label>
                   <div className="space-y-2">
                      {(Object.keys(COLOR_GRADING_STYLES) as ColorGradingStyle[]).map(style => (
                        <button key={style} onClick={() => setColorGrading(style)} className={`w-full py-4 px-5 flex items-center gap-4 text-[9px] font-black border rounded-xl transition-all ${colorGrading === style ? 'border-studio-neon text-studio-neon bg-studio-neon/10' : 'border-white/5 bg-white/5 text-gray-500 hover:border-white/20'}`}>
                          <svg className="w-5 h-5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d={COLOR_ICONS[style]} strokeWidth={2}/></svg>
                          {style.replace('_', ' ').toUpperCase()}
                        </button>
                      ))}
                   </div>
                </div>
             </div>
          </aside>

          {/* Canvas Section */}
          <section className="lg:col-span-5 p-8 flex flex-col h-full items-center space-y-8 overflow-y-auto custom-scrollbar animate-reveal">
             {processing.isLoading && isBatch && (
                <div className="w-full bg-white/5 border border-white/10 p-6 rounded-[2rem] space-y-4 animate-pulse">
                   <div className="flex justify-between items-center text-[10px] font-black uppercase text-studio-neon">
                      <span>{t.batchStatus.replace('{current}', String(processing.batchCurrent)).replace('{total}', String(processing.batchTotal))}</span>
                      <span>{Math.round(((processing.batchCurrent || 0) / (processing.batchTotal || 1)) * 100)}%</span>
                   </div>
                   <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-studio-neon shadow-neon-blue transition-all duration-700" style={{ width: `${((processing.batchCurrent || 0) / (processing.batchTotal || 1)) * 100}%` }}></div>
                   </div>
                </div>
             )}

             <div className="w-full flex-1 flex items-center justify-center p-4">
                {isBatch ? (
                   <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 w-full">
                      {batchItems.map((item) => (
                         <div key={item.id} className={`relative aspect-square rounded-[1.5rem] overflow-hidden border transition-all duration-300 ${item.status === 'processing' ? 'border-studio-neon ring-4 ring-studio-neon/20 scale-105' : 'border-white/10'}`}>
                            <img src={item.original} className="w-full h-full object-cover" alt="Batch" />
                            <div className={`absolute inset-0 bg-black/60 flex items-center justify-center transition-opacity ${item.status === 'pending' ? 'opacity-0' : 'opacity-100'}`}>
                               {item.status === 'processing' && <div className="w-6 h-6 border-3 border-studio-neon border-t-transparent rounded-full animate-spin"></div>}
                               {item.status === 'done' && <svg className="w-8 h-8 text-studio-neon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" /></svg>}
                               {item.status === 'error' && <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M6 18L18 6M6 6l12 12" /></svg>}
                            </div>
                         </div>
                      ))}
                   </div>
                ) : (
                   <div className="w-full max-w-xl aspect-square relative rounded-[3rem] overflow-hidden border border-white/10 bg-black/40 group shadow-glass-heavy">
                      <img src={selectedImage} alt="Monitor" className="w-full h-full object-contain p-8 group-hover:scale-105 transition-transform duration-1000" />
                   </div>
                )}
             </div>

             <div className="w-full max-w-2xl bg-white/5 border border-white/10 rounded-[2.5rem] p-6 space-y-4">
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t.chatPlaceholder}
                  className="w-full bg-transparent border-none text-sm text-white placeholder:text-gray-600 focus:ring-0 resize-none min-h-[80px]"
                />
                <div className="flex flex-wrap gap-2">
                   {PROMPT_SUGGESTIONS.map(s => (
                     <button key={s.id} onClick={() => setDescription(s.prompt)} className="px-4 py-2 rounded-full border border-white/5 bg-white/5 text-[9px] font-black uppercase text-gray-500 hover:text-studio-neon hover:border-studio-neon transition-all">
                        {s.labelKey}
                     </button>
                   ))}
                </div>
             </div>
          </section>

          {/* Chat Section */}
          <section className="lg:col-span-4 border-l border-white/10 bg-white/5 backdrop-blur-3xl animate-slide-in-right">
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

  // Result and Error stages
  if (processing.error) {
     return (
       <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
         <LivingBackground />
         <div className="max-w-xl w-full bg-red-500/5 border border-red-500/20 rounded-[4rem] p-16 text-center space-y-10 relative z-10 backdrop-blur-3xl animate-reveal shadow-glass-heavy">
           <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto text-red-500">
             <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth={2.5}/></svg>
           </div>
           <div className="space-y-2">
              <h2 className="text-2xl font-black uppercase tracking-tighter text-red-500">{processing.error === 'ERR_SAFETY' ? t.ERR_SAFETY : t.ERR_GENERIC}</h2>
              <p className="text-gray-400 text-sm">{processing.error === 'ERR_SAFETY' ? t.ERR_SAFETY_DESC : processing.error}</p>
           </div>
           <div className="flex gap-4">
             <Button variant="gold" className="flex-1 rounded-2xl" onClick={handleGenerate}>{t.TRY_AGAIN}</Button>
             <Button variant="secondary" className="flex-1 rounded-2xl" onClick={reset}>{t.BACK_TO_STUDIO}</Button>
           </div>
         </div>
       </div>
     );
  }

  if (resultImage) {
    const isBatch = batchItems.length > 0;
    return (
      <div className="min-h-screen bg-black text-white relative flex flex-col">
        <LivingBackground />
        <header className="relative z-50 p-6 flex justify-between items-center bg-black/60 backdrop-blur-3xl border-b border-white/10 shadow-glass">
           <div className="flex items-center gap-4 cursor-pointer" onClick={reset}>
             <img src={APP_LOGO} className="w-10 h-10 rounded-xl shadow-neon-blue border border-white/20 animate-logo-cinema" alt="logo" />
             <h1 className="text-sm font-black uppercase tracking-widest">موسسه صبح امید</h1>
           </div>
           <div className="flex gap-4">
              <Button variant="secondary" className="px-6 h-12 rounded-xl text-[10px]" onClick={reset}>{t.newGeneration}</Button>
              <a href={resultImage} download="masterpiece.png">
                <Button variant="gold" className="px-10 h-12 rounded-xl text-[10px]">{t.download}</Button>
              </a>
           </div>
        </header>

        <main className="flex-1 p-6 md:p-12 flex flex-col items-center justify-center animate-reveal gap-8 overflow-y-auto">
           <div className="w-full max-w-6xl shadow-glass-heavy rounded-[4rem] overflow-hidden border border-white/20 relative bg-black/40 backdrop-blur-3xl">
              {comparisonMode ? (
                <div className="h-[70vh]"><ComparisonView original={selectedImage!} result={resultImage!} /></div>
              ) : (
                <div className="relative aspect-auto max-h-[75vh] flex items-center justify-center p-8 group">
                   <img src={resultImage} alt="result" className="max-w-full max-h-[70vh] object-contain rounded-[3rem] shadow-2xl transition-all duration-1000 group-hover:scale-105" />
                   <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-12">
                      <Button variant="primary" onClick={() => setComparisonMode(true)} className="px-12 h-16 rounded-full text-[11px] bg-black/40 backdrop-blur-3xl border-white/20 shadow-neon-blue hover:scale-110">
                        {t.viewCompare}
                      </Button>
                   </div>
                </div>
              )}
           </div>

           {isBatch && (
              <div className="flex gap-3 overflow-x-auto p-4 max-w-full custom-scrollbar bg-white/5 rounded-[2.5rem] border border-white/10">
                 {batchItems.map((item) => (
                    item.status === 'done' && (
                      <button 
                        key={item.id} 
                        onClick={() => { setResultImage(item.result!); setComparisonMode(false); }}
                        className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${resultImage === item.result ? 'border-studio-neon scale-110 shadow-neon-blue' : 'border-white/10 hover:border-white/30'}`}
                      >
                        <img src={item.result} className="w-full h-full object-cover" alt="Result Thumb" />
                      </button>
                    )
                 ))}
              </div>
           )}
        </main>
      </div>
    );
  }

  return null;
};

export default App;
