"""
Test script to verify all three agents are working
Run this from the AgentNetwork directory: python test_agents.py
"""
import asyncio
from agents.gemini_agent import GeminiAgent
from agents.deepseek_agent import DeepSeekAgent
from agents.groq_agent import GroqAgent

async def test_agents():
    print("🔬 Testing AgentNetwork.ai Agents\n")
    print("=" * 50)
    
    # Test Gemini Agent
    print("\n1️⃣ Testing Gemini Agent...")
    try:
        gemini = GeminiAgent()
        response = await gemini.generate("Say hello in one sentence.")
        print(f"✅ Gemini Response: {response[:100]}...")
    except Exception as e:
        print(f"❌ Gemini Error: {str(e)}")
    
    # Test DeepSeek Agent
    print("\n2️⃣ Testing DeepSeek Agent...")
    try:
        deepseek = DeepSeekAgent()
        response = await deepseek.generate("Say hello in one sentence.")
        print(f"✅ DeepSeek Response: {response[:100]}...")
    except Exception as e:
        print(f"❌ DeepSeek Error: {str(e)}")
    
    # Test Groq Agent
    print("\n3️⃣ Testing Groq Agent...")
    try:
        groq = GroqAgent()
        response = await groq.generate("Say hello in one sentence.")
        print(f"✅ Groq Response: {response[:100]}...")
    except Exception as e:
        print(f"❌ Groq Error: {str(e)}")
    
    print("\n" + "=" * 50)
    print("✨ Agent testing complete!\n")

if __name__ == "__main__":
    asyncio.run(test_agents())