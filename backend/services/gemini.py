import os
from dotenv import load_dotenv
from google import genai

load_dotenv()


class _ModelWrapper:
    """Thin wrapper so callers can use model.generate_content(prompt)."""

    def __init__(self, client: genai.Client, model_name: str):
        self._client = client
        self._model_name = model_name

    def generate_content(self, contents):
        return self._client.models.generate_content(
            model=self._model_name,
            contents=contents,
        )


def get_gemini_client() -> genai.Client:
    """Return a configured genai.Client for advanced use (chat, multimodal, etc.)."""
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise RuntimeError("GOOGLE_API_KEY is not set in .env")
    return genai.Client(api_key=api_key)


def get_gemini_model(model_name: str = "gemini-2.5-flash") -> _ModelWrapper:
    return _ModelWrapper(get_gemini_client(), model_name)
