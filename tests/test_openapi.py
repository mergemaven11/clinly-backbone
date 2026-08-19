from __future__ import annotations

from app.main import app

EXPECTED_OPERATIONS = {
    # V1 compatibility surface
    ("/auth/signup-therapist", "post"),
    ("/auth/login", "post"),
    ("/auth/me", "get"),
    ("/auth/create-client", "post"),
    ("/clients", "get"),
    # V2 provider-platform surface
    ("/auth/signup-provider", "post"),
    ("/account/me", "get"),
    ("/auth/create-participant", "post"),
    ("/participants", "get"),
    ("/integrations/catalog", "get"),
    ("/integrations/connections", "get"),
    # Shared relationship platform surface
    ("/conversations", "post"),
    ("/conversations/me", "get"),
    ("/messages", "post"),
    ("/messages", "get"),
    ("/portal/tracks", "post"),
    ("/portal/tracks/me", "get"),
    ("/portal/entries", "post"),
    ("/portal/entries", "get"),
    ("/audit", "get"),
    ("/export", "post"),
    ("/health", "get"),
    ("/ready", "get"),
}

PROTECTED_OPERATIONS = EXPECTED_OPERATIONS - {
    ("/auth/signup-therapist", "post"),
    ("/auth/signup-provider", "post"),
    ("/auth/login", "post"),
    ("/health", "get"),
    ("/ready", "get"),
}


def test_openapi_contains_complete_platform_contract() -> None:
    schema = app.openapi()

    assert schema["info"]["version"] == "1.0.0"
    assert schema["info"]["title"] == "Clinly Backbone"

    actual_operations = {
        (path, method)
        for path, path_item in schema["paths"].items()
        for method in path_item
        if method in {"get", "post", "put", "patch", "delete"}
    }
    assert actual_operations == EXPECTED_OPERATIONS

    bearer = schema["components"]["securitySchemes"]["HTTPBearer"]
    assert bearer["type"] == "http"
    assert bearer["scheme"] == "bearer"

    for path, method in PROTECTED_OPERATIONS:
        operation = schema["paths"][path][method]
        assert operation.get("summary")
        assert {"HTTPBearer": []} in operation.get("security", [])
        assert any(
            not response_code.startswith("2")
            for response_code in operation["responses"]
        )


def test_readiness_documents_dependency_failure() -> None:
    schema = app.openapi()
    assert "503" in schema["paths"]["/ready"]["get"]["responses"]


def test_login_documents_auth_and_throttle_failures() -> None:
    schema = app.openapi()
    responses = schema["paths"]["/auth/login"]["post"]["responses"]
    assert {"401", "403", "422", "429"}.issubset(responses)


def test_provider_integration_surface_is_documented_as_protected() -> None:
    schema = app.openapi()
    for path in ("/integrations/catalog", "/integrations/connections"):
        operation = schema["paths"][path]["get"]
        assert {"HTTPBearer": []} in operation["security"]
        assert {"401", "403"}.issubset(operation["responses"])
