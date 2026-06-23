from app.domain.ports.llm import LlmProvider


class FakeLlmProvider(LlmProvider):
    async def complete(self, prompt: str) -> str:
        _ = prompt
        return '{"fake": true}'
