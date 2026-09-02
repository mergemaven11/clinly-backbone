"""Document this first-party Python module."""
from __future__ import annotations

import hashlib
import threading
import time
from collections import defaultdict, deque
from dataclasses import dataclass


@dataclass(frozen=True)
class RateLimitDecision:
    """Represent RateLimitDecision."""
    allowed: bool
    retry_after_seconds: int = 0


class LoginRateLimiter:
    """Process-local sliding-window limiter for login failures.

    Identity and IP keys are SHA-256 digests so raw email addresses and client
    IP values are not retained in the limiter's in-memory keyspace. Deployments
    with multiple replicas should also enforce a distributed/upstream rate
    limit, but this provides an application-level V1 backstop.
    """

    def __init__(
        self,
        *,
        identity_max_attempts: int,
        ip_max_attempts: int,
        window_seconds: int,
    ) -> None:
        """Initialize the instance.

        Args:
            identity_max_attempts: Function argument.
            ip_max_attempts: Function argument.
            window_seconds: Function argument.
        """
        self._identity_max_attempts = identity_max_attempts
        self._ip_max_attempts = ip_max_attempts
        self._window_seconds = window_seconds
        self._attempts: dict[str, deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()

    @staticmethod
    def _digest(namespace: str, value: str) -> str:
        """Handle digest.

        Args:
            namespace: Function argument.
            value: Function argument.

        Returns:
            Function result.
        """
        normalized = value.strip().lower()
        return hashlib.sha256(f"{namespace}:{normalized}".encode()).hexdigest()

    def _keys(self, email: str, ip_address: str) -> tuple[str, str]:
        """Handle keys.

        Args:
            email: Function argument.
            ip_address: Function argument.

        Returns:
            Function result.
        """
        return (
            self._digest("identity", email),
            self._digest("ip", ip_address or "unknown"),
        )

    def _prune(self, bucket: deque[float], now: float) -> None:
        """Handle prune.

        Args:
            bucket: Function argument.
            now: Function argument.
        """
        cutoff = now - self._window_seconds
        while bucket and bucket[0] <= cutoff:
            bucket.popleft()

    def check(self, *, email: str, ip_address: str) -> RateLimitDecision:
        """Handle check.

        Args:
            email: Function argument.
            ip_address: Function argument.

        Returns:
            Function result.
        """
        now = time.monotonic()
        identity_key, ip_key = self._keys(email, ip_address)
        with self._lock:
            identity_bucket = self._attempts[identity_key]
            ip_bucket = self._attempts[ip_key]
            self._prune(identity_bucket, now)
            self._prune(ip_bucket, now)

            blocked_bucket: deque[float] | None = None
            if len(identity_bucket) >= self._identity_max_attempts:
                blocked_bucket = identity_bucket
            elif len(ip_bucket) >= self._ip_max_attempts:
                blocked_bucket = ip_bucket

            if blocked_bucket is None:
                return RateLimitDecision(allowed=True)

            retry_after = max(
                1,
                int(self._window_seconds - (now - blocked_bucket[0])) + 1,
            )
            return RateLimitDecision(
                allowed=False,
                retry_after_seconds=retry_after,
            )

    def record_failure(self, *, email: str, ip_address: str) -> None:
        """Handle record failure.

        Args:
            email: Function argument.
            ip_address: Function argument.
        """
        now = time.monotonic()
        identity_key, ip_key = self._keys(email, ip_address)
        with self._lock:
            for key in (identity_key, ip_key):
                bucket = self._attempts[key]
                self._prune(bucket, now)
                bucket.append(now)

    def reset_identity(self, *, email: str) -> None:
        """Handle reset identity.

        Args:
            email: Function argument.
        """
        identity_key = self._digest("identity", email)
        with self._lock:
            self._attempts.pop(identity_key, None)
