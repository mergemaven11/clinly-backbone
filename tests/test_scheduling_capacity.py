"""Document this first-party Python module."""
from datetime import date

from bson import ObjectId

from app.services.scheduling import generate_availability


class _Profiles:
    """Represent Profiles."""
    def find_one(self, *_args, **_kwargs):
        """Handle find one.

        Args:
            _args: Function argument.
            _kwargs: Function argument.

        Returns:
            Function result.
        """
        return {"timezone": "UTC"}


class _Database:
    """Represent Database."""
    provider_profiles = _Profiles()


def test_group_capacity_service_has_no_one_to_one_slots() -> None:
    """Verify group capacity service has no one to one slots."""
    service = {
        "_id": ObjectId(),
        "provider_user_id": ObjectId(),
        "capacity": 8,
        "duration_minutes": 60,
    }
    day = date(2030, 1, 1)

    availability = generate_availability(
        _Database(),  # type: ignore[arg-type]
        service=service,
        date_from=day,
        date_to=day,
    )

    assert availability.slots == []
    assert availability.provider_timezone == "UTC"
