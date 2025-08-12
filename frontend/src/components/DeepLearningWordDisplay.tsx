import React from 'react';
import { DeepLearningAIResponse } from '../lib/types';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Volume2, Star } from 'lucide-react';
import ClickableTextWrapper from './ClickableTextWrapper';

interface DeepLearningWordDisplayProps {
  data: DeepLearningAIResponse;
  onAIAnalysisClick?: (word: string) => void;
  onWordAdded?: (word: string) => void;
  onAddWordClick?: () => void;
  onRemoveWordClick?: () => void;
  isAddingWord?: boolean;
  isRemovingWord?: boolean;
  isWordInVocabulary?: boolean;
}

const DeepLearningWordDisplay: React.FC<DeepLearningWordDisplayProps> = ({ 
  data, 
  onAIAnalysisClick, 
  onWordAdded, 
  onAddWordClick, 
  onRemoveWordClick,
  isAddingWord, 
  isRemovingWord,
  isWordInVocabulary 
}) => {
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
      <div className="text-center bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg">
        <div className="relative flex items-center justify-center mb-2">
          <h2 className="text-3xl font-bold text-slate-800">
            {data.word}
          </h2>
          
          {/* Action Buttons - positioned to the right */}
          <div className="absolute right-0 flex items-center gap-2">
            <button
              onClick={() => handlePronunciation(data.word)}
              className="p-2 rounded-full bg-white shadow-sm border border-slate-200 hover:bg-slate-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              title="聆聽單字發音"
              aria-label="聆聽單字發音"
            >
              <Volume2 size={18} className="text-slate-600" />
            </button>
            
            {(onAddWordClick || onRemoveWordClick) && (
              <button
                onClick={isWordInVocabulary ? onRemoveWordClick : onAddWordClick}
                disabled={isAddingWord || isRemovingWord}
                className={`p-2 rounded-full border-2 shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 bg-white ${
                  isWordInVocabulary 
                    ? 'border-yellow-400 hover:bg-yellow-50 disabled:border-yellow-300 focus:ring-yellow-400 text-yellow-600' 
                    : 'border-amber-400 hover:bg-amber-50 disabled:border-amber-300 focus:ring-amber-400 text-amber-600'
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
                    isWordInVocabulary ? 'border-yellow-600' : 'border-amber-600'
                  }`}></div>
                ) : (
                  <Star 
                    size={18} 
                    className={`${isWordInVocabulary ? 'fill-yellow-400 text-yellow-600' : 'text-amber-600'}`} 
                  />
                )}
              </button>
            )}
          </div>
        </div>
        {data.pronunciations.length > 0 && (
          <div className="flex justify-center gap-4 mb-3">
            {data.pronunciations.map((pronunciation, index) => (
              <span key={index} className="text-lg text-slate-600 font-mono">
                {pronunciation}
              </span>
            ))}
          </div>
        )}
        <div className="flex justify-center gap-2">
          <Badge variant="outline" className="bg-blue-100 text-blue-700">
            {data.difficulty_level}
          </Badge>
          <Badge variant="outline" className="bg-green-100 text-green-700">
            {data.frequency}
          </Badge>
        </div>
      </div>

      {/* Etymology Section */}
      <Card className="p-4 border-amber-200 bg-amber-50">
        <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center">
          🏛️ 詞源分析
        </h3>
        <div className="space-y-3">
          <div>
            <h4 className="font-medium text-amber-800">詞彙來源：</h4>
            <p className="text-slate-700">{data.etymology.origin}</p>
          </div>
          <div>
            <h4 className="font-medium text-amber-800">字根分析：</h4>
            <div className="text-slate-700">
              {typeof data.etymology.root_analysis === 'string' ? (
                <p>{data.etymology.root_analysis}</p>
              ) : (
                <div className="space-y-2">
                  {Object.entries(data.etymology.root_analysis).map(([key, value]) => (
                    <div key={key} className="bg-amber-100 p-2 rounded">
                      <span className="font-medium text-amber-800">{key}:</span> {value}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          {data.etymology.related_words.length > 0 && (
            <div>
              <h4 className="font-medium text-amber-800">相關詞彙：</h4>
              <div className="flex flex-wrap gap-2 mt-2">
                {data.etymology.related_words.map((word, index) => (
                  <Badge key={index} variant="outline" className="bg-amber-100 text-amber-700">
                    {word}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Enhanced Definitions */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-slate-800">📖 詳細定義</h3>
        {data.definitions.map((definition, defIndex) => (
          <Card key={defIndex} className="p-4">
            <Badge variant="secondary" className="mb-3">
              {definition.part_of_speech}
            </Badge>
            <div className="space-y-3">
              {definition.meanings.map((meaning, meaningIndex) => (
                <div key={meaningIndex} className="border-l-4 border-blue-200 pl-4 space-y-2">
                  <p className="text-slate-800 font-medium">
                    {meaning.definition}
                  </p>
                  {meaning.context && (
                    <p className="text-sm text-slate-600">
                      <span className="font-medium">語境：</span>{meaning.context}
                    </p>
                  )}
                  {meaning.formality && (
                    <p className="text-sm text-slate-600">
                      <span className="font-medium">正式程度：</span>{meaning.formality}
                    </p>
                  )}
                  {meaning.usage_notes && (
                    <p className="text-sm text-slate-600">
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
      <Card className="p-4">
        <h3 className="text-lg font-semibold text-slate-800 mb-3">
          🔗 搭配用法
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.collocations.common_phrases.length > 0 && (
            <div>
              <h4 className="font-medium text-purple-700 mb-2">常見片語：</h4>
              <div className="space-y-1">
                {data.collocations.common_phrases.map((phrase, index) => (
                  <Badge key={index} variant="outline" className="mr-2 mb-2 bg-purple-50 text-purple-700">
                    {phrase}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {data.collocations.verb_combinations.length > 0 && (
            <div>
              <h4 className="font-medium text-green-700 mb-2">動詞搭配：</h4>
              <div className="space-y-1">
                {data.collocations.verb_combinations.map((combo, index) => (
                  <Badge key={index} variant="outline" className="mr-2 mb-2 bg-green-50 text-green-700">
                    {combo}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {data.collocations.adjective_combinations.length > 0 && (
            <div>
              <h4 className="font-medium text-blue-700 mb-2">形容詞搭配：</h4>
              <div className="space-y-1">
                {data.collocations.adjective_combinations.map((combo, index) => (
                  <Badge key={index} variant="outline" className="mr-2 mb-2 bg-blue-50 text-blue-700">
                    {combo}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          
          {data.collocations.preposition_combinations.length > 0 && (
            <div>
              <h4 className="font-medium text-orange-700 mb-2">介詞搭配：</h4>
              <div className="space-y-1">
                {data.collocations.preposition_combinations.map((combo, index) => (
                  <Badge key={index} variant="outline" className="mr-2 mb-2 bg-orange-50 text-orange-700">
                    {combo}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Enhanced Examples */}
      {data.examples.length > 0 && (
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-slate-800 mb-3">
            📝 情境例句
          </h3>
          <div className="space-y-4">
            {data.examples.map((example, index) => (
              <div key={index} className="bg-slate-50 p-4 rounded-lg relative group">
                <ClickableTextWrapper 
                  className="text-slate-700 italic font-medium mb-2 pr-8"
                  onAIAnalysisClick={onAIAnalysisClick}
                  onWordAdded={onWordAdded}
                >
                  "{highlightWord(example.sentence, data.word)}"
                </ClickableTextWrapper>
                <p className="text-slate-600 text-sm mb-1">
                  翻譯：{example.translation}
                </p>
                <p className="text-slate-500 text-xs">
                  情境：{example.context}
                </p>
                <button
                  onClick={() => handlePronunciation(example.sentence)}
                  className="absolute top-4 right-4 p-2 rounded-full bg-white shadow-sm border border-slate-200 hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-all duration-200 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  title="聆聽例句發音"
                  aria-label="聆聽例句發音"
                >
                  <Volume2 size={16} className="text-slate-600" />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Enhanced Synonyms */}
      {data.synonyms.length > 0 && (
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-slate-800 mb-3">
            🔄 同義詞比較
          </h3>
          <div className="space-y-3">
            {data.synonyms.map((synonym, index) => (
              <div key={index} className="flex items-start gap-3 p-3 bg-green-50 rounded-lg">
                <Badge variant="outline" className="text-green-700 border-green-300 shrink-0">
                  {synonym.word}
                </Badge>
                <p className="text-sm text-slate-700">{synonym.difference}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Antonyms */}
      {data.antonyms.length > 0 && (
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-slate-800 mb-3">
            ↔️ 反義詞
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.antonyms.map((antonym, index) => (
              <Badge key={index} variant="outline" className="text-red-700 border-red-300">
                {antonym}
              </Badge>
            ))}
          </div>
        </Card>
      )}

      {/* Memory Strategies */}
      <Card className="p-4 bg-indigo-50 border-indigo-200">
        <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center">
          🧠 記憶策略
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <h4 className="font-medium text-indigo-700 mb-2">👁️ 視覺記憶：</h4>
            <p className="text-sm text-slate-700">{data.memory_strategies.visual}</p>
          </div>
          <div>
            <h4 className="font-medium text-indigo-700 mb-2">🔗 聯想記憶：</h4>
            <p className="text-sm text-slate-700">{data.memory_strategies.association}</p>
          </div>
          <div>
            <h4 className="font-medium text-indigo-700 mb-2">🏗️ 構詞記憶：</h4>
            <p className="text-sm text-slate-700">{data.memory_strategies.word_formation}</p>
          </div>
          <div>
            <h4 className="font-medium text-indigo-700 mb-2">📚 故事記憶：</h4>
            <p className="text-sm text-slate-700">{data.memory_strategies.story}</p>
          </div>
        </div>
      </Card>

      {/* Cultural Notes */}
      {data.cultural_notes && (
        <Card className="p-4 bg-rose-50 border-rose-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center">
            🌍 文化背景
          </h3>
          <p className="text-slate-700">
            {data.cultural_notes}
          </p>
        </Card>
      )}
    </div>
  );
};

export default DeepLearningWordDisplay;