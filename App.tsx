
import React, { useState, useEffect, useCallback } from 'react';
import { ImageUpload } from './components/ImageUpload';
import { Button } from './components/Button';
import { ComparisonView } from './components/ComparisonView';
import { CameraCapture } from './components/CameraCapture';
import { generateEditedImage, generateFaceSwap, analyzeImage } from './services/geminiService';
import { saveHistoryItem } from './services/storageService';
import { DEFAULT_PROMPT, LIGHTING_STYLES, COLOR_GRADING_STYLES, PROMPT_SUGGESTIONS, LIGHTING_ICONS } from './constants';
import { ProcessingState, AspectRatio, HistoryItem, Language, LightingIntensity, ColorGradingStyle, AppMode, BatchItem, Theme } from './types';
import { translations } from './translations';
import { LivingBackground } from './components/LivingBackground';
import { HistoryGallery } from './components/HistoryGallery';
import { ImageEditor } from './components/ImageEditor';

type AppStep = 'setup' | 'cinema' | 'batch-results';

const APP_LOGO = "https://dl1.negarestock.ir/S/p/2024/10/4/1728068570_31103_Untitled-1.jpg";

const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>('fa');
  const [theme, setTheme] = useState<Theme>('dark');
  const [mode, setMode] = useState<AppMode>('portrait');
  const [step, setStep] = useState<AppStep>('setup');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
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
  const [showHistory, setShowHistory] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [showCamera, setShowCamera] = useState<'selected' | 'source' | null>(null);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [detectedDimensions, setDetectedDimensions] = useState<{w: number, h: number} | null>(null);

  const t = translations[language];

  useEffect(() => {
    document.documentElement.className = theme;
    document.documentElement.dir = language === 'fa' ? 'rtl' : 'ltr';
  }, [theme, language]);

  const handleGenerate = useCallback(async () => {
    if (processing.isLoading) return;
    if (batchItems.length > 0) {
      await processBatch();
      return;
    }

    if (!selectedImage) return;
    
    setProcessing(p => ({ ...p, isLoading: true, statusText: t.loadAnalyzing, error: null }));
    
    try {
      let result = '';
      const prompt = `${DEFAULT_PROMPT} ${LIGHTING_STYLES[lighting]}. ${COLOR_GRADING_STYLES[colorGrading]}. ${description}`;

      if (mode === 'portrait' || mode === 'batch') {
        result = await generateEditedImage(selectedImage!, prompt, aspectRatio, detectedDimensions ? { width: detectedDimensions.w, height: detectedDimensions.h } : undefined);
      } else if (mode === 'faceswap') {
        if (!sourceImage) throw new Error("Missing source image");
        result = await generateFaceSwap(selectedImage!, sourceImage, prompt);
      }
      
      setResultImage(result);
      setStep('cinema');
      
      const historyItem: HistoryItem = {
        id: Date.now().toString(),
        imageUrl: result,
        prompt: prompt,
        description: description,
        aspectRatio,
        timestamp: Date.now(),
        mode,
        lighting,
        colorGrading
      };
      await saveHistoryItem(historyItem);

    } catch (err: any) {
      setProcessing(prev => ({ ...prev, error: err.message || 'errorServer' }));
    } finally {
      setProcessing(prev => ({ ...prev, isLoading: false }));
    }
  }, [selectedImage, batchItems, mode, lighting, colorGrading, description, aspectRatio, detectedDimensions, sourceImage, t, processing.isLoading]);

  const processBatch = async () => {
    setStep('batch-results');
    setProcessing({ 
      isLoading: true, 
      statusText: t.loadAnalyzing, 
      error: null,
      batchTotal: batchItems.length,
      batchCurrent: 0
    });

    const results: BatchItem[] = batchItems.map(item => ({ ...item, status: 'pending' }));
    setBatchItems([...results]);

    const prompt = `${DEFAULT_PROMPT} ${LIGHTING_STYLES[lighting]}. ${COLOR_GRADING_STYLES[colorGrading]}. ${description}`;

    for (let i = 0; i < results.length; i++) {
      setProcessing(prev => ({ ...prev, statusText: `${t.loadLighting} (${i+1}/${results.length})`, batchCurrent: i + 1 }));
      results[i].status = 'processing';
      setBatchItems([...results]);

      try {
        const result = await generateEditedImage(results[i].original, prompt, aspectRatio);
        results[i].result = result;
        results[i].status = 'done';
        
        const historyItem: HistoryItem = {
          id: `batch-${Date.now()}-${i}`,
          imageUrl: result,
          prompt: prompt,
          description: `Batch: ${description}`,
          aspectRatio,
          timestamp: Date.now(),
          mode: 'batch',
          lighting,
          colorGrading
        };
        await saveHistoryItem(historyItem);
      } catch (err: any) {
        results[i].status = 'error';
        results[i].error = err.message;
      }
      setBatchItems([...results]);
    }

    setProcessing(prev => ({ ...prev, isLoading: false }));
  };

  const handleAutoAnalyze = async () => {
    if (!selectedImage) return;
    setProcessing(p => ({ ...p, isLoading: true, statusText: t.loadDescribing, error: null }));
    try {
      const desc = await analyzeImage(selectedImage);
      setDescription(desc);
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(prev => ({ ...prev, isLoading: false }));
    }
  };

  const reset = useCallback(() => {
    setStep('setup');
    setSelectedImage(null);
    setSourceImage(null);
    setResultImage(null);
    setBatchItems([]);
    setComparisonMode(false);
    setShowEditor(false);
    setProcessing({ isLoading: false, statusText: '', error: null, batchCurrent: 0, batchTotal: 0 });
  }, []);

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

      // Ctrl/Cmd + Enter to Generate
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (step === 'setup') handleGenerate();
        if (step === 'cinema' || step === 'batch-results') reset();
      }

      // H to toggle History
      if (e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setShowHistory(prev => !prev);
      }

      // T to toggle Theme
      if (e.key.toLowerCase() === 't') {
        e.preventDefault();
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
      }

      // Escape to close things
      if (e.key === 'Escape') {
        if (showHistory) setShowHistory(false);
        else if (showCamera) setShowCamera(null);
        else if (showEditor) setShowEditor(false);
        else if (step === 'cinema') reset();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, showHistory, showCamera, showEditor, handleGenerate, reset]);

  const getStatusIcon = (status: BatchItem['status']) => {
    switch (status) {
      case 'done':
        return (
          <div className="bg-green-500/20 text-green-500 p-2 rounded-full border border-green-500/30 animate-reveal shadow-lg shadow-green-500/20">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
          </div>
        );
      case 'error':
        return (
          <div className="bg-red-500/20 text-red-500 p-2 rounded-full border border-red-500/30 animate-bounce shadow-lg shadow-red-500/20">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
          </div>
        );
      case 'processing':
        return (
          <div className="bg-studio-neon/20 text-studio-neon p-2 rounded-full border border-studio-neon/30 animate-spin shadow-lg shadow-studio-neon/20">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
          </div>
        );
      default:
        return (
          <div className="bg-gray-500/10 text-gray-500 p-2 rounded-full border border-gray-500/20 opacity-50">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 2m6-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
        );
    }
  };

  const overallProgress = batchItems.length > 0 ? (batchItems.filter(i => i.status === 'done' || i.status === 'error').length / batchItems.length) * 100 : 0;

  return (
    <div className={`min-h-screen transition-all duration-700 ${theme === 'dark' ? 'bg-black text-white' : 'bg-gray-50 text-gray-900'}`}>
      <LivingBackground />
      
      <header className="relative z-50 p-6 flex flex-wrap justify-between items-center max-w-7xl mx-auto backdrop-blur-md">
        <div className="flex items-center gap-4 group cursor-pointer hover:scale-105 transition-transform" onClick={reset}>
          <div className="relative">
            <div className="absolute inset-0 bg-studio-neon blur-xl opacity-20 group-hover:opacity-60 transition-opacity animate-pulse"></div>
            <img 
              src={APP_LOGO} 
              alt="Logo" 
              className="relative w-14 h-14 rounded-2xl shadow-neon-blue transition-all duration-500 animate-logo-cinema group-hover:rotate-12" 
            />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-[10px] font-black tracking-[0.4em] uppercase opacity-40">{t.instituteName}</h1>
            <h2 className="text-xl font-black tracking-tight uppercase leading-tight bg-gradient-to-r from-gray-900 to-gray-500 dark:from-white dark:to-gray-500 bg-clip-text text-transparent">{t.appTitle}</h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-white/10 dark:bg-white/5 backdrop-blur-xl rounded-2xl p-1 border border-black/10 dark:border-white/10 shadow-sm">
            <button onClick={() => setLanguage('fa')} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${language === 'fa' ? 'bg-studio-neon text-black shadow-neon-blue' : 'text-gray-400 hover:text-studio-neon'}`}>FA</button>
            <button onClick={() => setLanguage('en')} className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${language === 'en' ? 'bg-studio-neon text-black shadow-neon-blue' : 'text-gray-400 hover:text-studio-neon'}`}>EN</button>
          </div>
          
          <button 
            onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')} 
            className="p-3 bg-white/10 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl hover:bg-studio-neon hover:text-black transition-all shadow-lg active:scale-90 group relative"
            title="Toggle Theme (T)"
          >
            {theme === 'dark' ? (
              <svg className="w-6 h-6 group-hover:rotate-45 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707.707M12 7a5 5 0 100 10 5 5 0 000-10z" /></svg>
            ) : (
              <svg className="w-6 h-6 group-hover:-rotate-12 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" /></svg>
            )}
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[8px] bg-black text-white px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">T</span>
          </button>
          
          <button 
            onClick={() => setShowHistory(true)} 
            className="p-3 bg-white/10 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-2xl hover:bg-studio-neon hover:text-black transition-all shadow-lg active:scale-90 group relative"
            title="Open History (H)"
          >
            <svg className="w-6 h-6 group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[8px] bg-black text-white px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity">H</span>
          </button>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto p-6 md:p-12">
        {step === 'setup' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-reveal">
            <div className="space-y-10">
              <div className="flex flex-wrap gap-2 p-1.5 bg-white/10 dark:bg-white/5 backdrop-blur-xl rounded-[1.5rem] w-fit border border-black/5 dark:border-white/10 shadow-glass">
                {(['portrait', 'faceswap', 'batch'] as AppMode[]).map(m => (
                  <button 
                    key={m} 
                    onClick={() => setMode(m)} 
                    className={`px-8 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 hover:scale-105 active:scale-95 ${mode === m ? 'bg-studio-neon text-black shadow-neon-blue' : 'hover:bg-studio-neon/10 text-gray-500 dark:text-gray-400'}`}
                  >
                    {t[`mode${m.charAt(0).toUpperCase() + m.slice(1)}` as keyof typeof t]}
                  </button>
                ))}
              </div>

              <div className="space-y-8">
                <ImageUpload 
                  title={mode === 'batch' ? t.uploadMultiTitle : mode === 'faceswap' ? "Upload Target Scene" : t.uploadTitle}
                  selectedImage={selectedImage}
                  batchImages={batchItems}
                  onImageSelected={(img) => {
                    if (Array.isArray(img)) {
                      setBatchItems(img.map(b => ({ id: Math.random().toString(), original: b, status: 'pending' })));
                      setSelectedImage(null);
                    } else {
                      setSelectedImage(img);
                      setBatchItems([]);
                    }
                  }}
                  onDimensionsDetected={(w, h) => setDetectedDimensions({ w, h })}
                  onOpenCamera={() => setShowCamera('selected')}
                  description={description}
                  onDescriptionChange={setDescription}
                  descriptionLabel={t.descriptionLabel}
                  descriptionPlaceholder={t.descriptionPlaceholder}
                  allowMultiple={mode === 'batch'}
                  language={language}
                />
                
                {selectedImage && mode !== 'batch' && (
                  <Button variant="secondary" className="w-full text-[10px] h-14 hover:scale-[1.01]" onClick={handleAutoAnalyze}>
                    <svg className="w-5 h-5 mr-2 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>
                    {t.autoAnalyze}
                  </Button>
                )}
              </div>

              <div className="space-y-4">
                 <h4 className="text-[10px] uppercase font-black text-gray-500 tracking-[0.3em] pl-2 flex items-center gap-2">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 6h16M4 12h16m-7 6h7" strokeWidth={2} /></svg>
                    {language === 'fa' ? 'کتابخانه استایل‌ها' : 'Style Library'}
                 </h4>
                 <div className="grid grid-cols-3 gap-3">
                    {PROMPT_SUGGESTIONS.map(s => (
                      <button key={s.id} onClick={() => setDescription(s.prompt)} className={`group p-4 bg-white/10 dark:bg-white/5 border border-black/5 dark:border-white/10 rounded-3xl text-left transition-all duration-300 hover:border-studio-neon hover:bg-studio-neon/5 hover:scale-105 active:scale-95 ${description === s.prompt ? 'border-studio-neon bg-studio-neon/10' : ''}`}>
                        <div className={`w-8 h-8 mb-3 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={s.icon} /></svg></div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${description === s.prompt ? 'text-studio-neon' : 'text-gray-400 group-hover:text-studio-neon'}`}>{s.id.replace('cinema_', '')}</span>
                      </button>
                    ))}
                 </div>
              </div>
            </div>

            <div className="bg-white/10 dark:bg-white/5 backdrop-blur-[40px] p-10 rounded-[3.5rem] border border-black/5 dark:border-white/10 space-y-12 shadow-glass relative overflow-hidden group/params">
              <div className="absolute top-0 right-0 w-32 h-32 bg-studio-neon/10 blur-[60px] rounded-full group-hover/params:bg-studio-neon/20 transition-all duration-1000"></div>
              <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-studio-gold flex items-center gap-3"><span className="w-1.5 h-1.5 rounded-full bg-studio-gold animate-ping"></span>{t.configTitle}</h3>
              
              <div className="space-y-8">
                <label className="block text-[10px] uppercase font-black text-gray-400 tracking-[0.3em] flex items-center gap-2">
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" /></svg>
                   {t.aspectRatio}
                </label>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {(['AUTO', '1:1', '4:3', '16:9', '9:16', '3:4'] as AspectRatio[]).map(ratio => (
                    <button key={ratio} onClick={() => setAspectRatio(ratio)} className={`py-4 border rounded-2xl text-[10px] font-black transition-all duration-300 shadow-sm hover:scale-110 active:scale-90 ${aspectRatio === ratio ? 'border-studio-neon bg-studio-neon/10 text-studio-neon shadow-neon-blue' : 'border-black/10 dark:border-white/10 text-gray-500 hover:border-studio-neon/40 hover:bg-studio-neon/5'}`}>{ratio === 'AUTO' ? t.ratioAuto : ratio}</button>
                  ))}
                </div>
              </div>

              <div className="space-y-8">
                <label className="block text-[10px] uppercase font-black text-gray-400 tracking-[0.3em] flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m12.728 0l-.707-.707M6.343 6.343l-.707.707M12 7a5 5 0 100 10 5 5 0 000-10z" /></svg>
                  {t.lightingIntensity}
                </label>
                <div className="grid grid-cols-2 gap-5">
                  {(Object.keys(LIGHTING_STYLES) as LightingIntensity[]).map(l => (
                    <button key={l} onClick={() => setLighting(l)} className={`p-6 border rounded-3xl flex flex-col gap-4 items-start transition-all duration-300 group/item hover:scale-[1.02] active:scale-[0.98] ${lighting === l ? 'border-studio-neon bg-studio-neon/10 text-studio-neon shadow-neon-blue' : 'border-black/10 dark:border-white/10 text-gray-400 hover:border-studio-neon/40 hover:bg-studio-neon/5'}`}>
                      <div className={`p-3 rounded-2xl transition-all ${lighting === l ? 'bg-studio-neon text-black' : 'bg-black/10 dark:bg-white/5 text-gray-400 group-hover/item:scale-110'}`}><svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d={LIGHTING_ICONS[l]} /></svg></div>
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t[`light${l.charAt(0).toUpperCase() + l.slice(1)}` as keyof typeof t] || l}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-8">
                <label className="block text-[10px] uppercase font-black text-gray-400 tracking-[0.3em] flex items-center gap-2">
                   <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>
                   {t.colorGrading}
                </label>
                <div className="flex flex-wrap gap-4">
                  {(Object.keys(COLOR_GRADING_STYLES) as ColorGradingStyle[]).map(c => (
                    <button key={c} onClick={() => setColorGrading(c)} className={`px-6 py-3 border rounded-full text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300 hover:scale-105 active:scale-95 ${colorGrading === c ? 'border-studio-gold bg-studio-gold/10 text-studio-gold shadow-[0_0_15px_rgba(255,215,0,0.2)]' : 'border-black/10 dark:border-white/10 text-gray-500 hover:border-studio-gold/40 hover:bg-studio-gold/5'}`}>{c.replace('_', ' ')}</button>
                  ))}
                </div>
              </div>

              <div className="pt-10 space-y-4">
                <Button variant="gold" className="w-full h-24 rounded-[2rem] text-sm hover:scale-[1.02] active:scale-[0.98] group" onClick={handleGenerate} isLoading={processing.isLoading} disabled={(batchItems.length === 0 && !selectedImage) || (mode === 'faceswap' && !sourceImage)}>
                  <svg className="w-6 h-6 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" /></svg>
                  {batchItems.length > 1 ? t.generateBatch : t.generate}
                  <span className="ml-4 opacity-30 text-[9px] font-mono group-hover:opacity-100 transition-opacity hidden md:inline">CTRL + ENTER</span>
                </Button>
                <div className="flex justify-center gap-4 text-[9px] font-black text-gray-500 uppercase tracking-widest opacity-50">
                   <span>H: آرشیو</span>
                   <span>T: تم</span>
                   <span>ESC: بازگشت</span>
                </div>
              </div>
            </div>
          </div>
        ) : step === 'batch-results' ? (
          <div className="max-w-7xl mx-auto space-y-12 animate-reveal pb-24">
             <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 bg-white/10 dark:bg-black/40 p-10 rounded-[3rem] border border-black/5 dark:border-white/10 backdrop-blur-3xl shadow-glass">
               <div className="space-y-4 flex-1 w-full">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-studio-neon flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-studio-neon animate-pulse"></span>
                    {t.batchQueue}
                  </h3>
                  <h2 className="text-4xl font-black tracking-tighter uppercase">{t.modeBatch}</h2>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">
                       <span>{t.overallProgress}</span>
                       <span className="text-studio-neon">{Math.round(overallProgress)}%</span>
                    </div>
                    <div className="w-full h-3 bg-black/10 dark:bg-white/5 rounded-full overflow-hidden border border-black/5 dark:border-white/5 shadow-inner">
                        <div 
                          className="h-full bg-gradient-to-r from-studio-neon to-studio-gold shadow-neon-blue transition-all duration-1000 ease-in-out" 
                          style={{ width: `${overallProgress}%` }}
                        ></div>
                    </div>
                  </div>
               </div>
               <div className="flex gap-4">
                  <Button variant="secondary" className="h-14 px-8 hover:scale-105" onClick={reset}>{t.newGeneration}</Button>
               </div>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {batchItems.map((item, idx) => (
                   <div key={item.id} className="relative group bg-white/10 dark:bg-white/5 rounded-[3rem] border border-black/5 dark:border-white/10 overflow-hidden shadow-glass transition-all duration-500 hover:scale-[1.02] hover:border-studio-neon/40 hover:shadow-neon-blue/10">
                      <div className="aspect-[4/5] relative overflow-hidden bg-black/40">
                        {item.result ? (
                           <img src={item.result} className="w-full h-full object-cover animate-fade-in group-hover:scale-105 transition-transform duration-1000" />
                        ) : (
                           <div className="relative w-full h-full">
                             <img src={item.original} className="w-full h-full object-cover opacity-20 grayscale scale-110 blur-sm" />
                             {item.status === 'processing' && (
                               <div className="absolute inset-0 flex items-center justify-center">
                                 <div className="w-32 h-32 border border-studio-neon/20 rounded-full animate-ping"></div>
                               </div>
                             )}
                           </div>
                        )}
                        
                        <div className="absolute top-6 left-6 right-6 flex justify-between items-center z-20">
                           <div className="bg-black/60 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 text-[9px] font-black uppercase tracking-widest text-white shadow-xl">
                             {language === 'fa' ? `تصویر #${idx + 1}` : `FRAME #${idx + 1}`}
                           </div>
                           {getStatusIcon(item.status)}
                        </div>

                        {item.status === 'processing' && (
                           <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[2px]">
                              <div className="w-20 h-20 border-4 border-studio-neon border-t-transparent rounded-full animate-spin mb-6 shadow-neon-blue"></div>
                              <p className="text-[10px] font-black text-studio-neon uppercase tracking-[0.4em] animate-pulse">{t.rendering}</p>
                           </div>
                        )}
                      </div>

                      <div className="p-8 bg-black/5 dark:bg-black/20 backdrop-blur-xl border-t border-black/5 dark:border-white/5 flex flex-col gap-6">
                         <div className="flex justify-between items-start">
                            <div className="space-y-1">
                               <p className={`text-[10px] font-black uppercase tracking-widest ${item.status === 'done' ? 'text-green-500' : item.status === 'error' ? 'text-red-500' : item.status === 'processing' ? 'text-studio-neon animate-pulse' : 'text-gray-500'}`}>
                                  {item.status === 'done' ? t.itemDone : item.status === 'processing' ? t.itemProcessing : item.status === 'error' ? t.itemError : t.itemPending}
                               </p>
                               {item.error && <p className="text-[9px] text-red-500/80 font-medium leading-relaxed max-w-[200px] bg-red-500/5 p-2 rounded-lg mt-2">{item.error}</p>}
                            </div>
                            
                            {item.result && (
                               <div className="flex gap-2">
                                  <a href={item.result} download={`studio_frame_${idx+1}.png`} className="p-3 bg-white/10 dark:bg-white/5 rounded-2xl hover:bg-studio-neon hover:text-black transition-all border border-black/5 dark:border-white/10 shadow-lg hover:scale-110 active:scale-90">
                                     <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                  </a>
                               </div>
                            )}
                         </div>

                         <div className="h-1.5 bg-black/5 dark:bg-white/5 rounded-full overflow-hidden shadow-inner">
                            <div className={`h-full transition-all duration-1000 ease-out ${item.status === 'done' ? 'w-full bg-green-500' : item.status === 'processing' ? 'w-1/2 bg-studio-neon animate-pulse' : item.status === 'error' ? 'w-full bg-red-500' : 'w-0'}`}></div>
                         </div>
                      </div>
                   </div>
                ))}
             </div>
          </div>
        ) : (
          <div className="max-w-5xl mx-auto space-y-12 animate-reveal">
            {showEditor ? <ImageEditor imageSrc={resultImage!} language={language} onSave={(newImg) => { setResultImage(newImg); setShowEditor(false); }} />
            : <div className="space-y-12">
                <div className="relative rounded-[4rem] overflow-hidden shadow-2xl border border-black/5 dark:border-white/10 bg-black/60 group h-[700px] transition-all duration-1000 hover:shadow-neon-blue/20">
                  {comparisonMode ? <ComparisonView original={selectedImage!} result={resultImage!} /> : <img src={resultImage!} alt="Result" className="w-full h-full object-contain animate-fade-in group-hover:scale-[1.01] transition-transform duration-1000" />}
                  <div className="absolute top-10 right-10 flex gap-4">
                     <button onClick={() => setComparisonMode(!comparisonMode)} className={`p-5 rounded-3xl backdrop-blur-xl border transition-all duration-300 shadow-xl hover:scale-110 active:scale-90 ${comparisonMode ? 'bg-studio-neon text-black border-studio-neon shadow-neon-blue' : 'bg-black/40 text-white border-white/10 hover:border-studio-neon/50'}`} title={t.viewCompare}><svg className={`w-7 h-7 transition-transform duration-500 ${comparisonMode ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" /></svg></button>
                  </div>
                  <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-wrap justify-center gap-4 p-3 bg-black/60 backdrop-blur-3xl rounded-[2.5rem] border border-black/5 dark:border-white/10 shadow-2xl scale-90 md:scale-100">
                      <Button variant="secondary" className="px-10 h-16 rounded-[1.5rem] hover:scale-105 active:scale-95" onClick={reset}><svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>{t.newGeneration}</Button>
                      <Button variant="secondary" className="px-10 h-16 rounded-[1.5rem] hover:scale-105 active:scale-95" onClick={() => setShowEditor(true)}><svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 12H13.5" /></svg>{t.viewEdit}</Button>
                      <a href={resultImage!} download="studio_masterpiece.png"><Button variant="gold" className="px-10 h-16 rounded-[1.5rem] hover:scale-105 active:scale-95 shadow-neon-blue/20"><svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>{t.download}</Button></a>
                  </div>
                </div>
              </div>}
          </div>
        )}
      </main>

      {showHistory && <HistoryGallery title={t.galleryTitle} emptyMessage={t.galleryEmpty} onClose={() => setShowHistory(false)} onSelect={(item) => { setResultImage(item.imageUrl); setSelectedImage(item.imageUrl); setStep('cinema'); }} />}
      {showCamera && <CameraCapture labelCapture={t.takePhoto} labelCancel={t.cancel} onCancel={() => setShowCamera(null)} onCapture={(img) => { if (showCamera === 'selected') setSelectedImage(img); else setSourceImage(img); setShowCamera(null); }} />}

      {processing.isLoading && step !== 'batch-results' && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center space-y-12 animate-fade-in">
           <div className="relative w-48 h-48">
              <div className="absolute inset-0 border-8 border-white/5 rounded-full"></div>
              <div className="absolute inset-0 border-8 border-studio-neon border-t-transparent rounded-full animate-spin shadow-neon-blue"></div>
              <div className="absolute inset-0 flex items-center justify-center flex-col">
                 <span className="text-2xl font-black text-studio-neon font-mono tracking-tighter">STUDIO</span>
                 <span className="text-[10px] text-gray-500 uppercase tracking-[0.3em] mt-1">{t.rendering}</span>
              </div>
           </div>
           <div className="text-center space-y-4 max-w-md px-6">
             <p className="text-studio-neon text-2xl font-black tracking-[0.2em] uppercase animate-pulse">{processing.statusText}</p>
             <p className="text-[11px] text-gray-500 uppercase tracking-[0.4em] leading-relaxed">{t.instituteName} <br/> <span className="opacity-50 mt-2 block">{t.appTitle}</span></p>
           </div>
        </div>
      )}
    </div>
  );
};

export default App;
