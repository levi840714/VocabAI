import { StructuredAIResponse } from './types';
import { createTelegramAuthHeader, isLocalDevelopment } from '../hooks/use-telegram';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.DEV ? 'http://localhost:8000/api' : 'https://vocab-ai-backend-909144458673.asia-east1.run.app/api');

export interface Word {
  id: number;
  word: string;
  initial_ai_explanation?: string;
  user_notes?: string;
  learned?: boolean;
}

export interface WordDetail extends Word {
  user_id: number;
  next_review: string;
  interval: number;
  difficulty: number;
  created_at: string;
  user_notes?: string;
}

export interface WordsResponse {
  words: Word[];
  total_count: number;
  page: number;
  page_size: number;
}

export interface StatsResponse {
  total_words: number;
  due_today: number;
  reviewed_today: number;
  difficulty_distribution: Record<number, number>;
}

export interface ReviewResponse {
  success: boolean;
  message: string;
  next_review_date?: string;
}

export interface AIExplanationResponse {
  word: string;
  explanation: string;
  explanation_type: string;
  structured_data?: StructuredAIResponse;
}

class VocabotAPI {
  private baseUrl: string;
  private telegramAuthData: string | null = null;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
    console.log('VocabotAPI initialized with baseUrl:', this.baseUrl);
    console.log('Environment variables:', {
      VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
      DEV: import.meta.env.DEV,
      computed: API_BASE_URL
    });
  }

  // 設置 Telegram 驗證數據
  setTelegramAuth(authData: string | null) {
    this.telegramAuthData = authData;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    // 創建驗證標頭
    const authHeaders = createTelegramAuthHeader(this.telegramAuthData);
    
    console.log('Making API request:', { url, method: options.method || 'GET', authHeaders });
    
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
          ...options.headers,
        },
        ...options,
      });

      console.log('API response status:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API error response:', errorData);
        throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('API response data:', data);
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // Health check
  async healthCheck() {
    return this.request('/v1/health');
  }

  // Words endpoints
  async getWords(
    page: number = 0,
    pageSize: number = 10,
    filterType: 'all' | 'due' | 'recent' = 'all'
  ): Promise<WordsResponse> {
    const params = new URLSearchParams({
      page: page.toString(),
      page_size: pageSize.toString(),
      filter_type: filterType,
    });
    
    // 本地測試模式下添加 user_id 參數
    if (isLocalDevelopment() && !this.telegramAuthData) {
      params.append('user_id', '613170570');
    }
    
    return this.request(`/v1/words?${params}`);
  }

  async addWord(word: string, userNotes?: string): Promise<any> {
    let endpoint = '/v1/words';
    
    // 本地測試模式下添加 user_id 參數
    if (isLocalDevelopment() && !this.telegramAuthData) {
      endpoint += '?user_id=613170570';
    }
    
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        word,
        user_notes: userNotes,
      }),
    });
  }

  async getWordById(wordId: number): Promise<WordDetail> {
    return this.request(`/v1/words/${wordId}`);
  }

  // Review endpoints
  async getNextReview(): Promise<WordDetail | { message: string }> {
    let endpoint = '/v1/review/next';
    
    // 本地測試模式下添加 user_id 參數
    if (isLocalDevelopment() && !this.telegramAuthData) {
      endpoint += '?user_id=613170570';
    }
    
    return this.request(endpoint);
  }

  async submitReview(
    wordId: number,
    response: 'easy' | 'hard' | 'again' | 'mastered'
  ): Promise<ReviewResponse> {
    return this.request(`/v1/review/${wordId}`, {
      method: 'POST',
      body: JSON.stringify({ response }),
    });
  }

  // AI explanation
  async getAIExplanation(
    word: string,
    explanationType: 'simple' | 'deep' = 'simple'
  ): Promise<AIExplanationResponse> {
    return this.request('/v1/ai/explain', {
      method: 'POST',
      body: JSON.stringify({
        word,
        explanation_type: explanationType,
      }),
    });
  }

  // Update word notes
  async updateWordNotes(wordId: number, notes: string): Promise<{ message: string; word_id: number }> {
    return this.request(`/v1/words/${wordId}/notes`, {
      method: 'PUT',
      body: JSON.stringify({ notes }),
    });
  }

  // Statistics
  async getStats(): Promise<StatsResponse> {
    let endpoint = '/v1/stats';
    
    // 本地測試模式下添加 user_id 參數
    if (isLocalDevelopment() && !this.telegramAuthData) {
      endpoint += '?user_id=613170570';
    }
    
    return this.request(endpoint);
  }

  // Delete word
  async deleteWord(wordId: number): Promise<{ message: string; word_id: number }> {
    let endpoint = `/v1/words/${wordId}`;
    
    // 本地測試模式下添加 user_id 參數
    if (isLocalDevelopment() && !this.telegramAuthData) {
      endpoint += '?user_id=613170570';
    }
    
    return this.request(endpoint, {
      method: 'DELETE',
    });
  }

  // Toggle word learned status
  async toggleWordLearned(wordId: number): Promise<{ message: string; word_id: number; new_status: string }> {
    let endpoint = `/v1/words/${wordId}/toggle-learned`;
    
    // 本地測試模式下添加 user_id 參數
    if (isLocalDevelopment() && !this.telegramAuthData) {
      endpoint += '?user_id=613170570';
    }
    
    return this.request(endpoint, {
      method: 'PUT',
    });
  }
}

export const vocabotAPI = new VocabotAPI();