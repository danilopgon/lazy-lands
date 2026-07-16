"""Localized presentation copy for the server-rendered export document.

The export stores English labels and raw origin enums, so the PDF needs its own
copy catalog. These strings mirror the web catalog (``apps/web/messages/*.json``,
namespaces ``SessionGeneration.generated.sections`` and ``Entities.origin*``) so
a DM sees the same headings on screen and in the PDF. There is no i18n runtime
in this service, and a gettext/Babel setup would be disproportionate for a
closed set of seven canonical sections and two origins — but if this catalog
grows past the export document, that tradeoff is worth revisiting.
"""

from app.modules.sessions.domain.pdf_export import ExportLocale

_SECTION_LABELS: dict[ExportLocale, dict[str, str]] = {
    "en": {
        "synopsis": "Synopsis",
        "goal": "Session goal",
        "opening": "Opening scene",
        "beats": "Main beats",
        "encounters": "Encounters",
        "factions": "Faction reactions",
        "arcs": "Arc progression",
    },
    "es": {
        "synopsis": "Sinopsis",
        "goal": "Objetivo de la sesión",
        "opening": "Escena inicial",
        "beats": "Momentos clave",
        "encounters": "Encuentros",
        "factions": "Reacciones de facciones",
        "arcs": "Avance de arco",
    },
}

_ORIGIN_LABELS: dict[ExportLocale, dict[str, str]] = {
    "en": {"scribe": "✦ Scribe", "edited": "✎ Edited by you"},
    "es": {"scribe": "✦ Escriba", "edited": "✎ Editado por ti"},
}

_FOOTERS: dict[ExportLocale, str] = {
    "en": "Lazy Lands · DM-edited session {session_number}",
    "es": "Lazy Lands · Sesion {session_number} editada por el DM",
}


def section_label(section_id: str, label: str, locale: ExportLocale) -> str:
    """Localize a canonical section heading, falling back to the saved label.

    Retired or unknown ids have no canonical translation, so the snapshot's own
    label is the only truthful heading — the same fallback the web UI applies in
    ``apps/web/lib/sessions/section-label.ts``. The fallback returns persisted
    text, which stays untrusted and is autoescaped by the template.
    """
    return _SECTION_LABELS[locale].get(section_id, label)


def origin_label(origin: str, locale: ExportLocale) -> str:
    """Localize a section's origin, falling back to the raw stored value."""
    return _ORIGIN_LABELS[locale].get(origin, origin)


def page_footer(session_number: int, locale: ExportLocale) -> str:
    """Build the running-footer copy for the export's page margin box."""
    return _FOOTERS[locale].format(session_number=session_number)
