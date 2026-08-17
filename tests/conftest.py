from __future__ import annotations

import os


def _escape_workflow_command(value: str) -> str:
    return (
        value.replace("%", "%25")
        .replace("\r", "%0D")
        .replace("\n", "%0A")
    )


def pytest_terminal_summary(terminalreporter, exitstatus, config) -> None:
    """Expose useful pytest tracebacks as GitHub Actions annotations."""
    if os.getenv("GITHUB_ACTIONS") != "true":
        return

    for report in terminalreporter.stats.get("failed", []):
        details = getattr(report, "longreprtext", str(report.longrepr))[-12000:]
        message = _escape_workflow_command(details)
        title = _escape_workflow_command(f"pytest failure: {report.nodeid}")
        terminalreporter.write_line(
            f"::error title={title}::{message}",
            yellow=True,
        )
