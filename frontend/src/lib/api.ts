import { 
  StructuredAIResponse, 
  DeepLearningAIResponse, 
  SentenceAnalysisResponse, 
  DailyDiscoveryResponse,
  BookmarkRequest,
  BookmarkListResponse,
  BookmarkResponse,
  BookmarkSummaryListResponse,
  BookmarkTag,
  CreateTagRequest
} from './types';
import { createTelegramAuthHeader, isLocalDevelopment } from '../hooks/use-telegram';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.DEV ? 'http://localhost:8000/api' : 'https://memwhiz-backend-909144458673.asia-east1.run.app/api');

export interface Word {
  id: number;
  word: string;
  initial_ai_explanation?: string;
  user_notes?: string;
  learned?: boolean;
  category?: string;
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
  text: string;
  explanation: string;
  explanation_type: string;
  structured_data?: StructuredAIResponse | DeepLearningAIResponse | SentenceAnalysisResponse;
}

// User Settings interfaces
export interface LearningPreferences {
  daily_review_target: number;
  difficulty_preference: 'easy' | 'normal' | 'hard' | 'mixed';
  review_reminder_enabled: boolean;
  review_reminder_time: string;
}

export interface InterfaceSettings {
  voice_auto_play: boolean;
  // 新增：語音提供者（webspeech=瀏覽器, cloud=雲端, auto=自動）
  voice_provider?: 'auto' | 'webspeech' | 'cloud';
  // 新增：語音參數（使用者可調）
  voice_language?: string; // e.g. 'en-US' | 'en-GB'
  voice_rate?: number;     // 0.1 - 2.0
  voice_pitch?: number;    // 0.0 - 2.0
  voice_volume?: number;   // 0.0 - 1.0 音量控制
  preferred_voice_name?: string; // 例如 'Google US English'
  theme_mode: 'light' | 'dark' | 'auto';
  language: string;
  animation_enabled: boolean;
}

export interface AISettings {
  default_explanation_type: 'simple' | 'deep';
  ai_provider_preference: string;
  explanation_detail_level: 'concise' | 'standard' | 'detailed';
}

export interface StudySettings {
  spaced_repetition_algorithm: string;
  show_pronunciation: boolean;
  show_etymology: boolean;
  auto_mark_learned_threshold: number;
}

export interface UserSettingsResponse {
  user_id: number;
  learning_preferences: LearningPreferences;
  interface_settings: InterfaceSettings;
  ai_settings: AISettings;
  study_settings: StudySettings;
  created_at: string;
  updated_at: string;
}

export interface UserSettingsCreate {
  learning_preferences: LearningPreferences;
  interface_settings: InterfaceSettings;
  ai_settings: AISettings;
  study_settings: StudySettings;
}

export interface UserSettingsUpdate {
  learning_preferences?: LearningPreferences;
  interface_settings?: InterfaceSettings;
  ai_settings?: AISettings;
  study_settings?: StudySettings;
}

class MemWhizAPI {
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
    
    // 若尚未設置但可從 Telegram WebApp 讀到 initData，動態抓取填入
    try {
      if (!this.telegramAuthData && typeof window !== 'undefined' && (window as any)?.Telegram?.WebApp?.initData) {
        this.telegramAuthData = (window as any).Telegram.WebApp.initData;
      }
    } catch {}

    // 創建驗證標頭
    const authHeaders = createTelegramAuthHeader(this.telegramAuthData);
    
