# Opennanchart design system

The user selected https://opennan.com/ as the visual reference on 2026-10-18. Source tokens were inspected in the existing Opennan frontend and checked against the live site.

## Theme

Dark, neutral studio surfaces: page and chart `#0a0c0f`, chrome `#0b0e12`, elevated panels `#14171c`, borders white at 8%. Primary text `#e8e8ea`; secondary text uses a brighter `#a0a6b1` for readability. Use Opennan's ice-blue `#7dd3fc` for focus and active states and white for the primary Run action.

## Typography

Inter-compatible system sans, 12–14px controls and 20px product title. Monospace for code, prices and numeric results. No display typography in working controls.

## Layout

Compact product header; chart toolbar with symbol, interval, indicators and data actions; narrow drawing rail; chart; script editor and results beneath the chart. Collapse secondary controls on narrow screens and allow chart/editor resizing without cropping.

## Icons and identity

Reuse Opennan's circuit arc logo, maintaining its geometry. Tool icons use a consistent 24px viewBox, 1.6–1.8px strokes and 16–18px rendered sizes, with accessible button names. Green/red are reserved for price direction, strategy signals and results.

## States

Show explicit demo vs imported vs Binance data. Run, cancel, script error, unsaved/saved draft, MCP connection and import validation each have labelled states. Avoid decorative animation.
