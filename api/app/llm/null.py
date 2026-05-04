from __future__ import annotations

from app.llm.base import LLMClient


class NullLLM(LLMClient):
    def enabled(self) -> bool:
        return False

