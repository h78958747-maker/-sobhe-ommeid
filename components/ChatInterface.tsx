
import React, { useRef, useEffect, useState } from 'react';
import { ChatMessage, Language } from '../types';
import { translations } from '../translations';
import { Button } from './Button';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  language: Language;
  disabled: boolean;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  isLoading,
  language,
  disabled
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const t = translations[language];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputText.trim() && !isLoading && !disabled) {
      onSendMessage(inputText);
      setInputText('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-white/10 flex items-center justify-between">
        <h3 className="text-sm font-black uppercase tracking-[0.3em] text-studio-neon flex items-center gap-3">
          <svg className="w-5 h-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          {t.chatTitle}
        </h3>
        <div className="flex gap-1.5">
           <span className="w-1.5 h-1.5 bg-studio-neon rounded-full animate-ping"></span>
           <span className="w-1.5 h-1.5 bg-studio-neon rounded-full opacity-50"></span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
        {messages.length === 0 && (
           <div className="text-center py-20 space-y-4 animate-reveal">
             <div className="w-16 h-16 bg-studio-neon/10 rounded-full flex items-center justify-center mx-auto border border-studio-neon/20">
                <svg className="w-8 h-8 text-studio-neon" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
             </div>
             <p className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-black">{t.modelGreeting}</p>
           </div>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-reveal`}>
            <div className={`max-w-[85%] rounded-[1.5rem] px-5 py-4 text-xs leading-relaxed shadow-xl border ${
                msg.role === 'user'
                  ? 'bg-studio-neon text-black border-studio-neon font-black'
                  : 'bg-white/5 text-gray-200 border-white/10 backdrop-blur-md'
              }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start animate-reveal">
             <div className="bg-white/5 border border-white/10 rounded-[1.5rem] px-5 py-4 flex items-center gap-2">
                <span className="w-2 h-2 bg-studio-neon rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-studio-neon rounded-full animate-bounce" style={{ animationDelay: '200ms' }}></span>
                <span className="w-2 h-2 bg-studio-neon rounded-full animate-bounce" style={{ animationDelay: '400ms' }}></span>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-6 border-t border-white/10 flex gap-4 bg-black/60">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={t.chatPlaceholder}
          disabled={disabled || isLoading}
          className="flex-1 bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-xs text-white placeholder:text-gray-600 focus:outline-none focus:border-studio-neon transition-all"
        />
        <Button 
          type="submit" 
          disabled={disabled || isLoading || !inputText.trim()}
          variant="gold"
          className="px-6 py-4 rounded-2xl h-14 w-14 flex items-center justify-center p-0"
        >
          <svg className={`w-5 h-5 ${language === 'fa' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </Button>
      </form>
    </div>
  );
};
