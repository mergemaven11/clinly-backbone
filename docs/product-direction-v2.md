# Provider Platform V2 direction

The current repository name and legacy API storage vocabulary remain in place temporarily for backward compatibility. The product layer is moving to a general provider platform that supports many ongoing service relationships rather than a clinical-first workflow.

## Product language

Default presentation terms:

- **Provider**: the business professional delivering a service
- **Person**: a client, customer, member, candidate, patient, student, or other recipient of a service
- **Relationship track**: a configurable shared space for progress, notes, goals, sessions, and check-ins
- **Workspace**: the provider's operating surface

Vertical-specific language belongs in configurable modules and service definitions, not global navigation.

## Brand strategy

The permanent product name has not been selected. Runtime UI uses `APP_DISPLAY_NAME` and `APP_TAGLINE`, passed to the Vite build as `VITE_APP_NAME` and `VITE_APP_TAGLINE`. The neutral local defaults are `Provider Portal` and `One relationship. One connected place.`

Repository, database, container, and legacy token identifiers can be renamed in a later migration after a permanent name/domain is selected.

## V2 capability roadmap

GitHub issue #36 is the V2 epic. Major tracks include provider profiles/services, scheduling, real-time communication, live sessions, forms/resources, billing, integrations, notifications, secure files, discovery/matching, organizations/roles, analytics, reactive UI architecture, shared plans/goals, and privacy/retention controls.

## Integration business model

Integrations are a product surface, not one-off vendor code. The target architecture is a provider-scoped integration catalog with adapters, OAuth/credential handling, sync jobs, webhook processing, health status, and billing entitlements. Integrations may be free, plan-gated, or paid add-ons without changing core relationship logic.
