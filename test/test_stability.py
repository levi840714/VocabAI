#!/usr/bin/env python3
"""
測試新功能的穩定性 - 模擬間歇性錯誤場景
"""

import asyncio
import sys
import os
import time

# 添加專案路徑到 Python 路徑
sys.path.append(os.path.dirname(__file__))

from config_loader import load_config
from bot.services.ai_service import AIService

async def test_multiple_requests(ai_service, test_func, test_name, iterations=5):
    """多次測試同一個功能來檢查穩定性"""
    print(f"\n🔄 測試 {test_name} - 執行 {iterations} 次...")
    
    success_count = 0
    results = []
    
    for i in range(iterations):
        print(f"  第 {i + 1}/{iterations} 次測試...", end=" ")
        start_time = time.time()
        
        try:
            result = await test_func(ai_service)
            end_time = time.time()
            duration = end_time - start_time
            
            if result and not result.startswith("Sorry"):
                success_count += 1
                print(f"✅ 成功 ({duration:.1f}s)")
                results.append(('success', duration))
            else:
                print(f"⚠️ 失敗 - 無效回應 ({duration:.1f}s)")
                results.append(('invalid_response', duration))
                
        except Exception as e:
            end_time = time.time()
            duration = end_time - start_time
            print(f"❌ 異常 - {str(e)[:50]}... ({duration:.1f}s)")
            results.append(('exception', duration))
        
        # 在測試間稍作停顿，避免過於頻繁的請求
        await asyncio.sleep(0.5)
    
    # 計算統計資料
    durations = [r[1] for r in results]
    avg_duration = sum(durations) / len(durations) if durations else 0
    max_duration = max(durations) if durations else 0
    min_duration = min(durations) if durations else 0
    
    print(f"📊 {test_name} 測試結果:")
    print(f"  成功率: {success_count}/{iterations} ({success_count/iterations*100:.1f}%)")
    print(f"  平均時間: {avg_duration:.1f}s")
    print(f"  最短時間: {min_duration:.1f}s")
    print(f"  最長時間: {max_duration:.1f}s")
    
    return success_count, results

async def test_sentence_optimization_single(ai_service):
    """單次句子優化測試"""
    test_sentences = [
        "I have went to the store yesterday.",
        "She don't like apples.",
        "The book what I read was interesting.",
        "I'm loving pizza very much.",
        "Can you borrow me some money?"
    ]
    
    # 隨機選擇一個測試句子
    import random
    sentence = random.choice(test_sentences)
    
    result = await ai_service.get_sentence_analysis_optimization(sentence)
    return result

async def test_translation_single(ai_service):
    """單次翻譯測試"""
    test_texts = [
        "Hello world",
        "How are you today?",
        "你好世界",
        "今天天氣很好",
        "Thank you very much"
    ]
    
    # 隨機選擇一個測試文本
    import random
    text = random.choice(test_texts)
    
    result = await ai_service.get_translation(text)
    return result

async def test_concurrent_requests(ai_service):
    """測試並發請求的處理能力"""
    print(f"\n⚡ 測試並發請求處理...")
    
    # 創建多個並發任務
    tasks = []
    for i in range(3):  # 同時發送3個請求
        if i % 2 == 0:
            task = test_sentence_optimization_single(ai_service)
        else:
            task = test_translation_single(ai_service)
        tasks.append(task)
    
    start_time = time.time()
    try:
        results = await asyncio.gather(*tasks, return_exceptions=True)
        end_time = time.time()
        duration = end_time - start_time
        
        success_count = 0
        for i, result in enumerate(results):
            if isinstance(result, Exception):
                print(f"  任務 {i + 1}: ❌ 異常 - {str(result)[:50]}...")
            elif result and not result.startswith("Sorry"):
                print(f"  任務 {i + 1}: ✅ 成功")
                success_count += 1
            else:
                print(f"  任務 {i + 1}: ⚠️ 無效回應")
        
        print(f"📊 並發測試結果: {success_count}/{len(tasks)} 成功 ({duration:.1f}s)")
        return success_count > 0
        
    except Exception as e:
        print(f"❌ 並發測試失敗: {e}")
        return False

async def main():
    """主測試函數"""
    print("🧪 開始穩定性測試...\n")
    
    try:
        config = load_config()
        ai_service = AIService(config)
        
        # 測試句子優化的穩定性
        sentence_success, sentence_results = await test_multiple_requests(
            ai_service, test_sentence_optimization_single, "句子優化", 5
        )
        
        # 測試翻譯的穩定性
        translation_success, translation_results = await test_multiple_requests(
            ai_service, test_translation_single, "翻譯功能", 5
        )
        
        # 測試並發處理
        concurrent_success = await test_concurrent_requests(ai_service)
        
        # 總結報告
        print(f"\n📋 穩定性測試總結:")
        print(f"句子優化: {sentence_success}/5 成功")
        print(f"翻譯功能: {translation_success}/5 成功")
        print(f"並發處理: {'✅ 通過' if concurrent_success else '❌ 失敗'}")
        
        total_tests = 10 + (3 if concurrent_success else 0)
        total_success = sentence_success + translation_success + (3 if concurrent_success else 0)
        overall_success_rate = total_success / total_tests * 100
        
        print(f"整體成功率: {total_success}/{total_tests} ({overall_success_rate:.1f}%)")
        
        if overall_success_rate >= 80:
            print("🎉 穩定性測試通過！")
        else:
            print("⚠️ 穩定性需要改進")
            
    except Exception as e:
        print(f"❌ 測試過程發生錯誤: {e}")
        import traceback
        traceback.print_exc()
    finally:
        # 清理資源
        if 'ai_service' in locals() and hasattr(ai_service, 'client'):
            await ai_service.client.aclose()

if __name__ == "__main__":
    asyncio.run(main())