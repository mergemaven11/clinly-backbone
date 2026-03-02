# CONTRIBUTING.md

## Development Setup

``` bash
poetry install
poetry run uvicorn app.main:app --reload
```

## Branching

-   main (protected)
-   feature/`<name>`{=html}
-   fix/`<name>`{=html}

## Pull Request Checklist

-   Tests added
-   No plaintext PHI logged
-   Authorization enforced
-   Audit events implemented
-   Lint passes

Run tests:

``` bash
poetry run pytest
```
