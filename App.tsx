import React, { useState, useCallback, useEffect } from 'react';
import { ImageUpload } from './components/ImageUpload';
import { Button } from './components/Button';
import { ChatInterface } from './components/ChatInterface';
import { ImageCropper } from './components/ImageCropper';
import { CameraCapture } from './components/CameraCapture';
import { HistoryGallery } from './components/HistoryGallery';
import { ImageEditor } from './components/ImageEditor';
import { LivingBackground } from './components/LivingBackground';
import { ComparisonView } from './components/ComparisonView';
import { generateEditedImage, generateFaceSwap, getStoredApiKey, setStoredApiKey, clearStoredApiKey } from './services/geminiService';
import { generateInstantVideo } from './services/clientVideoService';
import { saveHistoryItem } from './services/storageService';
import { DEFAULT_PROMPT, QUALITY_MODIFIERS, LIGHTING_STYLES, COLOR_GRADING_STYLES, PROMPT_SUGGESTIONS, LOADING_MESSAGES, LIGHTING_ICONS, CINEMATIC_KEYWORDS } from './constants';
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
  
  // Cropper & Camera State
  const [isCropping, setIsCropping] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<'base' | 'face'>('base');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<'base' | 'face'>('base');

  // History Gallery State
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);

  // Loading Message State
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);

  // Settings
  const [skinTexture, setSkinTexture] = useState<boolean>(true);
  const [faceDetail, setFaceDetail] = useState<number>(65); 
  const [creativityLevel, setCreativityLevel] = useState<number>(30); // 0 to 100
  const [lighting, setLighting] = useState<LightingIntensity>('dramatic');
  const [colorGrading, setColorGrading] = useState<ColorGradingStyle>('teal_orange');
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [showPromptSuggestions, setShowPromptSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  
  // Animation State
  const [isAnimating, setIsAnimating] = useState(false);
  const [videoResult, setVideoResult] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'image' | 'video' | 'compare' | 'edit'>('image');

  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Batch
  const [batchQueue, setBatchQueue] = useState<BatchItem[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  // API Key State
  const [hasApiKey, setHasApiKey] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [apiKeyError, setApiKeyError] = useState(false);

  // Updated Logo URL
  const LOGO_URL = "https://sobheommid.com/_nuxt/logo.BtixDU2P.svg";

  useEffect(() => {
    document.documentElement.classList.add('dark');
    
    // Check API Key Availability (Local Storage first, then Env, then Platform)
    const checkKey = async () => {
      
      const stored = getStoredApiKey();
      if (stored) {
          setHasApiKey(true);
          return;
      }

      // If manually set in env (dev), allow it
      if (process.env.API_KEY) {
        setHasApiKey(true);
        return;
      }
      
      // Otherwise check platform handler
      if (window.aistudio && window.aistudio.hasSelectedApiKey) {
        const has = await window.aistudio.hasSelectedApiKey();
        setHasApiKey(has);
      }
    };
    checkKey();
  }, []);

  const handleManualKeySubmit = () => {
    const trimmed = apiKeyInput.trim();
    if (trimmed.length > 30 && trimmed.startsWith('AIza')) {
       setStoredApiKey(trimmed);
       setHasApiKey(true);
       setApiKeyError(false);
    } else {
       setApiKeyError(true);
    }
  };

  const handleLogout = () => {
      clearStoredApiKey();
      setHasApiKey(false);
      setApiKeyInput("");
      setApiKeyError(false);
  };

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

  const handleCameraCapture = (imageSrc: string) => {
    if (cameraTarget === 'base') {
      handleImageSelected(imageSrc);
    } else {
      handleFaceImageSelected(imageSrc);
    }
    setIsCameraOpen(false);
  };

  const handleHistorySelect = (item: HistoryItem) => {
    setResultImage(item.imageUrl);
    setAppMode(item.mode || 'portrait');
    if (item.skinTexture !== undefined) setSkinTexture(item.skinTexture);
    if (item.faceDetail !== undefined) setFaceDetail(item.faceDetail);
    if (item.lighting) setLighting(item.lighting);
    if (item.colorGrading) setColorGrading(item.colorGrading);
    setActiveTab('image');
  };

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setCustomPrompt(val);

    const words = val.split(' ');
    const lastWord = words[words.length - 1].toLowerCase();

    if (lastWord.length > 1) {
       const matches = CINEMATIC_KEYWORDS.filter(k => k.toLowerCase().startsWith(lastWord));
       if (matches.length > 0) {
          setFilteredSuggestions(matches);
          setShowPromptSuggestions(true);
       } else {
          setShowPromptSuggestions(false);
       }
    } else {
       setShowPromptSuggestions(false);
    }
  };

  const acceptSuggestion = (suggestion: string) => {
    const words = customPrompt.split(' ');
    words.pop(); // Remove partial word
    const newText = words.join(' ') + (words.length > 0 ? ' ' : '') + suggestion + ', ';
    setCustomPrompt(newText);
    setShowPromptSuggestions(false);
  };

  const constructPrompt = () => {
    let base = customPrompt ? customPrompt : DEFAULT_PROMPT;

    if (selectedStyleId && !customPrompt) {
      const style = PROMPT_SUGGESTIONS.find(s => s.id === selectedStyleId);
      if (style) base = style.prompt; 
    }

    let finalPrompt = base;

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

    if (appMode === 'faceswap') {
      if (!swapFaceImage) return;
      setStatus({ isLoading: true, error: null });
      setResultImage(null);
      try {
        const prompt = (customPrompt || t.swapPrompt) + QUALITY_MODIFIERS[quality];
        const img = await generateFaceSwap(selectedImage, swapFaceImage, prompt);
        setResultImage(img);
        await addToHistory(img, prompt, aspectRatio);
      } catch (error: any) {
        setStatus({ isLoading: false, error: error.message });
      } finally {
        setStatus(prev => ({ ...prev, isLoading: false }));
      }
      return;
    }

    if (batchQueue.length > 0) { handleBatchGenerate(); return; }

    setStatus({ isLoading: true, error: null });
    setResultImage(null);
    try {
      const finalPrompt = constructPrompt();
      const img = await generateEditedImage(selectedImage, finalPrompt, aspectRatio);
      setResultImage(img);
      await addToHistory(img, finalPrompt, aspectRatio);
    } catch (error: any) {
      setStatus({ isLoading: false, error: error.message });
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
       let img;
       if (appMode === 'faceswap' && selectedImage && swapFaceImage) {
         const editPrompt = `${t.swapPrompt}, ${text}`;
         img = await generateEditedImage(resultImage, editPrompt, aspectRatio);
       } else {
         const currentPrompt = constructPrompt();
         const editPrompt = `${currentPrompt}, ${text}`;
         img = await generateEditedImage(selectedImage!, editPrompt, aspectRatio);
       }
       setResultImage(img);
       const modelMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: t.modelGreeting, timestamp: Date.now() };
       setChatMessages(prev => [...prev, modelMsg]);
    } catch (error: any) {
      setStatus({ isLoading: false, error: error.message });
    } finally {
      setStatus(prev => ({ ...prev, isLoading: false }));
    }
  };

  const getErrorMessage = (errorKey: string | null) => {
    if (!errorKey) return t.errorGeneric;
    return t[errorKey] || errorKey || t.errorGeneric;
  };

  return (
    <div dir={language === 'fa' ? 'rtl' : 'ltr'} className="min-h-screen bg-transparent text-white font-sans overflow-x-hidden relative selection:bg-studio-neon/30">
      
      <LivingBackground />

      {/* API Key Connection Overlay (Login) */}
      {!hasApiKey && (
        <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col items-center justify-center p-6 text-center animate-fade-in">
           <div className="w-24 h-24 mb-6 rounded-3xl bg-studio-gold/10 flex items-center justify-center border border-studio-gold/30 shadow-[0_0_50px_rgba(255,215,0,0.2)]">
              <img src={LOGO_URL} className="w-16 h-16 object-contain" />
           </div>
           
           <h2 className="text-2xl md:text-4xl font-black text-white mb-2 tracking-tighter">{t.apiKeyTitle}</h2>
           <p className="text-gray-400 max-w-lg mb-8 leading-relaxed text-sm md:text-base">{t.apiKeyDesc}</p>
           
           <div className="w-full max-w-md space-y-4">
              <div className="relative">
                <input 
                   type="password" 
                   value={apiKeyInput}
                   onChange={(e) => { setApiKeyInput(e.target.value); setApiKeyError(false); }}
                   placeholder={t.enterKeyPlaceholder}
                   className={`w-full h-14 bg-white/5 border rounded-xl px-4 text-center text-white outline-none transition-all placeholder:text-gray-600 font-mono text-sm ${apiKeyError ? 'border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500' : 'border-white/10 focus:border-studio-gold focus:ring-1 focus:ring-studio-gold'}`}
                />
                {apiKeyError && <p className="text-red-500 text-xs mt-1 absolute -bottom-5 left-0 w-full">Invalid API Key format (must start with AIza...)</p>}
              </div>
              
              <Button variant="gold" onClick={handleManualKeySubmit} className="w-full h-14 text-sm font-bold shadow-studio-gold" disabled={apiKeyInput.length < 10}>
                {t.connectApi}
              </Button>
           </div>

           <div className="mt-8 pt-8 border-t border-white/5 w-full max-w-md flex flex-col items-center gap-3">
              <span className="text-xs text-gray-500 uppercase tracking-widest">Don't have a key?</span>
              <a 
                href="https://aistudio.google.com/app/apikey" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="flex items-center gap-2 text-xs md:text-sm text-studio-neon hover:text-white transition-colors py-2 px-4 rounded-full hover:bg-white/5"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
                {t.getApiKey}
              </a>
           </div>
        </div>
      )}

      {isCameraOpen && (
        <CameraCapture 
           onCapture={handleCameraCapture} 
           onCancel={() => setIsCameraOpen(false)}
           labelCapture={t.takePhoto}
           labelCancel={t.cancel}
        />
      )}

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

      {isGalleryOpen && (
        <HistoryGallery 
           onSelect={handleHistorySelect} 
           onClose={() => setIsGalleryOpen(false)} 
           title={t.galleryTitle}
           emptyMessage={t.galleryEmpty}
        />
      )}

      {/* Main Container */}
      <div className={`relative z-10 max-w-[1920px] mx-auto p-4 md:p-6 lg:p-8 flex flex-col gap-6 transition-opacity duration-500 ${!hasApiKey ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
        
        {/* HEADER */}
        <header className="flex items-center justify-between animate-stagger-1 pb-4 border-b border-white/5">
           <div className="flex items-center gap-4 select-none">
              <div className="w-12 h-12 md:w-20 md:h-20 rounded-2xl overflow-hidden shadow-[0_0_25px_rgba(250,204,21,0.2)] hover:shadow-studio-gold/40 transition-shadow duration-500 bg-transparent p-1">
                 <img src={LOGO_URL} alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col">
                 <h1 className="text-xl md:text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-400">{t.instituteName}</h1>
                 <p className="text-[10px] md:text-xs font-bold tracking-[0.3em] text-studio-neon uppercase">{t.appTitle}</p>
              </div>
           </div>

           <div className="flex items-center gap-3">
               {/* Status Indicator */}
               {hasApiKey && (
                  <div className="hidden md:flex items-center gap-2 px-3 py-2 bg-green-500/10 rounded-xl border border-green-500/20 mr-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]"></div>
                    <span className="text-[10px] font-bold text-green-400 uppercase tracking-widest">{t.statusConnected}</span>
                  </div>
               )}

               <button 
                 onClick={handleLogout}
                 className="p-2 bg-red-500/10 backdrop-blur-md rounded-xl border border-red-500/20 text-red-400 hover:text-white hover:bg-red-500/30 transition-all"
                 title={t.logout}
              >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                  </svg>
              </button>

              <button 
                 onClick={() => setIsGalleryOpen(true)}
                 className="p-2 bg-black/30 backdrop-blur-md rounded-xl border border-white/5 text-gray-400 hover:text-white hover:border-studio-neon/50 transition-all"
                 title={t.history}
              >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
              </button>
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
                  onClick={() => { setAppMode('portrait'); setResultImage(null); setStatus({ isLoading: false, error: null }); }}
                  className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 ${appMode === 'portrait' ? 'bg-studio-neon/20 text-studio-neon border border-studio-neon/50 shadow-[0_0_20px_rgba(0,240,255,0.2)]' : 'text-gray-500 hover:text-white'}`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
                  {t.modePortrait}
                </button>
                <button 
                  onClick={() => { setAppMode('faceswap'); setResultImage(null); setStatus({ isLoading: false, error: null }); }}
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
                    onOpenCamera={() => { setCameraTarget('base'); setIsCameraOpen(true); }}
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
                         onOpenCamera={() => { setCameraTarget('face'); setIsCameraOpen(true); }}
                       />
                    </div>
                  )}

                  {/* Aspect Ratio Selector (Only Show in Portrait Mode) */}
                  {appMode === 'portrait' && (
                    <div className="space-y-2">
                       <p className="text-[10px] uppercase font-bold text-gray-500">{t.aspectRatio}</p>
                       <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
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

                {/* Advanced Prompt Section */}
                <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-glass animate-fade-in-up animation-delay-400">
                   <div className="p-4 bg-white/5 border-b border-white/5 flex items-center gap-2">
                     <svg className="w-4 h-4 text-studio-neon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" /></svg>
                     <h3 className="text-xs font-bold text-white uppercase tracking-widest">{t.sectionAdvanced}</h3>
                   </div>
                   <div className="p-4 relative">
                      <textarea
                        value={customPrompt}
                        onChange={handlePromptChange}
                        placeholder={t.customPromptPlaceholder}
                        className="w-full h-24 bg-black/40 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-gray-500 focus:border-studio-neon focus:ring-1 focus:ring-studio-neon outline-none resize-none"
                      />
                      {showPromptSuggestions && filteredSuggestions.length > 0 && (
                        <div className="absolute bottom-full left-4 bg-gray-900 border border-white/10 rounded-xl shadow-xl p-2 max-h-40 overflow-y-auto mb-2 z-50 min-w-[200px]">
                           <p className="text-[10px] text-gray-400 uppercase font-bold mb-2 px-2">{t.suggestions}</p>
                           {filteredSuggestions.map((s, i) => (
                             <div 
                               key={i} 
                               onClick={() => acceptSuggestion(s)}
                               className="px-2 py-1.5 hover:bg-white/10 rounded-lg cursor-pointer text-xs text-studio-neon"
                             >
                               {s}
                             </div>
                           ))}
                        </div>
                      )}
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
               <button onClick={() => setActiveTab('edit')} className={`px-6 py-2 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${activeTab === 'edit' ? 'bg-studio-gold/20 text-studio-gold shadow' : 'text-gray-500 hover:text-gray-300'}`} disabled={!resultImage}>{t.viewEdit}</button>
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
                  ) : status.error ? (
                    <div className="flex flex-col items-center justify-center max-w-md text-center p-8 bg-black/40 border border-red-500/30 rounded-2xl backdrop-blur-md animate-zoom-in">
                        <div className="w-16 h-16 mb-4 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-red-500">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">{t.errorTitle}</h3>
                        <p className="text-red-200/80 text-sm leading-relaxed mb-6">{getErrorMessage(status.error)}</p>
                        <Button variant="secondary" onClick={() => setStatus({isLoading: false, error: null})}>
                            {t.tryAgain}
                        </Button>
                    </div>
                  ) : activeTab === 'compare' && selectedImage && resultImage ? (
                     <ComparisonView original={selectedImage} result={resultImage} />
                  ) : activeTab === 'edit' && resultImage ? (
                     <ImageEditor 
                        imageSrc={resultImage} 
                        onSave={(newImg) => { setResultImage(newImg); setActiveTab('image'); }} 
                        language={language}
                     />
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
            {resultImage && !status.error && activeTab !== 'edit' && (
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
            {resultImage && activeTab === 'image' && !status.error && (
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