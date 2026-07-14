"""Structured logging factory for the API service."""

import logging


def get_logger(name: str) -> logging.Logger:
    """Return a named logger, initialising basic config on first call."""
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s %(message)s",
    )
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)
    return logger
