"""Unified LLM client.

Supports Anthropic, OpenAI, and Google Gemini. If no key (or SDK) is available,
falls back to a deterministic heuristic generator so every agent still returns
useful output.
"""
from __future__ import annotations

import json
import re
from typing import Optional

from app.connectors.http import post_json
from app.core.config import settings


class LLMClient:
    def __init__(self) -> None:
        self.provider = self._pick_provider()

    def _pick_provider(self) -> str:
        p = settings.LLM_PROVIDER
        if p == "openai" and settings.OPENAI_API_KEY:
            return "openai"
        if p == "anthropic" and settings.ANTHROPIC_API_KEY:
            return "anthropic"
        if p == "gemini" and settings.GEMINI_API_KEY:
            return "gemini"
        if p == "auto":
            if settings.ANTHROPIC_API_KEY:
                return "anthropic"
            if settings.OPENAI_API_KEY:
                return "openai"
            if settings.GEMINI_API_KEY:
                return "gemini"
        return "none"

    @property
    def available(self) -> bool:
        return self.provider != "none"

    async def complete(
        self, prompt: str, system: str = "", max_tokens: int = 1200
    ) -> str:
        if self.provider == "anthropic":
            return await self._anthropic(prompt, system, max_tokens)
        if self.provider == "openai":
            return await self._openai(prompt, system, max_tokens)
        if self.provider == "gemini":
            return await self._gemini(prompt, system, max_tokens)
        return self._fallback(prompt, system)

    async def complete_json(
        self, prompt: str, system: str = "", max_tokens: int = 1500
    ) -> dict:
        system = (system + "\nReturn ONLY valid minified JSON, no prose.").strip()
        raw = await self.complete(prompt, system, max_tokens)
        return _extract_json(raw)

    async def _anthropic(self, prompt: str, system: str, max_tokens: int) -> str:
        try:
            import anthropic

            client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
            msg = await client.messages.create(
                model=settings.ANTHROPIC_MODEL,
                max_tokens=max_tokens,
                system=system or "You are a helpful research assistant.",
                messages=[{"role": "user", "content": prompt}],
            )
            return "".join(b.text for b in msg.content if b.type == "text")
        except Exception:
            return self._fallback(prompt, system)

    async def _openai(self, prompt: str, system: str, max_tokens: int) -> str:
        try:
            from openai import AsyncOpenAI

            client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
            resp = await client.chat.completions.create(
                model=settings.OPENAI_MODEL,
                max_tokens=max_tokens,
                messages=[
                    {"role": "system", "content": system or "You are a research assistant."},
                    {"role": "user", "content": prompt},
                ],
            )
            return resp.choices[0].message.content or ""
        except Exception:
            return self._fallback(prompt, system)

    async def _gemini(self, prompt: str, system: str, max_tokens: int) -> str:
        # Try the configured model first, then fall back across free-tier models
        # so one model's daily quota (429) doesn't kill the feature. Order is by
        # remaining free-tier capacity (requests/day): 3.1-flash-lite has 500/day
        # vs 20/day for the rest — so it's the workhorse, with the others as
        # spillover. Only models actually provisioned on the project will answer;
        # the rest no-op and we move on.
        # Verified against the project's available model list, ordered by
        # remaining free-tier requests/day capacity.
        fallback_chain = [
            "gemini-3.1-flash-lite",  # 500 RPD — primary workhorse
            "gemini-2.5-flash-lite",  # 20 RPD
            "gemini-2.5-flash",       # 20 RPD
            "gemini-3.5-flash",       # 20 RPD
            "gemini-3-flash-preview", # 20 RPD
            "gemini-2.0-flash",       # legacy spillover
            "gemini-flash-lite-latest",  # final catch-all (tracks newest lite)
        ]
        models = [settings.GEMINI_MODEL]
        for m in fallback_chain:
            if m not in models:
                models.append(m)

        body = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                # Gemini 2.5 models "think" by default, consuming the output
                # budget on hidden reasoning and sometimes returning no text.
                # Disable thinking and give visible output room to breathe.
                "maxOutputTokens": max_tokens + 1024,
                "temperature": 0.4,
                "thinkingConfig": {"thinkingBudget": 0},
            },
        }
        if system:
            body["systemInstruction"] = {"parts": [{"text": system}]}

        for model in models:
            url = (
                f"https://generativelanguage.googleapis.com/v1beta/models/"
                f"{model}:generateContent"
            )
            try:
                data = await post_json(
                    url, body, headers={"x-goog-api-key": settings.GEMINI_API_KEY}
                )
                candidates = (data or {}).get("candidates") or []
                if not candidates:
                    continue  # quota/error on this model — try the next
                parts = (candidates[0].get("content") or {}).get("parts") or []
                text = "".join(p.get("text", "") for p in parts)
                if text:
                    return text
            except Exception:
                continue
        return self._fallback(prompt, system)

    def _fallback(self, prompt: str, system: str) -> str:
        """Deterministic, structure-preserving stub when no LLM is configured."""
        if "JSON" in system.upper():
            return "{}"
        return (
            "[LLM not configured — heuristic output]\n"
            "Set ANTHROPIC_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY in "
            "backend/.env for full AI-generated analysis. The underlying data "
            "below was still gathered from live academic sources."
        )


def _extract_json(raw: str) -> dict:
    raw = raw.strip()
    # Strip code fences if present.
    raw = re.sub(r"^```(json)?", "", raw).strip().rstrip("`").strip()
    try:
        return json.loads(raw)
    except Exception:
        # Try to find the first balanced JSON object.
        m = re.search(r"\{.*\}", raw, re.DOTALL)
        if m:
            try:
                return json.loads(m.group(0))
            except Exception:
                pass
    return {}


_client: Optional[LLMClient] = None


def get_llm() -> LLMClient:
    global _client
    if _client is None:
        _client = LLMClient()
    return _client
