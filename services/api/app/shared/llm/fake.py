from app.shared.llm.port import LlmProvider


class FakeLlmProvider(LlmProvider):
    async def complete(self, prompt: str) -> str:
        _ = prompt
        return '{"fake": true}'
