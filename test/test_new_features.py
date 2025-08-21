#!/usr/bin/env python3
"""
測試新的 /s 和 /t 功能
"""

import asyncio
import sys
import os

# 添加專案路徑到 Python 路徑
sys.path.append(os.path.dirname(__file__))

from config_loader import load_config
from bot.services.ai_service import AIService

async def test_sentence_optimization():
    """測試句子優化功能"""
    print("🔍 測試句子優化功能...")
    
    config = load_config()
    ai_service = AIService(config)
    
    test_sentence = "I have went to the store yesterday."
    
    try:
        print(f"輸入句子: {test_sentence}")
        raw_response = await ai_service.get_sentence_analysis_optimization(test_sentence)
        print("✅ AI 服務回應成功")
        print(f"回應長度: {len(raw_response)} 字符")
        print(f"前200字符: {raw_response[:200]}...")
        
        # 嘗試解析結構化回應
        structured_data = ai_service.parse_structured_response(raw_response, is_sentence_optimization=True)
        print("✅ 結構化解析成功")
        print(f"解析結果類型: {type(structured_data)}")
        print(f"主要鍵值: {list(structured_data.keys())}")
        
        return True
        
    except Exception as e:
        print(f"❌ 句子優化測試失敗: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_translation():
    """測試翻譯功能"""
    print("\n🌐 測試翻譯功能...")
    
    config = load_config()
    ai_service = AIService(config)
    
    test_text = "Hello world"
    
    try:
        print(f"輸入文字: {test_text}")
        raw_response = await ai_service.get_translation(test_text)
        print("✅ AI 服務回應成功")
        print(f"回應長度: {len(raw_response)} 字符")
        print(f"前200字符: {raw_response[:200]}...")
        
        # 嘗試解析結構化回應
        structured_data = ai_service.parse_structured_response(raw_response, is_translation=True)
        print("✅ 結構化解析成功")
        print(f"解析結果類型: {type(structured_data)}")
        print(f"主要鍵值: {list(structured_data.keys())}")
        
        return True
        
    except Exception as e:
        print(f"❌ 翻譯測試失敗: {e}")
        import traceback
        traceback.print_exc()
        return False

async def test_config_loading():
    """測試配置加載"""
    print("🔧 測試配置加載...")
    
    try:
        config = load_config()
        
        # 檢查新的 prompts 是否正確加載
        prompts = config.get('prompts', {})
        
        sentence_prompt = prompts.get('sentence_analysis_optimization')
        translation_prompt = prompts.get('translation')
        
        if sentence_prompt:
            print("✅ 句子分析優化 prompt 載入成功")
            print(f"Prompt 長度: {len(sentence_prompt)} 字符")
        else:
            print("❌ 句子分析優化 prompt 載入失敗")
            
        if translation_prompt:
            print("✅ 翻譯 prompt 載入成功")
            print(f"Prompt 長度: {len(translation_prompt)} 字符")
        else:
            print("❌ 翻譯 prompt 載入失敗")
            
        # 檢查 AI 服務配置
        ai_config = config.get('ai_services', {})
        provider = ai_config.get('provider')
        api_key = ai_config.get('google', {}).get('api_key')
        
        print(f"AI 提供商: {provider}")
        print(f"API Key 是否存在: {'是' if api_key else '否'}")
        
        return True
        
    except Exception as e:
        print(f"❌ 配置測試失敗: {e}")
        import traceback
        traceback.print_exc()
        return False

async def main():
    """主測試函數"""
    print("🧪 開始測試新功能...\n")
    
    # 測試配置
    config_ok = await test_config_loading()
    if not config_ok:
        print("❌ 配置測試失敗，停止後續測試")
        return
    
    # 測試句子優化
    sentence_ok = await test_sentence_optimization()
    
    # 測試翻譯
    translation_ok = await test_translation()
    
    # 總結
    print(f"\n📊 測試結果總結:")
    print(f"配置載入: {'✅ 成功' if config_ok else '❌ 失敗'}")
    print(f"句子優化: {'✅ 成功' if sentence_ok else '❌ 失敗'}")
    print(f"翻譯功能: {'✅ 成功' if translation_ok else '❌ 失敗'}")
    
    if all([config_ok, sentence_ok, translation_ok]):
        print("\n🎉 所有測試通過！")
    else:
        print("\n⚠️ 部分測試失敗，需要修復")

if __name__ == "__main__":
    asyncio.run(main())