from __future__ import annotations

import os

import pytest


def _escape_workflow_command(value: str) -> str:
    return (
        value.replace("%", "%25")
        .replace("\r", "%0D")
        .replace("\n", "%0A")
    )


def pytest_runtest_logreport(report: pytest.TestReport) -> None:
    """Expose useful pytest tracebacks as GitHub Actions annotations."""
    if os.getenv("GITHUB_ACTIONS") != "true" or not report.failed:
        return

    details = getattr(report, "longreprtext", str(report.longrepr))
    details = details[-12000:]
    message = _escape_workflow_command(details)
    title = _escape_workflow_command(f"pytest failure: {report.nodeid}")
    print(f"::error title={title}::{message}", flush=True)
