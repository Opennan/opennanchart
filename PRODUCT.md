# Product

## Register

product

## Users

Developers, traders and AI agents building charting tools, custom indicators and reproducible strategy experiments. The owner wants to publish the existing React chart as Opennanchart, with JavaScript and MCP access.

## Product Purpose

Provide a reusable candlestick chart with injected OHLCV data, interactive scales, drawings, JavaScript plots and explicit historical backtest execution rules. A working demo teaches the same API that embedding developers and MCP clients use.

## Brand Personality

Focused, technical, quiet. Use the owner's explicitly selected reference, https://opennan.com/, and its existing product guidelines.

## Anti-references

Avoid the broken BestSignal chart screenshot, overlapping controls, missing candles, ornamental dashboard cards and pretending that the entire TradingView platform has been reproduced.

## Design Principles

1. Keep the chart as the largest surface, with controls in predictable toolbars.
2. Use the original React canvas chart as the renderer, retaining working scale and drawing interactions.
3. Make data origin, script errors and execution assumptions visible.
4. Give JavaScript developers and agents the same operations exposed in the UI.
5. Preserve scripts and settings while iterating, and keep failed runs recoverable.

## Accessibility & Inclusion

Follow Opennan's existing WCAG AA target: visible keyboard focus, readable text on the dark theme, labelled controls, reduced motion and responsive layouts. Canvas drawing interaction remains pointer based; all surrounding controls support keyboard access.
