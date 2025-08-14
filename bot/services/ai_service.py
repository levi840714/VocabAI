import httpx
import yaml
import json
import re

class AIService:
    def __init__(self, config):
        self.config = config
        self.provider = config['ai_services']['provider']
        # Increase timeout for deep learning requests
        self.client = httpx.AsyncClient(timeout=30.0)

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

    def parse_structured_response(self, raw_response: str, is_deep_learning: bool = False, is_sentence_analysis: bool = False) -> dict:
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
                return self._create_fallback_structure(raw_response, is_deep_learning, is_sentence_analysis)
        except json.JSONDecodeError as e:
            print(f"JSON parsing error: {e}")
            # If JSON parsing fails, create fallback structure
            return self._create_fallback_structure(raw_response, is_deep_learning, is_sentence_analysis)

    def _create_fallback_structure(self, raw_response: str, is_deep_learning: bool = False, is_sentence_analysis: bool = False) -> dict:
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
