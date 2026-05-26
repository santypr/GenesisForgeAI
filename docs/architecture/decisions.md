# Architecture Decisions

## ADR-0001: Idempotent bootstrap workflow
- **Decision:** `init-project` updates generated files without duplicating structure.
- **Reason:** repeatable setup and safe reruns.

## ADR-0002: Markdown-first documentation engine
- **Decision:** all generated docs are markdown in `/docs`.
- **Reason:** portability and reviewability.
