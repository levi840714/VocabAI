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
    let target = event.target as HTMLElement;
    
    // 特殊處理：如果點擊的是 dangerouslySetInnerHTML 生成的元素
    // 需要找到包含實際文字內容的元素
    if (!target.textContent || target.textContent.trim() === '') {
      // 向上尋找包含文字的父元素
      let parent = target.parentElement;
      while (parent && (!parent.textContent || parent.textContent.trim() === '')) {
        parent = parent.parentElement;
      }
      if (parent && parent.textContent && parent.textContent.trim()) {
        target = parent;
      }
    }
    
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
        if (caretPos && caretPos.offsetNode) {
          // 對於 dangerouslySetInnerHTML 生成的元素，offsetNode 可能是文本節點
          if (caretPos.offsetNode.nodeType === Node.TEXT_NODE) {
            // 計算該文本節點在整個元素中的相對位置
            let textOffset = 0;
            const walker = document.createTreeWalker(
              target,
              NodeFilter.SHOW_TEXT,
              null
            );
            
            let currentNode;
            while ((currentNode = walker.nextNode())) {
              if (currentNode === caretPos.offsetNode) {
                clickedCharIndex = textOffset + caretPos.offset;
                break;
              }
              textOffset += currentNode.textContent?.length || 0;
            }
          } else if (caretPos.offsetNode === target.firstChild) {
            clickedCharIndex = caretPos.offset;
          }
        }
      } else if ('caretRangeFromPoint' in document && document.caretRangeFromPoint) {
        const caretRange = document.caretRangeFromPoint(clickX, clickY);
        if (caretRange && caretRange.startContainer) {
          // 對於 dangerouslySetInnerHTML 生成的元素，startContainer 可能是文本節點
          if (caretRange.startContainer.nodeType === Node.TEXT_NODE) {
            // 計算該文本節點在整個元素中的相對位置
            let textOffset = 0;
            const walker = document.createTreeWalker(
              target,
              NodeFilter.SHOW_TEXT,
              null
            );
            
            let currentNode;
            while ((currentNode = walker.nextNode())) {
              if (currentNode === caretRange.startContainer) {
                clickedCharIndex = textOffset + caretRange.startOffset;
                break;
              }
              textOffset += currentNode.textContent?.length || 0;
            }
          } else if (caretRange.startContainer === target.firstChild) {
            clickedCharIndex = caretRange.startOffset;
          }
        }
      }
      
      // 如果上述方法失敗，使用改進的備選方法
      if (clickedCharIndex === -1) {
        const rect = target.getBoundingClientRect();
        const relativeClickX = clickX - rect.left;
        const relativeClickY = clickY - rect.top;
        
        // 檢查是否為多行文本（簡單判斷）
        const hasLineBreaks = textContent.includes('\n') || target.scrollHeight > target.clientHeight;
        
        if (hasLineBreaks) {
          // 多行文本處理：使用 DOM Range API
          clickedCharIndex = findCharIndexInMultilineText(target, relativeClickX, relativeClickY, textContent);
        } else {
          // 單行文本處理：使用原版算法
          clickedCharIndex = findCharIndexInSingleLine(target, relativeClickX, textContent);
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
          console.log('🎯 智能點擊檢測到單字:', word, '在位置:', clickedCharIndex);
          console.log('📍 目標元素類型:', target.tagName, '是否包含HTML:', target.innerHTML !== target.textContent);
          console.log('📝 文本內容長度:', textContent.length, '前10字符:', textContent.substring(0, 10));
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

  // 單行文本字符位置檢測（原版算法）
  const findCharIndexInSingleLine = useCallback((target: HTMLElement, relativeClickX: number, textContent: string): number => {
    const testElement = document.createElement('span');
    const computedStyle = window.getComputedStyle(target);
    testElement.style.font = computedStyle.font;
    testElement.style.fontSize = computedStyle.fontSize;
    testElement.style.fontFamily = computedStyle.fontFamily;
    testElement.style.fontWeight = computedStyle.fontWeight;
    testElement.style.letterSpacing = computedStyle.letterSpacing;
    testElement.style.wordSpacing = computedStyle.wordSpacing;
    testElement.style.visibility = 'hidden';
    testElement.style.position = 'absolute';
    testElement.style.whiteSpace = 'nowrap';
    testElement.style.top = '-9999px';
    document.body.appendChild(testElement);
    
    try {
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
      
      return Math.max(0, left - 1);
    } finally {
      if (testElement.parentNode) {
        document.body.removeChild(testElement);
      }
    }
  }, []);

  // 多行文本字符位置檢測（改進版）
  const findCharIndexInMultilineText = useCallback((target: HTMLElement, relativeClickX: number, relativeClickY: number, textContent: string): number => {
    // 使用 DOM Range API 逐行檢測
    const range = document.createRange();
    
    // 對於 dangerouslySetInnerHTML 生成的元素，可能有多個文本節點
    const walker = document.createTreeWalker(
      target,
      NodeFilter.SHOW_TEXT,
      null
    );
    
    const textNodes: Text[] = [];
    let textNode;
    while ((textNode = walker.nextNode())) {
      textNodes.push(textNode as Text);
    }
    
    if (textNodes.length === 0) {
      return 0;
    }
    
    try {
      // 簡化版本：直接使用二分搜索在整個文本中找最接近的位置
      let bestIndex = 0;
      let minDistance = Infinity;
      
      // 遍歷所有文本節點，找到最接近點擊位置的字符
      let globalOffset = 0;
      
      for (const node of textNodes) {
        const nodeLength = node.textContent?.length || 0;
        
        // 測試當前節點中的字符位置（每 3 個字符取樣）
        for (let i = 0; i < nodeLength; i += 3) {
          range.setStart(node, i);
          range.setEnd(node, i);
          
          const rect = range.getBoundingClientRect();
          const distance = Math.sqrt(
            Math.pow(rect.left - (target.getBoundingClientRect().left + relativeClickX), 2) +
            Math.pow(rect.top - (target.getBoundingClientRect().top + relativeClickY), 2)
          );
          
          if (distance < minDistance) {
            minDistance = distance;
            bestIndex = globalOffset + i;
          }
        }
        
        globalOffset += nodeLength;
      }
      
      // 在最佳位置附近精細搜索
      const searchStart = Math.max(0, bestIndex - 5);
      const searchEnd = Math.min(textContent.length, bestIndex + 5);
      
      // 找到包含 bestIndex 位置的文本節點
      globalOffset = 0;
      for (const node of textNodes) {
        const nodeLength = node.textContent?.length || 0;
        
        for (let i = Math.max(0, searchStart - globalOffset); i < Math.min(nodeLength, searchEnd - globalOffset); i++) {
          if (globalOffset + i >= searchStart && globalOffset + i < searchEnd) {
            range.setStart(node, i);
            range.setEnd(node, i);
            
            const rect = range.getBoundingClientRect();
            const distance = Math.sqrt(
              Math.pow(rect.left - (target.getBoundingClientRect().left + relativeClickX), 2) +
              Math.pow(rect.top - (target.getBoundingClientRect().top + relativeClickY), 2)
            );
            
            if (distance < minDistance) {
              minDistance = distance;
              bestIndex = globalOffset + i;
            }
          }
        }
        
        globalOffset += nodeLength;
      }
      
      return bestIndex;
    } catch (error) {
      console.warn('多行文本檢測失敗，使用單行備選:', error);
      return findCharIndexInSingleLine(target, relativeClickX, textContent);
    }
  }, [findCharIndexInSingleLine]);


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