    try {
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

      const data = await response.json();
      return data;
    } catch (error) {
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

  async addWord(word: string, userNotes?: string, category?: string): Promise<any> {
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
        category: category || 'uncategorized',
      }),
    });
  }

  async getWordById(wordId: number): Promise<WordDetail> {
    let endpoint = `/v1/words/${wordId}`;
    
    // 本地測試模式下添加 user_id 參數
    if (isLocalDevelopment() && !this.telegramAuthData) {
      endpoint += '?user_id=613170570';
    }
    
    return this.request(endpoint);
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
    text: string,
    explanationType: 'simple' | 'deep' | 'sentence' = 'deep'
  ): Promise<AIExplanationResponse> {
    return this.request('/v1/ai/explain', {
      method: 'POST',
      body: JSON.stringify({
        text,
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

  // User Settings endpoints
  async getUserSettings(): Promise<UserSettingsResponse> {
    let endpoint = '/v1/settings';
    
    // 本地測試模式下添加 user_id 參數
    if (isLocalDevelopment() && !this.telegramAuthData) {
      endpoint += '?user_id=613170570';
    }
    
    return this.request(endpoint);
  }

  async createOrUpdateSettings(settings: UserSettingsCreate): Promise<{ message: string; user_id: number }> {
    let endpoint = '/v1/settings';
    
    // 本地測試模式下添加 user_id 參數
    if (isLocalDevelopment() && !this.telegramAuthData) {
      endpoint += '?user_id=613170570';
    }
    
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(settings),
    });
  }

  async updateSettings(settings: UserSettingsUpdate): Promise<{ message: string; user_id: number }> {
    let endpoint = '/v1/settings';
    
    // 本地測試模式下添加 user_id 參數
    if (isLocalDevelopment() && !this.telegramAuthData) {
      endpoint += '?user_id=613170570';
    }
    
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  // Daily Discovery endpoints
  async getDailyDiscovery(date?: string, contentType?: 'article' | 'conversation'): Promise<DailyDiscoveryResponse> {
    let endpoint = '/v1/daily-discovery';
    
    const params = new URLSearchParams();
    
    // 添加日期參數（如果提供）
    if (date) {
      params.append('date_str', date);
    }
    
    // 添加內容類型參數（如果提供）
    if (contentType) {
      params.append('content_type', contentType);
    }
    
    // 本地測試模式下添加 user_id 參數
    if (isLocalDevelopment() && !this.telegramAuthData) {
      params.append('user_id', '613170570');
    }
    
    if (params.toString()) {
      endpoint += '?' + params.toString();
    }
    
    return this.request(endpoint);
  }

  // Bookmark endpoints
  async createBookmark(bookmarkRequest: BookmarkRequest): Promise<{ success: boolean; message: string }> {
    let endpoint = '/v1/bookmarks';
    
    // 本地測試模式下添加 user_id 參數
    if (isLocalDevelopment() && !this.telegramAuthData) {
      endpoint += '?user_id=613170570';
    }
    
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(bookmarkRequest),
    });
  }

  async deleteBookmark(
    discoveryId: number, 
    bookmarkType: string = 'full', 
    knowledgePointId?: string
  ): Promise<{ success: boolean; message: string }> {
    let endpoint = `/v1/bookmarks/${discoveryId}`;
    
    const params = new URLSearchParams();
    params.append('bookmark_type', bookmarkType);
    
    if (knowledgePointId) {
      params.append('knowledge_point_id', knowledgePointId);
    }
    
    // 本地測試模式下添加 user_id 參數
    if (isLocalDevelopment() && !this.telegramAuthData) {
      params.append('user_id', '613170570');
    }
    
    endpoint += '?' + params.toString();
    
    return this.request(endpoint, {
      method: 'DELETE',
    });
  }

  async getBookmarks(options?: {
    bookmarkType?: string,
    contentType?: 'article' | 'conversation',
    startDate?: string,
    endDate?: string,
    page?: number,
    pageSize?: number,
  }): Promise<BookmarkSummaryListResponse> {
    let endpoint = '/v1/bookmarks';
    const params = new URLSearchParams();
    const {
      bookmarkType,
      contentType,
      startDate,
      endDate,
      page = 0,
      pageSize = 20,
    } = options || {};

    if (bookmarkType) params.append('bookmark_type', bookmarkType);
    if (contentType) params.append('content_type', contentType);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    params.append('page', page.toString());
    params.append('page_size', pageSize.toString());

    if (isLocalDevelopment() && !this.telegramAuthData) {
      params.append('user_id', '613170570');
    }
    endpoint += '?' + params.toString();
    return this.request(endpoint);
  }

  async getBookmarkDetail(bookmarkId: number): Promise<BookmarkResponse> {
    let endpoint = `/v1/bookmarks/${bookmarkId}`;
    
    // 本地測試模式下添加 user_id 參數
    if (isLocalDevelopment() && !this.telegramAuthData) {
      endpoint += '?user_id=613170570';
    }
    
    return this.request(endpoint);
  }

  async updateBookmarkNotes(
    bookmarkId: number, 
    personalNotes?: string
  ): Promise<{ success: boolean; message: string }> {
    let endpoint = `/v1/bookmarks/${bookmarkId}/notes`;
    
    // 本地測試模式下添加 user_id 參數
    if (isLocalDevelopment() && !this.telegramAuthData) {
      endpoint += '?user_id=613170570';
    }
    
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify({ personal_notes: personalNotes }),
    });
  }

  async getBookmarkTags(): Promise<BookmarkTag[]> {
    let endpoint = '/v1/bookmarks/tags';
    
    // 本地測試模式下添加 user_id 參數
    if (isLocalDevelopment() && !this.telegramAuthData) {
      endpoint += '?user_id=613170570';
    }
    
    return this.request(endpoint);
  }

  async createBookmarkTag(tagRequest: CreateTagRequest): Promise<{ success: boolean; message: string }> {
    let endpoint = '/v1/bookmarks/tags';
    
    // 本地測試模式下添加 user_id 參數
    if (isLocalDevelopment() && !this.telegramAuthData) {
      endpoint += '?user_id=613170570';
    }
    
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(tagRequest),
    });
  }
}

export const memWhizAPI = new MemWhizAPI();
