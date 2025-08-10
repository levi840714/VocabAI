import { StructuredAIResponse } from './types';
import { createTelegramAuthHeader, isLocalDevelopment } from '../hooks/use-telegram';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

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
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  }

  // Health check
  async healthCheck() {
    return this.request('/health');
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
    
    return this.request(`/words?${params}`);
  }

  async addWord(word: string, userNotes?: string): Promise<any> {
    let endpoint = '/words';
    
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
    return this.request(`/words/${wordId}`);
  }

  // Review endpoints
  async getNextReview(): Promise<WordDetail | { message: string }> {
    let endpoint = '/review/next';
    
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
    return this.request(`/review/${wordId}`, {
      method: 'POST',
      body: JSON.stringify({ response }),
    });
  }

  // AI explanation
  async getAIExplanation(
    word: string,
    explanationType: 'simple' | 'deep' = 'simple'
  ): Promise<AIExplanationResponse> {
    return this.request('/ai/explain', {
      method: 'POST',
      body: JSON.stringify({
        word,
        explanation_type: explanationType,
      }),
    });
  }

  // Update word notes
  async updateWordNotes(wordId: number, notes: string): Promise<{ message: string; word_id: number }> {
    return this.request(`/words/${wordId}/notes`, {
      method: 'PUT',
      body: JSON.stringify({ notes }),
    });
  }

  // Statistics
  async getStats(): Promise<StatsResponse> {
    let endpoint = '/stats';
    
    // 本地測試模式下添加 user_id 參數
    if (isLocalDevelopment() && !this.telegramAuthData) {
      endpoint += '?user_id=613170570';
    }
    
    return this.request(endpoint);
  }

  // Delete word
  async deleteWord(wordId: number): Promise<{ message: string; word_id: number }> {
    let endpoint = `/words/${wordId}`;
    
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
    let endpoint = `/words/${wordId}/toggle-learned`;
    
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