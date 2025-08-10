import httpx
import yaml
import json
import re

class AIService:
    def __init__(self, config):
        self.config = config
        self.provider = config['ai_services']['provider']
        self.client = httpx.AsyncClient()

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
        api_key = self.config['ai_services']['google']['api_key']
        prompt = self.config['prompts']['deep_learning'].format(word=word)

        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"
        headers = {"Content-Type": "application/json", "X-goog-api-key": api_key}
        data = {"contents": [{"parts": [{"text": prompt}]}]}

        try:
            response = await self.client.post(url, headers=headers, json=data)
            response.raise_for_status()
            
            result = response.json()
            if 'candidates' in result and result['candidates']:
                if 'content' in result['candidates'][0] and 'parts' in result['candidates'][0]['content']:
                    raw_response = result['candidates'][0]['content']['parts'][0]['text'].strip()
                    return raw_response
            return "Sorry, I couldn't get a deep learning explanation for that word."

        except httpx.HTTPStatusError as e:
            print(f"HTTP error occurred: {e}")
            return f"Error from AI service: {e.response.status_code}"
        except Exception as e:
            print(f"An error occurred: {e}")
            return "An unexpected error occurred while contacting the AI service."

    def parse_structured_response(self, raw_response: str) -> dict:
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
                return self._create_fallback_structure(raw_response)
        except json.JSONDecodeError as e:
            print(f"JSON parsing error: {e}")
            # If JSON parsing fails, create fallback structure
            return self._create_fallback_structure(raw_response)

    def _create_fallback_structure(self, raw_response: str) -> dict:
        """Create a fallback structured response when JSON parsing fails."""
        return {
            "word": "unknown",
            "pronunciations": [],
            "definitions": [{
                "part_of_speech": "unknown",
                "meanings": [{
                    "definition": raw_response,
                    "context": "原始回覆"
                }]
            }],
            "examples": [],
            "synonyms": [],
            "antonyms": [],
            "memory_tips": None
        }

    def _clean_explanation_for_storage(self, raw_response: str) -> str:
        """Clean the explanation by removing markdown code blocks for database storage."""
        # Remove markdown code blocks but preserve the content inside
        cleaned = re.sub(r'```(?:json)?\s*\n(.*?)\n```', r'\1', raw_response, flags=re.DOTALL)
        # Remove any remaining triple backticks
        cleaned = re.sub(r'```', '', cleaned)
        return cleaned.strip()
