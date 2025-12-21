
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ImageUpload } from './components/ImageUpload';
import { Button } from './components/Button';
import { ComparisonView } from './components/ComparisonView';
import { generateEditedImage, sendChatMessage } from './services/geminiService';
import { saveHistoryItem } from './services/storageService';
import { generateInstantVideo } from './services/clientVideoService';
import { DEFAULT_PROMPT, LIGHTING_STYLES, COLOR_GRADING_STYLES, PROMPT_SUGGESTIONS, LIGHTING_ICONS, COLOR_ICONS, LOADING_MESSAGES } from './constants';
import { ProcessingState, AspectRatio, Language, LightingIntensity, ColorGradingStyle, ChatMessage, BatchItem } from './types';
import { translations } from './translations';
import { LivingBackground } from './components/LivingBackground';
import { HistoryGallery } from './components/HistoryGallery';
import { ImageEditor } from './components/ImageEditor';
import { ChatInterface } from './components/ChatInterface';
import { playSuccess, playError, playClick, playUpload } from './services/audioService';

const APP_LOGO = "https://dl1.negarestock.ir/S/p/2024/10/4/1728068570_31103_Untitled-1.jpg";

const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>('fa');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [imageDimensions, setImageDimensions] = useState<{width: number, height: number} | undefined>(undefined);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [description, setDescription] = useState('');
  const [processing, setProcessing] = useState<ProcessingState>({
    isLoading: false,
    statusText: '',
    error: null,
    progress: 0,
    batchCurrent: 0,
    batchTotal: 0,
    currentStageKey: ''
  });
  const [lighting, setLighting] = useState<LightingIntensity>('soft');
  const [colorGrading, setColorGrading] = useState<ColorGradingStyle>('none');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('AUTO');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [showLiveView, setShowLiveView] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [mouseOffset, setMouseOffset] = useState({ x: 0, y: 0 });

  const t = translations[language];
  const loadingIntervalRef = useRef<number | null>(null);

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

    // Reset processing state
    const initialStatus = t[LOADING_MESSAGES[0]] || t.rendering;
    setProcessing({ 
      isLoading: true, 
      statusText: initialStatus, 
      error: null, 
      progress: 5,
      currentStageKey: LOADING_MESSAGES[0]
    });
    
    // Timer to cycle through messages and simulate progress
    const stages = [
      { key: LOADING_MESSAGES[0], targetProgress: 30, time: 2000 },
      { key: LOADING_MESSAGES[1], targetProgress: 60, time: 5000 },
      { key: LOADING_MESSAGES[2], targetProgress: 95, time: 10000 },
    ];

    let currentStageIndex = 0;
    const startTime = Date.now();

    loadingIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      
      // Determine current stage based on elapsed time
      if (currentStageIndex < stages.length - 1 && elapsed > stages[currentStageIndex + 1].time) {
        currentStageIndex++;
      }

      const stage = stages[currentStageIndex];
      const prevStageProgress = currentStageIndex > 0 ? stages[currentStageIndex - 1].targetProgress : 5;
      const stageDuration = currentStageIndex > 0 ? stage.time - stages[currentStageIndex - 1].time : stage.time;
      const stageElapsed = currentStageIndex > 0 ? elapsed - stages[currentStageIndex - 1].time : elapsed;
      
      // Interpolate progress within the stage
      const stagePercent = Math.min(stageElapsed / stageDuration, 1);
      const currentProgress = prevStageProgress + (stage.targetProgress - prevStageProgress) * stagePercent;

      setProcessing(prev => ({ 
        ...prev, 
        statusText: t[stage.key] || t.rendering,
        progress: Math.floor(currentProgress),
        currentStageKey: stage.key
      }));
    }, 200);
    
    try {
      const prompt = `${DEFAULT_PROMPT} style: ${LIGHTING_STYLES[lighting]}, colors: ${COLOR_GRADING_STYLES[colorGrading]}. ${description}`;
      const result = await generateEditedImage(selectedImage, prompt, aspectRatio, imageDimensions);
      
      if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
      setProcessing(prev => ({ ...prev, progress: 100, currentStageKey: 'done' }));
      
      playSuccess();
      setResultImage(result);
      setVideoUrl(null);
      setShowLiveView(false);
      
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
      if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
      console.error(err);
      playError();
      setProcessing(prev => ({ ...prev, error: err.message || "ERR_GENERIC" }));
    } finally {
      setProcessing(prev => ({ ...prev, isLoading: false }));
    }
  }, [selectedImage, lighting, colorGrading, description, aspectRatio, imageDimensions, t, processing.isLoading]);

  const handleAnimate = async () => {
    if (!resultImage || isAnimating) return;
    playClick();
    setIsAnimating(true);
    try {
      const url = await generateInstantVideo(resultImage);
      setVideoUrl(url);
      setShowLiveView(true);
      playSuccess();
    } catch (err) {
      console.error("Animation failed", err);
      playError();
    } finally {
      setIsAnimating(false);
    }
  };

  const handleBatchGenerate = useCallback(async () => {
    if (batchItems.length === 0 || processing.isLoading) return;
    playClick();
    
    setProcessing({ 
      isLoading: true, 
      statusText: t.rendering, 
      error: null,
      batchTotal: batchItems.length,
      batchCurrent: 1,
      progress: 0,
      currentStageKey: 'batch'
    });

    const results: string[] = [];
    const updatedBatch = [...batchItems];

    try {
      for (let i = 0; i < batchItems.length; i++) {
        setProcessing(prev => ({ ...prev, batchCurrent: i + 1, progress: Math.round(((i + 1) / batchItems.length) * 100) }));
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
      if (results.length > 0) {
        setResultImage(results[0]);
        setVideoUrl(null);
        setShowLiveView(false);
      }
    } catch (err: any) {
      playError();
      setProcessing(prev => ({ ...prev, error: "ERR_GENERIC" }));
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

  const handleEditorSave = (newImage: string) => {
    setResultImage(newImage);
    setShowEditor(false);
    playSuccess();
  };

  const reset = () => {
    playClick();
    if (loadingIntervalRef.current) clearInterval(loadingIntervalRef.current);
    setSelectedImage(null);
    setBatchItems([]);
    setImageDimensions(undefined);
    setResultImage(null);
    setVideoUrl(null);
    setShowLiveView(false);
    setComparisonMode(false);
    setShowEditor(false);
    setChatMessages([]);
    setProcessing({ isLoading: false, statusText: '', error: null, progress: 0, currentStageKey: '' });
  };

  if (!selectedImage && !processing.error) {
    return (
      <div className="min-h-screen bg-black text-white relative overflow-hidden flex flex-col">
        <LivingBackground />
        <header className="relative z-50 p-8 flex justify-between items-center max-w-[1700px] mx-auto w-full">
          <div className="flex items-center gap-4 group transition-transform duration-500" style={{ transform: `translate(${mouseOffset.x * 0.2}px, ${mouseOffset.y * 0.2}px)` }}>
            <img src={APP_LOGO} alt="Logo" className="w-14 h-14 rounded-2xl shadow-neon-blue animate-logo-cinema object-cover border border-white/10" />
            <div>
              <h1 className="text-xl font-black tracking-tighter uppercase text-white">موسسه صبح امید</h1>
              <span className="text-[9px] text-studio-neon uppercase tracking-[0.4em] font-bold opacity-70">STUDIO CRYSTAL v4.5</span>
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
                currentAspectRatio={aspectRatio}
                onAspectRatioChange={setAspectRatio}
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
               <p className="text-[8px] text-studio-neon font-bold uppercase opacity-60 italic">Crystal Engine v4.5 Rendering</p>
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
                      <button key={ratio} disabled={processing.isLoading} onClick={() => setAspectRatio(ratio)} className={`py-3 text-[9px] font-black border rounded-xl transition-all ${aspectRatio === ratio ? 'border-studio-neon text-studio-neon bg-studio-neon/10' : 'border-white/5 bg-white/5 text-gray-500 hover:border-white/20'} disabled:opacity-50`}>
                        {ratio === 'AUTO' ? t.ratioAuto : ratio}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{t.lightingIntensity}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(Object.keys(LIGHTING_STYLES) as LightingIntensity[]).map(l => (
                      <button key={l} disabled={processing.isLoading} onClick={() => setLighting(l)} className={`p-4 border rounded-2xl flex flex-col items-center gap-2 transition-all ${lighting === l ? 'border-studio-neon bg-studio-neon/10 text-studio-neon' : 'border-white/5 bg-white/5 text-gray-400 hover:border-white/20'} disabled:opacity-50`}>
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
                        <button key={style} disabled={processing.isLoading} onClick={() => setColorGrading(style)} className={`w-full py-4 px-5 flex items-center gap-4 text-[9px] font-black border rounded-xl transition-all ${colorGrading === style ? 'border-studio-neon text-studio-neon bg-studio-neon/10' : 'border-white/5 bg-white/5 text-gray-500 hover:border-white/20'} disabled:opacity-50`}>
                          <svg className="w-5 h-5 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d={COLOR_ICONS[style]} strokeWidth={2}/></svg>
                          {style.replace('_', ' ').toUpperCase()}
                        </button>
                      ))}
                   </div>
                </div>
             </div>
          </aside>

          <section className="lg:col-span-5 p-8 flex flex-col h-full items-center space-y-8 overflow-y-auto custom-scrollbar animate-reveal">
             {processing.isLoading && (
                <div className={`w-full bg-black/60 border border-studio-neon/30 p-10 rounded-[4rem] space-y-8 animate-reveal backdrop-blur-3xl shadow-[0_0_100px_rgba(0,240,255,0.1)] relative overflow-hidden group transition-all duration-1000 ${processing.currentStageKey === 'loadLighting' ? 'ring-2 ring-studio-neon/40' : ''}`}>
                   {/* Load Lighting Visual Cues */}
                   {processing.currentStageKey === 'loadLighting' && (
                      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
                        <div className="absolute top-0 -left-1/4 w-1/2 h-full bg-gradient-to-r from-transparent via-studio-neon/20 to-transparent animate-shimmer-fast"></div>
                        <div className="absolute bottom-0 -right-1/4 w-1/2 h-full bg-gradient-to-l from-transparent via-studio-gold/20 to-transparent animate-shimmer-fast" style={{ animationDelay: '1s' }}></div>
                      </div>
                   )}
                   
                   <div className="absolute inset-0 bg-gradient-to-br from-studio-neon/5 to-transparent pointer-events-none"></div>
                   <div className="relative z-10 flex flex-col gap-6">
                      <div className="flex justify-between items-end">
                         <div className="space-y-3">
                            <h4 className="text-sm font-black uppercase tracking-[0.5em] text-studio-neon animate-pulse">{processing.statusText}</h4>
                            <p className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">{isBatch ? t.batchMode : 'PREMIUM 4K NEURAL SYNTHESIS'}</p>
                         </div>
                         <div className="text-right">
                            <span className="text-4xl font-black text-white font-mono drop-shadow-neon-blue">{processing.progress}%</span>
                         </div>
                      </div>
                      
                      <div className="w-full h-4 bg-white/5 rounded-full overflow-hidden border border-white/10 p-1">
                         <div 
                           className="h-full bg-gradient-to-r from-studio-neon via-studio-violet to-studio-gold shadow-[0_0_20px_rgba(0,240,255,0.5)] transition-all duration-700 ease-out rounded-full relative overflow-hidden" 
                           style={{ width: `${processing.progress}%` }}
                         >
                            {/* Finalizing Shimmer Effect */}
                            <div className={`absolute inset-0 bg-white/20 transition-opacity duration-1000 ${processing.currentStageKey === 'loadFinalizing' ? 'animate-shimmer-fast opacity-80' : 'animate-shimmer-fast opacity-30'}`}></div>
                         </div>
                      </div>

                      <div className="flex justify-between text-[9px] font-black uppercase tracking-widest text-gray-600">
                         <span>Phase {processing.progress < 30 ? '01' : processing.progress < 60 ? '02' : '03'}</span>
                         <span>Refining Micro-Textures</span>
                         <span>Sub-pixel Precision</span>
                      </div>
                   </div>

                   {isBatch && (
                      <div className="text-center pt-4 border-t border-white/5 relative z-10">
                         <span className="text-[11px] font-black text-studio-gold uppercase tracking-[0.3em]">
                           {t.batchStatus.replace('{current}', String(processing.batchCurrent)).replace('{total}', String(processing.batchTotal))}
                         </span>
                      </div>
                   )}
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
                   <div className={`w-full max-w-xl aspect-square relative rounded-[3rem] overflow-hidden border border-white/10 bg-black/40 group shadow-glass-heavy transition-all duration-700 ${processing.isLoading ? 'opacity-30 scale-95 blur-sm' : 'opacity-100 scale-100 blur-0'}`}>
                      <img src={selectedImage} alt="Monitor" className="w-full h-full object-contain p-8 group-hover:scale-105 transition-transform duration-1000" />
                   </div>
                )}
             </div>

             <div className="w-full max-w-2xl bg-white/5 border border-white/10 rounded-[2.5rem] p-6 space-y-4">
                <textarea 
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t.chatPlaceholder}
                  disabled={processing.isLoading}
                  className="w-full bg-transparent border-none text-sm text-white placeholder:text-gray-600 focus:ring-0 resize-none min-h-[80px]"
                />
                <div className="flex flex-wrap gap-2">
                   {PROMPT_SUGGESTIONS.map(s => (
                     <button key={s.id} disabled={processing.isLoading} onClick={() => setDescription(s.prompt)} className="px-4 py-2 rounded-full border border-white/5 bg-white/5 text-[9px] font-black uppercase text-gray-500 hover:text-studio-neon hover:border-studio-neon transition-all disabled:opacity-50">
                        {s.labelKey}
                     </button>
                   ))}
                </div>
             </div>
          </section>

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

  if (resultImage) {
    if (showEditor) {
      return (
        <div className="min-h-screen bg-black text-white relative flex flex-col p-8">
           <LivingBackground />
           <header className="relative z-50 mb-8 flex justify-between items-center bg-black/40 p-6 rounded-3xl border border-white/10 backdrop-blur-2xl">
              <h2 className="text-xl font-black uppercase tracking-[0.4em] text-studio-neon">{t.viewEdit}</h2>
              <button onClick={() => setShowEditor(false)} className="p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
           </header>
           <div className="flex-1 relative z-10 overflow-hidden">
             <ImageEditor imageSrc={resultImage} onSave={handleEditorSave} language={language} />
           </div>
        </div>
      );
    }

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
              <div className="bg-white/5 p-1 rounded-xl flex border border-white/10 backdrop-blur-2xl mr-4">
                 <button onClick={() => setShowLiveView(false)} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${!showLiveView ? 'bg-white/10 text-white' : 'text-gray-500'}`}>{t.viewStatic}</button>
                 <button onClick={() => { if(videoUrl) setShowLiveView(true); else handleAnimate(); }} className={`px-4 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${showLiveView ? 'bg-studio-neon text-black' : 'text-gray-500'}`}>{t.viewLive}</button>
              </div>
              <Button variant="secondary" className="px-6 h-12 rounded-xl text-[10px]" onClick={() => setShowEditor(true)}>{t.viewEdit}</Button>
              <Button variant="secondary" className="px-6 h-12 rounded-xl text-[10px]" onClick={reset}>{t.newGeneration}</Button>
              <a href={showLiveView && videoUrl ? videoUrl : resultImage} download={showLiveView ? "cinematic_live.webm" : "masterpiece.png"}>
                <Button variant="gold" className="px-10 h-12 rounded-xl text-[10px]">{t.download}</Button>
              </a>
           </div>
        </header>

        <main className="flex-1 p-6 md:p-12 flex flex-col items-center justify-center animate-reveal gap-8 overflow-y-auto">
           <div className="w-full max-w-6xl shadow-glass-heavy rounded-[4rem] overflow-hidden border border-white/20 relative bg-black/40 backdrop-blur-3xl aspect-video md:aspect-auto">
              {comparisonMode ? (
                <div className="h-[70vh]"><ComparisonView original={selectedImage!} result={resultImage!} /></div>
              ) : (
                <div className="relative aspect-auto max-h-[75vh] flex items-center justify-center p-8 group">
                   {showLiveView && videoUrl ? (
                      <video 
                        src={videoUrl} 
                        autoPlay 
                        loop 
                        className="max-w-full max-h-[70vh] object-contain rounded-[3rem] shadow-2xl"
                      />
                   ) : (
                      <img src={resultImage} alt="result" className="max-w-full max-h-[70vh] object-contain rounded-[3rem] shadow-2xl transition-all duration-1000 group-hover:scale-105" />
                   )}
                   
                   <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-12 gap-4">
                      <Button variant="primary" onClick={() => setComparisonMode(true)} className="px-8 h-14 rounded-full text-[10px] bg-black/40 backdrop-blur-3xl border-white/20 shadow-neon-blue hover:scale-110">
                        {t.viewCompare}
                      </Button>
                      {!videoUrl && (
                        <Button variant="gold" onClick={handleAnimate} isLoading={isAnimating} className="px-8 h-14 rounded-full text-[10px] shadow-neon-gold border-0 hover:scale-110">
                           {t.animate}
                        </Button>
                      )}
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
                        onClick={() => { setResultImage(item.result!); setVideoUrl(null); setShowLiveView(false); setComparisonMode(false); }}
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

  if (processing.error) {
     const errKey = processing.error as keyof typeof t;
     const displayTitle = t[errKey] || t.ERR_GENERIC;
     const displayDesc = t[`${String(errKey)}_DESC` as keyof typeof t] || processing.error;

     return (
       <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
         <LivingBackground />
         <div className="max-w-2xl w-full bg-red-500/5 border border-red-500/20 rounded-[4rem] p-12 md:p-16 text-center space-y-10 relative z-10 backdrop-blur-3xl animate-reveal shadow-glass-heavy">
           <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto text-red-500 shadow-lg shadow-red-500/10">
             <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" strokeWidth={2.5}/></svg>
           </div>
           <div className="space-y-4">
              <h2 className="text-3xl font-black uppercase tracking-tighter text-red-500">{displayTitle}</h2>
              <p className="text-gray-400 text-base leading-relaxed max-w-md mx-auto">{displayDesc}</p>
           </div>
           <div className="flex flex-col sm:flex-row gap-4 pt-4">
             <Button variant="gold" className="flex-1 rounded-2xl h-16" onClick={handleGenerate}>{t.TRY_AGAIN}</Button>
             <Button variant="secondary" className="flex-1 rounded-2xl h-16" onClick={reset}>{t.BACK_TO_STUDIO}</Button>
           </div>
           <p className="text-[10px] text-gray-600 uppercase tracking-widest pt-4">Internal Error ID: {processing.error}</p>
         </div>
       </div>
     );
  }

  return null;
};

export default App;
