import React from 'react';
import { SentenceAnalysisResponse } from '../lib/types';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Volume2, BookOpen, Square } from 'lucide-react';
import ClickableTextWrapper from './ClickableTextWrapper';
import { useVoice } from '@/hooks/useVoice';

interface SentenceAnalysisDisplayProps {
  data: SentenceAnalysisResponse;
  onAIAnalysisClick?: (word: string) => void;
  onWordAdded?: (word: string) => void;
}

const SentenceAnalysisDisplay: React.FC<SentenceAnalysisDisplayProps> = ({ 
  data, 
  onAIAnalysisClick, 
  onWordAdded
}) => {
  // Handle pronunciation for text (sentence) - toggle to stop on second click
  const { toggleSpeakSentence, isPlaying } = useVoice();
  const handlePronunciation = async (text: string) => {
    await toggleSpeakSentence(text);
  };

  return (
    <div className="space-y-6">
      {/* Sentence Header */}
      <div className="relative text-center bg-gradient-to-r from-green-50 to-emerald-50 dark:from-slate-800 dark:to-slate-700 p-6 rounded-lg">
        <div className="flex flex-col items-center mb-2">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white mb-3 leading-relaxed break-words px-2 sm:px-0">
            "{data.sentence}"
          </h2>
          
          {/* Action Buttons - pronunciation button */}
          <div className="flex items-center gap-3 md:absolute md:right-4 md:top-4">
            <button
              onClick={() => handlePronunciation(data.sentence)}
              className="p-2 rounded-full bg-white dark:bg-slate-600 shadow-sm border border-slate-200 dark:border-slate-500 hover:bg-slate-100 dark:hover:bg-slate-500 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 dark:focus:ring-green-400"
              title="聆聽句子發音"
              aria-label="聆聽句子發音"
            >
              {isPlaying ? (
                <Square size={18} className="text-slate-600 dark:text-slate-200" />
              ) : (
                <Volume2 size={18} className="text-slate-600 dark:text-slate-200" />
              )}
            </button>
          </div>
        </div>
        
        <div className="flex flex-wrap justify-center gap-2">
          <Badge variant="outline" className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-600 text-xs sm:text-sm">
            {data.sentence_type}
          </Badge>
          <Badge variant="outline" className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-600 text-xs sm:text-sm">
            {data.difficulty_level}
          </Badge>
        </div>
      </div>

      {/* Grammar Structure Analysis */}
      <Card className="p-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-3 flex items-center">
          🔍 語法結構分析
        </h3>
        <div className="space-y-3">
          {data.grammar_structure.map((component, index) => (
            <div key={index} className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex flex-col gap-2">
                <div>
                  <Badge variant="outline" className="inline-block text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-600 text-xs leading-tight break-words whitespace-normal px-2 py-1">
                    {component.component}
                  </Badge>
                </div>
                <div>
                  <p className="font-medium text-slate-800 dark:text-slate-200 mb-1 break-words">"{component.text}"</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{component.explanation}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Tense Analysis */}
      <Card className="p-4 bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-700">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-3 flex items-center">
          ⏰ 時態分析
        </h3>
        <div className="space-y-3">
          <div>
            <h4 className="font-medium text-orange-700 dark:text-orange-300">時態名稱：</h4>
            <p className="text-slate-700 dark:text-slate-200 font-semibold">{data.tense_analysis.tense_name}</p>
          </div>
          <div>
            <h4 className="font-medium text-orange-700 dark:text-orange-300">時態形式：</h4>
            <p className="text-slate-700 dark:text-slate-200">{data.tense_analysis.tense_form}</p>
          </div>
          <div>
            <h4 className="font-medium text-orange-700 dark:text-orange-300">使用原因：</h4>
            <p className="text-slate-700 dark:text-slate-200">{data.tense_analysis.usage_explanation}</p>
          </div>
        </div>
      </Card>

      {/* Key Grammar Points */}
      {data.key_grammar_points.length > 0 && (
        <Card className="p-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-3">
            📚 重要語法點
          </h3>
          <div className="space-y-2">
            {data.key_grammar_points.map((point, index) => (
              <div key={index} className="flex items-start gap-2">
                <span className="text-purple-600 dark:text-purple-400 font-bold">•</span>
                <ClickableTextWrapper 
                  onAIAnalysisClick={onAIAnalysisClick}
                  onWordAdded={onWordAdded}
                  className="text-slate-700 dark:text-slate-200"
                >
                  {point}
                </ClickableTextWrapper>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Vocabulary Breakdown */}
      <Card className="p-4 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-3">
          📖 詞彙分解
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.vocabulary_breakdown.map((vocab, index) => (
            <div key={index} className="p-3 bg-slate-50 dark:bg-slate-700 rounded-lg">
              <div className="flex flex-col gap-1 mb-2">
                <div className="flex items-center gap-2">
                  <ClickableTextWrapper 
                    onAIAnalysisClick={onAIAnalysisClick}
                    onWordAdded={onWordAdded}
                    className="font-semibold text-slate-800 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                  >
                    {vocab.word}
                  </ClickableTextWrapper>
                  <Badge variant="secondary" className="text-xs">
                    {vocab.part_of_speech}
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300 mb-1">
                <span className="font-medium">含義：</span>{vocab.meaning}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                <span className="font-medium">功能：</span>{vocab.function}
              </p>
            </div>
          ))}
        </div>
      </Card>

      {/* Rewrite Suggestions */}
      {data.rewrite_suggestions.length > 0 && (
        <Card className="p-4 bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-700">
          <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-3">
            ✏️ 改寫建議
          </h3>
          <div className="space-y-3">
            {data.rewrite_suggestions.map((suggestion, index) => (
              <div key={index} className="p-3 bg-white dark:bg-purple-900/10 rounded-lg border border-purple-200 dark:border-purple-600">
                <ClickableTextWrapper 
                  onAIAnalysisClick={onAIAnalysisClick}
                  onWordAdded={onWordAdded}
                  className="text-slate-700 dark:text-slate-200 italic"
                >
                  "{suggestion}"
                </ClickableTextWrapper>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Learning Tips */}
      <Card className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-700">
        <h3 className="text-lg font-semibold text-slate-800 dark:text-white mb-3 flex items-center">
          💡 學習建議
        </h3>
        <ClickableTextWrapper 
          onAIAnalysisClick={onAIAnalysisClick}
          onWordAdded={onWordAdded}
          className="text-slate-700 dark:text-slate-200 leading-relaxed"
        >
          {data.learning_tips}
        </ClickableTextWrapper>
      </Card>
    </div>
  );
};

export default SentenceAnalysisDisplay;
