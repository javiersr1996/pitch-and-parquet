"""`tracklab.runs.protocol` and `tracklab.runs.data`: the seal and the git status the frozen P6 code
imports. The four sealed P6 reports in the repository must still verify with them byte for byte,
and a seal or a fingerprint must move with any edit."""

from __future__ import annotations

import json
import subprocess
from pathlib import Path

import pytest

from tracklab.runs.data import HeldOutLocked, dirty_paths
from tracklab.runs.protocol import fingerprint, seal, sealed

REPORTS = Path(__file__).resolve().parents[2] / "reports"
SEALED = ("pose_protocol", "pose_calibration", "pose_verdict", "pose_metric")


@pytest.mark.parametrize("name", SEALED)
def test_the_committed_p6_reports_are_sealed_by_these_helpers(name: str) -> None:
    payload = json.loads((REPORTS / f"{name}.json").read_text(encoding="utf-8"))
    assert sealed(payload)
    assert seal({k: v for k, v in payload.items() if k != "content_sha256"}) == payload
    assert not sealed({**payload, "written": "1999-01-01"})


def test_the_fingerprint_follows_the_design_and_nothing_else() -> None:
    payload = json.loads((REPORTS / "pose_protocol.json").read_text(encoding="utf-8"))
    assert payload["fingerprint"] == fingerprint(payload["design"])
    moved = {**payload["design"], "extra": 1}
    assert fingerprint(moved) != payload["fingerprint"]
    assert fingerprint(dict(reversed(list(payload["design"].items())))) == payload["fingerprint"]


def _git(repo: Path, *args: str) -> None:
    subprocess.run(["git", "-C", str(repo), *args], check=True, capture_output=True)


def test_dirty_paths_lists_edits_and_untracked_files(tmp_path: Path) -> None:
    _git(tmp_path, "init", "-q")
    (tmp_path / "a.txt").write_text("a", encoding="utf-8")
    _git(tmp_path, "add", "a.txt")
    _git(tmp_path, "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "-m", "a")
    assert dirty_paths(tmp_path) == []
    (tmp_path / "a.txt").write_text("b", encoding="utf-8")
    (tmp_path / "new").mkdir()
    (tmp_path / "new" / "b.txt").write_text("b", encoding="utf-8")
    assert sorted(line[3:] for line in dirty_paths(tmp_path)) == ["a.txt", "new/b.txt"]


def test_dirty_paths_outside_a_repository_raises(tmp_path: Path) -> None:
    with pytest.raises(HeldOutLocked, match="git status failed"):
        dirty_paths(tmp_path / "nowhere")
