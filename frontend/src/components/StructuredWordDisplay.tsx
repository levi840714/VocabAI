import React, { useState } from 'react';
import { StructuredAIResponse } from '../lib/types';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Volume2, MessageSquare } from 'lucide-react';
import ClickableTextWrapper from './ClickableTextWrapper';
import { useSettings } from '@/contexts/SettingsContext';
import { useVoice } from '@/hooks/useVoice';

interface StructuredWordDisplayProps {
  data: StructuredAIResponse;
  onAIAnalysisClick?: (word: string) => void;
  onWordAdded?: (word: string) => void;
  showFullDetails?: boolean;
  onSentenceAnalysis?: (sentence: string) => void;
}

const StructuredWordDisplay: React.FC<StructuredWordDisplayProps> = ({ data, onAIAnalysisClick, onWordAdded, showFullDetails = false, onSentenceAnalysis }) => {
  const { shouldShowPronunciation } = useSettings();
  const { speakWord, speakSentence } = useVoice();
  const [activeExampleMenu, setActiveExampleMenu] = useState<number | null>(null);
  
  // Handle pronunciation for text (word or sentence)
  const handlePronunciation = async (text: string) => {
    // 判斷是單字還是句子
    const isWord = text.split(' ').length === 1;
    if (isWord) {
      await speakWord(text);
    } else {
      await speakSentence(text);
    }
  };

  // Highlight target word in text
  const highlightWord = (text: string, targetWord: string) => {
    if (!targetWord || !text) return text;
    
    // Create a case-insensitive regex with word boundaries
    const regex = new RegExp(`\\b(${targetWord})\\b`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => {
      if (part.toLowerCase() === targetWord.toLowerCase()) {
        return (
          <span 
            key={index}
            className="text-red-600 dark:text-red-400 font-semibold underline decoration-red-300 dark:decoration-red-500 decoration-2"
          >
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="space-y-6">
      {/* Word and Pronunciations - 為網頁版優化，保持手機版不變 */}
      {!showFullDetails && (
        <div className="text-center">
          <h2 className="text-xl md:text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white">
            {data.word}
          </h2>
        
          {/* Base form information for inflected words */}
          {data.is_inflected && data.base_form && (
            <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                <span className="text-blue-600 dark:text-blue-400 font-medium">🔄 變形單字：</span> 
                {data.word} （{data.base_form.inflection_type}）
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                <span className="text-blue-600 dark:text-blue-400 font-medium">📝 原型單字：</span> 
                <ClickableTextWrapper
                  onAIAnalysisClick={onAIAnalysisClick}
                  onWordAdded={onWordAdded}
                  inline={true}
                >
                  <span className="text-slate-900 dark:text-white font-semibold cursor-pointer hover:underline">
                    {data.base_form.word}
                  </span>
                </ClickableTextWrapper>
              </p>
            </div>
          )}
        
          {shouldShowPronunciation && data.pronunciations && data.pronunciations.length > 0 && (
            <div className="mt-2">
              {data.pronunciations.map((pronunciation, index) => (
                <span key={index} className="text-lg text-slate-600 dark:text-slate-300 mr-4">
                  {pronunciation}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Base form information for inflected words - 當 showFullDetails 為 true 時顯示 */}
      {showFullDetails && data.is_inflected && data.base_form && (
        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            <span className="text-blue-600 dark:text-blue-400 font-medium">🔄 變形單字：</span> 
            {data.word} （{data.base_form.inflection_type}）
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
            <span className="text-blue-600 dark:text-blue-400 font-medium">📝 原型單字：</span> 
            <ClickableTextWrapper
              onAIAnalysisClick={onAIAnalysisClick}
              onWordAdded={onWordAdded}
              inline={true}
            >
              <span className="text-slate-900 dark:text-white font-semibold cursor-pointer hover:underline">
                {data.base_form.word}
              </span>
            </ClickableTextWrapper>
          </p>
        </div>
      )}

      {/* Definitions by Part of Speech - 豐富視覺設計 */}
      <div className="space-y-6">
        {data.definitions && data.definitions.map((definition, defIndex) => (
          <Card key={defIndex} className="relative p-6 lg:p-8 bg-gradient-to-br from-blue-50/90 via-indigo-50/70 to-purple-50/90 dark:from-slate-800/95 dark:via-slate-700/80 dark:to-slate-600/95 backdrop-blur-sm border-2 border-blue-200/60 dark:border-slate-600/60 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl overflow-hidden">
            {/* 多層背景裝飾 */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-blue-200/50 to-indigo-200/50 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-full -translate-y-10 translate-x-10 blur-xl"></div>
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-purple-200/40 to-blue-200/40 dark:from-purple-900/20 dark:to-blue-900/20 rounded-full translate-y-12 -translate-x-12 blur-xl"></div>
            <div className="absolute top-1/2 left-1/2 w-12 h-12 bg-gradient-to-r from-indigo-200/30 to-purple-200/30 dark:from-indigo-900/15 dark:to-purple-900/15 rounded-full -translate-x-6 -translate-y-6 blur-lg"></div>
            
            <Badge variant="secondary" className="relative mb-4 text-sm lg:text-base px-3 py-2 bg-gradient-to-r from-blue-100/90 via-indigo-100/90 to-purple-100/90 dark:from-blue-900/60 dark:via-indigo-900/60 dark:to-purple-900/60 text-blue-800 dark:text-blue-200 border-2 border-blue-300/60 dark:border-blue-600/60 font-semibold shadow-md rounded-xl backdrop-blur-sm">
              {definition.part_of_speech}
            </Badge>
            
            <div className="relative space-y-4">
              {definition.meanings.map((meaning, meaningIndex) => (
                <div key={meaningIndex} className="relative bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm p-4 lg:p-5 rounded-xl border-l-4 border-gradient-to-b border-blue-500 dark:border-blue-400 shadow-lg hover:shadow-xl transition-all duration-300">
                  {/* 裝飾元素 */}
                  <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-blue-500 dark:bg-blue-400 rounded-full opacity-70"></div>
                  <div className="absolute top-0 left-0 w-8 h-8 bg-gradient-to-br from-blue-100/60 to-indigo-100/60 dark:from-blue-900/40 dark:to-indigo-900/40 rounded-full -translate-x-4 -translate-y-4 blur-sm"></div>
                  
                  <p className="relative text-slate-800 dark:text-slate-100 font-semibold text-sm md:text-base lg:text-lg leading-relaxed mb-3 pl-2">
                    {meaning.definition}
                  </p>
                  {meaning.context && (
                    <div className="relative mt-3 bg-gradient-to-r from-blue-50/90 to-indigo-50/90 dark:from-slate-800/90 dark:to-slate-700/90 p-3 lg:p-4 rounded-lg border border-blue-200/50 dark:border-slate-600/50 shadow-inner">
                      <div className="flex items-center mb-2">
                        <div className="w-1 h-1 bg-blue-500 dark:bg-blue-400 rounded-full mr-2"></div>
                        <span className="text-blue-600 dark:text-blue-400 text-xs font-medium uppercase tracking-wider">用法說明</span>
                      </div>
                      <p className="text-xs md:text-sm lg:text-base text-slate-700 dark:text-slate-200 leading-relaxed">
                        {meaning.context}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* Examples - 極致視覺優化 */}
      {data.examples && data.examples.length > 0 && (
        <Card className="relative overflow-hidden p-8 lg:p-10 bg-gradient-to-br from-white via-blue-50/30 to-indigo-50/30 dark:from-slate-800 dark:via-slate-700/50 dark:to-slate-600/50 border-2 border-blue-200/50 dark:border-slate-600/50 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl">
          {/* 背景裝飾 */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-blue-200/40 to-indigo-200/40 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-full -translate-y-12 translate-x-12 blur-xl"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-indigo-200/30 to-blue-200/30 dark:from-indigo-900/15 dark:to-blue-900/15 rounded-full translate-y-16 -translate-x-16 blur-2xl"></div>
          
          <h3 className="relative text-base md:text-lg lg:text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center">
            <div className="p-2 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900/40 dark:to-indigo-900/40 rounded-xl shadow-lg mr-3">
              <span className="text-xl">📝</span>
            </div>
            <div>
              <div>例句展示</div>
              <div className="text-xs font-normal text-slate-600 dark:text-slate-400 mt-0.5">實境應用範例</div>
            </div>
          </h3>
          
          <div className="relative space-y-6">
            {data.examples && data.examples.map((example, index) => (
              <div key={index} className="group relative bg-gradient-to-r from-white/90 via-blue-50/60 to-white/90 dark:from-slate-700/90 dark:via-slate-600/60 dark:to-slate-700/90 backdrop-blur-sm p-6 lg:p-8 rounded-xl border-2 border-blue-100/60 dark:border-slate-600/60 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-300">
                {/* 例句編號裝飾 */}
                <div className="absolute -top-2 -left-2 w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                  <span className="text-white text-sm font-bold">{index + 1}</span>
                </div>
                
                {/* 例句內容 */}
                <div className="relative">
                  <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-blue-400 to-indigo-500 rounded-full"></div>
                  <ClickableTextWrapper 
                    className="pl-6 text-slate-800 dark:text-slate-100 italic text-sm md:text-base lg:text-lg leading-relaxed font-medium block"
                    onAIAnalysisClick={onAIAnalysisClick}
                    onWordAdded={onWordAdded}
                  >
                    "{highlightWord(example, data.word)}"
                  </ClickableTextWrapper>
                </div>
                
                {/* 桌面版懸浮操作按鈕 */}
                <div className="hidden md:block absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300">
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePronunciation(example)}
                      className="p-3 rounded-xl bg-white/90 dark:bg-slate-600/90 backdrop-blur-sm shadow-lg border-2 border-blue-200/50 dark:border-slate-500/50 hover:bg-blue-50/90 dark:hover:bg-slate-500/90 hover:border-blue-400 dark:hover:border-blue-400 hover:shadow-xl hover:scale-110 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-200/50"
                      title="聆聽例句發音"
                      aria-label="聆聽例句發音"
                    >
                      <Volume2 size={16} className="text-blue-600 dark:text-blue-400" />
                    </button>
                    {onSentenceAnalysis && (
                      <button
                        onClick={() => onSentenceAnalysis(example)}
                        className="p-3 rounded-xl bg-white/90 dark:bg-slate-600/90 backdrop-blur-sm shadow-lg border-2 border-green-200/50 dark:border-slate-500/50 hover:bg-green-50/90 dark:hover:bg-slate-500/90 hover:border-green-400 dark:hover:border-green-400 hover:shadow-xl hover:scale-110 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-green-200/50"
                        title="句子語法分析"
                        aria-label="句子語法分析"
                      >
                        <MessageSquare size={16} className="text-green-600 dark:text-green-400" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 手機版操作區域 */}
                <div className="md:hidden mt-4 pt-4 border-t-2 border-gradient-to-r from-blue-200/20 via-indigo-200/40 to-blue-200/20 dark:from-blue-900/10 dark:via-indigo-900/20 dark:to-blue-900/10">
                  <div className="flex items-center justify-between pl-6">
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 tracking-wide">例句操作</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePronunciation(example)}
                        className="p-2.5 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-600 dark:text-blue-400 hover:from-blue-100 hover:to-indigo-100 dark:hover:from-blue-900/40 dark:hover:to-indigo-900/40 transition-all duration-200 shadow-sm border border-blue-200/30 dark:border-blue-700/30"
                        title="聆聽例句發音"
                        aria-label="聆聽例句發音"
                      >
                        <Volume2 size={15} />
                      </button>
                      {onSentenceAnalysis && (
                        <button
                          onClick={() => onSentenceAnalysis(example)}
                          className="p-2.5 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 text-green-600 dark:text-green-400 hover:from-green-100 hover:to-emerald-100 dark:hover:from-green-900/40 dark:hover:to-emerald-900/40 transition-all duration-200 shadow-sm border border-green-200/30 dark:border-green-700/30"
                          title="句子語法分析"
                          aria-label="句子語法分析"
                        >
                          <MessageSquare size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* 底部裝飾線 */}
                <div className="absolute bottom-0 left-6 right-6 h-0.5 bg-gradient-to-r from-transparent via-blue-200 to-transparent dark:from-transparent dark:via-blue-600/30 dark:to-transparent"></div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Synonyms and Antonyms - 極致視覺優化 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {data.synonyms && data.synonyms.length > 0 && (
          <Card className="relative overflow-hidden p-8 lg:p-10 bg-gradient-to-br from-emerald-50/80 via-green-50/60 to-teal-50/80 dark:from-emerald-900/20 dark:via-slate-800/60 dark:to-teal-900/20 border-2 border-emerald-200/50 dark:border-slate-600/50 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl">
            {/* 背景裝飾 */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-emerald-200/40 to-green-200/40 dark:from-emerald-900/20 dark:to-green-900/20 rounded-full -translate-y-10 translate-x-10 blur-xl"></div>
            
            <h3 className="relative text-base md:text-lg lg:text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center">
              <div className="p-2 bg-gradient-to-br from-emerald-100 to-green-100 dark:from-emerald-900/40 dark:to-green-900/40 rounded-xl shadow-lg mr-3">
                <span className="text-xl">🔄</span>
              </div>
              <div>
                <div>同義詞</div>
                <div className="text-xs font-normal text-emerald-600 dark:text-emerald-400 mt-0.5">相似詞彙</div>
              </div>
            </h3>
            
            <div className="relative flex flex-wrap gap-4">
              {data.synonyms && data.synonyms.map((synonym, index) => (
                <ClickableTextWrapper 
                  key={index}
                  onAIAnalysisClick={onAIAnalysisClick}
                  onWordAdded={onWordAdded}
                >
                  <Badge 
                    variant="outline" 
                    className="group relative px-4 py-3 text-sm md:text-base lg:text-lg bg-white/90 dark:bg-slate-700/90 backdrop-blur-sm text-emerald-700 dark:text-emerald-300 border-2 border-emerald-300/60 dark:border-emerald-600/60 cursor-pointer hover:bg-emerald-50/90 dark:hover:bg-emerald-900/40 hover:border-emerald-500 dark:hover:border-emerald-400 hover:shadow-lg hover:scale-105 transition-all duration-300 font-semibold rounded-xl overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-200/20 to-green-200/20 dark:from-emerald-900/20 dark:to-green-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <span className="relative">{synonym}</span>
                  </Badge>
                </ClickableTextWrapper>
              ))}
            </div>
          </Card>
        )}

        {data.antonyms && data.antonyms.length > 0 && (
          <Card className="relative overflow-hidden p-8 lg:p-10 bg-gradient-to-br from-rose-50/80 via-red-50/60 to-pink-50/80 dark:from-rose-900/20 dark:via-slate-800/60 dark:to-pink-900/20 border-2 border-rose-200/50 dark:border-slate-600/50 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl">
            {/* 背景裝飾 */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-rose-200/40 to-red-200/40 dark:from-rose-900/20 dark:to-red-900/20 rounded-full -translate-y-10 translate-x-10 blur-xl"></div>
            
            <h3 className="relative text-base md:text-lg lg:text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center">
              <div className="p-2 bg-gradient-to-br from-rose-100 to-red-100 dark:from-rose-900/40 dark:to-red-900/40 rounded-xl shadow-lg mr-3">
                <span className="text-xl">↔️</span>
              </div>
              <div>
                <div>反義詞</div>
                <div className="text-xs font-normal text-rose-600 dark:text-rose-400 mt-0.5">對比詞彙</div>
              </div>
            </h3>
            
            <div className="relative flex flex-wrap gap-4">
              {data.antonyms && data.antonyms.map((antonym, index) => (
                <ClickableTextWrapper 
                  key={index}
                  onAIAnalysisClick={onAIAnalysisClick}
                  onWordAdded={onWordAdded}
                >
                  <Badge 
                    variant="outline" 
                    className="group relative px-4 py-3 text-sm md:text-base lg:text-lg bg-white/90 dark:bg-slate-700/90 backdrop-blur-sm text-rose-700 dark:text-rose-300 border-2 border-rose-300/60 dark:border-rose-600/60 cursor-pointer hover:bg-rose-50/90 dark:hover:bg-rose-900/40 hover:border-rose-500 dark:hover:border-rose-400 hover:shadow-lg hover:scale-105 transition-all duration-300 font-semibold rounded-xl overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-rose-200/20 to-red-200/20 dark:from-rose-900/20 dark:to-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <span className="relative">{antonym}</span>
                  </Badge>
                </ClickableTextWrapper>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Memory Tips - 極致視覺優化 */}
      {data.memory_tips && (
        <Card className="relative overflow-hidden p-8 lg:p-10 bg-gradient-to-br from-amber-50/90 via-yellow-50/70 to-orange-50/90 dark:from-amber-900/30 dark:via-slate-800/60 dark:to-orange-900/30 border-2 border-amber-200/60 dark:border-amber-700/60 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-2xl">
          {/* 背景裝飾 */}
          <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-200/50 to-yellow-200/50 dark:from-amber-900/25 dark:to-yellow-900/25 rounded-full -translate-y-12 translate-x-12 blur-xl"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-yellow-200/40 to-orange-200/40 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-full translate-y-16 -translate-x-16 blur-2xl"></div>
          <div className="absolute top-1/2 left-1/2 w-16 h-16 bg-gradient-to-r from-amber-300/30 to-yellow-300/30 dark:from-amber-800/20 dark:to-yellow-800/20 rounded-full -translate-x-8 -translate-y-8 blur-lg"></div>
          
          <h3 className="relative text-lg lg:text-xl font-bold text-slate-900 dark:text-white mb-6 flex items-center">
            <div className="p-2 bg-gradient-to-br from-amber-100 via-yellow-100 to-orange-100 dark:from-amber-900/50 dark:via-yellow-900/50 dark:to-orange-900/50 rounded-xl shadow-lg mr-3">
              <span className="text-xl">💡</span>
            </div>
            <div>
              <div>記憶小技巧</div>
              <div className="text-xs font-normal text-amber-600 dark:text-amber-400 mt-0.5">學習助記方法</div>
            </div>
          </h3>
          
          <div className="relative bg-white/80 dark:bg-slate-700/80 backdrop-blur-sm p-6 lg:p-8 rounded-xl border-2 border-amber-200/50 dark:border-amber-600/50 shadow-inner">
            {/* 裝飾引號 */}
            <div className="absolute top-2 left-2 text-4xl text-amber-400/40 dark:text-amber-500/40 font-serif">"</div>
            <div className="absolute bottom-2 right-2 text-4xl text-amber-400/40 dark:text-amber-500/40 font-serif rotate-180">"</div>
            
            <p className="relative text-slate-800 dark:text-slate-100 text-base lg:text-lg leading-relaxed font-medium px-6">
              {data.memory_tips}
            </p>
            
            {/* 底部裝飾線 */}
            <div className="mt-6 h-1 bg-gradient-to-r from-transparent via-amber-300/60 to-transparent dark:from-transparent dark:via-amber-600/40 dark:to-transparent rounded-full"></div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default StructuredWordDisplay;