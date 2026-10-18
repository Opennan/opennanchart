# Release verification · 0.1.0

Verified locally on 2026-10-18 with Node, a production Vite build and headless
Chrome. No customer messages or exchange orders were sent.

- `npm test`: 22 passing tests covering indicator math, next-open fills, fees,
  slippage, data/import validation and result schemas.
- `npm run build`: passes TypeScript checks and builds the workspace, ES module,
  standalone browser bundle and declarations.
- `node tests/browser.mjs`: 32 passing browser/integration checks, with no runtime
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
- `npm audit --omit=dev`: no reported production dependency vulnerabilities at
  verification time.

Claude Code independently reviewed the implementation in three read-only
passes. Confirmed findings were fixed, including worker result validation in a
separate realm, future-data access through caller reflection, editor draft
preservation, reconnect ordering, offline state/results, streaming snapshots,
drawing hit tests and timestamp labels. The final reported reconnect race was
fixed and verified by the regression above. This is a code review, not a claim
of complete TradingView feature parity.

The release includes MIT attribution and bundled dependency license notices.
The default UI clearly labels generated demo data. Backtests use a documented
single-position, next-open execution model; Pine Script and exchange execution
are outside this release.
