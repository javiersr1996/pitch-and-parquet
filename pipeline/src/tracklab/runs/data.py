"""The guard's exception and the working tree's state, for `tracklab.pose.data`'s guard."""

from __future__ import annotations

import subprocess
from pathlib import Path


class HeldOutLocked(RuntimeError):
    """The committed protocol cannot vouch for what was asked: missing or unverifiable in
    HEAD, not frozen, or a dirty working tree."""


def _git(repo: Path, *args: str) -> subprocess.CompletedProcess[str]:
    # utf-8 explicitly: `text=True` would decode the output in the console code page.
    return subprocess.run(
        ["git", "-C", str(repo), *args], capture_output=True, encoding="utf-8", check=False
    )


def dirty_paths(repo: Path) -> list[str]:
    """What `git status --porcelain --untracked-files=all` lists: modified, staged and
    untracked (every file, whatever `status.showUntrackedFiles` says), ignored left out."""
    out = _git(repo, "status", "--porcelain", "--untracked-files=all")
    if out.returncode != 0:
        raise HeldOutLocked(f"git status failed in {repo}: {out.stderr.strip()}")
    return [line for line in out.stdout.splitlines() if line.strip()]
