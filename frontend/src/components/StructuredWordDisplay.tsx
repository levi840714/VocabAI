import React from 'react';
import { StructuredAIResponse } from '../lib/types';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Volume2 } from 'lucide-react';
import ClickableTextWrapper from './ClickableTextWrapper';
import { useSettings } from '@/contexts/SettingsContext';
import { useVoice } from '@/hooks/useVoice';

interface StructuredWordDisplayProps {
  data: StructuredAIResponse;
  onAIAnalysisClick?: (word: string) => void;
  onWordAdded?: (word: string) => void;
  showFullDetails?: boolean;
}

const StructuredWordDisplay: React.FC<StructuredWordDisplayProps> = ({ data, onAIAnalysisClick, onWordAdded, showFullDetails = false }) => {
  const { shouldShowPronunciation } = useSettings();
  const { speakWord, speakSentence } = useVoice();
  
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
    <div className="space-y-4">
      {/* Word and Pronunciations */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
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
              >
                <span className="text-slate-900 dark:text-white font-semibold cursor-pointer hover:underline">
                  {data.base_form.word}
                </span>
              </ClickableTextWrapper>
            </p>
          </div>
        )}
        
        {shouldShowPronunciation && data.pronunciations.length > 0 && (
          <div className="mt-2">
            {data.pronunciations.map((pronunciation, index) => (
              <span key={index} className="text-lg text-slate-600 dark:text-slate-300 mr-4">
                {pronunciation}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Definitions by Part of Speech */}
      <div className="space-y-3">
        {data.definitions.map((definition, defIndex) => (
          <Card key={defIndex} className="p-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600">
            <Badge variant="secondary" className="mb-3 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-600">
              {definition.part_of_speech}
            </Badge>
            <div className="space-y-2">
              {definition.meanings.map((meaning, meaningIndex) => (
                <div key={meaningIndex} className="border-l-4 border-blue-200 dark:border-blue-600 pl-3">
                  <p className="text-slate-900 dark:text-white font-medium">
                    {meaning.definition}
                  </p>
                  {meaning.context && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
                      {meaning.context}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* Examples */}
      {data.examples.length > 0 && (
        <Card className="p-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
            📝 例句
          </h3>
          <div className="space-y-2">
            {data.examples.map((example, index) => (
              <div key={index} className="bg-slate-50 dark:bg-slate-700 p-3 rounded-lg relative group">
                <ClickableTextWrapper 
                  className="text-slate-700 dark:text-slate-200 italic pr-8"
                  onAIAnalysisClick={onAIAnalysisClick}
                  onWordAdded={onWordAdded}
                >
                  "{highlightWord(example, data.word)}"
                </ClickableTextWrapper>
                <button
                  onClick={() => handlePronunciation(example)}
                  className="absolute top-3 right-3 p-1 rounded-full bg-white dark:bg-slate-600 shadow-sm border border-slate-200 dark:border-slate-500 hover:bg-slate-100 dark:hover:bg-slate-500 opacity-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  title="聆聽例句發音"
                  aria-label="聆聽例句發音"
                >
                  <Volume2 size={14} className="text-slate-600 dark:text-slate-200" />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Synonyms and Antonyms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.synonyms.length > 0 && (
          <Card className="p-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
              🔄 同義詞
            </h3>
            <div className="flex flex-wrap gap-2">
              {data.synonyms.map((synonym, index) => (
                <ClickableTextWrapper 
                  key={index}
                  onAIAnalysisClick={onAIAnalysisClick}
                  onWordAdded={onWordAdded}
                >
                  <Badge variant="outline" className="text-green-700 dark:text-green-400 border-green-300 dark:border-green-600 cursor-pointer hover:bg-green-50 dark:hover:bg-green-900/30">
                    {synonym}
                  </Badge>
                </ClickableTextWrapper>
              ))}
            </div>
          </Card>
        )}

        {data.antonyms.length > 0 && (
          <Card className="p-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
              ↔️ 反義詞
            </h3>
            <div className="flex flex-wrap gap-2">
              {data.antonyms.map((antonym, index) => (
                <ClickableTextWrapper 
                  key={index}
                  onAIAnalysisClick={onAIAnalysisClick}
                  onWordAdded={onWordAdded}
                >
                  <Badge variant="outline" className="text-red-700 dark:text-red-400 border-red-300 dark:border-red-600 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/30">
                    {antonym}
                  </Badge>
                </ClickableTextWrapper>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Memory Tips */}
      {data.memory_tips && (
        <Card className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3 flex items-center">
            💡 記憶小技巧
          </h3>
          <p className="text-slate-700 dark:text-slate-200">
            {data.memory_tips}
          </p>
        </Card>
      )}
    </div>
  );
};

export default StructuredWordDisplay;