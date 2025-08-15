import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, Lightbulb, MessageSquare, Volume2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { memWhizAPI } from '../lib/api';
import { DailyDiscoveryResponse, KnowledgePoint } from '../lib/types';
import { ThemeCard, ThemeTitle, ThemeText, ThemeButton } from '../components/ui/ThemeComponents';
import { useAnimation } from '../hooks/useAnimation';
import { useClickableText } from '../hooks/useClickableText';
import { useClickableTextContext } from '../contexts/ClickableTextContext';
import { useVocabulary } from '../hooks/use-vocabulary';


const KNOWLEDGE_TYPE_COLORS = {
  vocabulary: {
    badge: 'bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400',
    icon: 'bg-blue-100 dark:bg-blue-900',
    iconText: 'text-blue-600 dark:text-blue-400'
  },
  grammar: {
    badge: 'bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400',
    icon: 'bg-green-100 dark:bg-green-900',
    iconText: 'text-green-600 dark:text-green-400'
  },
  cultural: {
    badge: 'bg-purple-100 dark:bg-purple-900 text-purple-600 dark:text-purple-400',
    icon: 'bg-purple-100 dark:bg-purple-900',
    iconText: 'text-purple-600 dark:text-purple-400'
  },
  expression: {
    badge: 'bg-orange-100 dark:bg-orange-900 text-orange-600 dark:text-orange-400',
    icon: 'bg-orange-100 dark:bg-orange-900',
    iconText: 'text-orange-600 dark:text-orange-400'
  },
  default: {
    badge: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400',
    icon: 'bg-slate-100 dark:bg-slate-700',
    iconText: 'text-slate-600 dark:text-slate-400'
  }
};

const KNOWLEDGE_TYPE_ICONS = {
  vocabulary: BookOpen,
  grammar: Lightbulb,
  cultural: MessageSquare,
  expression: Volume2,
  default: BookOpen
};

