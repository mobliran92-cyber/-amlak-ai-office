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


## Resilience / offline-first architecture
Connectivity is not a single point of failure. The product is designed in three layers:
1. **Online primary:** shared PostgreSQL, object storage, AI providers, external integrations and normal real-time operation.
2. **Offline application shell:** PWA service worker caches the application shell and previously fetched non-sensitive resources. The UI can open when connectivity is lost.
3. **Local-first operations:** IndexedDB is the client queue/cache boundary. Mutations use idempotency keys and a guarded sync API; only explicitly approved operations may be replayed. File uploads and high-risk actions require a connected provider unless a dedicated local adapter is enabled.

AI is optional for core continuity. Property records, cached files/metadata, CRM workflows and locally supported office operations must remain usable without an AI provider. AI-dependent features degrade to "queued / unavailable" rather than blocking the whole application.

## Payment architecture
Payments are provider-agnostic. There are separate adapter boundaries for:
- global payment provider;
- Iran/local payment provider.

No payment provider is hard-coded into business logic. Checkout, webhook verification, idempotency, subscription activation, refunds and reconciliation must pass through the adapter boundary. Production activation is configuration- and approval-gated. This allows the global and Iran paths to operate independently when international connectivity is unavailable.

## Deployment resilience
The long-term deployment topology is:
- primary global service;
- Iran/local service for local availability and payment;
- shared logical domain model with explicit synchronization contracts;
- local queues/outbox for delayed synchronization;
- conflict/version rules for records edited in both regions.

A true disconnected Iran deployment requires a local database/object-storage/AI-optional stack; it cannot be achieved by a browser cache alone. The current repository contains the PWA/offline foundation and provider boundaries, while the full disconnected local server package remains a production hardening phase.


CI gate: syntax, regression and resilience checks run on main changes.
