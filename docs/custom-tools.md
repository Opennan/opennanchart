# Custom drawing tools

Apps and MCP agents can define tools from two anchor points and drawing
primitives. Definitions are data, not arbitrary host JavaScript. They work with
the normal drawing selection, move, resize, color, line-width and label editor.
Registered tools appear in the workspace's **Shape tools** pop-out menu.

```js
chart.registerTool({
  id: 'CustomTool:RangeBox',
  name: 'Range box with levels',
  primitives: [
    { type: 'rectangle', from: 0, to: 1, fill: '#7dd3fc12' },
    { type: 'horizontal', from: 0 },
    { type: 'horizontal', from: 1 },
    { type: 'text', from: 0, text: 'Range' },
  ],
});
chart.setTool('CustomTool:RangeBox');
// Click two points on the chart. Use chart.getDrawings() to inspect the result.
```

IDs must start `CustomTool:` followed by 1–48 letters, digits, `_` or `-`.
Names have 1–80 characters. Registering the same ID replaces its definition.
Each chart supports up to 20 custom tools, each with 1–32 primitives. Tools
remain registered until that chart is destroyed; save their definitions in your
host if you want to restore them after a reload.

| Primitive | Anchors | Rendering |
| --- | --- | --- |
| `line` | `from`, `to` | Segment between anchors |
| `rectangle` | `from`, `to` | Bounding rectangle |
| `ellipse` | `from`, `to` | Center at from; horizontal/vertical radii from to |
| `horizontal` | `from` | Full-width level at anchor price |
| `vertical` | `from` | Full-height line at anchor bar |
| `text` | `from` | `text`, or tool name, beside anchor |

Anchor indexes are 0 or 1. `color` overrides a primitive's stroke; omit it so the
normal drawing color editor controls it. `fill` optionally colors rectangles
and ellipses. `text` is limited to 80 characters. Colors cannot contain URLs or
external assets. JS indicators in the worker cannot register tools or access
the host canvas.

## Place drawings programmatically

```js
chart.setDrawings([{
  id: 'range-1', type: 'CustomTool:RangeBox',
  p: [{t: 20, y$: 101}, {t: 35, y$: 108}],
  color: '#7dd3fc', lineWidth: 2, text: 'My range', showPrice: false,
}]);
```

`t` is a fractional **bar index**, not a timestamp; `y$` is a price. Read the
dataset to find the index of a timestamp. `setDrawings` replaces the whole
drawing list (maximum 200). To add one drawing, read the list, append, then set.
Candles use Unix milliseconds, so do not confuse their time unit with drawing
anchors. `setData` clears drawings; incremental candle updates preserve them.

Built-in tool IDs exposed in the toolbar are `Cursor`, `LineTool:Segment`,
`LineTool:HorzLine`, `LineTool:VertLine`, `FibTool:Retracement`,
`ShapeTool:Rectangle`, `ShapeTool:Circle`, `RangeTool:PriceTime`,
`PositionTool:Long`, `PositionTool:Short`. Horizontal/vertical lines need one
click; other exposed tools need two. Position tools synthesize a third anchor
for a 2:1 reward/risk target. They illustrate a position, not an exchange order.

## Through MCP

1. `chart_get_documentation({topic:'tools'})`
2. `chart_control({action:'registerTool', args:definition})`
3. `chart_control({action:'setTool', args:'CustomTool:RangeBox'})` for manual use,
   or `chart_control({action:'setDrawings', args:drawings})` for immediate placement.
4. `chart_control({action:'getDrawings'})` and `chart_export_image({})` to verify.

Custom tools compose the primitives above. Freehand custom JS render callbacks,
arbitrary DOM interaction and new gesture recognizers are not exposed through
MCP. See [mcp.md](mcp.md) for other chart controls.
