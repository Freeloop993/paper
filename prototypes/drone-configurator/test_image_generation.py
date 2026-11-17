#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
无人机Prompt图像生成测试脚本
测试前端生成的最终版本prompt在AI图像生成中的效果
"""

__test__ = False
import json
import os
import time
from datetime import datetime

# 示例：从前端复制的不同类型prompt
SAMPLE_PROMPTS = {
    "final_version": """A professional high-quality drone/quadcopter with true x frame configuration, 250mm wheelbase and 4mm thick carbon fiber arms, equipped with 5.0-inch 3叶-blade propellers, vertically mounted brushless motors, minimalist plate fuselage design (100×80×30mm), equipped with 低矮滑撬/支腿 landing gear system providing 40mm ground clearance, designed for pure flight performance without camera equipment, beginner-friendly design with bright LED status indicators, safety-focused with protective features, intuitive control interface, durable construction for learning, modern consumer-grade appearance, primary color scheme in #0ea5e9, professional matte finish with clean modern aesthetics, high-precision mechanical components, aerodynamic propeller guards for safety, ultra-high resolution professional product photography, studio lighting with perfect shadows and highlights, clean white background, photorealistic details and textures, commercial product showcase quality""",
    
    "detailed_version": """A detailed professional drone/quadcopter with true x frame configuration, 250mm wheelbase, 4mm thick carbon fiber arms, carbon fiber frame material finish, equipped with 5.0-inch propellers, 3叶-blade propeller configuration, motors mounted vertically, brushless motors with propeller guards, minimalist plate fuselage design, fuselage dimensions 100×80×30mm, equipped with 低矮滑撬/支腿 landing gear system, 40mm ground clearance, without camera gimbal, primary color scheme: #0ea5e9, matte finish with professional appearance, high-resolution photography, studio lighting with soft shadows, clean white background, professional product photography style, detailed mechanical components visible, realistic materials and textures""",
    
    "simple_version": """True X drone, 250mm wheelbase, 5.0" props, #0ea5e9 color, high quality, detailed"""
}

def generate_image_with_prompt(prompt_text, prompt_type="test", model=None):
    """Retained for older callers while no image provider is configured."""
    raise RuntimeError("模型服务未配置，无法发起生成。")


def test_all_prompts():
    """测试所有类型的prompt"""
    print("🚁 开始无人机Prompt图像生成测试")
    print("=" * 60)
    
    results = []
    
    for prompt_type, prompt_text in SAMPLE_PROMPTS.items():
        result = generate_image_with_prompt(prompt_text, prompt_type)
        results.append(result)
        
        # 添加延迟避免API限制
        if prompt_type != list(SAMPLE_PROMPTS.keys())[-1]:
            print("⏰ 等待3秒避免API限制...")
            time.sleep(3)
    
    return results

def save_results(results):
    """保存测试结果到文件"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"drone_prompt_test_results_{timestamp}.json"
    
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    
    print(f"\n💾 测试结果已保存到: {filename}")
    return filename

def generate_test_report(results):
    """生成测试报告"""
    print("\n" + "=" * 60)
    print("📊 测试报告总结")
    print("=" * 60)
    
    successful_tests = [r for r in results if r.get("success", False)]
    failed_tests = [r for r in results if not r.get("success", False)]
    
    print(f"✅ 成功生成: {len(successful_tests)}/{len(results)}")
    print(f"❌ 生成失败: {len(failed_tests)}/{len(results)}")
    
    if successful_tests:
        print("\n🎯 成功的测试:")
        for result in successful_tests:
            print(f"  • {result['prompt_type']}: {result['prompt_length']} 字符")
            print(f"    🔗 {result['image_url']}")
    
    if failed_tests:
        print("\n⚠️ 失败的测试:")
        for result in failed_tests:
            print(f"  • {result['prompt_type']}: {result['error']}")
    
    print("\n" + "=" * 60)

def test_custom_prompt(custom_prompt, prompt_name="custom"):
    """测试自定义prompt"""
    print(f"\n🧪 测试自定义Prompt: {prompt_name}")
    result = generate_image_with_prompt(custom_prompt, prompt_name)
    return result

if __name__ == "__main__":
    raise SystemExit("模型服务未配置，未发起请求。")
