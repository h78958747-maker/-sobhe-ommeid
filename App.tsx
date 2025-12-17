
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
import { generateEditedImage, generateFaceSwap } from './services/geminiService';
import { generateInstantVideo } from './services/clientVideoService';
import { saveHistoryItem } from './services/storageService';
import { DEFAULT_PROMPT, QUALITY_MODIFIERS, LIGHTING_STYLES, COLOR_GRADING_STYLES, PROMPT_SUGGESTIONS, LOADING_MESSAGES, LIGHTING_ICONS, CINEMATIC_KEYWORDS } from './constants';
import { ProcessingState, AspectRatio, HistoryItem, Language, ChatMessage, QualityMode, LightingIntensity, ColorGradingStyle, Theme, BatchItem, AppMode } from './types';
import { translations } from './translations';

function App() {
  const [language, setLanguage] = useState<Language>('fa');
  const t = translations[language];
  const [appMode, setAppMode] = useState<AppMode>('portrait');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [swapFaceImage, setSwapFaceImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [selectedStyleId, setSelectedStyleId] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("AUTO");
  const [quality, setQuality] = useState<QualityMode>('high');
  const [status, setStatus] = useState<ProcessingState>({ isLoading: false, error: null });
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isCropping, setIsCropping] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [cropTarget, setCropTarget] = useState<'base' | 'face'>('base');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [cameraTarget, setCameraTarget] = useState<'base' | 'face'>('base');
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [skinTexture, setSkinTexture] = useState<boolean>(true);
  const [faceDetail, setFaceDetail] = useState<number>(75); 
  const [creativityLevel, setCreativityLevel] = useState<number>(30);
  const [lighting, setLighting] = useState<LightingIntensity>('cinematic');
  const [colorGrading, setColorGrading] = useState<ColorGradingStyle>('teal_orange');
  const [customPrompt, setCustomPrompt] = useState<string>("");
  const [showPromptSuggestions, setShowPromptSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [videoResult, setVideoResult] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'image' | 'video' | 'compare' | 'edit'>('image');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [batchQueue, setBatchQueue] = useState<BatchItem[]>([]);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);

  const LOGO_URL = "https://sobheommid.com/_nuxt/logo.BtixDU2P.svg";

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

  useEffect(() => {
    setImageLoaded(false);
  }, [resultImage, activeTab]);

  const addToHistory = async (image: string, p: string, ar: AspectRatio) => {
    const newItem: HistoryItem = {
      id: Date.now().toString() + Math.random().toString(36).substring(2),
      imageUrl: image, prompt: p, aspectRatio: ar, timestamp: Date.now(),
      skinTexture, faceDetail, lighting, colorGrading, creativityLevel, mode: appMode
    };
    setHistory(prev => [newItem, ...prev]);
    saveHistoryItem(newItem).catch(console.error);
  };

  const handleImageSelected = useCallback((base64: string | string[]) => {
    if (Array.isArray(base64)) {
       if (appMode === 'portrait') {
         const newItems: BatchItem[] = base64.map((b, i) => ({
           id: `batch-${Date.now()}-${i}`, original: b, status: 'pending'
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
    setResultImage(null); setVideoResult(null); setActiveTab('image'); setStatus({ isLoading: false, error: null });
  }, [appMode]);

  const handleFaceImageSelected = useCallback((base64: string | string[]) => {
    if (Array.isArray(base64)) setSwapFaceImage(base64[0]);
    else setSwapFaceImage(base64 || null);
  }, []);

  const handleCameraCapture = (imageSrc: string) => {
    if (cameraTarget === 'base') handleImageSelected(imageSrc);
    else handleFaceImageSelected(imageSrc);
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
       if (matches.length > 0) { setFilteredSuggestions(matches); setShowPromptSuggestions(true); }
       else setShowPromptSuggestions(false);
    } else setShowPromptSuggestions(false);
  };

  const acceptSuggestion = (suggestion: string) => {
    const words = customPrompt.split(' ');
    words.pop();
    const newText = words.join(' ') + (words.length > 0 ? ' ' : '') + suggestion + ', ';
    setCustomPrompt(newText); setShowPromptSuggestions(false);
  };

  const constructPrompt = () => {
    let base = customPrompt ? customPrompt : DEFAULT_PROMPT;
    if (selectedStyleId && !customPrompt) {
      const style = PROMPT_SUGGESTIONS.find(s => s.id === selectedStyleId);
      if (style) base = style.prompt; 
    }
    let finalPrompt = base;
    if (skinTexture) finalPrompt += ", ultra-realistic skin texture, 8k movie resolution";
    if (faceDetail > 60) finalPrompt += ", high-fidelity cinematic facial details";
    if (creativityLevel < 30) finalPrompt += ", professional cinema retouch";
    else if (creativityLevel > 70) finalPrompt += ", intense cinematic transformation";
    finalPrompt += `, ${LIGHTING_STYLES[lighting]}`;
    if (colorGrading !== 'none') finalPrompt += `, ${COLOR_GRADING_STYLES[colorGrading]}`;
    finalPrompt += QUALITY_MODIFIERS[quality];
    return finalPrompt;
  };

  const handleGenerate = async () => {
    if (!selectedImage) return;
    setStatus({ isLoading: true, error: null });
    setResultImage(null);
    try {
      if (appMode === 'faceswap') {
        if (!swapFaceImage) return;
        const prompt = (customPrompt || t.swapPrompt) + QUALITY_MODIFIERS[quality];
        const img = await generateFaceSwap(selectedImage, swapFaceImage, prompt);
        setResultImage(img); await addToHistory(img, prompt, aspectRatio);
      } else {
        const finalPrompt = constructPrompt();
        const img = await generateEditedImage(selectedImage, finalPrompt, aspectRatio);
        setResultImage(img); await addToHistory(img, finalPrompt, aspectRatio);
      }
    } catch (error: any) {
      setStatus({ isLoading: false, error: error.message });
    } finally {
      setStatus(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleAnimate = async () => {
    if (!resultImage) return;
    setIsAnimating(true); setStatus({ isLoading: true, error: null });
    try {
      const videoUrl = await generateInstantVideo(resultImage);
      setVideoResult(videoUrl); setActiveTab('video');
    } catch (error: any) {
      setStatus({ isLoading: false, error: error.message });
    } finally {
      setIsAnimating(false); setStatus(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleDownload = (url: string, filename: string) => {
    const a = document.createElement('a'); a.href = url; a.download = `CinemaStudio_${filename}_${Date.now()}`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const handleSendMessage = async (text: string) => {
    if (!resultImage) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text, timestamp: Date.now() };
    setChatMessages(prev => [...prev, userMsg]);
    setStatus({ isLoading: true, error: null });
    try {
       const img = await generateEditedImage(resultImage, text, aspectRatio);
       setResultImage(img);
       const modelMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'model', text: t.modelGreeting, timestamp: Date.now() };
       setChatMessages(prev => [...prev, modelMsg]);
    } catch (error: any) { setStatus({ isLoading: false, error: error.message });
    } finally { setStatus(prev => ({ ...prev, isLoading: false })); }
  };

  return (
    <div dir={language === 'fa' ? 'rtl' : 'ltr'} className="min-h-screen bg-transparent text-white font-sans overflow-x-hidden relative selection:bg-studio-neon/30">
      <LivingBackground />
      {isCameraOpen && <CameraCapture onCapture={handleCameraCapture} onCancel={() => setIsCameraOpen(false)} labelCapture={t.takePhoto} labelCancel={t.cancel} />}
      {isCropping && imageToCrop && <ImageCropper imageSrc={imageToCrop} onCropComplete={(cropped) => { if (cropTarget === 'base') setSelectedImage(cropped); else setSwapFaceImage(cropped); setIsCropping(false); }} onCancel={() => setIsCropping(false)} confirmLabel={t.applyCrop} cancelLabel={t.cancel} instructions={t.cropInstructions} />}
      {isGalleryOpen && <HistoryGallery onSelect={handleHistorySelect} onClose={() => setIsGalleryOpen(false)} title={t.galleryTitle} emptyMessage={t.galleryEmpty} />}

      <div className="relative z-10 max-w-[1920px] mx-auto p-4 md:p-8 flex flex-col gap-6">
        <header className="flex items-center justify-between pb-4 border-b border-white/5">
           <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-black/40 p-1 flex items-center justify-center shadow-neon-blue transition-all duration-500 hover:shadow-studio-neon/50">
                 <img src={LOGO_URL} alt="Logo" className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(0,240,255,0.6)]" />
              </div>
              <div>
                 <h1 className="text-2xl md:text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-studio-neon to-white">{t.instituteName}</h1>
                 <p className="text-xs font-bold text-studio-neon uppercase tracking-widest">{t.appTitle}</p>
              </div>
           </div>
           <div className="flex gap-3">
              <button onClick={() => setIsGalleryOpen(true)} className="p-2 bg-black/30 rounded-xl border border-white/5 text-gray-400 hover:text-white transition-all"><svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg></button>
              <div className="flex bg-black/30 rounded-xl p-1 border border-white/5">
                 <button onClick={() => setLanguage('en')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${language === 'en' ? 'bg-white text-black' : 'text-gray-400'}`}>EN</button>
                 <button onClick={() => setLanguage('fa')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${language === 'fa' ? 'bg-white text-black' : 'text-gray-400'}`}>FA</button>
              </div>
           </div>
        </header>

        <main className="flex flex-col lg:flex-row gap-8">
          <div className="w-full lg:w-[450px] flex flex-col gap-6 order-2 lg:order-1">
            <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl p-2 flex gap-2">
                <button onClick={() => setAppMode('portrait')} className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase transition-all ${appMode === 'portrait' ? 'bg-studio-neon/20 text-studio-neon' : 'text-gray-500 hover:text-white'}`}>{t.modePortrait}</button>
                <button onClick={() => setAppMode('faceswap')} className={`flex-1 py-3 rounded-xl text-xs font-bold uppercase transition-all ${appMode === 'faceswap' ? 'bg-studio-purple/20 text-studio-purple' : 'text-gray-500 hover:text-white'}`}>{t.modeFaceSwap}</button>
            </div>
            
            <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-3xl p-5 space-y-6">
               <ImageUpload onImageSelected={handleImageSelected} selectedImage={selectedImage} title={appMode === 'faceswap' ? t.labelTarget : t.uploadTitle} onOpenCamera={() => { setCameraTarget('base'); setIsCameraOpen(true); }} />
               {appMode === 'faceswap' && <ImageUpload onImageSelected={handleFaceImageSelected} selectedImage={swapFaceImage} title={t.labelSource} onOpenCamera={() => { setCameraTarget('face'); setIsCameraOpen(true); }} />}
               
               {appMode === 'portrait' && (
                 <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-3">
                       <p className="text-[10px] uppercase font-bold text-gray-500">{t.sectionStyle}</p>
                       <div className="grid grid-cols-3 gap-2">
                          {PROMPT_SUGGESTIONS.map(s => (
                            <button key={s.id} onClick={() => setSelectedStyleId(s.id)} className={`h-12 rounded-xl text-[9px] font-bold uppercase border transition-all ${selectedStyleId === s.id ? 'bg-studio-neon/20 border-studio-neon text-studio-neon' : 'bg-black/40 border-white/5 hover:border-white/20 text-gray-400'}`}>{t[s.labelKey]}</button>
                          ))}
                       </div>
                    </div>
                 </div>
               )}
            </div>

            <Button variant="gold" onClick={handleGenerate} isLoading={status.isLoading} disabled={!selectedImage || (appMode === 'faceswap' && !swapFaceImage)} className="w-full h-16 text-lg animate-pulse-glow">
                {appMode === 'faceswap' ? t.swapFaces : t.generate}
            </Button>
          </div>

          <div className="flex-1 flex flex-col gap-4 order-1 lg:order-2">
            <div className="flex gap-2 p-1 bg-black/30 rounded-full w-fit border border-white/10">
               <button onClick={() => setActiveTab('image')} className={`px-6 py-2 rounded-full text-xs font-bold uppercase transition-all ${activeTab === 'image' ? 'bg-white/10 text-white' : 'text-gray-500'}`}>{t.viewImage}</button>
               <button onClick={() => setActiveTab('compare')} className={`px-6 py-2 rounded-full text-xs font-bold uppercase transition-all ${activeTab === 'compare' ? 'bg-studio-neon/20 text-studio-neon' : 'text-gray-500'}`} disabled={!resultImage}>{t.viewCompare}</button>
               <button onClick={() => setActiveTab('video')} className={`px-6 py-2 rounded-full text-xs font-bold uppercase transition-all ${activeTab === 'video' ? 'bg-studio-purple/20 text-studio-purple' : 'text-gray-500'}`} disabled={!resultImage}>{t.viewVideo}</button>
            </div>

            <div className="flex-1 relative rounded-[3rem] overflow-hidden bg-black/40 border border-white/10 flex items-center justify-center min-h-[500px] shadow-glass">
               {status.isLoading ? (
                  <div className="text-center space-y-4">
                     <div className="w-16 h-16 border-t-2 border-studio-neon rounded-full animate-spin mx-auto"></div>
                     <p className="text-studio-neon text-xs font-mono uppercase animate-pulse">{t[LOADING_MESSAGES[loadingMessageIndex]]}</p>
                  </div>
               ) : resultImage && activeTab === 'image' ? (
                  <img src={resultImage} onLoad={() => setImageLoaded(true)} className={`max-h-[85vh] object-contain rounded-2xl transition-all duration-300 ease-out cursor-zoom-in ${imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-[0.98]'} hover:scale-[1.02] hover:shadow-studio-neon/30`} />
               ) : videoResult && activeTab === 'video' ? (
                  <video src={videoResult} controls autoPlay loop className="max-h-[85vh] rounded-2xl" />
               ) : activeTab === 'compare' && resultImage ? (
                  <ComparisonView original={selectedImage!} result={resultImage} />
               ) : (
                  <div className="text-center opacity-30 flex flex-col items-center gap-4">
                     <div className="w-20 h-20 border-2 border-dashed border-white/30 rounded-full flex items-center justify-center"><svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></div>
                     <p className="text-sm font-light uppercase tracking-widest">{t.noResultDesc}</p>
                  </div>
               )}
            </div>

            {resultImage && !status.isLoading && (
               <div className="flex gap-4">
                  <Button variant="primary" onClick={() => handleDownload(activeTab === 'video' ? videoResult! : resultImage!, 'Result')} className="flex-1 h-14 bg-white text-black">{t.download}</Button>
                  <Button variant="secondary" onClick={handleAnimate} className="flex-1 h-14 border-studio-purple/30 text-studio-purple hover:bg-studio-purple/10">{t.animate}</Button>
               </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
