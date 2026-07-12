# NOTE: runtime verification is performed during Block 0 when Docker is available.
FROM python:3.12-slim AS runtime

WORKDIR /app

RUN apt-get update \
    && apt-get install --no-install-recommends -y \
        fonts-dejavu-core \
        libcairo2 \
        libgdk-pixbuf-2.0-0 \
        libpango-1.0-0 \
        libpangocairo-1.0-0 \
        shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml uv.lock ./
RUN pip install --no-cache-dir uv && uv sync --frozen --no-dev

COPY app/ ./app/
COPY scripts/ ./scripts/

EXPOSE 8000

CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
