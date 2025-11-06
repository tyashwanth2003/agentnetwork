import os
from openai import OpenAI
import asyncio

class GroqAgent:
    def __init__(self):
        self.api_key = os.getenv("GROQ_API_KEY")
        if not self.api_key:
            raise ValueError("❌ GROQ_API_KEY not found in environment variables.")

        # ✅ No proxies, correct OpenAI usage for Groq
        self.client = OpenAI(
            api_key=self.api_key,
            base_url="https://api.groq.com/openai/v1"
        )

    async def generate(self, prompt):
        """Generate response from Groq API"""
        try:
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.client.chat.completions.create(
                    model="llama-3.3-70b-versatile",
                    messages=[
                        {"role": "system", "content": "You are a helpful AI agent collaborating with a team."},
                        {"role": "user", "content": prompt}
                    ]
                )
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"Error from Groq Agent: {str(e)}"

    def generate_sync(self, prompt):
        """Synchronous version"""
        try:
            response = self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {"role": "system", "content": "You are a helpful AI agent collaborating with a team."},
                    {"role": "user", "content": prompt}
                ]
            )
            return response.choices[0].message.content
        except Exception as e:
            return f"Error from Groq Agent: {str(e)}"
