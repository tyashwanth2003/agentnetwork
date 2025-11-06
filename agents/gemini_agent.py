import os
from google import genai
import asyncio

class GeminiAgent:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("❌ GEMINI_API_KEY not found in environment variables.")

        self.client = genai.Client(api_key=self.api_key)
        self.model = "gemini-2.0-flash-exp"

    async def generate(self, prompt):
        """Generate response from Gemini API"""
        try:
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.client.models.generate_content(
                    model=self.model,
                    contents=prompt
                )
            )
            return response.text
        except Exception as e:
            return f"Error from Gemini Agent: {str(e)}"

    def generate_sync(self, prompt):
        """Synchronous version for non-async contexts"""
        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt
            )
            return response.text
        except Exception as e:
            return f"Error from Gemini Agent: {str(e)}"
