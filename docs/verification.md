# Release verification · 0.1.0

Verified locally on 2026-10-18 with Node, a production Vite build and headless
Chrome. No customer messages or exchange orders were sent.

- `npm test`: 33 passing tests covering indicator math, next-open fills, fees,
  slippage, data/import validation and result schemas.
- `npm run build`: passes TypeScript checks and builds the workspace, ES module,
  standalone browser bundle and declarations.
- `npm run test:browser`: 72 passing browser/integration checks (32 existing
  regressions, 18 extended checks and 22 multi-indicator/workspace checks), with no runtime
  page errors. Uses the compiled workspace, real HTTP/SSE bridge, actual stdio
  MCP client/server and browser script sandbox. Chart data is deterministic test
  fixtures; external Binance availability is not covered.
- The browser suite exercises scale modes, price-axis drag, pan/zoom, drawings,
  indicator panes, multiline editing, saved drafts, import errors/retry, worker
  cancellation/timeouts, hostile script outputs, 10,000 candles with 20 plots,
  MCP injection and execution, offline reconnects, streaming snapshots,
  standalone embedding and a narrow mobile viewport.
- The reconnect race regression delays delivery of a real SSE hello message to
  force a stream tick between connection opening and state synchronization.
  It verifies that browser and bridge retain identical candles and results.
- Extended checks exercise every exposed drawing tool and its property editor;
  Madrid's real canvas areas/circles/dotted levels; engulfing's yellow candles
  and recorded alerts; typed, locked and invalid input recovery; editor/agent
  source isolation; parameter/cost retention after streaming; named pane
  alignment under scrollbars; saved layout and full-chart restoration; custom
  tools; MCP documentation/resources/prompts; direct command consistency and
  actual image export. The >4 MB image transport boundary uses a real PNG with
  deterministic random pixels as a fixture, rather than a market-data chart.
- Multi-indicator checks run actual Chrome and stdio MCP against the compiled UI.
  They cover duplicate source/plot names, independent inputs, hiding and removal,
  reloads, offline collection reconciliation, closing during a pending run, editor
  instance isolation, panel collapse, dropdown state, aligned desktop/mobile icons,
  drawing-hover measurements and the standalone multi-indicator API.
- A separate real stdio smoke check starts MCP from a directory without `dist`
  and reads bundled docs/examples, verifying development use before a build.
- `npm audit --omit=dev`: no reported production dependency vulnerabilities at
  verification time.

Claude Code independently reviewed the initial implementation in three read-only
passes and the extended features in two further passes. Confirmed findings were
fixed and covered by regressions, including worker result validation in a
separate realm, future-data access through caller reflection, editor draft
preservation, reconnect ordering, offline state/results, streaming snapshots,
drawing hit tests, timestamp labels, parameter/source isolation, persistent run
options, custom tool names, responsive layouts, pane alignment and command
exports. This is a code review, not a claim
of complete TradingView feature parity.

The multi-indicator changes received three additional read-only Claude reviews.
Confirmed issues were fixed with regressions covering snapshot validation,
per-instance update ordering, disconnected clients, dataset resets during
uploads, deletion races, editor identity for duplicate scripts and stable
returned instance IDs. Streaming updates use dataset generations separately
from per-study revisions, and synchronization sends one changed study per request.

The release includes MIT attribution for the core, MPL-2.0 notices and editable
source for the separately maintained Madrid example, and bundled dependency
license notices. See [CREDITS.md](../CREDITS.md) for source provenance and scope.
The default UI clearly labels generated demo data. Backtests use a documented
single-position, next-open execution model; Pine Script and exchange execution
are outside this release.
