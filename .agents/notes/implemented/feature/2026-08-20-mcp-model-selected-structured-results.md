# Agent Note: Model-selected MCP structured results

Status: implemented

English | [中文](2026-08-20-mcp-model-selected-structured-results.zh.md)

## Problem

MCP tool results separate presentation blocks in `content` from machine-readable data in `structuredContent`. The client preserved and validated both, but its Native projection rendered only `content`. Servers that returned a concise status line and placed useful fields solely in `structuredContent` therefore left the model unable to use identifiers, cursors, or details needed for its next decision. Always injecting structured data would fix visibility at the cost of paying its token and retention cost for every call.

## Decision

The MCP client adds a host-only `responseDetail: "summary" | "full"` property to every discovered tool's model-facing input schema. `summary` is the default. The model selects `full` on the same tool call when its current task needs that result's structured data. The client removes the property before `tools/call`, so MCP servers retain their original input schemas and wire arguments. If a server already owns `responseDetail`, the client selects the first free deterministic numeric suffix.

A full response appends formatted `structuredContent` to the definition-owned model projection while the canonical MCP value remains unchanged for validation, Code Mode, and programmatic callers. The projection is execution-local, so it is inherently associated with the call that requested it and requires no result identifier or follow-up tool.

`structuredContentMaxInlineBytes` bounds the added UTF-8 text, with a 16 KiB default. Oversized JSON is saved through optional `ctx.spillStore` when the call has a session owner; the model receives a bounded head/tail preview, locator, and backend retrieval guidance. Without usable spill storage, the preview says that the complete value remains available only to programmatic callers. Storage failure never turns a successful MCP call into an error.

## Alternatives considered

**Always serialize `structuredContent` into model context.** Rejected because summary calls would pay data-dependent token and retention costs even when the model does not need the structured fields.

**Add a separate result-expansion tool keyed by call id.** Rejected because it requires the model to select and correlate a prior call, adds another round trip, and separates the decision from the MCP tool whose result is needed.

**Add a detail parameter to each MCP server.** Rejected as the general solution because it duplicates one presentation policy across servers and changes their wire schemas. Servers may still expose domain-specific pagination or filtering independently.

## Testing

Package tests pin schema augmentation and collision handling, removal of the host-only argument before the wire call, unchanged canonical values, summary behavior, inline full projection, bounded no-store previews, storage-failure fallback, and spill-backed retrieval guidance. Configuration tests pin the default and accepted byte range. The keyless stdio E2E fixture returns a concise `content` status plus schema-validated `structuredContent` and proves that `responseDetail: "full"` exposes both on one real MCP call.

## Consequences

- The model controls structured-result visibility per MCP call without a second tool or correlation identifier.
- Every discovered MCP tool pays a small stable schema cost for the detail enum; structured-result tokens are paid only for `full` calls.
- The behavior is entirely Host-side and applies uniformly to MCP servers connected through this client; servers and other MCP clients are unaffected.
- A model must anticipate that it needs structured data when making the call. Repeating the same read with `full` remains possible when a summary proves insufficient.
