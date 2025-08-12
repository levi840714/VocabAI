import React from 'react';
import { StructuredAIResponse } from '../lib/types';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Volume2 } from 'lucide-react';
import ClickableTextWrapper from './ClickableTextWrapper';

interface StructuredWordDisplayProps {
  data: StructuredAIResponse;
  onAIAnalysisClick?: (word: string) => void;
  onWordAdded?: (word: string) => void;
  showFullDetails?: boolean;
}

const StructuredWordDisplay: React.FC<StructuredWordDisplayProps> = ({ data, onAIAnalysisClick, onWordAdded, showFullDetails = false }) => {
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
    <div className="space-y-4">
      {/* Word and Pronunciations */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-800">
          {data.word}
        </h2>
        {data.pronunciations.length > 0 && (
          <div className="mt-2">
            {data.pronunciations.map((pronunciation, index) => (
              <span key={index} className="text-lg text-slate-600 mr-4">
                {pronunciation}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Definitions by Part of Speech */}
      <div className="space-y-3">
        {data.definitions.map((definition, defIndex) => (
          <Card key={defIndex} className="p-4">
            <Badge variant="secondary" className="mb-3">
              {definition.part_of_speech}
            </Badge>
            <div className="space-y-2">
              {definition.meanings.map((meaning, meaningIndex) => (
                <div key={meaningIndex} className="border-l-4 border-blue-200 pl-3">
                  <p className="text-slate-800 font-medium">
                    {meaning.definition}
                  </p>
                  {meaning.context && (
                    <p className="text-sm text-slate-600 mt-1">
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
        <Card className="p-4">
          <h3 className="text-lg font-semibold text-slate-800 mb-3">
            📝 例句
          </h3>
          <div className="space-y-2">
            {data.examples.map((example, index) => (
              <div key={index} className="bg-slate-50 p-3 rounded-lg relative group">
                <ClickableTextWrapper 
                  className="text-slate-700 italic pr-8"
                  onAIAnalysisClick={onAIAnalysisClick}
                  onWordAdded={onWordAdded}
                >
                  "{highlightWord(example, data.word)}"
                </ClickableTextWrapper>
                <button
                  onClick={() => handlePronunciation(example)}
                  className="absolute top-3 right-3 p-1 rounded-full bg-white shadow-sm border border-slate-200 hover:bg-slate-100 opacity-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  title="聆聽例句發音"
                  aria-label="聆聽例句發音"
                >
                  <Volume2 size={14} className="text-slate-600" />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Synonyms and Antonyms */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.synonyms.length > 0 && (
          <Card className="p-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-3">
              🔄 同義詞
            </h3>
            <div className="flex flex-wrap gap-2">
              {data.synonyms.map((synonym, index) => (
                <ClickableTextWrapper 
                  key={index}
                  onAIAnalysisClick={onAIAnalysisClick}
                  onWordAdded={onWordAdded}
                >
                  <Badge variant="outline" className="text-green-700 border-green-300 cursor-pointer hover:bg-green-50">
                    {synonym}
                  </Badge>
                </ClickableTextWrapper>
              ))}
            </div>
          </Card>
        )}

        {data.antonyms.length > 0 && (
          <Card className="p-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-3">
              ↔️ 反義詞
            </h3>
            <div className="flex flex-wrap gap-2">
              {data.antonyms.map((antonym, index) => (
                <ClickableTextWrapper 
                  key={index}
                  onAIAnalysisClick={onAIAnalysisClick}
                  onWordAdded={onWordAdded}
                >
                  <Badge variant="outline" className="text-red-700 border-red-300 cursor-pointer hover:bg-red-50">
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
        <Card className="p-4 bg-yellow-50 border-yellow-200">
          <h3 className="text-lg font-semibold text-slate-800 mb-3 flex items-center">
            💡 記憶小技巧
          </h3>
          <p className="text-slate-700">
            {data.memory_tips}
          </p>
        </Card>
      )}
    </div>
  );
};

export default StructuredWordDisplay;