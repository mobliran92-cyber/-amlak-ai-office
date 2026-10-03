# Amlak AI Office — Architecture Contract

## Product direction
Global, AI-first Real Estate OS for property, customers, transactions, investment, construction, design, content and office operations.

## Non-negotiable architecture
`User -> Mission -> Plan -> Tasks -> Agents -> Tools -> Data -> Execution -> Progress -> Approval -> Result -> Audit`

The UI is a stable shell. New capabilities are added as agents/tools/modules behind the shell instead of creating a new navigation page for every capability.

## Core layers
- Identity and RBAC
- Subscription / entitlement
- Mission orchestration
- Durable task queue and workers
- Agent registry
- Tool registry
- Source adapters and provenance
- Normalized domain data
- Search / matching / intelligence
- AI model gateway and AI run telemetry
- Approval gates
- Audit / event / outbox
- Feature flags
- Observability, retries, idempotency and rollback

## Scale
The data model must be able to move from hundreds to millions of users without replacing the mission contract. The current legacy `app_state` store is transitional and must not receive new high-volume domain entities.

## Pro boundary
The Command Center and mission execution are server-side gated. Hiding a button is not an authorization mechanism.

## External sources
Source adapters must use public or explicitly authorized interfaces. No CAPTCHA, login, paywall or technical restriction bypass. Every imported record should retain provenance such as source, source URL/ID, first seen, last seen and deduplication identity.

## AI governance
AI may detect, analyze, plan and propose. Production-impacting changes require an approval gate. AI outputs should be attributable to a model/provider/run and remain auditable.

## Deployment
Render is the current deployment target. Production-scale evolution should replace process-local sessions and the transitional JSON state with shared infrastructure before horizontal scaling.

## Current status
The repository now contains the durable mission schema, Pro entitlement boundary, mission worker, live mission UI, tool/feature governance tables and regression tests. External source adapters and payment-provider integration remain configuration/integration work rather than fabricated functionality.
