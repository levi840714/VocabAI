import { StructuredAIResponse } from './types';

/**
 * Parse structured response from AI explanation text
 * Handles both old format (with code blocks) and new format (cleaned)
 */
export function parseStructuredResponse(rawResponse: string): StructuredAIResponse | null {
  try {
    // First try to extract JSON from markdown code block (for backward compatibility)
    const codeBlockMatch = rawResponse.match(/```(?:json)?\s*\n([\s\S]*?)\n```/);
    if (codeBlockMatch) {
      const jsonStr = codeBlockMatch[1].trim();
      return JSON.parse(jsonStr);
    }
    
    // If no code block, try to parse the entire response as JSON (for new cleaned format)
    try {
      return JSON.parse(rawResponse.trim());
    } catch (directParseError) {
      // If direct parsing fails, try to extract JSON from anywhere in the text
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const jsonStr = jsonMatch[0];
        return JSON.parse(jsonStr);
      }
    }
    
    return null;
  } catch (error) {
    console.error('Failed to parse structured response:', error);
    return null;
  }
}

/**
 * Clean null values from structured response arrays
 */
export function cleanStructuredResponse(data: StructuredAIResponse): StructuredAIResponse {
  return {
    ...data,
    pronunciations: data.pronunciations?.filter(p => p !== null) || [],
    examples: data.examples?.filter(e => e !== null) || [],
    synonyms: data.synonyms?.filter(s => s !== null) || [],
    antonyms: data.antonyms?.filter(a => a !== null) || [],
  };
}