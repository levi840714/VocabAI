import React, { useCallback, useRef } from 'react';
import { useClickableTextContext } from '../contexts/ClickableTextContext';
import type { ClickedWord, Translation } from '../contexts/ClickableTextContext';

export type { ClickedWord, Translation };

export const useClickableText = () => {
  const {
    clickedWord,
    translation,
    isLoading,
    setClickedWord,
    setTranslation,
    setIsLoading,
    closePopup
  } = useClickableTextContext();
  const containerRef = useRef<HTMLDivElement>(null);

  // 檢測英文單字的正則表達式
  const WORD_REGEX = /\b[A-Za-z]+\b/g;

  // 快速翻譯服務（使用免費的翻譯 API）
  const getQuickTranslation = useCallback(async (word: string): Promise<Translation> => {
    try {
      // 方案1：使用 MyMemory API（更穩定可靠）
      const response = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=en|zh-TW`
      );
      
      if (response.ok) {
        const data = await response.json();
        if (data.responseData?.translatedText) {
          return {
            word,
            translation: data.responseData.translatedText,
            partOfSpeech: await getPartOfSpeech(word),
          };
        }
      }
      
      throw new Error('MyMemory API failed');
    } catch (error) {
      console.error('Primary translation failed:', error);
      
      try {
        // 方案2：使用 LibreTranslate 作為備選
        const response = await fetch('https://libretranslate.de/translate', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            q: word,
            source: 'en',
            target: 'zh',
            format: 'text'
          })
        });

        if (response.ok) {
          const data = await response.json();
          if (data.translatedText) {
            return {
              word,
              translation: data.translatedText,
              partOfSpeech: await getPartOfSpeech(word),
            };
          }
        }
        
        throw new Error('LibreTranslate API failed');
      } catch (fallbackError) {
        console.error('Backup translation failed:', fallbackError);
        
        try {
          // 方案3：使用簡單的 Google Translate 頁面爬取（最後備選）
          const googleResponse = await fetch(
            `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=zh-TW&dt=t&q=${encodeURIComponent(word)}`
          );
          
          if (googleResponse.ok) {
            const data = await googleResponse.json();
            if (data && data[0] && data[0][0] && data[0][0][0]) {
              return {
                word,
                translation: data[0][0][0],
                partOfSpeech: await getPartOfSpeech(word),
              };
            }
          }
        } catch (googleError) {
          console.error('Google translate failed:', googleError);
        }
        
        // 最終備選：返回錯誤訊息
        return {
          word,
          translation: '翻譯服務暫時不可用',
          partOfSpeech: await getPartOfSpeech(word),
        };
      }
    }
  }, []);

  // 簡單的詞性檢測（基於後綴規則）
  const getPartOfSpeech = useCallback(async (word: string): Promise<string> => {
    const lowerWord = word.toLowerCase();
    
    // 常見動詞後綴
    if (lowerWord.endsWith('ing') || lowerWord.endsWith('ed') || lowerWord.endsWith('s')) {
      return '動詞';
    }
    
    // 常見形容詞後綴
    if (lowerWord.endsWith('ly')) {
      return '副詞';
    }
    
    if (lowerWord.endsWith('ful') || lowerWord.endsWith('less') || lowerWord.endsWith('ous') || 
        lowerWord.endsWith('ive') || lowerWord.endsWith('able')) {
      return '形容詞';
    }
    
    // 常見名詞後綴
    if (lowerWord.endsWith('tion') || lowerWord.endsWith('ness') || lowerWord.endsWith('ment') ||
        lowerWord.endsWith('ity') || lowerWord.endsWith('er') || lowerWord.endsWith('or')) {
      return '名詞';
    }
    
    // 默認根據位置和長度判斷
    if (word.length <= 3) {
      return '介詞/冠詞';
    }
    
    return '名詞'; // 默認
  }, []);

  // 處理文本點擊事件
  const handleTextClick = useCallback(async (event: React.MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement;
    const selection = window.getSelection();
    
    // 如果有選中文字，優先處理選中的內容
    if (selection && selection.toString().trim()) {
      const selectedText = selection.toString().trim();
      const wordMatch = selectedText.match(/^[A-Za-z]+$/);
      
      if (wordMatch) {
        const rect = selection.getRangeAt(0).getBoundingClientRect();
        const position = {
          x: rect.left + rect.width / 2,
          y: rect.top
        };
        
        setClickedWord({ word: selectedText, position });
        setIsLoading(true);
        
        try {
          const translationResult = await getQuickTranslation(selectedText);
          setTranslation(translationResult);
        } finally {
          setIsLoading(false);
        }
        
        return;
      }
    }
    
    // 如果沒有選中文字，使用改進的點擊位置檢測
    const textContent = target.textContent || '';
    if (!textContent) return;
    
    // 使用 Document.caretPositionFromPoint 或 Document.caretRangeFromPoint（更準確）
    let clickedCharIndex = -1;
    const clickX = event.clientX;
    const clickY = event.clientY;
    
    try {
      // 現代瀏覽器支持的方法 - 添加型別檢查
      if ('caretPositionFromPoint' in document && document.caretPositionFromPoint) {
        const caretPos = document.caretPositionFromPoint(clickX, clickY);
        if (caretPos && caretPos.offsetNode === target.firstChild) {
          clickedCharIndex = caretPos.offset;
        }
      } else if ('caretRangeFromPoint' in document && document.caretRangeFromPoint) {
        const caretRange = document.caretRangeFromPoint(clickX, clickY);
        if (caretRange && caretRange.startContainer === target.firstChild) {
          clickedCharIndex = caretRange.startOffset;
        }
      }
      
      // 如果上述方法失敗，使用改進的備選方法
      if (clickedCharIndex === -1) {
        const rect = target.getBoundingClientRect();
        const relativeClickX = clickX - rect.left;
        
        // 創建一個測試元素來測量文字寬度（對移動設備更友好）
        const testElement = document.createElement('span');
        testElement.style.font = window.getComputedStyle(target).font;
        testElement.style.visibility = 'hidden';
        testElement.style.position = 'absolute';
        testElement.style.whiteSpace = 'nowrap';
        document.body.appendChild(testElement);
        
        try {
          // 二分搜索找到最接近的字符位置
          let left = 0;
          let right = textContent.length;
          
          while (left < right) {
            const mid = Math.floor((left + right) / 2);
            testElement.textContent = textContent.substring(0, mid);
            const width = testElement.offsetWidth;
            
            if (width < relativeClickX) {
              left = mid + 1;
            } else {
              right = mid;
            }
          }
          
          clickedCharIndex = Math.max(0, left - 1);
        } finally {
          // 確保測試元素被清理
          if (testElement.parentNode) {
            document.body.removeChild(testElement);
          }
        }
      }
      
      if (clickedCharIndex >= 0 && clickedCharIndex < textContent.length) {
        // 向前和向後擴展找到完整單字
        let wordStart = clickedCharIndex;
        let wordEnd = clickedCharIndex;
        
        // 確保點擊的是字母字符（防止越界訪問）
        if (clickedCharIndex >= textContent.length || !/[A-Za-z]/.test(textContent[clickedCharIndex])) {
          // 如果點擊的不是字母，嘗試找附近的字母
          let found = false;
          for (let offset = 1; offset <= 3 && !found; offset++) {
            if (clickedCharIndex - offset >= 0 && /[A-Za-z]/.test(textContent[clickedCharIndex - offset])) {
              clickedCharIndex = clickedCharIndex - offset;
              found = true;
            } else if (clickedCharIndex + offset < textContent.length && /[A-Za-z]/.test(textContent[clickedCharIndex + offset])) {
              clickedCharIndex = clickedCharIndex + offset;
              found = true;
            }
          }
          if (!found) return; // 沒找到附近的字母，退出
        }
        
        // 向前擴展找到單字開始
        while (wordStart > 0 && /[A-Za-z]/.test(textContent[wordStart - 1])) {
          wordStart--;
        }
        
        // 向後擴展找到單字結束
        while (wordEnd < textContent.length - 1 && /[A-Za-z]/.test(textContent[wordEnd + 1])) {
          wordEnd++;
        }
        
        const word = textContent.substring(wordStart, wordEnd + 1);
        
        if (word && word.length >= 2 && /^[A-Za-z]+$/.test(word)) {
          console.log('🎯 智能點擊檢測到單字:', word);
          const position = {
            x: event.clientX,
            y: event.clientY
          };
          
          setClickedWord({ word, position });
          setIsLoading(true);
          console.log('📡 開始翻譯請求...');
          
          try {
            const translationResult = await getQuickTranslation(word);
            console.log('✅ 翻譯結果:', translationResult);
            setTranslation(translationResult);
          } finally {
            setIsLoading(false);
          }
        }
      }
    } catch (error) {
      console.error('點擊位置檢測失敗:', error);
      // 靜默失敗，不影響用戶體驗
    }
  }, [getQuickTranslation]);


  // 處理文本內容，使其可點擊（無視覺變化）
  const makeTextClickable = useCallback((children: React.ReactNode) => {
    return React.createElement(
      'div',
      {
        ref: containerRef,
        onClick: handleTextClick,
        onMouseDown: (e: React.MouseEvent) => {
          // 防止事件被阻止
          e.stopPropagation();
        },
        className: 'cursor-text select-text',
        style: { userSelect: 'text' as const }
      },
      children
    );
  }, [handleTextClick]);

  return {
    clickedWord,
    translation,
    isLoading,
    closePopup,
    makeTextClickable,
    containerRef
  };
};