import os
import google.generativeai as genai
import asyncio

class GeminiAgent:
    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY")
        if not self.api_key:
            raise ValueError("❌ GEMINI_API_KEY not found in environment variables.")

        # Configure Google Generative AI client properly
        genai.configure(api_key=self.api_key)
        self.model = genai.GenerativeModel("gemini-2.0-flash-exp")

    async def generate(self, prompt):
        """Generate response from Gemini API"""
        try:
            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.model.generate_content(prompt)
            )
            return response.text
        except Exception as e:
            return f"Error from Gemini Agent: {str(e)}"

    def generate_sync(self, prompt):
        """Synchronous version"""
        try:
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            return f"Error from Gemini Agent: {str(e)}"
