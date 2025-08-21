import httpx
import yaml
import json
import re
import asyncio
from typing import Optional
import logging

class AIService:
    def __init__(self, config):
        self.config = config
        self.provider = config['ai_services']['provider']
        # Configure httpx client with better timeout and retry settings
        timeout = httpx.Timeout(
            connect=10.0,    # Connection timeout
            read=45.0,       # Read timeout for long AI responses
            write=10.0,      # Write timeout
            pool=5.0         # Pool timeout
        )
        # Configure limits and retries
        limits = httpx.Limits(
            max_connections=10,
            max_keepalive_connections=5
        )
        self.client = httpx.AsyncClient(
            timeout=timeout,
            limits=limits,
            verify=True,     # SSL verification
            follow_redirects=True
        )

    async def _retry_api_call(self, api_call_func, max_retries: int = 3, base_delay: float = 1.0):
        """
        帶重試機制的 API 調用包裝器
        
        Args:
            api_call_func: 要執行的 API 調用函數
            max_retries: 最大重試次數
            base_delay: 基礎延遲時間（秒）
        
        Returns:
            API 調用結果
        """
        last_exception = None
        
        for attempt in range(max_retries + 1):
            try:
                if attempt > 0:
                    # 指數退避策略
                    delay = base_delay * (2 ** (attempt - 1))
                    logging.warning(f"AI API 調用重試 {attempt}/{max_retries}，等待 {delay:.1f} 秒...")
                    await asyncio.sleep(delay)
                
                result = await api_call_func()
                
                # 檢查結果是否有效
                if result and not result.startswith("Error") and not result.startswith("Sorry") and not result.startswith("An unexpected error"):
                    if attempt > 0:
                        logging.info(f"AI API 調用在第 {attempt + 1} 次嘗試後成功")
                    return result
                else:
                    logging.warning(f"AI API 返回無效響應，嘗試 {attempt + 1}/{max_retries + 1}: {result[:100]}...")
                    if attempt < max_retries:
                        continue
                    return result  # 最後一次嘗試，即使結果不理想也返回
                    
            except (httpx.TimeoutException, httpx.ConnectTimeout, httpx.ReadTimeout) as e:
                last_exception = e
                logging.warning(f"AI API 超時錯誤，嘗試 {attempt + 1}/{max_retries + 1}: {str(e)}")
                if attempt >= max_retries:
                    break
                    
            except (httpx.NetworkError, httpx.ConnectError) as e:
                last_exception = e
                logging.warning(f"AI API 網絡錯誤，嘗試 {attempt + 1}/{max_retries + 1}: {str(e)}")
                if attempt >= max_retries:
                    break
                    
            except httpx.HTTPStatusError as e:
                last_exception = e
                if e.response.status_code in [429, 500, 502, 503, 504]:  # 可重試的 HTTP 錯誤
                    logging.warning(f"AI API HTTP 錯誤 {e.response.status_code}，嘗試 {attempt + 1}/{max_retries + 1}")
                    if attempt >= max_retries:
                        break
                else:
                    # 不可重試的錯誤（如 400, 401, 403）
                    logging.error(f"AI API 不可重試的 HTTP 錯誤: {e.response.status_code}")
                    break
                    
            except Exception as e:
                last_exception = e
                logging.error(f"AI API 未知錯誤，嘗試 {attempt + 1}/{max_retries + 1}: {str(e)}")
                if attempt >= max_retries:
                    break
        
        # 所有重試都失敗了
        error_msg = f"AI API 調用失敗，已重試 {max_retries} 次"
        if last_exception:
            error_msg += f": {str(last_exception)}"
        logging.error(error_msg)
        return f"Sorry, I couldn't process your request after {max_retries + 1} attempts. Please try again later."

    async def get_simple_explanation(self, word: str) -> str:
        """Gets a simple explanation for a word using the configured AI provider."""
        if self.provider == "google":
            raw_explanation = await self._get_google_explanation(word)
            # Clean the explanation by removing markdown code blocks for database storage
            return self._clean_explanation_for_storage(raw_explanation)
        # Add other providers here as needed
        else:
            raise ValueError(f"Unsupported AI provider: {self.provider}")

    async def _get_google_explanation(self, word: str) -> str:
        """Gets a simple explanation from the Google Gemini API."""
        api_key = self.config['ai_services']['google']['api_key']
        prompt = self.config['prompts']['simple_explanation'].format(word=word)

        # Note: The actual Gemini API endpoint and request format might differ.
        # This is a placeholder based on common API patterns.
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
        headers = {"Content-Type": "application/json", "X-goog-api-key": api_key}
        data = {"contents": [{"parts": [{"text": prompt}]}]}

        try:
            response = await self.client.post(url, headers=headers, json=data)
            response.raise_for_status()  # Raise an exception for bad status codes
            
            # Safely extract the text from the response
            result = response.json()
            if 'candidates' in result and result['candidates']:
                if 'content' in result['candidates'][0] and 'parts' in result['candidates'][0]['content']:
                    raw_response = result['candidates'][0]['content']['parts'][0]['text'].strip()
                    return raw_response
            return "Sorry, I couldn't get an explanation for that word."

        except httpx.HTTPStatusError as e:
            # Handle HTTP errors (e.g., 4xx, 5xx)
            print(f"HTTP error occurred: {e}")
            return f"Error from AI service: {e.response.status_code}"
        except Exception as e:
            # Handle other exceptions (e.g., network issues)
            print(f"An error occurred: {e}")
            return "An unexpected error occurred while contacting the AI service."

    async def get_deep_learning_explanation(self, word: str) -> str:
        """Gets a deep learning explanation for a word using the configured AI provider."""
        if self.provider == "google":
            return await self._get_google_deep_learning_explanation(word)
        # Add other providers here as needed
        else:
            raise ValueError(f"Unsupported AI provider: {self.provider}")

    async def _get_google_deep_learning_explanation(self, word: str) -> str:
        """Gets a deep learning explanation from the Google Gemini API."""
        # Temporary workaround: use simple explanation for now
        print(f"Deep learning request for word: {word} - using enhanced simple explanation")
        
        # Use the simple explanation method with enhanced prompt
        api_key = self.config['ai_services']['google']['api_key']
        enhanced_prompt = f"""請使用繁體中文提供「{word}」的深度學習解析，包含詞源、記憶法、搭配等。

**重要**：如果查詢的單字是變形形態（如動詞過去式、現在分詞、複數形等），請務必識別並提供原型單字資訊。

請回覆 JSON 格式：
{{
  "word": "{word}",
  "is_inflected": false,
  "base_form": {{
    "word": "原型單字",
    "inflection_type": "變形類型（如：過去式、現在分詞、複數形等）"
  }},
  "pronunciations": ["音標"],
  "etymology": {{"origin": "詞源", "root_analysis": "字根分析", "related_words": ["相關詞"]}},
  "definitions": [{{"part_of_speech": "詞性", "meanings": [{{"definition": "定義", "context": "語境", "formality": "正式度", "usage_notes": "用法"}}]}}],
  "collocations": {{"common_phrases": ["片語"], "verb_combinations": ["動詞搭配"], "adjective_combinations": ["形容詞搭配"], "preposition_combinations": ["介詞搭配"]}},
  "examples": [{{"sentence": "例句", "translation": "翻譯", "context": "情境"}}],
  "synonyms": [{{"word": "同義詞", "difference": "差別"}}],
  "antonyms": ["反義詞"],
  "memory_strategies": {{"visual": "視覺記憶", "association": "聯想記憶", "word_formation": "構字記憶", "story": "故事記憶"}},
  "cultural_notes": "文化背景",
  "difficulty_level": "難度等級",
  "frequency": "使用頻率"
}}

如果是變形單字，請將 is_inflected 設為 true，並在 base_form 中提供原型單字和變形類型。如果是原型單字，請將 is_inflected 設為 false，base_form 可設為 null。"""

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
        headers = {"Content-Type": "application/json"}
        data = {"contents": [{"parts": [{"text": enhanced_prompt}]}]}

        try:
            response = await self.client.post(url, headers=headers, json=data)
            response.raise_for_status()
            
            result = response.json()            
            if 'candidates' in result and result['candidates']:
                if 'content' in result['candidates'][0] and 'parts' in result['candidates'][0]['content']:
                    raw_response = result['candidates'][0]['content']['parts'][0]['text'].strip()
                    print(f"Got deep learning response length: {len(raw_response)}")
                    return raw_response
            
            return "Sorry, I couldn't get a deep learning explanation for that word."

        except Exception as e:
            print(f"Deep learning error: {e}")
            return "An unexpected error occurred while contacting the AI service."

    def parse_structured_response(self, raw_response: str, is_deep_learning: bool = False, is_sentence_analysis: bool = False, is_sentence_optimization: bool = False, is_translation: bool = False) -> dict:
        """Parse JSON response from AI service."""
        try:
            # First try to extract JSON from markdown code block
            code_block_match = re.search(r'```(?:json)?\s*\n(.*?)\n```', raw_response, re.DOTALL)
            if code_block_match:
                json_str = code_block_match.group(1).strip()
                return json.loads(json_str)
            
            # If no code block, try to extract direct JSON
            json_match = re.search(r'\{.*\}', raw_response, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                return json.loads(json_str)
            else:
                # If no JSON found, return fallback structure
                return self._create_fallback_structure(raw_response, is_deep_learning, is_sentence_analysis, is_sentence_optimization, is_translation)
        except json.JSONDecodeError as e:
            print(f"JSON parsing error: {e}")
            # If JSON parsing fails, create fallback structure
            return self._create_fallback_structure(raw_response, is_deep_learning, is_sentence_analysis, is_sentence_optimization, is_translation)

    def _create_fallback_structure(self, raw_response: str, is_deep_learning: bool = False, is_sentence_analysis: bool = False, is_sentence_optimization: bool = False, is_translation: bool = False) -> dict:
        """Create a fallback structured response when JSON parsing fails."""
        basic_structure = {
            "word": "unknown",
            "pronunciations": [],
            "definitions": [{
                "part_of_speech": "unknown",
                "meanings": [{
                    "definition": "AI 解析失敗，請稍後再試。",
                    "context": "解析失敗"
                }]
            }],
            "examples": [],
            "synonyms": [],
            "antonyms": [],
            "memory_tips": None
        }
        
        if is_deep_learning:
            # Add required fields for DeepLearningAIResponse
            basic_structure.update({
                "etymology": {
                    "origin": "資訊解析失敗",
                    "root_analysis": "資訊解析失敗",
                    "related_words": []
                },
                "collocations": {
                    "common_phrases": [],
                    "verb_combinations": [],
                    "adjective_combinations": [],
                    "preposition_combinations": []
                },
                "examples": [],  # Will be overridden for deep learning format
                "synonyms": [],  # Will be overridden for deep learning format
                "memory_strategies": {
                    "visual": "資訊解析失敗",
                    "association": "資訊解析失敗",
                    "word_formation": "資訊解析失敗",
                    "story": "資訊解析失敗"
                },
                "cultural_notes": "資訊解析失敗",
                "difficulty_level": "未知",
                "frequency": "未知"
            })
            # Convert examples and synonyms to deep learning format
            basic_structure["examples"] = [{
                "sentence": "範例解析失敗",
                "translation": "解析失敗",
                "context": "解析失敗"
            }]
            basic_structure["synonyms"] = []
        elif is_sentence_analysis:
            # Create sentence analysis fallback structure
            basic_structure = {
                "sentence": "unknown",
                "sentence_type": "未知句型",
                "grammar_structure": [{
                    "component": "未知",
                    "text": "分析失敗",
                    "explanation": "無法解析句子結構"
                }],
                "tense_analysis": {
                    "tense_name": "未知時態",
                    "tense_form": "分析失敗",
                    "usage_explanation": "無法分析時態用法"
                },
                "key_grammar_points": ["分析失敗"],
                "vocabulary_breakdown": [{
                    "word": "unknown",
                    "part_of_speech": "未知",
                    "meaning": "分析失敗",
                    "function": "無法確定"
                }],
                "rewrite_suggestions": ["分析失敗，無法提供建議"],
                "learning_tips": "抱歉，句子分析失敗，請稍後重試",
                "difficulty_level": "未知"
            }
        elif is_sentence_optimization:
            # Create sentence optimization fallback structure
            basic_structure = {
                "original_sentence": "unknown",
                "analysis": {
                    "sentence_type": "分析失敗",
                    "grammar_structure": [{
                        "component": "未知",
                        "text": "分析失敗",
                        "explanation": "無法解析語法結構"
                    }],
                    "tense_analysis": {
                        "tense_name": "分析失敗",
                        "tense_form": "分析失敗",
                        "usage_explanation": "分析失敗"
                    },
                    "complexity_level": "未知"
                },
                "grammar_issues": [{
                    "type": "分析失敗",
                    "location": "無法確定",
                    "description": "句子分析失敗",
                    "correction": "請稍後重試",
                    "explanation": "系統暫時無法分析此句子"
                }],
                "optimization_suggestions": [{
                    "type": "系統錯誤",
                    "original_part": "未知",
                    "suggested_improvement": "分析失敗",
                    "reason": "系統暫時無法提供建議",
                    "example": "請稍後重試"
                }],
                "vocabulary_enhancements": [],
                "style_improvements": {
                    "formality_level": "無法分析",
                    "tone_suggestions": "分析失敗",
                    "clarity_score": "未知",
                    "overall_assessment": "抱歉，分析失敗，請稍後重試"
                },
                "final_optimized_versions": ["分析失敗，無法提供優化版本"],
                "learning_tips": "抱歉，句子優化分析失敗，請稍後重試"
            }
        elif is_translation:
            # Create translation fallback structure
            basic_structure = {
                "original_text": "unknown",
                "detected_language": "無法識別",
                "translations": {
                    "primary_translation": "翻譯失敗",
                    "alternative_translations": ["分析失敗"],
                    "literal_translation": "分析失敗"
                },
                "language_analysis": {
                    "grammar_structure": [{
                        "original_part": "未知",
                        "translation_part": "分析失敗",
                        "grammar_note": "無法分析語法結構"
                    }],
                    "cultural_context": {
                        "cultural_differences": "分析失敗",
                        "usage_context": "無法確定",
                        "cultural_adaptation": "分析失敗"
                    },
                    "language_difficulty": "未知",
                    "key_challenges": ["分析失敗"]
                },
                "vocabulary_breakdown": [{
                    "original_word": "未知",
                    "translated_word": "分析失敗",
                    "part_of_speech": "未知",
                    "usage_notes": "分析失敗",
                    "common_alternatives": ["分析失敗"]
                }],
                "grammar_comparison": {
                    "sentence_structure": "分析失敗",
                    "word_order": "分析失敗",
                    "tense_aspect": "分析失敗"
                },
                "usage_examples": [{
                    "scenario": "分析失敗",
                    "example_original": "分析失敗",
                    "example_translation": "分析失敗",
                    "context_note": "分析失敗"
                }],
                "learning_tips": {
                    "translation_strategies": "分析失敗",
                    "common_mistakes": "分析失敗",
                    "memory_aids": "分析失敗"
                }
            }
        
        return basic_structure

    def _clean_explanation_for_storage(self, raw_response: str) -> str:
        """Clean the explanation by removing markdown code blocks for database storage."""
        # Remove markdown code blocks but preserve the content inside
        cleaned = re.sub(r'```(?:json)?\s*\n(.*?)\n```', r'\1', raw_response, flags=re.DOTALL)
        # Remove any remaining triple backticks
        cleaned = re.sub(r'```', '', cleaned)
        return cleaned.strip()

    async def get_sentence_analysis(self, sentence: str) -> str:
        """Gets a sentence structure analysis using the configured AI provider."""
        if self.provider == "google":
            return await self._get_google_sentence_analysis(sentence)
        else:
            raise ValueError(f"Unsupported AI provider: {self.provider}")

    async def _get_google_sentence_analysis(self, sentence: str) -> str:
        """Gets a sentence analysis from the Google Gemini API."""
        api_key = self.config['ai_services']['google']['api_key']
        
        analysis_prompt = f"""請使用繁體中文深度分析以下英語句子的語法結構：

"{sentence}"

請回覆 JSON 格式：
{{
  "sentence": "{sentence}",
  "sentence_type": "句型類型（如：簡單句、複合句、複雜句等）",
  "grammar_structure": [
    {{
      "component": "語法成分（如：主語、謂語、賓語、定語、狀語等）",
      "text": "對應的文字片段",
      "explanation": "中文解釋這個成分的作用"
    }}
  ],
  "tense_analysis": {{
    "tense_name": "時態名稱（如：現在簡單式、過去完成式等）",
    "tense_form": "時態形式說明",
    "usage_explanation": "為什麼使用這個時態"
  }},
  "key_grammar_points": [
    "重要語法點1",
    "重要語法點2"
  ],
  "vocabulary_breakdown": [
    {{
      "word": "單字",
      "part_of_speech": "詞性",
      "meaning": "在此句子中的含義",
      "function": "在句子中的語法功能"
    }}
  ],
  "rewrite_suggestions": [
    "改寫建議1（提供不同的表達方式）",
    "改寫建議2"
  ],
  "learning_tips": "針對這個句子的學習建議和記憶要點",
  "difficulty_level": "句子難度（初級/中級/高級）"
}}

請特別注意：
1. 詳細分析每個語法成分的作用
2. 解釋時態的使用原因
3. 指出重要的語法結構和模式
4. 提供實用的學習建議"""

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
        headers = {"Content-Type": "application/json"}
        data = {"contents": [{"parts": [{"text": analysis_prompt}]}]}

        try:
            response = await self.client.post(url, headers=headers, json=data)
            response.raise_for_status()
            
            result = response.json()            
            if 'candidates' in result and result['candidates']:
                if 'content' in result['candidates'][0] and 'parts' in result['candidates'][0]['content']:
                    raw_response = result['candidates'][0]['content']['parts'][0]['text'].strip()
                    print(f"Got sentence analysis response length: {len(raw_response)}")
                    return raw_response
            
            return "Sorry, I couldn't analyze the sentence structure."

        except Exception as e:
            print(f"Sentence analysis error: {e}")
            return "An unexpected error occurred while analyzing the sentence."

    async def generate_daily_discovery(self) -> str:
        """生成每日探索內容（短文章 + 知識點提取）"""
        if self.provider == "google":
            return await self._generate_google_daily_discovery()
        else:
            raise ValueError(f"Unsupported AI provider: {self.provider}")

    async def generate_daily_conversation(self) -> str:
        """生成每日對話例句（實用情境對話 + 知識點提取）"""
        if self.provider == "google":
            return await self._generate_google_daily_conversation()
        else:
            raise ValueError(f"Unsupported AI provider: {self.provider}")

    async def _generate_google_daily_discovery(self) -> str:
        """使用 Google Gemini API 生成每日探索內容"""
        api_key = self.config['ai_services']['google']['api_key']
        
        # 加入時間戳增強隨機性
        import time
        import random
        timestamp = int(time.time())
        random_seed = random.randint(1000, 9999)
        
        discovery_prompt = '''請生成一篇適合英語學習者的短文章，並提供知識點解析。

**重要提醒：這是第 ''' + str(timestamp) + str(random_seed) + ''' 次生成，請務必選擇與之前完全不同的主題！**

**生成步驟：**
1. 首先隨機選擇一個領域，並在心中確認這個選擇
2. 然後在該領域中選擇一個具體且有趣的角度
3. 開始撰寫文章

**要求：**
1. 文章長度：150-250 詞
2. **重要：主題必須隨機選擇，每次都要選擇不同的主題領域**
   - 從以下領域中隨機選一個：海洋探索、量子物理、咖啡文化、城市規劃、瑜伽冥想、極地研究、風力發電、數位藝術、火山地質、昆蟲世界、香草園藝、星座文化、陶瓷藝術、光影攝影、茶道文化、鳥類遷徙、再生能源、古建築、手工藝術、植物療法、極限運動、文字演變、色彩心理、珊瑚保育、氣候變化
   - 避免重複使用相同或相似的主題
   - 每次選擇一個具體且有趣的角度
3. 語言難度：中級程度，包含一些挑戰性詞彙
4. 內容要有教育價值且引人入勝

請回覆 JSON 格式：
{
  "article": {
    "title": "文章標題（英文）",
    "content": "文章內容（英文）",
    "word_count": 文章字數,
    "difficulty_level": "中級",
    "topic_category": "主題類別"
  },
  "knowledge_points": [
    {
      "id": "kp1",
      "type": "vocabulary",
      "title": "重點詞彙",
      "content": "詞彙解釋和用法",
      "examples": ["例句1", "例句2"],
      "difficulty": "中級"
    },
    {
      "id": "kp2", 
      "type": "grammar",
      "title": "語法重點",
      "content": "語法解釋",
      "examples": ["例句1", "例句2"],
      "difficulty": "中級"
    },
    {
      "id": "kp3",
      "type": "cultural",
      "title": "文化背景",
      "content": "相關文化知識",
      "examples": ["相關資訊1", "相關資訊2"],
      "difficulty": "中級"
    },
    {
      "id": "kp4",
      "type": "expression",
      "title": "實用表達",
      "content": "常用片語或表達方式",
      "examples": ["例句1", "例句2"],
      "difficulty": "中級"
    }
  ],
  "learning_objectives": [
    "學習目標1",
    "學習目標2",
    "學習目標3"
  ],
  "discussion_questions": [
    "思考問題1",
    "思考問題2"
  ]
}

請確保：
- **主題必須隨機選擇，每次生成都要是不同的領域和角度**
- 文章內容豐富有趣，適合激發學習興趣
- 知識點涵蓋詞彙、語法、文化、表達等不同層面
- 例句實用且易於理解
- 整體內容有教育意義且引人深思
- **避免繼續使用相同或類似的主題，確保內容的多樣性**'''

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
        headers = {"Content-Type": "application/json"}
        data = {"contents": [{"parts": [{"text": discovery_prompt}]}]}

        try:
            response = await self.client.post(url, headers=headers, json=data)
            response.raise_for_status()
            
            result = response.json()            
            if 'candidates' in result and result['candidates']:
                if 'content' in result['candidates'][0] and 'parts' in result['candidates'][0]['content']:
                    raw_response = result['candidates'][0]['content']['parts'][0]['text'].strip()
                    print(f"Generated daily discovery content length: {len(raw_response)}")
                    return raw_response
            
            return "Sorry, I couldn't generate daily discovery content."

        except Exception as e:
            print(f"Daily discovery generation error: {e}")
            return "An unexpected error occurred while generating daily discovery content."

    async def _generate_google_daily_conversation(self) -> str:
        """使用 Google Gemini API 生成每日對話例句"""
        api_key = self.config['ai_services']['google']['api_key']
        
        # 加入時間戳增強隨機性
        import time
        import random
        timestamp = int(time.time())
        random_seed = random.randint(1000, 9999)
        
        conversation_prompt = '''請生成一段實用的英語對話例句，並提供學習分析。

**重要提醒：這是第 ''' + str(timestamp) + str(random_seed) + ''' 次生成，請務必選擇與之前完全不同的情境場景！**

**生成步驟：**
1. 首先隨機選擇一個情境場景，並在心中確認這個選擇
2. 然後構想該場景中的真實對話需求
3. 開始撰寫對話內容

**要求：**
1. 對話長度：6-10 輪對話
2. **重要：情境必須隨機選擇，每次都要選擇不同的場景**
   - 從以下場景中隨機選一個：藝術畫廊開幕、滑雪度假村、寵物美容店、古董拍賣會、植物園導覽、攝影工作室、烹飪教室、圖書館研究、音樂會後台、馬術俱樂部、潛水中心、陶藝工作坊、葡萄酒莊、露營用品店、瑜伽教室、花藝設計、科技展覽、農夫市集、手工藝市場、天文觀測站
   - 避免重複使用相同的情境
   - 選擇具體且實用的對話場景
3. 語言難度：中級程度，包含常用表達和片語
4. 內容要實用且真實，適合日常應用

請回覆 JSON 格式：
{
  "conversation": {
    "title": "對話標題（中文）",
    "scenario": "對話情境描述",
    "participants": ["參與者1", "參與者2"],
    "conversation": [
      {
        "speaker": "說話者角色",
        "text": "英文對話內容",
        "translation": "中文翻譯",
        "audio_notes": "語音注意事項（語調、重音等）"
      }
    ],
    "difficulty_level": "中級",
    "scenario_category": "情境類別"
  },
  "knowledge_points": [
    {
      "id": "kp1",
      "type": "expression",
      "title": "實用表達",
      "content": "常用片語或表達方式解釋",
      "examples": ["例句1", "例句2"],
      "difficulty": "中級"
    },
    {
      "id": "kp2",
      "type": "vocabulary",
      "title": "關鍵詞彙",
      "content": "重要詞彙解釋和用法",
      "examples": ["例句1", "例句2"],
      "difficulty": "中級"
    },
    {
      "id": "kp3",
      "type": "cultural",
      "title": "文化背景",
      "content": "相關文化禮節或背景知識",
      "examples": ["相關資訊1", "相關資訊2"],
      "difficulty": "中級"
    },
    {
      "id": "kp4",
      "type": "pronunciation",
      "title": "發音重點",
      "content": "重要的發音技巧或注意事項",
      "examples": ["發音例子1", "發音例子2"],
      "difficulty": "中級"
    }
  ],
  "learning_objectives": [
    "掌握特定情境的實用表達",
    "學習自然的對話流程",
    "練習語音語調"
  ],
  "discussion_questions": [
    "你在類似情境中會如何表達？",
    "這些表達方式在你的文化中有對應嗎？"
  ]
}

請確保：
- **情境必須隨機選擇，每次生成都要是不同的場景和情境**
- 對話內容自然流暢，符合真實情境
- 包含實用的片語和表達方式
- 提供準確的中文翻譯
- 知識點涵蓋表達、詞彙、文化、發音等層面
- 整體內容有實際應用價值
- **避免繼續使用相同或類似的情境，確保對話的多樣性**'''

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
        headers = {"Content-Type": "application/json"}
        data = {"contents": [{"parts": [{"text": conversation_prompt}]}]}

        try:
            response = await self.client.post(url, headers=headers, json=data)
            response.raise_for_status()
            
            result = response.json()            
            if 'candidates' in result and result['candidates']:
                if 'content' in result['candidates'][0] and 'parts' in result['candidates'][0]['content']:
                    raw_response = result['candidates'][0]['content']['parts'][0]['text'].strip()
                    print(f"Generated daily conversation content length: {len(raw_response)}")
                    return raw_response
            
            return "Sorry, I couldn't generate daily conversation content."

        except Exception as e:
            print(f"Daily conversation generation error: {e}")
            return "An unexpected error occurred while generating daily conversation content."

    async def get_sentence_analysis_optimization(self, sentence: str) -> str:
        """獲取句子分析和優化建議"""
        if self.provider == "google":
            # 使用重試機制
            return await self._retry_api_call(
                lambda: self._get_google_sentence_analysis_optimization(sentence),
                max_retries=2,  # 句子分析較複雜，允許更多重試
                base_delay=1.5
            )
        else:
            raise ValueError(f"Unsupported AI provider: {self.provider}")

    async def _get_google_sentence_analysis_optimization(self, sentence: str) -> str:
        """使用 Google Gemini API 獲取句子分析和優化建議"""
        api_key = self.config['ai_services']['google']['api_key']
        prompt = self.config['prompts']['sentence_analysis_optimization'].format(sentence=sentence)

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
        headers = {"Content-Type": "application/json"}
        data = {"contents": [{"parts": [{"text": prompt}]}]}

        try:
            response = await self.client.post(url, headers=headers, json=data)
            response.raise_for_status()
            
            result = response.json()            
            if 'candidates' in result and result['candidates']:
                if 'content' in result['candidates'][0] and 'parts' in result['candidates'][0]['content']:
                    raw_response = result['candidates'][0]['content']['parts'][0]['text'].strip()
                    print(f"Got sentence analysis optimization response length: {len(raw_response)}")
                    return raw_response
            
            return "Sorry, I couldn't analyze and optimize the sentence."

        except Exception as e:
            print(f"Sentence analysis optimization error: {e}")
            return "An unexpected error occurred while analyzing the sentence."

    async def get_translation(self, text: str) -> str:
        """獲取翻譯和語言分析"""
        if self.provider == "google":
            # 使用重試機制
            return await self._retry_api_call(
                lambda: self._get_google_translation(text),
                max_retries=2,  # 翻譯較複雜，允許更多重試
                base_delay=1.0
            )
        else:
            raise ValueError(f"Unsupported AI provider: {self.provider}")

    async def _get_google_translation(self, text: str) -> str:
        """使用 Google Gemini API 獲取翻譯和語言分析"""
        api_key = self.config['ai_services']['google']['api_key']
        prompt = self.config['prompts']['translation'].format(text=text)

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={api_key}"
        headers = {"Content-Type": "application/json"}
        data = {"contents": [{"parts": [{"text": prompt}]}]}

        try:
            response = await self.client.post(url, headers=headers, json=data)
            response.raise_for_status()
            
            result = response.json()            
            if 'candidates' in result and result['candidates']:
                if 'content' in result['candidates'][0] and 'parts' in result['candidates'][0]['content']:
                    raw_response = result['candidates'][0]['content']['parts'][0]['text'].strip()
                    print(f"Got translation response length: {len(raw_response)}")
                    return raw_response
            
            return "Sorry, I couldn't translate the text."

        except Exception as e:
            print(f"Translation error: {e}")
            return "An unexpected error occurred while translating the text."
