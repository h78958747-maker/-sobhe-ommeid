
import React, { useEffect, useState, useMemo } from 'react';
import { HistoryItem } from '../types';
import { getHistory, deleteHistoryItem } from '../services/storageService';
import { Button } from './Button';
import { translations } from '../translations';

interface HistoryGalleryProps {
  onSelect: (item: HistoryItem) => void;
  onClose: () => void;
  title: string;
  emptyMessage: string;
}

const ITEMS_PER_PAGE = 10;

export const HistoryGallery: React.FC<HistoryGalleryProps> = ({
  onSelect,
  onClose,
  title,
  emptyMessage
}) => {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const data = await getHistory();
      setItems(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteHistoryItem(id);
    setItems(prev => prev.filter(item => item.id !== id));
  };

  const pagedItems = useMemo(() => {
    return items.slice(0, page * ITEMS_PER_PAGE);
  }, [items, page]);

  const hasMore = pagedItems.length < items.length;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex justify-end animate-fade-in">
       {/* Close Area */}
       <div className="flex-1" onClick={onClose}></div>
       
       {/* Drawer */}
       <div className="w-full max-w-md bg-gray-900 border-l border-white/10 shadow-2xl h-full flex flex-col transform transition-transform animate-slide-in-right">
          <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/40">
             <h2 className="text-xl font-bold text-white tracking-widest uppercase">{title}</h2>
             <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
               <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6 text-white">
                 <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
               </svg>
             </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
             {loading ? (
                <div className="flex justify-center mt-10"><div className="w-8 h-8 border-2 border-studio-neon border-t-transparent rounded-full animate-spin"></div></div>
             ) : items.length === 0 ? (
                <div className="text-center mt-20 text-gray-500 opacity-50 flex flex-col items-center gap-4">
                   <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="w-16 h-16"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" /></svg>
                   {emptyMessage}
                </div>
             ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-3">
                    {pagedItems.map((item) => (
                        <div 
                          key={item.id} 
                          className="group relative aspect-square rounded-xl overflow-hidden border border-white/5 cursor-pointer bg-black/50 hover:border-studio-neon/50 transition-all"
                          onClick={() => { onSelect(item); onClose(); }}
                        >
                          <img src={item.imageUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
                              {item.description && (
                                <span className="text-[10px] text-studio-gold font-bold mb-1 line-clamp-1 italic">"{item.description}"</span>
                              )}
                              <span className="text-[10px] text-gray-300 line-clamp-2 leading-tight mb-1">{item.prompt}</span>
                              <div className="flex justify-between items-center">
                                <span className="text-[9px] text-studio-neon font-mono">{new Date(item.timestamp).toLocaleDateString()}</span>
                                <button 
                                  onClick={(e) => handleDelete(e, item.id)}
                                  className="p-1 hover:bg-red-500/20 rounded-md text-gray-400 hover:text-red-400 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-3 h-3"><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                                </button>
                              </div>
                          </div>
                        </div>
                    ))}
                  </div>
                  
                  {hasMore && (
                    <div className="flex justify-center pb-4">
                      <Button variant="secondary" onClick={() => setPage(p => p + 1)} className="px-10 py-3 text-[10px]">
                        Load More
                      </Button>
                    </div>
                  )}
                  {!hasMore && items.length > 0 && (
                    <p className="text-center text-[9px] text-gray-600 uppercase tracking-widest pb-4">End of studio gallery</p>
                  )}
                </div>
             )}
          </div>
       </div>
    </div>
  );
};
