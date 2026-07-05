"""Application-owned read models returned by campaign queries.

These are the query handlers' output shapes (application layer). The ``api``
layer imports them for FastAPI ``response_model`` — an inward dependency
(api -> application) that is legal under ADR-05; the reverse must never
happen.
"""
