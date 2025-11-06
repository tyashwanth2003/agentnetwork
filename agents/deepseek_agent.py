import os
from openai import OpenAI
import asyncio

class DeepSeekAgent:
    def __init__(self):
        self.api_key = os.getenv("DEEPSEEK_API_KEY")
        if not self.api_key:
            raise ValueError("❌ DEEPSEEK_API_KEY not found in environment variables.")

        # ✅ No proxies, clean initializationkkk
        self.client = OpenAI(
            api_key=self.api_key,
            base_url="https://api.deepseek.com"
        )

    async def generate(self, prompt):
        """Generate response from DeepSeek API"""
        try:
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.client.chat.completions.create(
                    model="deepseek-chat",
                    messages=[
                        {"role": "system", "content": "You are a helpful AI agent collaborating with a team."},
                        {"role": "user", "content": prompt}
                    ]
                )
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"Error from DeepSeek Agent: {str(e)}"

    def generate_sync(self, prompt):
        """Synchronous version"""
        try:
            response = self.client.chat.completions.create(
                model="deepseek-chat",
                messages=[
                    {"role": "system", "content": "You are a helpful AI agent collaborating with a team."},
                    {"role": "user", "content": prompt}
                ]
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"Error from DeepSeek Agent: {str(e)}"
