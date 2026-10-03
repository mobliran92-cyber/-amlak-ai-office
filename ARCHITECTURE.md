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
The data model must be able to move from hundreds to millions of users without replacing the mission contract. The current legacy `app_state` store is transitional and must not receive new high-volume domain entities. Sessions are PostgreSQL-backed so multiple application instances can share authentication state.

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


## Experience architecture
The product has one simple shell with role-aware workspaces:
- Consumer: buy/rent/search/compare/AI advisor.
- Agent: listings, customers, follow-up, marketing, matching and AI office.
- Office: multi-user operations, CRM, contracts, transactions, permissions and reporting.
- Developer/investor: project, construction, design, feasibility and investment intelligence.

The service catalog is separate from navigation. Services can be enabled, disabled, upgraded or retired without rebuilding the shell.

## AI Media Studio
Media is treated as structured property data, not only attachments. Each asset retains metadata and provenance. The studio supports:
- automatic media ordering and labeling;
- virtual-tour composition;
- music, captions, transitions and branding configuration;
- non-destructive edit instructions;
- room/interior/facade design scenarios;
- material choices such as cabinets, floor, wall paint/wallpaper, lighting and furniture;
- future photorealistic image/3D rendering through an explicitly configured provider.

AI renderings must be labeled as AI visualizations and must not be represented as proof of the property's current physical condition.

## Automatic maintenance
The Maintenance Agent continuously checks runtime health, stale missions and schema availability. Safe runtime repairs may run automatically. Source-code changes, dependency upgrades and production-impacting changes remain approval-gated and auditable.
