

import React, { useState, useCallback, useEffect } from 'react';
import { ImageUpload } from './components/ImageUpload';
import { Button } from './components/Button';
import { ChatInterface } from './components/ChatInterface';
import { ImageCropper } from './components/ImageCropper';
import { LivingBackground } from './components/LivingBackground';
import { ComparisonView } from './components/ComparisonView';
import { generateEditedImage, generateFaceSwap } from './services/geminiService';
import { generateInstantVideo } from './services/clientVideoService';
import { saveHistoryItem } from './services/storageService';
import { DEFAULT_PROMPT, QUALITY_MODIFIERS, LIGHTING_STYLES, COLOR_GRADING_STYLES, PROMPT_SUGGESTIONS, LOADING_MESSAGES, LIGHTING_ICONS } from './constants';
import { ProcessingState, AspectRatio, HistoryItem, Language, ChatMessage, QualityMode, LightingIntensity, ColorGradingStyle, Theme, BatchItem, AppMode } from './types';
import { translations } from './translations';

function App() {
  const [language, setLanguage] = useState<Language>('fa');
  const theme: Theme = 'dark';
  const t = translations[language];
  
  // App Mode State
  const [appMode, setAppMode] = useState<AppMode>('portrait');

  // Image State
  const [selectedImage, setSelectedImage] = useState<string | null>(null); // Acts as "Target/Base" in Face Swap
  const [swapFaceImage, setSwapFaceImage] = useState<string | null>(null); // "Source/Face" in Face Swap

  const [resultImage, setResultImage] = useState<string | null>(null);
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);

  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("AUTO"); // Default to AUTO based on request
  const [quality, setQuality] = useState<QualityMode>('high');
  const [status, setStatus] = useState<ProcessingState>({ isLoading: false, error: null });
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  // Cropper State
  const [isCropping, setIsCropping] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<'base' | 'face'>('base');

  // Loading Message State
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  // Settings
  const [skinTexture, setSkinTexture] = useState<boolean>(true);
  const [faceDetail, setFaceDetail] = useState<number>(65); 
  const [creativityLevel, setCreativityLevel] = useState<number>(30); // 0 to 100
  const [lighting, setLighting] = useState<LightingIntensity>('dramatic');
  const [colorGrading, setColorGrading] = useState<ColorGradingStyle>('teal_orange');
  
  // Animation State
  const [isAnimating, setIsAnimating] = useState(false);
  const [videoResult, setVideoResult] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'image' | 'video' | 'compare'>('image');

  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Batch
  const [batchQueue, setBatchQueue] = useState<BatchItem[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  // Improved Modern Logo
  const LOGO_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><defs><linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="%23facc15"/><stop offset="1" stop-color="%23ca8a04"/></linearGradient></defs><rect width="200" height="200" rx="40" fill="%2318181b"/><circle cx="100" cy="100" r="85" fill="none" stroke="url(%23gold)" stroke-width="2" stroke-opacity="0.3"/><circle cx="100" cy="100" r="65" fill="none" stroke="url(%23gold)" stroke-width="4" stroke-dasharray="10 15"/><path d="M100 40 L100 20 M100 160 L100 180 M40 100 L20 100 M160 100 L180 100 M58 58 L44 44 M142 142 L156 156 M142 58 L156 44 M58 142 L44 156" stroke="url(%23gold)" stroke-width="6" stroke-linecap="round"/><circle cx="100" cy="100" r="30" fill="url(%23gold)"/><path d="M100 85 A 15 15 0 0 1 115 100" stroke="%23713f12" stroke-width="3" fill="none" opacity="0.5"/><text x="100" y="165" font-family="sans-serif" font-weight="900" font-size="20" fill="%23facc15" text-anchor="middle" dy="0">امید</text><text x="100" y="55" font-family="sans-serif" font-weight="900" font-size="20" fill="%23facc15" text-anchor="middle" dy="0">صبح</text></svg>`;

  useEffect(() => {
    document.documentElement.classList.add('dark');
  }, []);

  useEffect(() => {
    let interval: any;
    if (status.isLoading && !isAnimating) {
      setLoadingMessageIndex(0);
      interval = setInterval(() => {
        setLoadingMessageIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [status.isLoading, isAnimating]);

  const addToHistory = async (image: string, p: string, ar: AspectRatio) => {
    const newItem: HistoryItem = {
      id: Date.now().toString() + Math.random().toString(36).substring(2),
      imageUrl: image,
      prompt: p,
      aspectRatio: ar,
      timestamp: Date.now(),
      skinTexture, faceDetail, lighting, colorGrading, creativityLevel,
      mode: appMode
    };
    setHistory(prev => [newItem, ...prev]);
    saveHistoryItem(newItem).catch(console.error);
  };

  const handleImageSelected = useCallback((base64: string | string[]) => {
    if (Array.isArray(base64)) {
       // Only enable batch in portrait mode for now
       if (appMode === 'portrait') {
         const newItems: BatchItem[] = base64.map((b, i) => ({
           id: `batch-${Date.now()}-${i}`,
           original: b,
           status: 'pending'
         }));
         setBatchQueue(newItems);
         setSelectedImage(base64[0]); 
       } else {
         setSelectedImage(base64[0]);
       }
    } else {
       setSelectedImage(base64 || null);
       setBatchQueue([]);
    }
    setResultImage(null);
    setVideoResult(null);
    setActiveTab('image');
    setStatus({ isLoading: false, error: null });
  }, [appMode]);

  const handleFaceImageSelected = useCallback((base64: string | string[]) => {
    if (Array.isArray(base64)) {
        setSwapFaceImage(base64[0]);
    } else {
        setSwapFaceImage(base64 || null);
    }
  }, []);

  const constructPrompt = () => {
    let finalPrompt = DEFAULT_PROMPT;
    if (selectedStyleId) {
      const style = PROMPT_SUGGESTIONS.find(s => s.id === selectedStyleId);
      if (style) finalPrompt = style.prompt; 
    }

    if (skinTexture) finalPrompt += ", high fidelity texture, realistic pores";
    if (faceDetail > 60) finalPrompt += ", hyper-detailed facial features";
    
    // Creativity Logic
    if (creativityLevel < 30) finalPrompt += ", subtle retouching, preserve original identity";
    else if (creativityLevel > 70) finalPrompt += ", creative interpretation, stylized, artistic";

    finalPrompt += `, ${LIGHTING_STYLES[lighting]}`;
    if (colorGrading !== 'none') finalPrompt += `, ${COLOR_GRADING_STYLES[colorGrading]}`;
    finalPrompt += QUALITY_MODIFIERS[quality];
    
    return finalPrompt;
  };

  const handleGenerate = async () => {
    if (!selectedImage) return;

    // Handle Face Swap Mode
    if (appMode === 'faceswap') {
      if (!swapFaceImage) return;
      setStatus({ isLoading: true, error: null });
      setResultImage(null);
      try {
        const prompt = t.swapPrompt;
        const img = await generateFaceSwap(selectedImage, swapFaceImage, prompt);
        setResultImage(img);
        await addToHistory(img, prompt, aspectRatio);
      } catch (error: any) {
        setStatus({ isLoading: false, error: error.message || t.errorGeneric });
      } finally {
        setStatus(prev => ({ ...prev, isLoading: false }));
      }
      return;
    }

    // Handle Portrait Mode (Batch or Single)
    if (batchQueue.length > 0) { handleBatchGenerate(); return; }

    setStatus({ isLoading: true, error: null });
    setResultImage(null);
    try {
      const finalPrompt = constructPrompt();
      const img = await generateEditedImage(selectedImage, finalPrompt, aspectRatio);
      setResultImage(img);
      await addToHistory(img, finalPrompt, aspectRatio);
    } catch (error: any) {
      setStatus({ isLoading: false, error: error.message || t.errorGeneric });
    } finally {
      setStatus(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleBatchGenerate = async () => {
    setIsBatchProcessing(true);
    const finalPrompt = constructPrompt();
    for (let i = 0; i < batchQueue.length; i++) {
      const item = batchQueue[i];
      setBatchQueue(prev => prev.map(p => p.id === item.id ? { ...p, status: 'processing' } : p));
      try {
        const result = await generateEditedImage(item.original, finalPrompt, aspectRatio);
        setBatchQueue(prev => prev.map(p => p.id === item.id ? { ...p, status: 'done', result } : p));
        if (i === 0) setResultImage(result);
        await addToHistory(result, finalPrompt, aspectRatio);
      } catch (err) {
        setBatchQueue(prev => prev.map(p => p.id === item.id ? { ...p, status: 'error' } : p));
      }
    }
    setIsBatchProcessing(false);
  };

  const handleAnimate = async () => {
    if (!resultImage) return;
    setIsAnimating(true);
    setStatus({ isLoading: true, error: null });
    try {
      const videoUrl = await generateInstantVideo(resultImage);
      setVideoResult(videoUrl);
      setActiveTab('video');
    } catch (error: any) {
      setStatus({ isLoading: false, error: error.message });
    } finally {
      setIsAnimating(false);
      setStatus(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleDownload = (url: string, filename: string) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = `SobheOmid_${filename}_${Date.now()}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleSendMessage = async (text: string) => {
    if (!resultImage) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text, timestamp: Date.now() };
    setChatMessages(prev => [...prev, userMsg]);
    
    setStatus({ isLoading: true, error: null });
    try {
       // Re-construct logic based on mode
       let img;
       if (appMode === 'faceswap' && selectedImage && swapFaceImage) {
         // In Face Swap, chat is tricky because we have two inputs. 
         // Strategy: Use the resultImage as the new base? Or re-run prompt modification?
         // For simplicity, let's treat it as editing the LAST result image.
         // Note: generateEditedImage accepts one image.
         const editPrompt = `${t.swapPrompt}, ${text}`;
         // We might need to send the original inputs again with modified prompt or just edit the result
         // Let's edit the result for now to keep it consistent with "refining" the output.
         img = await generateEditedImage(resultImage, editPrompt, aspectRatio);
       } else {
         const currentPrompt = constructPrompt();
         const editPrompt = `${currentPrompt}, ${text}`;
         img = await generateEditedImage(selectedImage!, editPrompt, aspectRatio);
       }
       
       setResultImage(img);
       // Add to history not implemented for chat flow to avoid clutter, but could be.

       const modelMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: t.modelGreeting, timestamp: Date.now() };
       setChatMessages(prev => [...prev, modelMsg]);
    } catch (error: any) {
      setStatus({ isLoading: false, error: error.message });
    } finally {
      setStatus(prev => ({ ...prev, isLoading: false }));
    }
  };

  return (
    <div dir={language === 'fa' ? 'rtl' : 'ltr'} className="min-h-screen bg-transparent text-white font-sans overflow-x-hidden relative selection:bg-studio-neon/30">
      
      <LivingBackground />

      {isCropping && imageToCrop && (
        <ImageCropper
          imageSrc={imageToCrop}
          onCropComplete={(cropped) => { 
             if (cropTarget === 'base') setSelectedImage(cropped);
             else setSwapFaceImage(cropped);
             setIsCropping(false); 
             setImageToCrop(null); 
          }}
          onCancel={() => { setIsCropping(false); setImageToCrop(null); }}
          confirmLabel={t.applyCrop} cancelLabel={t.cancelCrop} instructions={t.cropInstructions}
        />
      )}

      {/* Main Container */}
      <div className="relative z-10 max-w-[1920px] mx-auto p-4 md:p-6 lg:p-8 flex flex-col gap-6">
        
        {/* HEADER */}
        <header className="flex items-center justify-between animate-stagger-1 pb-4 border-b border-white/5">
           <div className="flex items-center gap-4 select-none">
              <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl overflow-hidden shadow-[0_0_25px_rgba(250,204,21,0.2)] hover:shadow-studio-gold/40 transition-shadow duration-500 bg-black">
                 <img src={LOGO_SVG} alt="Logo" className="w-full h-full object-cover" />
              </div>
              <div className="flex flex-col">
                 <h1 className="text-xl md:text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">{t.instituteName}</h1>
                 <p className="text-[10px] md:text-xs font-bold tracking-[0.3em] text-studio-neon uppercase">{t.appTitle}</p>
              </div>
           </div>

           <div className="flex items-center gap-3">
              <div className="flex items-center bg-black/30 backdrop-blur-md rounded-xl p-1 border border-white/5">
                 <button onClick={() => setLanguage('en')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${language === 'en' ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}>EN</button>
                 <button onClick={() => setLanguage('fa')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${language === 'fa' ? 'bg-white text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}>FA</button>
              </div>
           </div>
        </header>

        {/* WORKSPACE */}
        <main className="flex flex-col lg:flex-row gap-6 items-start">
          
          {/* LEFT PANEL - TOOLKIT */}
          <div className="w-full lg:w-[420px] xl:w-[460px] flex-shrink-0 flex flex-col gap-4 animate-stagger-2 order-2 lg:order-1">
            
            {/* MODE SWITCHER */}
            <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-2 flex gap-2 shadow-glass">
                <button 
                  onClick={() => { setAppMode('portrait'); setResultImage(null); }}
                  className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${appMode === 'portrait' ? 'bg-studio-neon/20 text-studio-neon border border-studio-neon/50 shadow-[0_0_20px_rgba(0,240,255,0.2)]' : 'text-gray-500 hover:text-white'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                  {t.modePortrait}
                </button>
                <button 
                  onClick={() => { setAppMode('faceswap'); setResultImage(null); }}
                  className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${appMode === 'faceswap' ? 'bg-studio-purple/20 text-studio-purple border border-studio-purple/50 shadow-[0_0_20px_rgba(168,85,247,0.2)]' : 'text-gray-500 hover:text-white'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" /></svg>
                  {t.modeFaceSwap}
                </button>
            </div>
            
            {/* SECTION 1: UPLOADS */}
            <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-glass">
               <div className="p-4 bg-white/5 border-b border-white/5 flex items-center gap-2">
                 <svg className="w-4 h-4 text-studio-neon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                 <h3 className="text-xs font-bold text-white uppercase tracking-widest">{t.sectionComposition}</h3>
               </div>
               <div className="p-4 space-y-4">
                  {/* BASE IMAGE UPLOAD */}
                  <ImageUpload 
                    onImageSelected={handleImageSelected} 
                    selectedImage={selectedImage}
                    queue={batchQueue}
                    title={appMode === 'faceswap' ? t.labelTarget : undefined}
                  />

                  {/* FACE SWAP: SECOND UPLOAD */}
                  {appMode === 'faceswap' && (
                    <div className="animate-fade-in-up">
                       <div className="flex items-center gap-4 my-2">
                          <div className="h-px bg-white/10 flex-1"></div>
                          <div className="p-2 bg-white/5 rounded-full border border-white/10">
                             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4 text-gray-400"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                          </div>
                          <div className="h-px bg-white/10 flex-1"></div>
                       </div>
                       <ImageUpload 
                         onImageSelected={handleFaceImageSelected} 
                         selectedImage={swapFaceImage}
                         title={t.labelSource}
                         className="h-48 md:h-56"
                       />
                    </div>
                  )}

                  {/* Aspect Ratio Selector (Only Show in Portrait Mode) */}
                  {appMode === 'portrait' && (
                    <div className="space-y-2">
                       <p className="text-[10px] uppercase font-bold text-gray-500">{t.aspectRatio}</p>
                       <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                          {/* Auto Option */}
                          <button
                              onClick={() => setAspectRatio('AUTO')}
                              className={`
                                relative group flex flex-col items-center justify-center p-2 rounded-lg border transition-all duration-300
                                ${aspectRatio === 'AUTO' 
                                  ? 'bg-white/10 border-studio-gold/50 shadow-[0_0_15px_rgba(255,215,0,0.15)]' 
                                  : 'bg-black/40 border-white/5 hover:border-white/20 hover:bg-white/5'}
                              `}
                            >
                              <div className={`border-[1.5px] border-dashed rounded-[2px] mb-1.5 transition-all ${aspectRatio === 'AUTO' ? 'border-studio-gold bg-studio-gold/20' : 'border-gray-500 group-hover:border-gray-300'} w-6 h-4`}></div>
                              <span className={`text-[9px] font-bold ${aspectRatio === 'AUTO' ? 'text-studio-gold' : 'text-gray-500'}`}>{t.ratioAuto}</span>
                          </button>
                          {[
                            { r: '1:1', w: 'w-4', h: 'h-4' },
                            { r: '4:3', w: 'w-5', h: 'h-[15px]' },
                            { r: '16:9', w: 'w-6', h: 'h-[13px]' },
                            { r: '3:4', w: 'w-[15px]', h: 'h-5' },
                            { r: '9:16', w: 'w-[13px]', h: 'h-6' },
                          ].map((item) => (
                            <button
                              key={item.r}
                              onClick={() => setAspectRatio(item.r as AspectRatio)}
                              className={`
                                relative group flex flex-col items-center justify-center p-2 rounded-lg border transition-all duration-300
                                ${aspectRatio === item.r 
                                  ? 'bg-white/10 border-studio-gold/50 shadow-[0_0_15px_rgba(255,215,0,0.15)]' 
                                  : 'bg-black/40 border-white/5 hover:border-white/20 hover:bg-white/5'}
                              `}
                            >
                              <div className={`border-[1.5px] rounded-[2px] mb-1.5 transition-all ${aspectRatio === item.r ? 'border-studio-gold bg-studio-gold/20' : 'border-gray-500 group-hover:border-gray-300'} ${item.w} ${item.h}`}></div>
                              <span className={`text-[9px] font-bold ${aspectRatio === item.r ? 'text-studio-gold' : 'text-gray-500'}`}>{item.r}</span>
                            </button>
                          ))}
                       </div>
                    </div>
                  )}
               </div>
            </div>

            {/* SECTIONS 2 & 3: STYLE & TUNING (Only in Portrait Mode) */}
            {appMode === 'portrait' && (
              <>
                <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-glass animate-fade-in-up">
                   <div className="p-4 bg-white/5 border-b border-white/5 flex items-center gap-2">
                     <svg className="w-4 h-4 text-studio-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                     <h3 className="text-xs font-bold text-white uppercase tracking-widest">{t.sectionStyle}</h3>
                   </div>
                   <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-2">
                      <button 
                         onClick={() => setSelectedStyleId(null)}
                         className={`h-16 rounded-lg text-[10px] font-bold uppercase transition-all duration-300 border flex flex-col items-center justify-center gap-1 ${!selectedStyleId ? 'bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.4)]' : 'bg-black/40 text-gray-500 border-white/5 hover:border-white/20'}`}
                      >
                         <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                           <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                           <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
                         </svg>
                        Default
                      </button>
                      {PROMPT_SUGGESTIONS.map(s => (
                        <button
                          key={s.id}
                          onClick={() => setSelectedStyleId(s.id)}
                          className={`relative h-16 rounded-lg overflow-hidden group border transition-all duration-300 ${selectedStyleId === s.id ? 'border-transparent ring-2 ring-white/50 scale-[1.03] shadow-lg' : 'border-white/5 hover:border-white/20 opacity-80 hover:opacity-100'}`}
                        >
                          <div className={`absolute inset-0 bg-gradient-to-br ${s.color} opacity-80`}></div>
                          <div className="relative z-10 flex flex-col items-center justify-center h-full gap-1">
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-white">
                                 <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                              </svg>
                              <span className="text-[9px] font-bold text-white uppercase tracking-wider drop-shadow-md">{t[s.labelKey]}</span>
                          </div>
                        </button>
                      ))}
                   </div>
                </div>

                <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-glass animate-fade-in-up animation-delay-200">
                    <div className="p-4 bg-white/5 border-b border-white/5 flex items-center gap-2">
                     <svg className="w-4 h-4 text-studio-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                     <h3 className="text-xs font-bold text-white uppercase tracking-widest">{t.sectionTuning}</h3>
                   </div>
                   <div className="p-4 space-y-4">
                      {/* Sliders */}
                      <div className="space-y-3">
                        <div>
                           <div className="flex justify-between text-[10px] uppercase font-bold text-gray-500 mb-1">
                              <span>{t.faceDetail}</span><span className="text-white">{faceDetail}%</span>
                           </div>
                           <input type="range" min="0" max="100" value={faceDetail} onChange={(e) => setFaceDetail(Number(e.target.value))} className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer" />
                        </div>
                        <div>
                           <div className="flex justify-between text-[10px] uppercase font-bold text-gray-500 mb-1">
                              <span>{t.creativityLevel}</span><span className="text-white">{creativityLevel}%</span>
                           </div>
                           <input type="range" min="0" max="100" value={creativityLevel} onChange={(e) => setCreativityLevel(Number(e.target.value))} className="w-full h-1 bg-gradient-to-r from-blue-900 to-pink-900 rounded-full appearance-none cursor-pointer" />
                        </div>
                      </div>

                      <div className="h-px bg-white/5"></div>

                      {/* Settings Grid */}
                      <div className="grid grid-cols-1 gap-3">
                         <div className="relative">
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                   <path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.077-.78-.22-1.128zm0 0a15.998 15.998 0 003.388-1.62m-5.043-.025a15.994 15.994 0 011.622-3.395m3.42 3.42a15.995 15.995 0 004.764-4.648l3.876-5.814a1.151 1.151 0 00-1.597-1.597L14.146 6.32a16.001 16.001 0 00-4.649 4.763m3.42 3.42a6.776 6.776 0 00-3.42-3.42" />
                                </svg>
                            </div>
                            <select 
                                 value={colorGrading}
                                 onChange={(e) => setColorGrading(e.target.value as ColorGradingStyle)}
                                 className="w-full bg-black/40 text-xs text-white rounded-xl pl-10 pr-4 py-3 border border-white/10 focus:border-studio-neon outline-none appearance-none"
                              >
                                 <option value="none">{t.gradeNone}</option>
                                 <option value="teal_orange">{t.gradeTealOrange}</option>
                                 <option value="cool_noir">{t.gradeNoir}</option>
                                 <option value="warm_vintage">{t.gradeVintage}</option>
                                 <option value="classic_bw">{t.gradeBW}</option>
                              </select>
                         </div>

                          <div className="flex gap-2">
                             <button onClick={() => setSkinTexture(!skinTexture)} className={`flex-1 py-3 rounded-xl border transition-all text-[10px] font-bold uppercase flex items-center justify-center gap-2 ${skinTexture ? 'bg-studio-neon/10 border-studio-neon text-studio-neon shadow-[0_0_10px_rgba(0,240,255,0.2)]' : 'bg-black/20 border-white/10 text-gray-500'}`}>
                                 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                   <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
                                 </svg>
                                {t.skinTexture}
                             </button>
                          </div>

                          <div className="flex bg-black/20 rounded-xl p-1 border border-white/5">
                              {['cinematic', 'dramatic', 'soft', 'intense'].map((l) => (
                                 <button key={l} onClick={() => setLighting(l as LightingIntensity)} className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 rounded-lg text-[9px] font-bold uppercase transition-all ${lighting === l ? 'bg-white/10 text-white' : 'text-gray-500'}`}>
                                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                     <path strokeLinecap="round" strokeLinejoin="round" d={LIGHTING_ICONS[l as LightingIntensity]} />
                                   </svg>
                                   {t[`light${l.charAt(0).toUpperCase() + l.slice(1)}`]}
                                 </button>
                              ))}
                           </div>
                      </div>
                   </div>
                </div>
              </>
            )}

            {/* GENERATE BUTTON */}
            <div className="sticky bottom-4 z-20">
               <Button 
                 variant="gold" 
                 onClick={handleGenerate} 
                 isLoading={status.isLoading} 
                 disabled={!selectedImage || (appMode === 'faceswap' && !swapFaceImage)}
                 className="w-full h-16 text-sm md:text-base shadow-[0_10px_40px_rgba(0,0,0,0.5)]"
               >
                  {appMode === 'faceswap' ? t.swapFaces : (batchQueue.length > 0 ? t.processBatch : t.generate)}
                  <svg className="w-5 h-5 ml-2 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
               </Button>
            </div>
          </div>

          {/* RIGHT PANEL - VIEWPORT & RESULTS */}
          <div className="flex-1 w-full min-w-0 animate-stagger-3 order-1 lg:order-2 flex flex-col gap-4 h-[calc(100vh-120px)] sticky top-24">
            
            {/* 1. TABS */}
            <div className="flex gap-1 p-1 bg-black/30 backdrop-blur rounded-full w-fit border border-white/10 self-center lg:self-start">
               <button onClick={() => setActiveTab('image')} className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'image' ? 'bg-white/10 text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}>{t.viewImage}</button>
               <button onClick={() => setActiveTab('compare')} className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'compare' ? 'bg-studio-neon/20 text-studio-neon shadow' : 'text-gray-500 hover:text-gray-300'}`} disabled={!resultImage}>{t.viewCompare}</button>
               <button onClick={() => setActiveTab('video')} className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'video' ? 'bg-studio-purple/20 text-studio-purple shadow' : 'text-gray-500 hover:text-gray-300'}`}>{t.viewVideo}</button>
            </div>

            {/* 2. MAIN VIEWPORT */}
            <div className="flex-1 relative rounded-[2rem] overflow-hidden bg-black/40 border border-white/10 shadow-2xl backdrop-blur-sm group/viewport flex flex-col min-h-[400px]">
               
               <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

               {/* Result Content */}
               <div className="flex-1 flex items-center justify-center p-6 overflow-hidden relative z-10">
                  {status.isLoading ? (
                     <div className="text-center space-y-6">
                        <div className="relative w-24 h-24 mx-auto">
                           <div className="absolute inset-0 border-t-2 border-studio-neon rounded-full animate-spin"></div>
                           <div className="absolute inset-2 border-r-2 border-studio-purple rounded-full animate-spin-slow"></div>
                           <div className="absolute inset-0 flex items-center justify-center">
                              <div className="w-12 h-12 bg-white/10 rounded-full animate-pulse"></div>
                           </div>
                        </div>
                        <div>
                           <h2 className="text-xl font-bold text-white tracking-widest">{t.processing}</h2>
                           <p className="text-studio-neon text-xs mt-2 font-mono uppercase">{appMode === 'faceswap' ? t.processingSwap : t[LOADING_MESSAGES[loadingMessageIndex]]}</p>
                        </div>
                     </div>
                  ) : activeTab === 'compare' && selectedImage && resultImage ? (
                     <ComparisonView original={selectedImage} result={resultImage} />
                  ) : activeTab === 'image' && resultImage ? (
                    <img src={resultImage} className="max-h-full max-w-full object-contain rounded-lg shadow-2xl border border-white/5 cursor-zoom-in transition-transform duration-500 hover:scale-[1.02]" />
                  ) : activeTab === 'video' && videoResult ? (
                    <video src={videoResult} controls autoPlay loop className="max-h-full max-w-full rounded-lg shadow-2xl" />
                  ) : (
                    <div className="text-center opacity-30">
                       <div className="w-20 h-20 mx-auto mb-4 border-2 border-dashed border-white/30 rounded-full flex items-center justify-center">
                          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                       </div>
                       <p className="text-sm font-light tracking-widest">{t.noResultDesc}</p>
                    </div>
                  )}
               </div>
            </div>

            {/* 3. ACTION BAR (Download & Share) */}
            {resultImage && (
              <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl p-3 flex items-center justify-between animate-fade-in-up">
                 <div className="flex gap-2">
                    <Button 
                      variant="primary" 
                      onClick={() => handleDownload(activeTab === 'video' ? videoResult! : resultImage!, activeTab === 'video' ? 'Video' : 'Portrait')}
                      className="h-12 px-6 bg-white text-black hover:bg-gray-200 border-none shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                    >
                       <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                       {activeTab === 'video' ? t.downloadVideo : t.download}
                    </Button>
                    <button className="h-12 w-12 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white">
                       <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                    </button>
                 </div>
                 {activeTab === 'image' && (
                   <Button variant="secondary" onClick={handleAnimate} className="h-12 px-4 text-[10px] hidden sm:flex">
                      <svg className="w-4 h-4 mr-2 text-studio-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {t.animate}
                   </Button>
                 )}
              </div>
            )}

            {/* 4. CHAT */}
            {resultImage && activeTab === 'image' && (
              <div className="h-[200px] border border-white/10 rounded-2xl bg-black/40 backdrop-blur-md overflow-hidden">
                 <ChatInterface 
                   messages={chatMessages} 
                   onSendMessage={handleSendMessage} 
                   isLoading={status.isLoading} 
                   language={language}
                   disabled={false}
                 />
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}

export default App;