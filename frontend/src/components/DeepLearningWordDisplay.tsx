import React, { useState } from 'react';
import { DeepLearningAIResponse } from '../lib/types';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Volume2, Star, MessageSquare, MoreHorizontal } from 'lucide-react';
import ClickableTextWrapper from './ClickableTextWrapper';
import { useSettings } from '@/contexts/SettingsContext';

interface DeepLearningWordDisplayProps {
  data: DeepLearningAIResponse;
  onAIAnalysisClick?: (word: string) => void;
  onWordAdded?: (word: string) => void;
  onAddWordClick?: () => void;
  onRemoveWordClick?: () => void;
  isAddingWord?: boolean;
  isRemovingWord?: boolean;
  isWordInVocabulary?: boolean;
  onSentenceAnalysis?: (sentence: string) => void;
}

const DeepLearningWordDisplay: React.FC<DeepLearningWordDisplayProps> = ({ 
  data, 
  onAIAnalysisClick, 
  onWordAdded, 
  onAddWordClick, 
  onRemoveWordClick,
  isAddingWord, 
  isRemovingWord,
  isWordInVocabulary,
  onSentenceAnalysis
}) => {
  const { shouldShowPronunciation, shouldShowEtymology } = useSettings();
  const [activeExampleMenu, setActiveExampleMenu] = useState<number | null>(null);
  // Handle pronunciation for text (word or sentence)
  const handlePronunciation = (text: string) => {
    // Use Web Speech API for pronunciation
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
    } else {
      // Fallback: try Google Translate TTS
      const audio = new Audio(`https://translate.google.com/translate_tts?ie=UTF-8&tl=en&client=tw-ob&q=${encodeURIComponent(text)}`);
      audio.play().catch(() => {
        alert('發音功能暫時不可用，請檢查瀏覽器設定或網路連線');
      });
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
            className="text-red-600 font-semibold underline decoration-red-300 decoration-2"
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
      {/* Word Header with Pronunciations */}
      <div className="relative text-center bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 p-6 rounded-lg">
        <div className="flex flex-col items-center mb-2">
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-3">
            {data.word}
          </h2>
          
          {/* Base form information for inflected words */}
          {data.is_inflected && data.base_form && (
            <div className="mb-4 p-3 bg-white dark:bg-slate-700 border border-blue-200 dark:border-blue-600 rounded-lg max-w-lg">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                <span className="text-blue-600 dark:text-blue-400 font-medium">🔄 變形單字：</span> 
                {data.word} （{data.base_form.inflection_type}）
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                <span className="text-blue-600 dark:text-blue-400 font-medium">📝 原型單字：</span> 
                <ClickableTextWrapper
                  onAIAnalysisClick={onAIAnalysisClick}
                  onWordAdded={onWordAdded}
                >
                  <span className="text-slate-900 dark:text-white font-semibold cursor-pointer hover:underline">
                    {data.base_form.word}
                  </span>
                </ClickableTextWrapper>
              </p>
            </div>
          )}
          
          {/* Action Buttons - positioned in top right on desktop, below word on mobile */}
          <div className="flex items-center gap-3 md:absolute md:right-4 md:top-4">
            <button
              onClick={() => handlePronunciation(data.word)}
              className="p-2 rounded-full bg-white dark:bg-slate-600 shadow-sm border border-slate-200 dark:border-slate-500 hover:bg-slate-100 dark:hover:bg-slate-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              title="聆聽單字發音"
              aria-label="聆聽單字發音"
            >
              <Volume2 size={18} className="text-slate-600 dark:text-slate-200" />
            </button>
            
            {(onAddWordClick || onRemoveWordClick) && (
              <button
                onClick={isWordInVocabulary ? onRemoveWordClick : onAddWordClick}
                disabled={isAddingWord || isRemovingWord}
                className={`p-2 rounded-full border-2 shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 ${
                  isWordInVocabulary 
                    ? 'bg-white dark:bg-slate-600 border-yellow-400 dark:border-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/30 disabled:border-yellow-300 dark:disabled:border-yellow-600 focus:ring-yellow-400 text-yellow-600 dark:text-yellow-400' 
                    : 'bg-white dark:bg-slate-600 border-amber-400 dark:border-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30 disabled:border-amber-300 dark:disabled:border-amber-600 focus:ring-amber-400 text-amber-600 dark:text-amber-400'
                }`}
                title={
                  isAddingWord ? "加入中..." :
                  isRemovingWord ? "移除中..." :
                  isWordInVocabulary ? "已收藏，點擊取消收藏" : "點擊收藏到詞彙庫"
                }
                aria-label={
                  isAddingWord ? "加入中..." :
                  isRemovingWord ? "移除中..." :
                  isWordInVocabulary ? "已收藏，點擊取消收藏" : "點擊收藏到詞彙庫"
                }
              >
                {isAddingWord || isRemovingWord ? (
                  <div className={`animate-spin rounded-full h-4 w-4 border-b-2 ${
                    isWordInVocabulary ? 'border-yellow-600 dark:border-yellow-400' : 'border-amber-600 dark:border-amber-400'
                  }`}></div>
                ) : (
                  <Star 
                    size={18} 
                    className={`${isWordInVocabulary ? 'fill-yellow-400 text-yellow-600 dark:fill-yellow-400 dark:text-yellow-400' : 'text-amber-600 dark:text-amber-400'}`} 
                  />
                )}
              </button>
            )}
          </div>
        </div>
        {shouldShowPronunciation && data.pronunciations.length > 0 && (
          <div className="flex justify-center gap-4 mb-3">
            {data.pronunciations.map((pronunciation, index) => (
              <span key={index} className="text-lg text-slate-600 dark:text-slate-300 font-mono">
                {pronunciation}
              </span>
            ))}
          </div>
        )}
        <div className="flex justify-center gap-2">
          <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-600">
            {data.difficulty_level}
          </Badge>
          <Badge variant="outline" className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-600">
            {data.frequency}
          </Badge>
        </div>
      </div>

      {/* Etymology Section */}
      {shouldShowEtymology && (
        <Card className="p-4 border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-amber-200 mb-3 flex items-center">
            🏛️ 詞源分析
          </h3>
        <div className="space-y-3">
          <div>
            <h4 className="font-medium text-amber-800 dark:text-amber-300">詞彙來源：</h4>
            <p className="text-slate-700 dark:text-slate-200">{data.etymology.origin}</p>
          </div>
          <div>
            <h4 className="font-medium text-amber-800 dark:text-amber-300">字根分析：</h4>
            <div className="text-slate-700 dark:text-slate-200">
              {typeof data.etymology.root_analysis === 'string' ? (
                <p>{data.etymology.root_analysis}</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(data.etymology.root_analysis).map(([key, value]) => (
                    <div key={key} className="bg-amber-100 dark:bg-amber-800/30 p-2 rounded">
                      <span className="font-medium text-amber-800 dark:text-amber-300">{key}:</span> {value}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {data.etymology.related_words.length > 0 && (
            <div>
              <h4 className="font-medium text-amber-800 dark:text-amber-300">相關詞彙：</h4>
              <div className="flex flex-wrap gap-2 mt-2">
                {data.etymology.related_words.map((word, index) => (
                  <ClickableTextWrapper 
                    key={index}
                    onAIAnalysisClick={onAIAnalysisClick}
                    onWordAdded={onWordAdded}
                    onDeepAnalysis={onAIAnalysisClick}
                    className="inline-block"
                  >
                    <Badge variant="outline" className="bg-amber-100 dark:bg-amber-800/30 text-amber-700 dark:text-amber-200 border-amber-200 dark:border-amber-600">
                      {word}
                    </Badge>
                  </ClickableTextWrapper>
                ))}
              </div>
            </div>
          )}
        </div>
        </Card>
      )}

      {/* Enhanced Definitions */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white">📖 詳細定義</h3>
        {data.definitions.map((definition, defIndex) => (
          <Card key={defIndex} className="p-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600">
            <Badge variant="secondary" className="mb-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
              {definition.part_of_speech}
            </Badge>
            <div className="space-y-3">
              {definition.meanings.map((meaning, meaningIndex) => (
                <div key={meaningIndex} className="border-l-4 border-blue-200 dark:border-blue-600 pl-4 space-y-2">
                  <p className="text-slate-800 dark:text-slate-200 font-medium">
                    {meaning.definition}
                  </p>
                  {meaning.context && (
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      <span className="font-medium">語境：</span>{meaning.context}
                    </p>
                  )}
                  {meaning.formality && (
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      <span className="font-medium">正式程度：</span>{meaning.formality}
                    </p>
                  )}
                  {meaning.usage_notes && (
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      <span className="font-medium">用法提醒：</span>{meaning.usage_notes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* Collocations */}
      <Card className="p-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-3">
          🔗 搭配用法
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.collocations.common_phrases.length > 0 && (
            <div>
              <h4 className="font-medium text-purple-700 dark:text-purple-300 mb-2">常見片語：</h4>
              <div className="space-y-1">
                {data.collocations.common_phrases.map((phrase, index) => (
                  <ClickableTextWrapper 
                    key={index}
                    onAIAnalysisClick={onAIAnalysisClick}
                    onWordAdded={onWordAdded}
                    onDeepAnalysis={onAIAnalysisClick}
                    className="inline-block mr-2 mb-2"
                  >
                    <Badge variant="outline" className="bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-600">
                      {phrase}
                    </Badge>
                  </ClickableTextWrapper>
                ))}
              </div>
            </div>
          )}
          
          {data.collocations.verb_combinations.length > 0 && (
            <div>
              <h4 className="font-medium text-green-700 dark:text-green-300 mb-2">動詞搭配：</h4>
              <div className="space-y-1">
                {data.collocations.verb_combinations.map((combo, index) => (
                  <ClickableTextWrapper 
                    key={index}
                    onAIAnalysisClick={onAIAnalysisClick}
                    onWordAdded={onWordAdded}
                    onDeepAnalysis={onAIAnalysisClick}
                    className="inline-block mr-2 mb-2"
                  >
                    <Badge variant="outline" className="bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-600">
                      {combo}
                    </Badge>
                  </ClickableTextWrapper>
                ))}
              </div>
            </div>
          )}
          
          {data.collocations.adjective_combinations.length > 0 && (
            <div>
              <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-2">形容詞搭配：</h4>
              <div className="space-y-1">
                {data.collocations.adjective_combinations.map((combo, index) => (
                  <ClickableTextWrapper 
                    key={index}
                    onAIAnalysisClick={onAIAnalysisClick}
                    onWordAdded={onWordAdded}
                    onDeepAnalysis={onAIAnalysisClick}
                    className="inline-block mr-2 mb-2"
                  >
                    <Badge variant="outline" className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-600">
                      {combo}
                    </Badge>
                  </ClickableTextWrapper>
                ))}
              </div>
            </div>
          )}
          
          {data.collocations.preposition_combinations.length > 0 && (
            <div>
              <h4 className="font-medium text-orange-700 dark:text-orange-300 mb-2">介詞搭配：</h4>
              <div className="space-y-1">
                {data.collocations.preposition_combinations.map((combo, index) => (
                  <ClickableTextWrapper 
                    key={index}
                    onAIAnalysisClick={onAIAnalysisClick}
                    onWordAdded={onWordAdded}
                    onDeepAnalysis={onAIAnalysisClick}
                    className="inline-block mr-2 mb-2"
                  >
                    <Badge variant="outline" className="bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-600">
                      {combo}
                    </Badge>
                  </ClickableTextWrapper>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Enhanced Examples */}
      {data.examples.length > 0 && (
        <Card className="p-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-3">
            📝 情境例句
          </h3>
          <div className="space-y-4">
            {data.examples.map((example, index) => (
              <div key={index} className="bg-slate-50 dark:bg-slate-700 p-4 rounded-lg relative group">
                <ClickableTextWrapper 
                  className="text-slate-700 dark:text-slate-200 italic font-medium mb-2"
                  onAIAnalysisClick={onAIAnalysisClick}
                  onWordAdded={onWordAdded}
                  onDeepAnalysis={onAIAnalysisClick}
                >
                  "{highlightWord(example.sentence, data.word)}"
                </ClickableTextWrapper>
                <p className="text-slate-600 dark:text-slate-300 text-sm mb-1">
                  翻譯：{example.translation}
                </p>
                <p className="text-slate-500 dark:text-slate-400 text-xs">
                  情境：{example.context}
                </p>
                
                {/* 桌面版懸浮按鈕 */}
                <div className="hidden md:block absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-200">
                  <div className="flex gap-1">
                    <button
                      onClick={() => handlePronunciation(example.sentence)}
                      className="p-2 rounded-full bg-white dark:bg-slate-600 shadow-sm border border-slate-200 dark:border-slate-500 hover:bg-slate-100 dark:hover:bg-slate-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      title="聆聽例句發音"
                      aria-label="聆聽例句發音"
                    >
                      <Volume2 size={14} className="text-slate-600 dark:text-slate-200" />
                    </button>
                    {onSentenceAnalysis && (
                      <button
                        onClick={() => onSentenceAnalysis(example.sentence)}
                        className="p-2 rounded-full bg-white dark:bg-slate-600 shadow-sm border border-slate-200 dark:border-slate-500 hover:bg-slate-100 dark:hover:bg-slate-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500"
                        title="句子語法分析"
                        aria-label="句子語法分析"
                      >
                        <MessageSquare size={14} className="text-slate-600 dark:text-slate-200" />
                      </button>
                    )}
                  </div>
                </div>

                {/* 手機版操作區域 */}
                <div className="md:hidden mt-3 pt-3 border-t border-slate-200 dark:border-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 dark:text-slate-400">例句操作</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handlePronunciation(example.sentence)}
                        className="p-2 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all duration-200"
                        title="聆聽例句發音"
                        aria-label="聆聽例句發音"
                      >
                        <Volume2 size={14} />
                      </button>
                      {onSentenceAnalysis && (
                        <button
                          onClick={() => onSentenceAnalysis(example.sentence)}
                          className="p-2 rounded-md bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/40 transition-all duration-200"
                          title="句子語法分析"
                          aria-label="句子語法分析"
                        >
                          <MessageSquare size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Enhanced Synonyms */}
      {data.synonyms.length > 0 && (
        <Card className="p-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-3">
            🔄 同義詞比較
          </h3>
          <div className="space-y-3">
            {data.synonyms.map((synonym, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <ClickableTextWrapper 
                  onAIAnalysisClick={onAIAnalysisClick}
                  onWordAdded={onWordAdded}
                  onDeepAnalysis={onAIAnalysisClick}
                  className="shrink-0"
                >
                  <Badge variant="outline" className="text-green-700 dark:text-green-300 border-green-300 dark:border-green-600">
                    {synonym.word}
                  </Badge>
                </ClickableTextWrapper>
                <ClickableTextWrapper 
                  onAIAnalysisClick={onAIAnalysisClick}
                  onWordAdded={onWordAdded}
                  onDeepAnalysis={onAIAnalysisClick}
                  className="text-sm text-slate-700 dark:text-slate-200"
                >
                  {synonym.difference}
                </ClickableTextWrapper>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Antonyms */}
      {data.antonyms.length > 0 && (
        <Card className="p-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-3">
            ↔️ 反義詞
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.antonyms.map((antonym, index) => (
              <ClickableTextWrapper 
                key={index}
                onAIAnalysisClick={onAIAnalysisClick}
                onWordAdded={onWordAdded}
                onDeepAnalysis={onAIAnalysisClick}
                className="inline-block"
              >
                <Badge variant="outline" className="text-red-700 dark:text-red-400 border-red-300 dark:border-red-600">
                  {antonym}
                </Badge>
              </ClickableTextWrapper>
            ))}
          </div>
        </Card>
      )}

      {/* Memory Strategies */}
      <Card className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-700">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-3 flex items-center">
          🧠 記憶策略
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-indigo-700 dark:text-indigo-300 mb-2">👁️ 視覺記憶：</h4>
            <ClickableTextWrapper 
              onAIAnalysisClick={onAIAnalysisClick}
              onWordAdded={onWordAdded}
              onDeepAnalysis={onAIAnalysisClick}
              className="text-sm text-slate-700 dark:text-slate-200"
            >
              {data.memory_strategies.visual}
            </ClickableTextWrapper>
          </div>
          <div>
            <h4 className="font-medium text-indigo-700 dark:text-indigo-300 mb-2">🔗 聯想記憶：</h4>
            <ClickableTextWrapper 
              onAIAnalysisClick={onAIAnalysisClick}
              onWordAdded={onWordAdded}
              onDeepAnalysis={onAIAnalysisClick}
              className="text-sm text-slate-700 dark:text-slate-200"
            >
              {data.memory_strategies.association}
            </ClickableTextWrapper>
          </div>
          <div>
            <h4 className="font-medium text-indigo-700 dark:text-indigo-300 mb-2">🏗️ 構詞記憶：</h4>
            <ClickableTextWrapper 
              onAIAnalysisClick={onAIAnalysisClick}
              onWordAdded={onWordAdded}
              onDeepAnalysis={onAIAnalysisClick}
              className="text-sm text-slate-700 dark:text-slate-200"
            >
              {data.memory_strategies.word_formation}
            </ClickableTextWrapper>
          </div>
          <div>
            <h4 className="font-medium text-indigo-700 dark:text-indigo-300 mb-2">📚 故事記憶：</h4>
            <ClickableTextWrapper 
              onAIAnalysisClick={onAIAnalysisClick}
              onWordAdded={onWordAdded}
              onDeepAnalysis={onAIAnalysisClick}
              className="text-sm text-slate-700 dark:text-slate-200"
            >
              {data.memory_strategies.story}
            </ClickableTextWrapper>
          </div>
        </div>
      </Card>

      {/* Cultural Notes */}
      {data.cultural_notes && (
        <Card className="p-4 bg-rose-50 dark:bg-rose-900/20 border-rose-200 dark:border-rose-700">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-3 flex items-center">
            🌍 文化背景
          </h3>
          <ClickableTextWrapper 
            onAIAnalysisClick={onAIAnalysisClick}
            onWordAdded={onWordAdded}
            onDeepAnalysis={onAIAnalysisClick}
            className="text-slate-700 dark:text-slate-200"
          >
            {data.cultural_notes}
          </ClickableTextWrapper>
        </Card>
      )}
    </div>
  );
};

export default DeepLearningWordDisplay;