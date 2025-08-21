#!/usr/bin/env python3
"""
測試翻譯功能重構
- /t = 快速翻譯
- /q = 深度翻譯分析
"""

import asyncio
import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config_loader import load_config
from bot.services.ai_service import AIService
from bot.handlers.analysis_handler import format_quick_translation_response, format_translation_response

async def test_quick_translation():
    """測試快速翻譯功能"""
    print("🧪 測試快速翻譯 (/t)")
    
    config = load_config()
    ai_service = AIService(config)
    
    test_text = "Hello world, how are you today?"
    
    try:
        print(f"測試文本: {test_text}")
        raw_response = await ai_service.get_quick_translation(test_text)
        print(f"Raw response length: {len(raw_response)}")
        
        # 解析回應
        structured_data = ai_service.parse_structured_response(raw_response, is_quick_translation=True)
        print(f"Structured data keys: {list(structured_data.keys())}")
        
        # 格式化回應
        formatted_response = format_quick_translation_response(structured_data)
        print("📋 格式化結果:")
        print(formatted_response)
        print("✅ 快速翻譯測試成功")
        
    except Exception as e:
        print(f"❌ 快速翻譯測試失敗: {e}")
        
    finally:
        await ai_service.close()

async def test_deep_translation():
    """測試深度翻譯功能"""
    print("\n🧪 測試深度翻譯 (/q)")
    
    config = load_config()
    ai_service = AIService(config)
    
    test_text = "The quick brown fox jumps over the lazy dog."
    
    try:
        print(f"測試文本: {test_text}")
        raw_response = await ai_service.get_deep_translation(test_text)
        print(f"Raw response length: {len(raw_response)}")
        
        # 解析回應
        structured_data = ai_service.parse_structured_response(raw_response, is_translation=True)
        print(f"Structured data keys: {list(structured_data.keys())}")
        
        # 格式化回應
        formatted_response = format_translation_response(structured_data)
        print("📋 格式化結果:")
        print(formatted_response[:500] + "..." if len(formatted_response) > 500 else formatted_response)
        print("✅ 深度翻譯測試成功")
        
    except Exception as e:
        print(f"❌ 深度翻譯測試失敗: {e}")
        
    finally:
        await ai_service.close()

async def main():
    print("🚀 開始翻譯功能重構測試\n")
    
    await test_quick_translation()
    await test_deep_translation()
    
    print("\n🎉 測試完成")

if __name__ == "__main__":
    asyncio.run(main())