export default function DailyDiscoveryPage() {
  const navigate = useNavigate();
  const animation = useAnimation();
  const [discoveryData, setDiscoveryData] = useState<DailyDiscoveryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readingArticle, setReadingArticle] = useState(false);
  
  // 使用智能點擊功能（hook提供makeTextClickable）+ 全域回調設定
  const { makeTextClickable } = useClickableText();
  const { setCallbacks } = useClickableTextContext();
  const { addWordToVocabulary, removeWordFromVocabulary, vocabulary } = useVocabulary();

  const handlePronunciation = (text: string) => {
    if (readingArticle) return;
    
    setReadingArticle(true);
    
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // 停止當前的語音
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      
      utterance.onend = () => {
        setReadingArticle(false);
      };
      
      utterance.onerror = () => {
        setReadingArticle(false);
      };
      
      window.speechSynthesis.speak(utterance);
    } else {
      setReadingArticle(false);
    }
  };

  // 處理深度分析
  const handleDeepAnalysis = useCallback((word: string) => {
    console.log(`🧠 開始深度分析: ${word}`);
    navigate('/ai-analysis', { 
      state: { 
        initialWord: word,
        analysisType: 'deep'
      }
    });
  }, [navigate]);

  useEffect(() => {
    const fetchDailyDiscovery = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await memWhizAPI.getDailyDiscovery();
        setDiscoveryData(data);
      } catch (err) {
        console.error('獲取每日探索內容失敗:', err);
        setError(err instanceof Error ? err.message : '獲取每日探索內容失敗');
      } finally {
        setLoading(false);
      }
    };

    fetchDailyDiscovery();
  }, []);

  // 註冊全域回調函數
  useEffect(() => {
    setCallbacks({
      onDeepAnalysis: handleDeepAnalysis,
      onAIAnalysisClick: handleDeepAnalysis
    });
  }, [setCallbacks, handleDeepAnalysis]);

  const getKnowledgeTypeColor = (type: string) => {
    return KNOWLEDGE_TYPE_COLORS[type as keyof typeof KNOWLEDGE_TYPE_COLORS] || KNOWLEDGE_TYPE_COLORS.default;
  };

  const getKnowledgeTypeIcon = (type: string) => {
    const IconComponent = KNOWLEDGE_TYPE_ICONS[type as keyof typeof KNOWLEDGE_TYPE_ICONS] || KNOWLEDGE_TYPE_ICONS.default;
    return IconComponent;
  };

  // 在文章內容中標示知識重點
  const highlightKnowledgePoints = (content: string, knowledgePoints: KnowledgePoint[]) => {
    if (!knowledgePoints || knowledgePoints.length === 0) return formatArticleContent(content);
    
    let highlightedContent = content;
    
    // 收集所有需要標示的關鍵詞和短語（排除 cultural 類型）
    const keywordsToHighlight = new Set<string>();
    
    knowledgePoints.forEach(point => {
      // 跳過 cultural 類型的知識重點
      if (point.type === 'cultural') return;
      
      // 從標題中提取關鍵詞（更精確的匹配）
      const titleWords = point.title.match(/[A-Za-z]+(?:'[a-z]*)?/g) || [];
      titleWords.forEach(word => {
        if (word.length >= 4 && !isCommonWord(word)) { // 提高最小長度要求，排除常見詞
          keywordsToHighlight.add(word.toLowerCase());
        }
      });
      
      // 從範例中提取關鍵詞（只取明顯的專業詞彙）
      point.examples.forEach(example => {
        // 只匹配引號內的詞彙或明顯的專業術語
        const quotedWords = example.match(/"([^"]+)"/g) || [];
        quotedWords.forEach(quoted => {
          const words = quoted.replace(/"/g, '').match(/[A-Za-z]+(?:'[a-z]*)?/g) || [];
          words.forEach(word => {
            if (word.length >= 4 && !isCommonWord(word)) {
              keywordsToHighlight.add(word.toLowerCase());
            }
          });
        });
      });
    });

    // 對每個關鍵詞進行標示
    Array.from(keywordsToHighlight).forEach(keyword => {
      const regex = new RegExp(`\\b(${keyword})\\b`, 'gi');
      highlightedContent = highlightedContent.replace(regex, (match) => {
        return `<mark class="bg-yellow-200/60 dark:bg-yellow-600/40 text-slate-900 dark:text-slate-100 px-1 py-0.5 rounded font-medium">${match}</mark>`;
      });
    });

    const formattedContent = formatArticleContent(highlightedContent);
    // 確保內容用 p 標籤包裹
    const wrappedContent = formattedContent.startsWith('<p') ? formattedContent : `<p class="mb-6">${formattedContent}</p>`;
    return <div dangerouslySetInnerHTML={{ __html: wrappedContent }} />;
  };

  // 檢查是否為常見詞（避免標示過多無意義的詞）
  const isCommonWord = (word: string): boolean => {
    const commonWords = new Set([
      'that', 'this', 'with', 'have', 'will', 'from', 'they', 'been', 'their', 'said',
      'each', 'which', 'what', 'were', 'when', 'where', 'who', 'how', 'why', 'some',
      'more', 'very', 'time', 'just', 'like', 'over', 'also', 'back', 'after', 'first',
      'well', 'way', 'even', 'new', 'want', 'because', 'any', 'these', 'give', 'day',
      'most', 'us', 'is', 'are', 'was', 'be', 'been', 'has', 'had', 'do', 'does', 'did',
      'can', 'could', 'should', 'would', 'may', 'might', 'must', 'shall', 'will'
    ]);
    return commonWords.has(word.toLowerCase());
  };

  // 優化文章內容格式化和斷行
  const formatArticleContent = (content: string): string => {
    return content
      // 在句號後添加適當的段落間距
      .replace(/\.\s+/g, '. ')
      // 在段落之間添加更多間距，使用 HTML 分段
      .replace(/\n\n+/g, '</p><p class="mb-6">')
      // 在單個換行處增加間距
      .replace(/\n/g, '<br class="mb-2">')
      // 在長句子中的逗號後增加微小間距
      .replace(/,\s+/g, ', ')
      // 確保引號前後有適當間距
      .replace(/"\s*/g, '" ')
      .replace(/\s*"/g, ' "')
      .trim();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <ThemeCard className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto mb-4"></div>
          <ThemeText>正在生成今日探索內容...</ThemeText>
        </ThemeCard>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <ThemeCard className="text-center">
          <ThemeText className="text-red-500 dark:text-red-400 mb-4">載入失敗: {error}</ThemeText>
          <ThemeButton 
            onClick={() => window.location.reload()}
            variant="primary"
          >
            重新載入
          </ThemeButton>
        </ThemeCard>
      </div>
    );
  }

  if (!discoveryData) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <ThemeCard className="text-center">
          <ThemeText>沒有可用的探索內容</ThemeText>
        </ThemeCard>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 border-b sticky top-0 z-10">
        <div className="flex items-center p-4">
          <motion.button
            onClick={() => navigate('/')}
            className="mr-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors"
            whileHover={animation.hover}
            whileTap={animation.tap}
          >
            <ArrowLeft className="h-5 w-5" />
          </motion.button>
          <div>
            <ThemeTitle level={3}>每日探索</ThemeTitle>
            <ThemeText variant="caption" size="sm">
              {new Date(discoveryData.content_date).toLocaleDateString('zh-TW', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </ThemeText>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* Article Section */}
        <ThemeCard
          variant="solid"
          motionProps={{
            initial: { opacity: 0, y: 20 },
            animate: { opacity: 1, y: 0 }
          }}
        >
          <div className="flex items-center justify-between mb-6">
            {makeTextClickable(
              <ThemeTitle level={2} className="clickable-title-content">{discoveryData.article.title}</ThemeTitle>
            )}
            <motion.button
              onClick={() => handlePronunciation(discoveryData.article.content)}
              disabled={readingArticle}
              className={`p-3 rounded-xl ${readingArticle 
                ? 'bg-slate-400 dark:bg-slate-600' 
                : 'bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700'
              } text-white transition-colors shadow-sm`}
              whileHover={readingArticle ? {} : animation.hover}
              whileTap={readingArticle ? {} : animation.tap}
            >
              <Volume2 className="h-5 w-5" />
            </motion.button>
          </div>
          
          <div className="flex items-center gap-3 mb-6">
            <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400">
              {discoveryData.article.difficulty_level}
            </span>
            <span className="px-3 py-1.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-400">
              {discoveryData.article.topic_category}
            </span>
            <ThemeText variant="caption" size="sm">
              {discoveryData.article.word_count} 字
            </ThemeText>
          </div>
          
          <div className="prose prose-lg dark:prose-invert max-w-none">
            {makeTextClickable(
              <ThemeText className="clickable-article-content text-lg sm:text-xl whitespace-pre-line text-slate-700 dark:text-slate-200 tracking-wide">
                {highlightKnowledgePoints(discoveryData.article.content, discoveryData.knowledge_points)}
              </ThemeText>
            )}
          </div>
        </ThemeCard>

        {/* Learning Objectives Section - 移到第一個區塊 */}
        {discoveryData.learning_objectives.length > 0 && (
          <ThemeCard
            variant="solid"
            motionProps={{
              initial: { opacity: 0, y: 20 },
              animate: { opacity: 1, y: 0 },
              transition: { delay: 0.1 }
            }}
          >
            <ThemeTitle level={3} className="mb-4">學習目標</ThemeTitle>
            
            <ul className="space-y-3">
              {discoveryData.learning_objectives.map((objective, index) => (
                <li key={index} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-500 dark:bg-blue-600 text-white text-xs rounded-full flex items-center justify-center mt-0.5">
                    {index + 1}
                  </span>
                  {makeTextClickable(
                    <ThemeText variant="body" className="flex-1 text-lg sm:text-base clickable-text-content">
                      {objective}
                    </ThemeText>
                  )}
                </li>
              ))}
            </ul>
          </ThemeCard>
        )}

        {/* Knowledge Points Section - 調整為第二個區塊 */}
        {discoveryData.knowledge_points.length > 0 && (
          <ThemeCard
            variant="solid"
            motionProps={{
              initial: { opacity: 0, y: 20 },
              animate: { opacity: 1, y: 0 },
              transition: { delay: 0.2 }
            }}
          >
            <ThemeTitle level={3} className="mb-4">知識重點</ThemeTitle>
            
            <div className="grid gap-4 md:grid-cols-2">
              {discoveryData.knowledge_points.map((point, index) => {
                const IconComponent = getKnowledgeTypeIcon(point.type);
                const colors = getKnowledgeTypeColor(point.type);
                return (
                  <motion.div
                    key={point.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * index }}
                    className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-slate-600"
                  >
                    <div className="flex items-center gap-3 mb-4">
                      <div className={`p-2 rounded-lg ${colors.icon}`}>
                        <IconComponent className={`h-5 w-5 sm:h-4 sm:w-4 ${colors.iconText}`} />
                      </div>
                      <div className="flex-1">
                        {makeTextClickable(
                          <ThemeTitle level={4} className="!text-xl sm:!text-lg !font-medium mb-2">
                            {point.title}
                          </ThemeTitle>
                        )}
                        <span className={`text-base sm:text-sm px-3 py-1 rounded-full ${colors.badge}`}>
                          {point.type}
                        </span>
                      </div>
                    </div>
                    
                    {makeTextClickable(
                      <ThemeText variant="body" className="mb-5 text-lg sm:text-base leading-loose">
                        {point.content}
                      </ThemeText>
                    )}
                    
                    {point.examples.length > 0 && (
                      <div>
                        <ThemeText variant="caption" className="font-medium mb-3 text-base sm:text-sm">
                          範例：
                        </ThemeText>
                        <ul className="space-y-3">
                          {point.examples.map((example, idx) => (
                            <li key={idx}>
                              {makeTextClickable(
                                <ThemeText variant="caption" className="italic text-base sm:text-sm leading-relaxed">
                                  • {example}
                                </ThemeText>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          </ThemeCard>
        )}


        {/* Discussion Questions Section */}
        {discoveryData.discussion_questions.length > 0 && (
          <ThemeCard
            variant="solid"
            motionProps={{
              initial: { opacity: 0, y: 20 },
              animate: { opacity: 1, y: 0 },
              transition: { delay: 0.3 }
            }}
          >
            <ThemeTitle level={3} className="mb-4">思考問題</ThemeTitle>
            
            <div className="space-y-4">
              {discoveryData.discussion_questions.map((question, index) => (
                <div key={index} className="bg-slate-50 dark:bg-slate-700/50 rounded-xl p-5 sm:p-6 border border-slate-200 dark:border-slate-600">
                  {makeTextClickable(
                    <ThemeText variant="body" className="font-medium text-lg sm:text-base clickable-question-content">
                      Q{index + 1}: {question}
                    </ThemeText>
                  )}
                </div>
              ))}
            </div>
          </ThemeCard>
        )}
      </div>
    </div>
  );
}