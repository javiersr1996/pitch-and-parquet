"""The fingerprint and the seal of a protocol file: a sha256 of its canonical JSON."""

from __future__ import annotations

import hashlib
import json
from typing import Any


def fingerprint(design_payload: dict[str, Any]) -> str:
    canonical = json.dumps(
        design_payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False
    )
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


def seal(payload: dict[str, Any]) -> dict[str, Any]:
    """The payload with `content_sha256` over everything else, last; `sealed` verifies it."""
    body = {k: v for k, v in payload.items() if k != "content_sha256"}
    return {**body, "content_sha256": fingerprint(body)}


def sealed(payload: dict[str, Any]) -> bool:
    body = {k: v for k, v in payload.items() if k != "content_sha256"}
    return payload.get("content_sha256") == fingerprint(body)
