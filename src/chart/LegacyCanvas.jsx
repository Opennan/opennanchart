// Adapted from the user's original TradingReact canvas demo.
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// === SVG ICONS ===
const SvgIcons = {
    // Cursor
    cursor: (color) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><path d="M4 4l7 17 2.5-6.5L20 12 4 4z"/><path d="M13.5 13.5L19 19"/></svg>`,
    crosshair: (color) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><circle cx="12" cy="12" r="8"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>`,

    // Lines
    segment: (color) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><line x1="5" y1="19" x2="19" y2="5"/><circle cx="5" cy="19" r="2" fill="${color}"/><circle cx="19" cy="5" r="2" fill="${color}"/></svg>`,
    extended: (color) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><line x1="2" y1="22" x2="22" y2="2"/><circle cx="8" cy="16" r="2" fill="${color}"/><circle cx="16" cy="8" r="2" fill="${color}"/></svg>`,
    ray: (color) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><line x1="5" y1="19" x2="22" y2="2"/><circle cx="5" cy="19" r="2" fill="${color}"/></svg>`,
    horzLine: (color) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><line x1="2" y1="12" x2="22" y2="12"/><circle cx="12" cy="12" r="2" fill="${color}"/></svg>`,
    vertLine: (color) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><line x1="12" y1="2" x2="12" y2="22"/><circle cx="12" cy="12" r="2" fill="${color}"/></svg>`,
    crossLine: (color) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/></svg>`,
    trendLine: (color) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><line x1="4" y1="18" x2="20" y2="6"/><circle cx="4" cy="18" r="2" fill="${color}"/><circle cx="20" cy="6" r="2" fill="${color}"/><path d="M16 6h4v4" fill="none"/></svg>`,
    arrow: (color) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><line x1="5" y1="19" x2="19" y2="5"/><path d="M12 5h7v7" fill="none"/></svg>`,

    // Channels
    parallelChannel: (color) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><line x1="3" y1="17" x2="21" y2="7"/><line x1="3" y1="21" x2="21" y2="11"/><line x1="3" y1="17" x2="3" y2="21" stroke-dasharray="2,2"/></svg>`,

    // Fibonacci
    fibRetrace: (color) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><line x1="4" y1="4" x2="20" y2="4"/><line x1="4" y1="9" x2="20" y2="9" opacity="0.7"/><line x1="4" y1="14" x2="20" y2="14" opacity="0.5"/><line x1="4" y1="20" x2="20" y2="20"/><text x="2" y="5" font-size="4" fill="${color}">0</text><text x="2" y="21" font-size="4" fill="${color}">1</text></svg>`,
    fibExtend: (color) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><line x1="4" y1="20" x2="20" y2="20"/><line x1="4" y1="14" x2="20" y2="14" opacity="0.7"/><line x1="4" y1="8" x2="20" y2="8" opacity="0.5"/><line x1="4" y1="2" x2="20" y2="2" stroke-dasharray="2,2"/><path d="M12 20v-18" stroke-dasharray="2,2" opacity="0.3"/></svg>`,

    // Shapes
    rectangle: (color) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><rect x="4" y="6" width="16" height="12" rx="1"/></svg>`,
    circle: (color) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><circle cx="12" cy="12" r="9"/></svg>`,
    ellipse: (color) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><ellipse cx="12" cy="12" rx="10" ry="6"/></svg>`,
    triangle: (color) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><path d="M12 4L21 20H3L12 4z"/></svg>`,
    arc: (color) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><path d="M4 18 Q12 2 20 18"/><circle cx="4" cy="18" r="2" fill="${color}"/><circle cx="20" cy="18" r="2" fill="${color}"/></svg>`,

    // Measure
    priceRange: (color) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><line x1="3" y1="8" x2="21" y2="8"/><line x1="3" y1="16" x2="21" y2="16"/><path d="M12 8v8" stroke-dasharray="2,2"/><path d="M9 11l3-3 3 3M9 13l3 3 3-3" fill="none"/></svg>`,
    timeRange: (color) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><line x1="8" y1="3" x2="8" y2="21"/><line x1="16" y1="3" x2="16" y2="21"/><path d="M8 12h8" stroke-dasharray="2,2"/><path d="M11 9l-3 3 3 3M13 9l3 3-3 3" fill="none"/></svg>`,
    priceTime: (color) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><rect x="5" y="5" width="14" height="14" rx="1"/><circle cx="5" cy="5" r="2" fill="${color}"/><circle cx="19" cy="5" r="2" fill="${color}"/><circle cx="5" cy="19" r="2" fill="${color}"/><circle cx="19" cy="19" r="2" fill="${color}"/></svg>`,

    // Text & Annotations
    text: (color) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><path d="M6 4h12M12 4v16"/><path d="M8 20h8"/></svg>`,
    note: (color) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><rect x="4" y="4" width="16" height="16" rx="2"/><line x1="8" y1="9" x2="16" y2="9"/><line x1="8" y1="13" x2="14" y2="13"/></svg>`,
    callout: (color) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><path d="M4 4h16v12H10l-4 4v-4H4V4z"/><line x1="8" y1="8" x2="16" y2="8"/><line x1="8" y1="12" x2="12" y2="12"/></svg>`,
    priceLabel: (color) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><rect x="4" y="8" width="12" height="8" rx="1"/><path d="M16 12h4"/><circle cx="21" cy="12" r="1.5" fill="${color}"/></svg>`,
    flag: (color) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><path d="M5 4v16"/><path d="M5 4h12l-3 4 3 4H5"/></svg>`,

    // Position
    longPos: (color) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><rect x="4" y="8" width="16" height="12" rx="1" fill="rgba(76,175,80,0.2)" stroke="#4caf50"/><path d="M12 6V2M9 4l3-2 3 2" stroke="#4caf50"/></svg>`,
    shortPos: (color) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><rect x="4" y="4" width="16" height="12" rx="1" fill="rgba(244,67,54,0.2)" stroke="#f44336"/><path d="M12 18v4M9 20l3 2 3-2" stroke="#f44336"/></svg>`,

    // Brushes
    brush: (color) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><path d="M18 4l2 2-12 12H4v-4L16 2l2 2z"/><path d="M14 6l4 4"/></svg>`,
    highlighter: (color) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><path d="M15 3l6 6-10 10H5v-6L15 3z"/><path d="M5 21h14" stroke-dasharray="3,3"/></svg>`,

    // Patterns
    headShoulders: (color) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><path d="M2 16l4-4 3 2 3-8 3 8 3-2 4 4"/></svg>`,
    elliottWave: (color) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><path d="M2 18l3-6 2 3 4-10 3 8 2-4 4 9"/><text x="4" y="14" font-size="4" fill="${color}">1</text><text x="11" y="6" font-size="4" fill="${color}">3</text><text x="19" y="12" font-size="4" fill="${color}">5</text></svg>`,

    // Gann
    gannFan: (color) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><path d="M4 20L20 4M4 20l16-8M4 20l16-12M4 20h16" opacity="0.7"/><circle cx="4" cy="20" r="2" fill="${color}"/></svg>`,
    gannBox: (color) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><rect x="4" y="4" width="16" height="16"/><line x1="4" y1="4" x2="20" y2="20"/><line x1="4" y1="20" x2="20" y2="4"/><line x1="12" y1="4" x2="12" y2="20"/><line x1="4" y1="12" x2="20" y2="12"/></svg>`,

    // Projection
    projection: (color) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><path d="M4 18l6-8 4 4 6-10"/><path d="M16 4h4v4"/><circle cx="4" cy="18" r="2" fill="${color}"/><path d="M10 10l4 4" stroke-dasharray="2,2" opacity="0.5"/></svg>`,
    fibTimeZone: (color) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><line x1="4" y1="4" x2="4" y2="20"/><line x1="8" y1="4" x2="8" y2="20" opacity="0.8"/><line x1="13" y1="4" x2="13" y2="20" opacity="0.6"/><line x1="20" y1="4" x2="20" y2="20" opacity="0.4"/></svg>`,
    fibCircle: (color) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="6" opacity="0.7"/><circle cx="12" cy="12" r="9" opacity="0.4"/></svg>`,
    fibSpiral: (color) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><path d="M12 12 Q16 12 16 8 Q16 4 12 4 Q6 4 6 10 Q6 18 14 18 Q22 18 22 10"/></svg>`,
    fibWedge: (color) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><path d="M4 20l8-16 8 16"/><line x1="6" y1="16" x2="18" y2="16" opacity="0.6"/><line x1="8" y1="12" x2="16" y2="12" opacity="0.4"/></svg>`,
    fibChannel: (color) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><line x1="4" y1="18" x2="20" y2="6"/><line x1="4" y1="14" x2="20" y2="2" opacity="0.6"/><line x1="4" y1="22" x2="20" y2="10" opacity="0.6"/></svg>`,
    trendFib: (color) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><path d="M4 18l8-8 8 4"/><line x1="4" y1="18" x2="20" y2="14" stroke-dasharray="2,2" opacity="0.5"/><circle cx="4" cy="18" r="2" fill="${color}"/><circle cx="12" cy="10" r="2" fill="${color}"/><circle cx="20" cy="14" r="2" fill="${color}"/></svg>`,

    // Other
    magnet: (color) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><path d="M4 8c0-4.4 3.6-6 8-6s8 1.6 8 6"/><path d="M4 8v4h4V8M16 8v4h4V8"/><path d="M8 12v6c0 2 2 4 4 4s4-2 4-4v-6"/></svg>`,
    lock: (color) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/></svg>`,
    trash: (color) => `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2"><path d="M4 6h16M10 6V4h4v2M6 6v14h12V6"/><line x1="10" y1="10" x2="10" y2="16"/><line x1="14" y1="10" x2="14" y2="16"/></svg>`
};

const TOOLS = [
    { type: 'Cursor', iconKey: 'cursor', hint: 'Cursor' },
    { type: 'Crosshair', iconKey: 'crosshair', hint: 'Crosshair' },

    // Lines group
    { type: 'LineTool:Segment', iconKey: 'segment', group: 'Lines', hint: 'Line Segment' },
    { type: 'LineTool:Extended', iconKey: 'extended', group: 'Lines', hint: 'Extended Line' },
    { type: 'LineTool:Ray', iconKey: 'ray', group: 'Lines', hint: 'Ray' },
    { type: 'LineTool:Arrow', iconKey: 'arrow', group: 'Lines', hint: 'Arrow' },
    { type: 'LineTool:HorzLine', iconKey: 'horzLine', group: 'Lines', hint: 'Horizontal Line' },
    { type: 'LineTool:VertLine', iconKey: 'vertLine', group: 'Lines', hint: 'Vertical Line' },
    { type: 'LineTool:CrossLine', iconKey: 'crossLine', group: 'Lines', hint: 'Cross Line' },

    // Fibonacci group
    { type: 'FibTool:Retracement', iconKey: 'fibRetrace', group: 'Fib', hint: 'Fib Retracement' },
    { type: 'FibTool:Extension', iconKey: 'fibExtend', group: 'Fib', hint: 'Fib Extension' },

    // Shapes group
    { type: 'ShapeTool:Rectangle', iconKey: 'rectangle', group: 'Shapes', hint: 'Rectangle' },
    { type: 'ShapeTool:Circle', iconKey: 'circle', group: 'Shapes', hint: 'Circle' },
    { type: 'ShapeTool:Ellipse', iconKey: 'ellipse', group: 'Shapes', hint: 'Ellipse' },
    { type: 'ShapeTool:Triangle', iconKey: 'triangle', group: 'Shapes', hint: 'Triangle' },
    { type: 'ShapeTool:Arc', iconKey: 'arc', group: 'Shapes', hint: 'Arc' },

    // Measure group
    { type: 'RangeTool:Price', iconKey: 'priceRange', group: 'Measure', hint: 'Price Range' },
    { type: 'RangeTool:Time', iconKey: 'timeRange', group: 'Measure', hint: 'Time Range' },
    { type: 'RangeTool:PriceTime', iconKey: 'priceTime', group: 'Measure', hint: 'Price & Time' },

    // Text & Annotation group
    { type: 'TextTool:Text', iconKey: 'text', group: 'Text', hint: 'Text' },
    { type: 'TextTool:Note', iconKey: 'note', group: 'Text', hint: 'Note' },
    { type: 'TextTool:Callout', iconKey: 'callout', group: 'Text', hint: 'Callout' },
    { type: 'TextTool:PriceLabel', iconKey: 'priceLabel', group: 'Text', hint: 'Price Label' },

    // Position group
    { type: 'PositionTool:Long', iconKey: 'longPos', group: 'Position', hint: 'Long Position' },
    { type: 'PositionTool:Short', iconKey: 'shortPos', group: 'Position', hint: 'Short Position' },

    // Patterns group
    { type: 'PatternTool:HeadShoulders', iconKey: 'headShoulders', group: 'Patterns', hint: 'Head & Shoulders' },
    { type: 'PatternTool:Elliott', iconKey: 'elliottWave', group: 'Patterns', hint: 'Elliott Wave' },

    // Gann group
    { type: 'GannTool:Fan', iconKey: 'gannFan', group: 'Gann', hint: 'Gann Fan' },
    { type: 'GannTool:Box', iconKey: 'gannBox', group: 'Gann', hint: 'Gann Box' },

    // Projection group
    { type: 'ProjectionTool:Projection', iconKey: 'projection', group: 'Projection', hint: 'Projection' },
    { type: 'ProjectionTool:TrendFib', iconKey: 'trendFib', group: 'Projection', hint: 'Trend-Based Fib' },
    { type: 'ProjectionTool:FibTimeZone', iconKey: 'fibTimeZone', group: 'Projection', hint: 'Fib Time Zone' },
    { type: 'ProjectionTool:FibCircle', iconKey: 'fibCircle', group: 'Projection', hint: 'Fib Circle' },
    { type: 'ProjectionTool:FibSpiral', iconKey: 'fibSpiral', group: 'Projection', hint: 'Fib Spiral' },
    { type: 'ProjectionTool:FibWedge', iconKey: 'fibWedge', group: 'Projection', hint: 'Fib Wedge' },
    { type: 'ProjectionTool:FibChannel', iconKey: 'fibChannel', group: 'Projection', hint: 'Fib Channel' },

    // Brush
    { type: 'BrushTool:Brush', iconKey: 'brush', group: 'Brush', hint: 'Brush' },
    { type: 'BrushTool:Highlighter', iconKey: 'highlighter', group: 'Brush', hint: 'Highlighter' }
];

const COLORS = ['#7dd3fc', '#ff5252', '#4caf50', '#ff9800', '#9c27b0', '#00bcd4', '#ffeb3b', '#ffffff'];
const LINE_WIDTHS = [1, 2, 3, 4, 5];

// Store toolbox position globally so it persists
let savedToolboxPos = { x: 12, y: 10 };

// === DRAWING TOOLBOX ===
function DrawingToolbox({ drawing, onUpdate, onDelete, onClose, chartRight }) {
    if (!drawing) return null;

    const [showColorPicker, setShowColorPicker] = useState(false);
    const [showTextInput, setShowTextInput] = useState(false);
    const [textValue, setTextValue] = useState(drawing.text || '');
    const [pos, setPos] = useState(savedToolboxPos); // Use saved position
    const [dragging, setDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const boxRef = useRef(null);
    useEffect(() => {setTextValue(drawing.text || '');}, [drawing.id, drawing.text]);
    useEffect(() => {
        const box=boxRef.current,parent=box?.parentElement;if(!box||!parent)return;
        const clamp=()=>setPos(previous=>{const x=Math.max(8,Math.min(previous.x,parent.clientWidth-box.offsetWidth-8)),y=Math.max(8,Math.min(previous.y,parent.clientHeight-box.offsetHeight-8));return previous.x===x&&previous.y===y?previous:{x,y};});
        const ro=new ResizeObserver(clamp);ro.observe(parent);ro.observe(box);clamp();return()=>ro.disconnect();
    }, []);

    const handleMouseDown = (e) => {
        if (e.target.closest('button, select, input')) return;
        e.preventDefault();
        setDragging(true);
        const rect = boxRef.current?.parentElement?.getBoundingClientRect();
        const startX = e.clientX - (rect?.left || 0) - pos.x;
        const startY = e.clientY - (rect?.top || 0) - pos.y;
        setDragOffset({ x: startX, y: startY });
    };

    useEffect(() => {
        if (!dragging) return;
        const handleMouseMove = (e) => {
            const parent = boxRef.current?.parentElement;
            const box = boxRef.current;
            if (!parent || !box) return;

            const parentRect = parent.getBoundingClientRect();
            const boxRect = box.getBoundingClientRect();

            const newX = e.clientX - parentRect.left - dragOffset.x;
            const newY = e.clientY - parentRect.top - dragOffset.y;

            // Constrain within chart bounds
            const maxX = parentRect.width - boxRect.width;
            const maxY = parentRect.height - boxRect.height;

            const newPos = {
                x: Math.max(0, Math.min(newX, maxX)),
                y: Math.max(0, Math.min(newY, maxY))
            };
            setPos(newPos);
            savedToolboxPos = newPos; // Remember position
        };
        const handleMouseUp = () => setDragging(false);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [dragging, dragOffset]);

    const handleColorChange = (color) => {
        onUpdate({ ...drawing, color });
        setShowColorPicker(false);
    };

    const handleWidthChange = (lineWidth) => {
        onUpdate({ ...drawing, lineWidth });
    };

    const handleTextSave = () => {
        onUpdate({ ...drawing, text: textValue });
        setShowTextInput(false);
    };

    const handleShowPrice = () => {
        onUpdate({ ...drawing, showPrice: !drawing.showPrice });
    };

    const boxStyle = {
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        background: '#14191f',
        border: '1px solid #4a4e59',
        borderRadius: '6px',
        padding: '8px',
        display: 'flex',
        flexWrap: 'wrap',
        maxWidth: 'calc(100% - 16px)',
        gap: '6px',
        alignItems: 'center',
        zIndex: 200,
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        cursor: dragging ? 'grabbing' : 'grab',
        userSelect: 'none'
    };

    const btnStyle = {
        background: '#19212b',
        border: 'none',
        borderRadius: '4px',
        padding: '6px 10px',
        cursor: 'pointer',
        color: '#b2b5be',
        fontSize: '12px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px'
    };

    return (
        <div ref={boxRef} style={boxStyle} onMouseDown={handleMouseDown}>
            {/* Drag handle indicator */}
            <div style={{
                width: 4, height: 20, background: '#354052', borderRadius: 2, marginRight: 4,
                display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2
            }}>
                <div style={{ width: 4, height: 2, background: '#6a6e79', borderRadius: 1 }}/>
                <div style={{ width: 4, height: 2, background: '#6a6e79', borderRadius: 1 }}/>
                <div style={{ width: 4, height: 2, background: '#6a6e79', borderRadius: 1 }}/>
            </div>
            {/* Color button */}
            <div style={{ position: 'relative' }}>
                <button style={btnStyle} onClick={() => setShowColorPicker(!showColorPicker)} title="Color">
                    <div style={{ width: 16, height: 16, background: drawing.color || '#7dd3fc', borderRadius: 3 }} />
                </button>
                {showColorPicker && (
                    <div style={{ position: 'absolute', top: 36, left: 0, background: '#14191f', border: '1px solid #4a4e59', borderRadius: 4, padding: 6, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 4, zIndex: 201 }}>
                        {COLORS.map(c => (
                            <div key={c} onClick={() => handleColorChange(c)} style={{ width: 20, height: 20, background: c, borderRadius: 3, cursor: 'pointer', border: drawing.color === c ? '2px solid #fff' : 'none' }} />
                        ))}
                    </div>
                )}
            </div>

            {/* Line width */}
            <select
                value={drawing.lineWidth || 2}
                onChange={e => handleWidthChange(Number(e.target.value))}
                style={{ ...btnStyle, padding: '4px 8px' }}
                title="Line Width"
            >
                {LINE_WIDTHS.map(w => (
                    <option key={w} value={w}>{w}px</option>
                ))}
            </select>

            {/* Show price toggle */}
            <button
                style={{ ...btnStyle, background: drawing.showPrice ? '#4caf50' : '#19212b' }}
                onClick={handleShowPrice}
                title="Show Price"
            >
                $
            </button>

            {/* Text button */}
            <div style={{ position: 'relative' }}>
                <button style={btnStyle} onClick={() => setShowTextInput(!showTextInput)} title="Add Text">
                    T
                </button>
                {showTextInput && (
                    <div style={{ position: 'absolute', top: 36, left: -60, background: '#14191f', border: '1px solid #4a4e59', borderRadius: 4, padding: 8, zIndex: 201, width: 150 }}>
                        <input
                            type="text"
                            value={textValue}
                            onChange={e => setTextValue(e.target.value)}
                            placeholder="Enter text..."
                            style={{ width: '100%', padding: '4px 8px', border: '1px solid #4a4e59', borderRadius: 3, background: '#1e222d', color: '#fff', marginBottom: 6 }}
                            autoFocus
                        />
                        <button onClick={handleTextSave} style={{ ...btnStyle, width: '100%', justifyContent: 'center' }}>Save</button>
                    </div>
                )}
            </div>

            {/* Delete button */}
            <button style={{ ...btnStyle, color: '#ff5252' }} onClick={onDelete} title="Delete">
                ✕
            </button>
        </div>
    );
}

// === TOOLBAR ===
function Toolbar({ tools, currentTool, height, colors, onSelect }) {
    const [expanded, setExpanded] = useState(null);
    const [subMap, setSubMap] = useState({});
    const [hovered, setHovered] = useState(null);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0 });
    const buttonRefs = useRef({});

    const groups = useMemo(() => {
        const arr = [];
        tools.forEach(t => {
            if (!t.group) { arr.push(t); return; }
            const g = arr.find(x => x.group === t.group);
            if (!g) arr.push({ group: t.group, iconKey: t.iconKey, hint: t.hint, items: [t] });
            else g.items.push(t);
        });
        return arr;
    }, [tools]);

    const handleClick = (g, e) => {
        if (g.items) {
            // Click on icon = select the remembered tool (or first)
            const subType = g.group ? subMap[g.group] : null;
            const item = g.items.find(x => x.type === subType) || g.items[0];
            onSelect(item.type);
            if (!subMap[g.group]) {
                setSubMap(p => ({ ...p, [g.group]: item.type }));
            }
            setExpanded(null); // Close any open dropdown
        } else {
            onSelect(g.type);
            setExpanded(null);
        }
    };

    const handleArrowClick = (g, e) => {
        e.stopPropagation();
        // Arrow click = toggle dropdown
        if (expanded === g.group) {
            setExpanded(null);
        } else {
            // Calculate position from button
            const btn = buttonRefs.current[g.group];
            if (btn) {
                const rect = btn.getBoundingClientRect();
                setDropdownPos({ top: rect.top, left: rect.right + 4 });
            }
            setExpanded(g.group);
        }
    };

    const handleSubClick = (item, group) => {
        onSelect(item.type);
        setSubMap(p => ({ ...p, [group]: item.type }));
        setExpanded(null);
    };

    const isSelected = (g) => g.items ? g.items.some(x => x.type === currentTool) : g.type === currentTool;

    const getIconKey = (g) => {
        if (g.items && subMap[g.group]) {
            const s = g.items.find(x => x.type === subMap[g.group]);
            return s?.iconKey || g.iconKey;
        }
        return g.iconKey;
    };

    const getHint = (g) => {
        if (g.items && subMap[g.group]) {
            const s = g.items.find(x => x.type === subMap[g.group]);
            return s?.hint || g.hint || g.group;
        }
        return g.hint || g.group;
    };

    const renderIcon = (iconKey, isActive, size = 20) => {
        const color = isActive ? '#7dd3fc' : '#787b86';
        const svg = SvgIcons[iconKey]?.(color) || '';
        return (
            <div
                style={{ width: size, height: size, flexShrink: 0 }}
                dangerouslySetInnerHTML={{ __html: svg }}
            />
        );
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = () => setExpanded(null);
        if (expanded) {
            document.addEventListener('click', handleClickOutside);
            return () => document.removeEventListener('click', handleClickOutside);
        }
    }, [expanded]);

    return (
        <div style={{
            position: 'absolute',
            width: 48,
            height: height - 3,
            background: colors.back,
            borderRight: `1px solid ${colors.grid}`,
            zIndex: 101,
            paddingTop: 6,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
        }}>
            {groups.map((g, i) => {
                const sel = isSelected(g);
                const isHov = hovered === i;
                const iconKey = getIconKey(g);
                const isExpanded = expanded === g.group;

                return (
                    <div
                        key={i}
                        ref={el => { if (g.group) buttonRefs.current[g.group] = el; }}
                        style={{
                            width: 38,
                            height: 38,
                            marginBottom: 2,
                            borderRadius: 4,
                            position: 'relative',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: sel ? 'rgba(41, 98, 255, 0.12)' : (isHov ? 'rgba(255, 255, 255, 0.06)' : 'transparent'),
                            transition: 'background 0.1s ease'
                        }}
                        onClick={(e) => { e.stopPropagation(); handleClick(g, e); }}
                        onMouseEnter={() => setHovered(i)}
                        onMouseLeave={() => setHovered(null)}
                    >
                        {renderIcon(iconKey, sel, 20)}

                        {/* Expand arrow - right edge, only visible on hover with active area */}
                        {g.items && isHov && (
                            <div
                                onClick={(e) => handleArrowClick(g, e)}
                                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.15)'}
                                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                                style={{
                                    position: 'absolute',
                                    right: 0,
                                    top: 2,
                                    bottom: 2,
                                    width: 12,
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    background: 'rgba(255,255,255,0.08)',
                                    borderRadius: 2
                                }}
                                title="More tools"
                            >
                                <svg width="4" height="7" viewBox="0 0 4 7" fill={sel ? '#7dd3fc' : '#9598a1'}>
                                    <path d="M0 0l4 3.5-4 3.5V0z"/>
                                </svg>
                            </div>
                        )}

                        {/* Tooltip on hover (when not expanded) */}
                        {isHov && !isExpanded && (
                            <div style={{
                                position: 'absolute',
                                left: 46,
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: '#19212b',
                                color: '#d1d4dc',
                                padding: '6px 10px',
                                borderRadius: 4,
                                fontSize: 12,
                                whiteSpace: 'nowrap',
                                zIndex: 103,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                            }}>
                                {getHint(g)}
                            </div>
                        )}

                    </div>
                );
            })}

            {/* Fixed position dropdown - rendered outside toolbar flow */}
            {expanded && (() => {
                const g = groups.find(x => x.group === expanded);
                if (!g || !g.items) return null;
                return (
                    <div
                        style={{
                            position: 'fixed',
                            top: dropdownPos.top,
                            left: dropdownPos.left,
                            background: '#1e222d',
                            border: '1px solid #363a45',
                            borderRadius: 6,
                            padding: '4px 0',
                            zIndex: 9999,
                            boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                            minWidth: 180
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Group header */}
                        <div style={{
                            padding: '6px 12px 8px',
                            fontSize: 11,
                            color: '#787b86',
                            borderBottom: '1px solid #363a45',
                            marginBottom: 4,
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}>
                            {g.group}
                        </div>

                        {g.items.map((item, j) => {
                            const itemSel = item.type === currentTool;
                            return (
                                <div
                                    key={j}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 10,
                                        padding: '8px 12px',
                                        cursor: 'pointer',
                                        background: itemSel ? 'rgba(41, 98, 255, 0.15)' : 'transparent',
                                        borderLeft: itemSel ? '2px solid #2962ff' : '2px solid transparent',
                                        transition: 'background 0.1s ease'
                                    }}
                                    onClick={() => handleSubClick(item, g.group)}
                                    onMouseEnter={e => e.currentTarget.style.background = itemSel ? 'rgba(41, 98, 255, 0.2)' : 'rgba(255,255,255,0.05)'}
                                    onMouseLeave={e => e.currentTarget.style.background = itemSel ? 'rgba(41, 98, 255, 0.15)' : 'transparent'}
                                >
                                    {renderIcon(item.iconKey, itemSel, 18)}
                                    <span style={{
                                        color: itemSel ? '#7dd3fc' : '#d1d4dc',
                                        fontSize: 13,
                                        fontWeight: itemSel ? 500 : 400
                                    }}>
                                        {item.hint}
                                    </span>
                                    {itemSel && (
                                        <span style={{ marginLeft: 'auto', color: '#7dd3fc', fontSize: 14 }}>✓</span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                );
            })()}
        </div>
    );
}

// === CHART ===
function Chart({ data, width, height, colors, tool = 'Cursor', onToolChange, onDrawUpdate, controlsRef, plots = [], markers = [], scaleMode = 'linear', chartStyle = 'candles', onViewChange, onHover, onDrawingsChange, dataVersion = 0 }) {
    const canvasRef = useRef(null);
    const containerRef = useRef(null);
    const [drawings, setDrawings] = useState([]);
    const [wipDrawing, setWipDrawing] = useState(null);
    const [selectedId, setSelectedId] = useState(null);
    const [cursor, setCursor] = useState({ x: 0, y: 0, t: 0, y$: 0, visible: false });
    const [viewRange, setViewRange] = useState({ start: 0, end: 100 });
    const [yTransform, setYTransform] = useState({ zoom: 1.0, auto: true, offset: 0 });
    const [drag, setDrag] = useState({ type: null });
    const idRef = useRef(0);
    const previousLength = useRef(0);

    const ohlcv = data || [];
    const barSpacing = useMemo(() => {
        const gaps=[];for(let i=Math.max(1,ohlcv.length-200);i<ohlcv.length;i++){const gap=ohlcv[i][0]-ohlcv[i-1][0];if(gap>0)gaps.push(gap);}gaps.sort((a,b)=>a-b);return gaps[Math.floor(gaps.length/2)] || 3600000;
    }, [ohlcv]);
    const HANDLE_R = 6;
    const SIDEBAR_W = 70;

    const selectedDrawing = drawings.find(d => d.id === selectedId);

    const handleUpdateDrawing = (updated) => {
        setDrawings(prev => prev.map(d => d.id === updated.id ? updated : d));
    };

    const handleDeleteDrawing = () => {
        setDrawings(prev => prev.filter(d => d.id !== selectedId));
        setSelectedId(null);
    };

    useEffect(() => {
        if (ohlcv.length > 0) setViewRange({ start: Math.max(0, ohlcv.length - 130), end: ohlcv.length + 12 });
        setYTransform({ zoom: 1, auto: true, offset: 0 });
        setDrawings([]); setSelectedId(null); setWipDrawing(null);
        previousLength.current = ohlcv.length;
    }, [dataVersion]);

    useEffect(() => {
        const previous = previousLength.current;
        if (previous && ohlcv.length > previous) setViewRange(r => r.end >= previous ? { start: r.start + ohlcv.length - previous, end: r.end + ohlcv.length - previous } : r);
        previousLength.current = ohlcv.length;
    }, [ohlcv.length]);

    useEffect(() => { onViewChange?.(viewRange); }, [viewRange, onViewChange]);
    useEffect(() => { onDrawingsChange?.(drawings); }, [drawings, onDrawingsChange]);

    useEffect(() => {
        if (!controlsRef) return;
        controlsRef.current = {
            fitContent: () => { setViewRange({ start: 0, end: Math.max(2, ohlcv.length + 3) }); setYTransform({ zoom: 1, auto: true, offset: 0 }); },
            resetScale: () => setYTransform({ zoom: 1, auto: true, offset: 0 }),
            getVisibleRange: () => ({ ...viewRange }),
            setVisibleRange: r => { if (!Number.isFinite(r.start) || !Number.isFinite(r.end) || r.end <= r.start) throw new Error('Invalid chart range.');const span=r.end-r.start,start=Math.max(0,Math.min(ohlcv.length-1,r.start));setViewRange({start,end:start+span}); },
            zoom: factor => setViewRange(r => { const span = Math.max(8, Math.min(ohlcv.length + 20, (r.end - r.start) * factor)),start=Math.max(0,Math.min(ohlcv.length-1,r.end-span));return {start,end:start+span}; }),
            getDrawings: () => structuredClone(drawings),
            setDrawings: items => {setDrawings(structuredClone(items));setSelectedId(null);},
            clearDrawings: () => {setDrawings([]);setSelectedId(null);},
            exportImage: () => canvasRef.current?.toDataURL('image/png'),
        };
        return () => { controlsRef.current = null; };
    }, [controlsRef, ohlcv.length, viewRange, drawings]);

    useEffect(() => { onDrawUpdate?.(drawings.length, selectedId, yTransform); }, [drawings.length, selectedId, yTransform]);

    useEffect(() => {
        if (wipDrawing) setWipDrawing(null);
    }, [tool]);

    useEffect(() => {
        const onKey = (e) => {
            if (e.target.closest?.('input, textarea, select, [contenteditable="true"]') || !containerRef.current?.contains(document.activeElement)) return;
            if (e.key === 'Escape') {
                if (wipDrawing) setWipDrawing(null);
                else setSelectedId(null);
            }
            if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
                e.preventDefault();
                setDrawings(p => p.filter(d => d.id !== selectedId));
                setSelectedId(null);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [wipDrawing, selectedId]);

    const getLayout = useCallback(() => {
        const sbW = SIDEBAR_W, bbH = 30;
        const cW = width - sbW, cH = height - bbH;
        const s = Math.max(0, Math.floor(viewRange.start));
        const e = Math.min(ohlcv.length, Math.ceil(viewRange.end));
        const vis = ohlcv.slice(s, e);
        if (!vis.length) return null;

        // Use full range span for candle width calculation (including empty space on right)
        const rangeSpan = viewRange.end - viewRange.start;

        // Calculate base price range
        let baseHi = -Infinity, baseLo = Infinity;
        vis.forEach(c => { baseHi = Math.max(baseHi, c[2]); baseLo = Math.min(baseLo, c[3]); });
        for (const plot of plots) if (plot.pane === 'price') for (const point of plot.values) if (point.index >= s && point.index < e && Number.isFinite(point.value) && (scaleMode !== 'log' || point.value > 0)) { baseHi = Math.max(baseHi, point.value); baseLo = Math.min(baseLo, point.value); }
        const basePad = Math.max((baseHi - baseLo) * 0.08, Math.abs(baseHi) * 0.001, 0.000001);
        baseHi += basePad; baseLo -= basePad;
        if (scaleMode === 'log') baseLo = Math.max(baseLo, Math.min(...vis.map(c => c[3])) * 0.5);

        // Apply y-axis zoom transform
        let hi = baseHi, lo = baseLo;
        if (!yTransform.auto) {
            const mid = (baseHi + baseLo) / 2;
            const range = (baseHi - baseLo) / yTransform.zoom;
            hi = mid + range / 2 + yTransform.offset;
            lo = mid - range / 2 + yTransform.offset;
        }

        if (scaleMode === 'log') lo = Math.max(lo, baseLo * 0.01);
        const reference = ohlcv[0]?.[4] || 1;
        const top = scaleMode === 'log' ? Math.log(hi) : hi;
        const bottom = scaleMode === 'log' ? Math.log(lo) : lo;
        return {
            cW, cH, vis, s, hi, lo, baseHi, baseLo,
            cW2: cW / rangeSpan, // Use range span, not vis.length
            s2t: x => viewRange.start + (x / cW) * rangeSpan,
            s2$: y => scaleMode === 'log' ? Math.exp(top - y / cH * (top - bottom)) : hi - (y / cH) * (hi - lo),
            t2s: t => ((t - viewRange.start) / rangeSpan) * cW,
            $2s: y$ => scaleMode === 'log' ? y$ > 0 ? (top - Math.log(y$)) / (top - bottom) * cH : NaN : ((hi - y$) / (hi - lo)) * cH,
            label: (price, precision = 2) => scaleMode === 'percent' ? ((price / reference - 1) * 100).toFixed(2) + '%' : price.toLocaleString('en-US', {minimumFractionDigits: Math.min(precision, 6), maximumFractionDigits: Math.min(precision, 6)})
        };
    }, [width, height, viewRange, ohlcv, yTransform, plots, scaleMode]);

    const hitTest = useCallback((x, y, layout) => {
        if (!layout) return { d: null, pi: -1 };
        for (let i = drawings.length - 1; i >= 0; i--) {
            const d = drawings[i];
            const pts = d.p.map(p => ({ x: layout.t2s(p.t), y: layout.$2s(p.y$) }));

            if(d.type.includes('HorzLine')||d.type.includes('VertLine')||d.type.includes('CrossLine')){
                const p=pts[0];if(!p)continue;
                if(Math.hypot(x-p.x,y-p.y)<=HANDLE_R+3)return {d,pi:0};
                if((!d.type.includes('VertLine')&&Math.abs(y-p.y)<8)||(!d.type.includes('HorzLine')&&Math.abs(x-p.x)<8))return {d,pi:-1};
                continue;
            }
            if(d.type==='ShapeTool:Circle'&&pts.length>=2){
                for(let j=0;j<pts.length;j++)if(Math.hypot(x-pts[j].x,y-pts[j].y)<=HANDLE_R+3)return {d,pi:j};
                const radius=Math.hypot(pts[1].x-pts[0].x,pts[1].y-pts[0].y);
                if(Math.abs(Math.hypot(x-pts[0].x,y-pts[0].y)-radius)<8)return {d,pi:-1};
                continue;
            }

            // For Position tools - check extended handles and area
            if (d.type.includes('PositionTool') && pts.length >= 2) {
                const [p1, p2] = pts;
                const entryY = p1.y;
                const isLong = d.type.includes('Long');
                // Use stored SL and TP from p[1] and p[2]
                const slY = pts.length > 1 ? layout.$2s(d.p[1].y$) : (isLong ? entryY + 50 : entryY - 50);
                const tpY = pts.length > 2 ? layout.$2s(d.p[2].y$) : (isLong ? entryY - 100 : entryY + 100);
                const bx = Math.min(p1.x, p2.x), w = Math.abs(p2.x - p1.x) || 150;
                const minY = Math.min(tpY, slY), maxY = Math.max(tpY, slY);

                // Handle points: left-center, right-center, top-center, bottom-center
                // For Long: top = TP, bottom = SL
                // For Short: top = SL, bottom = TP
                const handles = [
                    { x: bx, y: (minY + maxY) / 2 },           // left
                    { x: bx + w, y: (minY + maxY) / 2 },       // right
                    { x: bx + w / 2, y: isLong ? tpY : slY },  // top
                    { x: bx + w / 2, y: isLong ? slY : tpY },  // bottom
                ];
                for (let j = 0; j < handles.length; j++) {
                    if (Math.hypot(x - handles[j].x, y - handles[j].y) <= HANDLE_R + 3) return { d, pi: j + 10 };
                }
                // Check if inside area
                if (x >= bx && x <= bx + w && y >= minY && y <= maxY) return { d, pi: -1 };
            }

            // Standard point handles
            for (let j = 0; j < pts.length; j++) {
                if (Math.hypot(x - pts[j].x, y - pts[j].y) <= HANDLE_R + 3) return { d, pi: j };
            }

            // For shapes - check if inside bounding box
            if ((d.type.includes('Rectangle') || d.type.includes('Shape') || d.type.includes('Range')) && pts.length >= 2) {
                const minX = Math.min(pts[0].x, pts[1].x), maxX = Math.max(pts[0].x, pts[1].x);
                const minY = Math.min(pts[0].y, pts[1].y), maxY = Math.max(pts[0].y, pts[1].y);
                if (x >= minX && x <= maxX && y >= minY && y <= maxY) return { d, pi: -1 };
            }

            if (pts.length >= 2) {
                const dist = ptLineDist(x, y, pts[0], pts[1]);
                if (dist < 10) return { d, pi: -1 };
            }
        }
        return { d: null, pi: -1 };
    }, [drawings]);

    const ptLineDist = (px, py, a, b) => {
        const dx = b.x - a.x, dy = b.y - a.y, l2 = dx*dx + dy*dy;
        if (l2 === 0) return Math.hypot(px - a.x, py - a.y);
        const t = Math.max(0, Math.min(1, ((px - a.x)*dx + (py - a.y)*dy) / l2));
        return Math.hypot(px - (a.x + t*dx), py - (a.y + t*dy));
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas || !ohlcv.length) return;
        const ctx = canvas.getContext('2d');
        const dpr = window.devicePixelRatio || 1;
        canvas.width = width * dpr; canvas.height = height * dpr;
        canvas.style.width = width + 'px'; canvas.style.height = height + 'px';
        ctx.scale(dpr, dpr);

        const L = getLayout();
        if (!L) return;

        ctx.fillStyle = colors.back;
        ctx.fillRect(0, 0, width, height);

        // Calculate grid intervals based on price range
        const priceRangeG = L.hi - L.lo;
        const rawStepG = priceRangeG / 6;
        const magG = Math.pow(10, Math.floor(Math.log10(rawStepG)));
        const normG = rawStepG / magG;
        let stepG;
        if (normG <= 1.5) stepG = magG;
        else if (normG <= 3) stepG = 2 * magG;
        else if (normG <= 7) stepG = 5 * magG;
        else stepG = 10 * magG;

        // Draw horizontal grid lines at price intervals
        ctx.strokeStyle = colors.grid; ctx.lineWidth = 0.5;
        const startG = Math.ceil(L.lo / stepG) * stepG;
        for (let pr = startG; pr <= L.hi; pr += stepG) {
            const y = L.$2s(pr);
            if (y > 0 && y < L.cH) {
                ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(L.cW, y); ctx.stroke();
            }
        }

        // Draw vertical grid lines for time
        const vGridStep = Math.max(1, Math.floor(L.vis.length / 8));
        for (let i = 0; i < L.vis.length; i += vGridStep) {
            const x = i * L.cW2 + L.cW2 / 2;
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, L.cH); ctx.stroke();
        }

        // Calculate offset for candle positioning (viewRange.start may be fractional)
        const startOffset = L.s - viewRange.start;

        // Volume
        ctx.save(); ctx.beginPath(); ctx.rect(0, 0, L.cW, L.cH); ctx.clip();
        const maxVol = Math.max(1, ...L.vis.map(c => c[5]));
        L.vis.forEach((c, i) => {
            const x = (i + startOffset) * L.cW2, volH = (c[5] / maxVol) * 40;
            ctx.fillStyle = c[4] >= c[1] ? colors.volUp : colors.volDw;
            ctx.fillRect(x, L.cH - volH, L.cW2 - 1, volH);
        });

        // Candles
        const p2y = L.$2s;
        let haOpen = L.vis[0]?.[1], haClose = L.vis[0]?.[4];
        if (chartStyle === 'line' || chartStyle === 'area') {
            ctx.beginPath();
            L.vis.forEach((c, i) => {const x=(i+startOffset)*L.cW2+L.cW2/2,y=p2y(c[4]);if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);});
            ctx.strokeStyle = colors.up; ctx.lineWidth = 1.8; ctx.stroke();
            if(chartStyle === 'area'){ctx.lineTo((L.vis.length-1+startOffset)*L.cW2+L.cW2/2,L.cH);ctx.lineTo(startOffset*L.cW2+L.cW2/2,L.cH);ctx.closePath();ctx.fillStyle=colors.volUp;ctx.fill();}
        } else L.vis.forEach((original, i) => {
            let c=original;
            if(chartStyle === 'heikin-ashi'){const close=(original[1]+original[2]+original[3]+original[4])/4,open=i===0?(original[1]+original[4])/2:(haOpen+haClose)/2;haOpen=open;haClose=close;c=[original[0],open,Math.max(original[2],open,close),Math.min(original[3],open,close),close,original[5]];}
            const x = (i + startOffset) * L.cW2 + L.cW2 / 2;
            const green = c[4] >= c[1];
            const col = green ? colors.up : colors.dw;
            ctx.strokeStyle = col; ctx.beginPath(); ctx.moveTo(x, p2y(c[2])); ctx.lineTo(x, p2y(c[3])); ctx.stroke();
            ctx.fillStyle = col;
            const bw = Math.max(L.cW2 * 0.7, 1);
            const yo = p2y(c[1]), yc = p2y(c[4]);
            ctx.fillRect(x - bw/2, Math.min(yo, yc), bw, Math.max(Math.abs(yc - yo), 1));
        });

        // Script plots and actual order fills share the chart's time and price scales.
        for(const series of plots) {
            if(series.pane !== 'price') continue;
            ctx.beginPath();ctx.strokeStyle=series.color;ctx.lineWidth=1.5;
            let started=false,lastIndex=-2;
            for(const point of series.values){if(point.index < L.s-1 || point.index > viewRange.end+1)continue;const x=L.t2s(point.index)+L.cW2/2,y=L.$2s(point.value);if(!Number.isFinite(y)){started=false;continue;}if(!started || point.index>lastIndex+1)ctx.moveTo(x,y);else ctx.lineTo(x,y);started=true;lastIndex=point.index;}
            ctx.stroke();
        }
        for(const marker of markers){if(marker.index < L.s || marker.index > viewRange.end)continue;const x=L.t2s(marker.index)+L.cW2/2,buy=marker.side==='buy',bar=ohlcv[marker.index],y=L.$2s(bar?.[buy?3:2]??marker.price)+(buy?13:-13);ctx.fillStyle=buy?colors.up:colors.dw;ctx.beginPath();ctx.moveTo(x,y+(buy?-5:5));ctx.lineTo(x-4,y+(buy?3:-3));ctx.lineTo(x+4,y+(buy?3:-3));ctx.closePath();ctx.fill();}

        // Drawings
        drawings.forEach(d => {
            // Check if cursor is hovering over this drawing (for Position tools)
            let isHovered = false;
            if (d.type.includes('PositionTool') && d.p.length >= 2 && cursor.visible) {
                const isLong = d.type.includes('Long');
                const entryY = L.$2s(d.p[0].y$);
                const slY = d.p.length > 1 ? L.$2s(d.p[1].y$) : (isLong ? entryY + 50 : entryY - 50);
                const tpY = d.p.length > 2 ? L.$2s(d.p[2].y$) : (isLong ? entryY - 100 : entryY + 100);
                const p0x = L.t2s(d.p[0].t), p1x = L.t2s(d.p[1].t);
                const bx = Math.min(p0x, p1x), w = Math.abs(p1x - p0x) || 150;
                const minY = Math.min(tpY, slY, entryY), maxY = Math.max(tpY, slY, entryY);
                isHovered = cursor.x >= bx && cursor.x <= bx + w && cursor.y >= minY && cursor.y <= maxY;
            }
            renderDrawing(ctx, d, L, d.id === selectedId, false, isHovered);
        });

        // WIP preview
        if (wipDrawing && wipDrawing.p.length > 0 && cursor.visible) {
            const preview = { ...wipDrawing, p: [...wipDrawing.p, { t: cursor.t, y$: cursor.y$ }] };
            renderDrawing(ctx, preview, L, false, true, true);
        }

        ctx.restore();
        // Sidebar
        ctx.fillStyle = colors.back; ctx.fillRect(L.cW, 0, SIDEBAR_W, height);
        ctx.strokeStyle = colors.grid; ctx.beginPath(); ctx.moveTo(L.cW, 0); ctx.lineTo(L.cW, L.cH); ctx.stroke();
        ctx.fillStyle = colors.text; ctx.font = '11px sans-serif';

        // Calculate nice price intervals
        const priceRange = L.hi - L.lo;
        const targetTicks = 6;
        const rawStep = priceRange / targetTicks;
        const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
        const normalized = rawStep / magnitude;
        let step;
        if (normalized <= 1.5) step = magnitude;
        else if (normalized <= 3) step = 2 * magnitude;
        else if (normalized <= 7) step = 5 * magnitude;
        else step = 10 * magnitude;

        const startPrice = Math.ceil(L.lo / step) * step;
        const precision = step < 1 ? Math.max(0, -Math.floor(Math.log10(step)) + 1) : (step < 10 ? 2 : 1);

        for (let pr = startPrice; pr <= L.hi; pr += step) {
            const y = L.$2s(pr);
            if (y > 0 && y < L.cH) {
                // Tick mark
                ctx.strokeStyle = colors.grid;
                ctx.beginPath(); ctx.moveTo(L.cW, y); ctx.lineTo(L.cW + 4, y); ctx.stroke();
                // Price label
                ctx.fillStyle = colors.text;
                ctx.fillText(L.label(pr, precision), L.cW + 8, y + 4);
            }
        }

        // Cursor price panel on y-axis
        if (cursor.visible && cursor.x < L.cW) {
            const panelH = 20;
            const panelY = cursor.y - panelH / 2;
            ctx.fillStyle = '#19212b';
            ctx.fillRect(L.cW, panelY, SIDEBAR_W, panelH);
            ctx.fillStyle = '#fff';
            ctx.font = '12px sans-serif';
            ctx.fillText(L.label(cursor.y$, precision), L.cW + 8, panelY + 14);
        }

        // Last price line
        if (L.vis.length > 0) {
            const last = L.vis[L.vis.length - 1];
            const lastY = p2y(last[4]);
            const isGreen = last[4] >= last[1];
            ctx.strokeStyle = isGreen ? colors.up : colors.dw;
            ctx.setLineDash([2, 2]);
            ctx.beginPath(); ctx.moveTo(0, lastY); ctx.lineTo(L.cW, lastY); ctx.stroke();
            ctx.setLineDash([]);
            ctx.fillStyle = isGreen ? colors.up : colors.dw;
            ctx.fillRect(L.cW + 1, lastY - 10, 68, 20);
            ctx.fillStyle = '#fff';
            ctx.fillText(L.label(last[4]), L.cW + 5, lastY + 4);
        }

        // Crosshair
        if (cursor.visible && cursor.x < L.cW) {
            ctx.strokeStyle = colors.cross; ctx.setLineDash([3, 3]);
            ctx.beginPath(); ctx.moveTo(cursor.x, 0); ctx.lineTo(cursor.x, L.cH);
            ctx.moveTo(0, cursor.y); ctx.lineTo(L.cW, cursor.y); ctx.stroke();
            ctx.setLineDash([]);
        }

        // X-axis (time scale) at bottom
        const botBarH = 28;
        ctx.fillStyle = colors.back;
        ctx.fillRect(0, L.cH, L.cW + SIDEBAR_W, botBarH);
        ctx.strokeStyle = colors.grid;
        ctx.beginPath(); ctx.moveTo(0, L.cH); ctx.lineTo(L.cW, L.cH); ctx.stroke();

        // Time labels
        ctx.fillStyle = colors.text;
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';

        const candlesVisible = L.vis.length;
        const labelStep = Math.max(1, Math.ceil(candlesVisible / Math.max(2, Math.floor(L.cW / 105))));
        let lastLabelRight=-10;

        for (let i = 0; i < candlesVisible; i += labelStep) {
            const candle = L.vis[i];
            const x = (i + startOffset) * L.cW2 + L.cW2 / 2;
            const date = new Date(candle[0]);

            // Draw tick mark
            ctx.strokeStyle = colors.grid;
            ctx.beginPath(); ctx.moveTo(x, L.cH); ctx.lineTo(x, L.cH + 4); ctx.stroke();

            // Format time based on zoom level
            let timeStr;
            if (barSpacing >= 86400000) {
                timeStr = date.toLocaleDateString([], {month:'short',day:'numeric'});
            } else if ((viewRange.end-viewRange.start)*barSpacing < 86400000) {
                timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit',hour12:false });
            } else {
                timeStr = `${date.getMonth()+1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2,'0')}`;
            }

            ctx.fillStyle = colors.text;
            const textWidth=ctx.measureText(timeStr).width,textX=Math.max(textWidth/2+3,Math.min(x,L.cW-textWidth/2-3));
            if(textX-textWidth/2>lastLabelRight+10){ctx.fillText(timeStr, textX, L.cH + 18);lastLabelRight=textX+textWidth/2;}
        }

        // Cursor time panel on x-axis
        if (cursor.visible && cursor.x < L.cW && cursor.x > 0) {
            const at=Math.floor(cursor.t),timestamp=ohlcv[at]?.[0]??(at<0?ohlcv[0][0]+at*barSpacing:ohlcv[ohlcv.length-1][0]+(at-ohlcv.length+1)*barSpacing),cursorTime=new Date(timestamp);
            const timeStr = barSpacing>=86400000?cursorTime.toLocaleDateString([],{year:'numeric',month:'short',day:'numeric'}):`${cursorTime.toLocaleDateString([],{month:'short',day:'numeric'})} ${cursorTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit',hour12:false })}`;
            const panelW = Math.min(L.cW, ctx.measureText(timeStr).width+16);
            const panelX = Math.max(0, Math.min(cursor.x - panelW/2, L.cW - panelW));

            ctx.fillStyle = '#19212b';
            ctx.fillRect(panelX, L.cH + 2, panelW, 20);
            ctx.fillStyle = '#fff';
            ctx.font = '11px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(timeStr, panelX + panelW/2, L.cH + 16);
        }

        ctx.textAlign = 'left';
    }, [ohlcv, viewRange, cursor, colors, width, height, drawings, wipDrawing, selectedId, getLayout, plots, markers, chartStyle, barSpacing]);

    const renderDrawing = (ctx, d, L, sel, preview = false, hovered = false) => {
        const col = sel ? '#7dd3fc' : (d.color || '#7dd3fc');
        const baseLw = d.lineWidth || 2;
        const lw = sel ? baseLw + 1 : baseLw;
        const pts = d.p.map(p => ({ x: L.t2s(p.t), y: L.$2s(p.y$) }));
        const prices = d.p.map(p => p.y$);

        ctx.save();
        ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = lw;
        if (preview) { ctx.setLineDash([5, 5]); ctx.globalAlpha = 0.7; }

        if (pts.length >= 2) {
            const [p1, p2] = pts;
            const [pr1, pr2] = prices;
            const midX = (p1.x + p2.x) / 2;
            const midY = (p1.y + p2.y) / 2;

            ctx.beginPath();

            // Brush tools (check first since they're simple)
            if (d.type.includes('BrushTool')) {
                ctx.strokeStyle = '#ff0000';  // Bright red for visibility
                ctx.lineWidth = 5;  // Thick line
                if (d.type.includes('Highlighter')) {
                    ctx.globalAlpha = 0.4;
                    ctx.lineWidth = 10;
                    ctx.strokeStyle = '#ffeb3b';
                }
                ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();

            // Line tools
            } else if (d.type.includes('Segment')) {
                ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
            } else if (d.type.includes('Ray')) {
                ctx.moveTo(p1.x, p1.y);
                const dx = p2.x - p1.x, dy = p2.y - p1.y, len = Math.hypot(dx, dy);
                if (len > 0) ctx.lineTo(p1.x + dx/len * 3000, p1.y + dy/len * 3000);
                ctx.stroke();
            } else if (d.type.includes('Extended')) {
                const dx = p2.x - p1.x, dy = p2.y - p1.y, len = Math.hypot(dx, dy);
                if (len > 0) {
                    ctx.moveTo(p1.x - dx/len * 3000, p1.y - dy/len * 3000);
                    ctx.lineTo(p1.x + dx/len * 3000, p1.y + dy/len * 3000);
                }
                ctx.stroke();
            } else if (d.type.includes('Arrow')) {
                ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
                // Arrow head
                const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
                const headLen = 12;
                ctx.beginPath();
                ctx.moveTo(p2.x, p2.y);
                ctx.lineTo(p2.x - headLen * Math.cos(angle - Math.PI/6), p2.y - headLen * Math.sin(angle - Math.PI/6));
                ctx.moveTo(p2.x, p2.y);
                ctx.lineTo(p2.x - headLen * Math.cos(angle + Math.PI/6), p2.y - headLen * Math.sin(angle + Math.PI/6));
                ctx.stroke();
            } else if (d.type.includes('HorzLine')) {
                ctx.moveTo(0, p1.y); ctx.lineTo(L.cW, p1.y); ctx.stroke();
            } else if (d.type.includes('VertLine')) {
                ctx.moveTo(p1.x, 0); ctx.lineTo(p1.x, L.cH); ctx.stroke();
            } else if (d.type.includes('CrossLine')) {
                ctx.moveTo(0, p1.y); ctx.lineTo(L.cW, p1.y);
                ctx.moveTo(p1.x, 0); ctx.lineTo(p1.x, L.cH);
                ctx.stroke();

            // Range tools
            } else if (d.type.includes('RangeTool:Price')) {
                ctx.setLineDash([2, 2]);
                ctx.moveTo(0, p1.y); ctx.lineTo(L.cW, p1.y);
                ctx.moveTo(0, p2.y); ctx.lineTo(L.cW, p2.y);
                ctx.stroke();
                ctx.globalAlpha = 0.1; ctx.fillRect(0, Math.min(p1.y, p2.y), L.cW, Math.abs(p2.y - p1.y));
                ctx.globalAlpha = preview ? 0.7 : 1;
            } else if (d.type.includes('RangeTool:Time') && !d.type.includes('Price')) {
                ctx.setLineDash([2, 2]);
                ctx.moveTo(p1.x, 0); ctx.lineTo(p1.x, L.cH);
                ctx.moveTo(p2.x, 0); ctx.lineTo(p2.x, L.cH);
                ctx.stroke();
                ctx.globalAlpha = 0.1; ctx.fillRect(Math.min(p1.x, p2.x), 0, Math.abs(p2.x - p1.x), L.cH);
                ctx.globalAlpha = preview ? 0.7 : 1;
            } else if (d.type.includes('PriceTime')) {
                ctx.setLineDash([2, 2]);
                const x = Math.min(p1.x, p2.x), y = Math.min(p1.y, p2.y);
                const w = Math.abs(p2.x - p1.x), h = Math.abs(p2.y - p1.y);
                ctx.strokeRect(x, y, w, h);
                ctx.globalAlpha = 0.1; ctx.fillRect(x, y, w, h);
                ctx.globalAlpha = preview ? 0.7 : 1;

            // Shape tools
            } else if (d.type.includes('Rectangle')) {
                const x = Math.min(p1.x, p2.x), y = Math.min(p1.y, p2.y);
                const w = Math.abs(p2.x - p1.x), h = Math.abs(p2.y - p1.y);
                ctx.strokeRect(x, y, w, h);
                ctx.globalAlpha = 0.1; ctx.fillRect(x, y, w, h);
                ctx.globalAlpha = preview ? 0.7 : 1;
            } else if (d.type.includes('Circle')) {
                const r = Math.hypot(p2.x - p1.x, p2.y - p1.y);
                ctx.beginPath(); ctx.arc(p1.x, p1.y, r, 0, Math.PI * 2); ctx.stroke();
                ctx.globalAlpha = 0.1; ctx.fill();
                ctx.globalAlpha = preview ? 0.7 : 1;
            } else if (d.type.includes('Ellipse')) {
                const rx = Math.abs(p2.x - p1.x), ry = Math.abs(p2.y - p1.y);
                ctx.beginPath(); ctx.ellipse(p1.x, p1.y, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
                ctx.globalAlpha = 0.1; ctx.fill();
                ctx.globalAlpha = preview ? 0.7 : 1;
            } else if (d.type.includes('Triangle')) {
                ctx.beginPath();
                ctx.moveTo(midX, p1.y); // Top
                ctx.lineTo(p1.x, p2.y); // Bottom left
                ctx.lineTo(p2.x, p2.y); // Bottom right
                ctx.closePath(); ctx.stroke();
                ctx.globalAlpha = 0.1; ctx.fill();
                ctx.globalAlpha = preview ? 0.7 : 1;
            } else if (d.type.includes('Arc')) {
                const cpY = Math.min(p1.y, p2.y) - Math.abs(p2.y - p1.y) * 0.5;
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.quadraticCurveTo(midX, cpY, p2.x, p2.y);
                ctx.stroke();

            // Fibonacci
            } else if (d.type.includes('FibTool:Retracement')) {
                const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
                const range = p2.y - p1.y;
                levels.forEach((lvl, i) => {
                    const y = p1.y + range * lvl;
                    ctx.globalAlpha = 1 - lvl * 0.3;
                    ctx.beginPath(); ctx.moveTo(p1.x, y); ctx.lineTo(p2.x, y); ctx.stroke();
                    ctx.globalAlpha = 1;
                    ctx.font = '10px Arial';
                    ctx.fillText(`${(lvl * 100).toFixed(1)}%`, p2.x + 5, y + 3);
                });
                ctx.globalAlpha = 0.05;
                ctx.fillRect(Math.min(p1.x, p2.x), Math.min(p1.y, p2.y), Math.abs(p2.x - p1.x), Math.abs(range));
                ctx.globalAlpha = preview ? 0.7 : 1;

            } else if (d.type.includes('FibTool:Extension')) {
                const levels = [0, 0.618, 1, 1.618, 2.618, 4.236];
                const range = p2.y - p1.y;
                levels.forEach((lvl, i) => {
                    const y = p1.y + range * lvl;
                    ctx.setLineDash(lvl > 1 ? [4, 4] : []);
                    ctx.globalAlpha = Math.max(0.3, 1 - lvl * 0.2);
                    ctx.beginPath(); ctx.moveTo(p1.x, y); ctx.lineTo(p2.x, y); ctx.stroke();
                    ctx.globalAlpha = 1;
                    ctx.font = '10px Arial';
                    ctx.fillText(`${(lvl * 100).toFixed(1)}%`, p2.x + 5, y + 3);
                });
                ctx.setLineDash([]);

            // Position tools - TradingView style with independent SL/TP
            } else if (d.type.includes('PositionTool:Long')) {
                // Long: p[0] = entry, p[1] = SL level, p[2] = TP level (if exists)
                const entryY = p1.y;
                // For preview: SL follows cursor, TP calculated as 2:1 RR from entry
                let slY, tpY;
                if (pts.length > 2) {
                    // Finalized: use stored positions
                    slY = L.$2s(d.p[1].y$);
                    tpY = L.$2s(d.p[2].y$);
                } else if (pts.length > 1) {
                    // Preview: calculate based on cursor position
                    const cursorY = p2.y;
                    // For Long, SL should be below entry (larger Y)
                    slY = Math.max(cursorY, entryY + Math.abs(cursorY - entryY));
                    const riskPixels = slY - entryY;
                    tpY = entryY - riskPixels * 2; // TP above entry
                } else {
                    slY = entryY + 50;
                    tpY = entryY - 100;
                }
                const x = Math.min(p1.x, p2.x), w = Math.abs(p2.x - p1.x) || 150;

                // Calculate dynamic RR ratio
                const risk = Math.abs(slY - entryY);
                const reward = Math.abs(entryY - tpY);
                const rr = risk > 0 ? (reward / risk).toFixed(1) : '0';

                // TP zone (green)
                ctx.fillStyle = 'rgba(76, 175, 80, 0.15)';
                ctx.fillRect(x, tpY, w, entryY - tpY);
                ctx.strokeStyle = '#4caf50';
                ctx.setLineDash([]);
                ctx.beginPath(); ctx.moveTo(x, tpY); ctx.lineTo(x + w, tpY); ctx.stroke();

                // SL zone (red)
                ctx.fillStyle = 'rgba(244, 67, 54, 0.15)';
                ctx.fillRect(x, entryY, w, slY - entryY);
                ctx.strokeStyle = '#f44336';
                ctx.beginPath(); ctx.moveTo(x, slY); ctx.lineTo(x + w, slY); ctx.stroke();

                // Entry line (blue)
                ctx.strokeStyle = '#7dd3fc';
                ctx.setLineDash([4, 4]);
                ctx.beginPath(); ctx.moveTo(x, entryY); ctx.lineTo(x + w, entryY); ctx.stroke();
                ctx.setLineDash([]);

                // Labels - only show on hover or select
                const showLabels = sel || hovered;
                ctx.font = 'bold 11px Arial';
                const entryPrice = pr1.toFixed(2);
                const slPriceVal = d.p[1]?.y$ || L.s2$(slY);
                const tpPriceVal = d.p[2]?.y$ || L.s2$(tpY);
                const profitPct = ((tpPriceVal - pr1) / pr1 * 100).toFixed(1);
                const lossPct = ((slPriceVal - pr1) / pr1 * 100).toFixed(1);

                if (showLabels) {
                    // TP label
                    ctx.fillStyle = '#4caf50';
                    ctx.fillRect(x + w + 2, tpY - 10, 75, 20);
                    ctx.fillStyle = '#fff'; ctx.fillText(`TP ${tpPriceVal.toFixed(2)}`, x + w + 6, tpY + 4);
                    ctx.fillStyle = '#4caf50'; ctx.fillText(`+${Math.abs(profitPct)}%`, x + w + 6, tpY - 22);

                    // Entry label
                    ctx.fillStyle = '#7dd3fc';
                    ctx.fillRect(x + w + 2, entryY - 10, 75, 20);
                    ctx.fillStyle = '#fff'; ctx.fillText(`Entry ${entryPrice}`, x + w + 6, entryY + 4);

                    // SL label
                    ctx.fillStyle = '#f44336';
                    ctx.fillRect(x + w + 2, slY - 10, 75, 20);
                    ctx.fillStyle = '#fff'; ctx.fillText(`SL ${slPriceVal.toFixed(2)}`, x + w + 6, slY + 4);
                    ctx.fillStyle = '#f44336'; ctx.fillText(`${lossPct}%`, x + w + 6, slY + 18);

                    // RR ratio box
                    ctx.fillStyle = 'rgba(38, 166, 154, 0.9)';
                    ctx.fillRect(x, entryY - 30, 60, 24);
                    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Arial';
                    ctx.fillText(`Long ${rr}:1`, x + 6, entryY - 12);
                }

                // Draw handles when selected
                if (sel) {
                    const handles = [
                        { x: x, y: (tpY + slY) / 2 },           // left
                        { x: x + w, y: (tpY + slY) / 2 },       // right
                        { x: x + w / 2, y: tpY },               // top (TP)
                        { x: x + w / 2, y: slY },               // bottom (SL)
                    ];
                    handles.forEach(h => {
                        ctx.beginPath();
                        ctx.arc(h.x, h.y, HANDLE_R, 0, Math.PI * 2);
                        ctx.fillStyle = '#7dd3fc';
                        ctx.fill();
                        ctx.strokeStyle = '#fff';
                        ctx.lineWidth = 2;
                        ctx.stroke();
                    });
                }

            } else if (d.type.includes('PositionTool:Short')) {
                // Short: p[0] = entry, p[1] = SL level, p[2] = TP level (if exists)
                const entryY = p1.y;
                // For preview: SL follows cursor, TP calculated as 2:1 RR from entry
                let slY, tpY;
                if (pts.length > 2) {
                    // Finalized: use stored positions
                    slY = L.$2s(d.p[1].y$);
                    tpY = L.$2s(d.p[2].y$);
                } else if (pts.length > 1) {
                    // Preview: calculate based on cursor position
                    const cursorY = p2.y;
                    // For Short, SL should be above entry (smaller Y)
                    slY = Math.min(cursorY, entryY - Math.abs(cursorY - entryY));
                    const riskPixels = entryY - slY;
                    tpY = entryY + riskPixels * 2; // TP below entry
                } else {
                    slY = entryY - 50;
                    tpY = entryY + 100;
                }
                const x = Math.min(p1.x, p2.x), w = Math.abs(p2.x - p1.x) || 150;

                // Calculate dynamic RR ratio
                const risk = Math.abs(entryY - slY);
                const reward = Math.abs(tpY - entryY);
                const rr = risk > 0 ? (reward / risk).toFixed(1) : '0';

                // TP zone (green)
                ctx.fillStyle = 'rgba(76, 175, 80, 0.15)';
                ctx.fillRect(x, entryY, w, tpY - entryY);
                ctx.strokeStyle = '#4caf50';
                ctx.setLineDash([]);
                ctx.beginPath(); ctx.moveTo(x, tpY); ctx.lineTo(x + w, tpY); ctx.stroke();

                // SL zone (red)
                ctx.fillStyle = 'rgba(244, 67, 54, 0.15)';
                ctx.fillRect(x, slY, w, entryY - slY);
                ctx.strokeStyle = '#f44336';
                ctx.beginPath(); ctx.moveTo(x, slY); ctx.lineTo(x + w, slY); ctx.stroke();

                // Entry line (blue)
                ctx.strokeStyle = '#7dd3fc';
                ctx.setLineDash([4, 4]);
                ctx.beginPath(); ctx.moveTo(x, entryY); ctx.lineTo(x + w, entryY); ctx.stroke();
                ctx.setLineDash([]);

                // Labels - only show on hover or select
                const showLabels = sel || hovered;
                ctx.font = 'bold 11px Arial';
                const entryPrice = pr1.toFixed(2);
                const slPriceVal = d.p[1]?.y$ || L.s2$(slY);
                const tpPriceVal = d.p[2]?.y$ || L.s2$(tpY);
                const profitPct = ((pr1 - tpPriceVal) / pr1 * 100).toFixed(1);
                const lossPct = ((slPriceVal - pr1) / pr1 * 100).toFixed(1);

                if (showLabels) {
                    // SL label (top)
                    ctx.fillStyle = '#f44336';
                    ctx.fillRect(x + w + 2, slY - 10, 75, 20);
                    ctx.fillStyle = '#fff'; ctx.fillText(`SL ${slPriceVal.toFixed(2)}`, x + w + 6, slY + 4);
                    ctx.fillStyle = '#f44336'; ctx.fillText(`-${Math.abs(lossPct)}%`, x + w + 6, slY - 22);

                    // Entry label
                    ctx.fillStyle = '#7dd3fc';
                    ctx.fillRect(x + w + 2, entryY - 10, 75, 20);
                    ctx.fillStyle = '#fff'; ctx.fillText(`Entry ${entryPrice}`, x + w + 6, entryY + 4);

                    // TP label (bottom)
                    ctx.fillStyle = '#4caf50';
                    ctx.fillRect(x + w + 2, tpY - 10, 75, 20);
                    ctx.fillStyle = '#fff'; ctx.fillText(`TP ${tpPriceVal.toFixed(2)}`, x + w + 6, tpY + 4);
                    ctx.fillStyle = '#4caf50'; ctx.fillText(`+${Math.abs(profitPct)}%`, x + w + 6, tpY + 18);

                    // RR ratio box
                    ctx.fillStyle = 'rgba(239, 83, 80, 0.9)';
                    ctx.fillRect(x, entryY + 6, 60, 24);
                    ctx.fillStyle = '#fff'; ctx.font = 'bold 12px Arial';
                    ctx.fillText(`Short ${rr}:1`, x + 4, entryY + 24);
                }

                // Draw handles when selected
                if (sel) {
                    const handles = [
                        { x: x, y: (tpY + slY) / 2 },           // left
                        { x: x + w, y: (tpY + slY) / 2 },       // right
                        { x: x + w / 2, y: slY },               // top (SL)
                        { x: x + w / 2, y: tpY },               // bottom (TP)
                    ];
                    handles.forEach(h => {
                        ctx.beginPath();
                        ctx.arc(h.x, h.y, HANDLE_R, 0, Math.PI * 2);
                        ctx.fillStyle = '#7dd3fc';
                        ctx.fill();
                        ctx.strokeStyle = '#fff';
                        ctx.lineWidth = 2;
                        ctx.stroke();
                    });
                }

            // Gann tools
            } else if (d.type.includes('GannTool:Fan')) {
                const angles = [1, 2, 3, 4, 8];
                angles.forEach((a, i) => {
                    ctx.globalAlpha = 1 - i * 0.15;
                    const endX = p1.x + (p2.x - p1.x) * 2;
                    const endY = p1.y + (p2.y - p1.y) * 2 / a;
                    ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(endX, endY); ctx.stroke();
                });
                ctx.globalAlpha = preview ? 0.7 : 1;

            } else if (d.type.includes('GannTool:Box')) {
                const x = Math.min(p1.x, p2.x), y = Math.min(p1.y, p2.y);
                const w = Math.abs(p2.x - p1.x), h = Math.abs(p2.y - p1.y);
                ctx.strokeRect(x, y, w, h);
                ctx.beginPath();
                ctx.moveTo(x, y); ctx.lineTo(x + w, y + h);
                ctx.moveTo(x + w, y); ctx.lineTo(x, y + h);
                ctx.moveTo(x + w/2, y); ctx.lineTo(x + w/2, y + h);
                ctx.moveTo(x, y + h/2); ctx.lineTo(x + w, y + h/2);
                ctx.stroke();

            // Text tools
            } else if (d.type.includes('TextTool:Text')) {
                ctx.font = `${14 + (d.lineWidth || 2) * 2}px Arial`;
                ctx.fillStyle = col;
                ctx.fillText(d.text || 'Text', p1.x, p1.y);
            } else if (d.type.includes('TextTool:Note')) {
                const w = 120, h = 60;
                ctx.fillStyle = 'rgba(255, 235, 59, 0.9)';
                ctx.fillRect(p1.x, p1.y, w, h);
                ctx.strokeStyle = '#fbc02d';
                ctx.strokeRect(p1.x, p1.y, w, h);
                ctx.fillStyle = '#333';
                ctx.font = '11px Arial';
                ctx.fillText(d.text || 'Note', p1.x + 6, p1.y + 18);
            } else if (d.type.includes('TextTool:Callout')) {
                ctx.fillStyle = col;
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p1.x + 100, p1.y - 40);
                ctx.lineTo(p1.x + 100, p1.y - 60);
                ctx.lineTo(p1.x + 200, p1.y - 60);
                ctx.lineTo(p1.x + 200, p1.y - 20);
                ctx.lineTo(p1.x + 120, p1.y - 20);
                ctx.closePath();
                ctx.stroke();
                ctx.font = '11px Arial';
                ctx.fillText(d.text || 'Callout', p1.x + 110, p1.y - 35);
            } else if (d.type.includes('TextTool:PriceLabel')) {
                const price = pr1.toFixed(2);
                const tw = ctx.measureText(price).width + 12;
                ctx.fillStyle = col;
                ctx.fillRect(p1.x, p1.y - 10, tw, 20);
                ctx.fillStyle = '#fff';
                ctx.font = '11px Arial';
                ctx.fillText(price, p1.x + 6, p1.y + 4);

            // Patterns (simplified)
            } else if (d.type.includes('PatternTool:HeadShoulders')) {
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                const w = p2.x - p1.x;
                ctx.lineTo(p1.x + w * 0.15, p1.y - 30);
                ctx.lineTo(p1.x + w * 0.3, p1.y);
                ctx.lineTo(p1.x + w * 0.5, p1.y - 60);
                ctx.lineTo(p1.x + w * 0.7, p1.y);
                ctx.lineTo(p1.x + w * 0.85, p1.y - 30);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
                // Neckline
                ctx.setLineDash([4, 4]);
                ctx.beginPath();
                ctx.moveTo(p1.x + w * 0.3, p1.y);
                ctx.lineTo(p1.x + w * 0.7, p1.y);
                ctx.stroke();
                ctx.setLineDash([]);

            } else if (d.type.includes('PatternTool:Elliott')) {
                ctx.beginPath();
                const w = p2.x - p1.x;
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p1.x + w * 0.1, p1.y - 40);
                ctx.lineTo(p1.x + w * 0.2, p1.y - 20);
                ctx.lineTo(p1.x + w * 0.4, p1.y - 80);
                ctx.lineTo(p1.x + w * 0.55, p1.y - 50);
                ctx.lineTo(p1.x + w * 0.7, p1.y - 70);
                ctx.stroke();
                ctx.font = '10px Arial';
                ctx.fillText('1', p1.x + w * 0.1 - 4, p1.y - 45);
                ctx.fillText('3', p1.x + w * 0.4 - 4, p1.y - 85);
                ctx.fillText('5', p1.x + w * 0.7 - 4, p1.y - 75);

            // Projection tools
            } else if (d.type.includes('ProjectionTool:Projection') || d.type.includes('ProjectionTool:TrendFib')) {
                // Draw main trend line with projection
                ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
                // Projection levels
                const dx = p2.x - p1.x, dy = p2.y - p1.y;
                const levels = [0.618, 1, 1.618, 2.618];
                ctx.setLineDash([4, 4]);
                levels.forEach((lvl, i) => {
                    ctx.globalAlpha = 1 - i * 0.2;
                    const px = p2.x + dx * lvl, py = p2.y + dy * lvl;
                    ctx.beginPath(); ctx.moveTo(p2.x, p2.y); ctx.lineTo(px, py); ctx.stroke();
                    ctx.font = '10px Arial'; ctx.fillText(`${(lvl * 100).toFixed(1)}%`, px + 5, py);
                });
                ctx.setLineDash([]); ctx.globalAlpha = preview ? 0.7 : 1;

            } else if (d.type.includes('ProjectionTool:FibTimeZone')) {
                // Vertical lines at fib intervals
                const dx = Math.abs(p2.x - p1.x);
                const fibNums = [1, 2, 3, 5, 8, 13, 21];
                fibNums.forEach((n, i) => {
                    ctx.globalAlpha = Math.max(0.3, 1 - i * 0.1);
                    const x = p1.x + (dx / fibNums[fibNums.length - 1]) * n;
                    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, L.cH); ctx.stroke();
                    ctx.font = '10px Arial'; ctx.fillText(n.toString(), x + 2, 14);
                });
                ctx.globalAlpha = preview ? 0.7 : 1;

            } else if (d.type.includes('ProjectionTool:FibCircle')) {
                // Concentric circles at fib ratios
                const r = Math.hypot(p2.x - p1.x, p2.y - p1.y);
                const ratios = [0.236, 0.382, 0.5, 0.618, 1];
                ratios.forEach((ratio, i) => {
                    ctx.globalAlpha = 1 - i * 0.15;
                    ctx.beginPath(); ctx.arc(p1.x, p1.y, r * ratio, 0, Math.PI * 2); ctx.stroke();
                });
                ctx.globalAlpha = preview ? 0.7 : 1;

            } else if (d.type.includes('ProjectionTool:FibSpiral')) {
                // Golden spiral approximation
                ctx.beginPath();
                let cx = p1.x, cy = p1.y;
                let size = Math.hypot(p2.x - p1.x, p2.y - p1.y) / 3;
                for (let i = 0; i < 8; i++) {
                    const startAngle = (i * Math.PI / 2);
                    ctx.arc(cx, cy, size, startAngle, startAngle + Math.PI / 2);
                    size *= 0.618;
                    if (i % 4 === 0) cx += size;
                    else if (i % 4 === 1) cy += size;
                    else if (i % 4 === 2) cx -= size;
                    else cy -= size;
                }
                ctx.stroke();

            } else if (d.type.includes('ProjectionTool:FibWedge')) {
                // Wedge/triangle with fib levels
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.lineTo(p1.x + (p2.x - p1.x) * 2, p1.y);
                ctx.stroke();
                // Horizontal fib lines
                const h = Math.abs(p2.y - p1.y);
                const levels = [0.236, 0.382, 0.5, 0.618, 0.786];
                ctx.setLineDash([2, 2]);
                levels.forEach((lvl, i) => {
                    ctx.globalAlpha = 0.6;
                    const y = p1.y + (p2.y - p1.y) * lvl;
                    ctx.beginPath(); ctx.moveTo(p1.x, y); ctx.lineTo(p2.x + (p2.x - p1.x) * (1 - lvl), y); ctx.stroke();
                });
                ctx.setLineDash([]); ctx.globalAlpha = preview ? 0.7 : 1;

            } else if (d.type.includes('ProjectionTool:FibChannel')) {
                // Parallel channel with fib levels
                const dx = p2.x - p1.x, dy = p2.y - p1.y;
                ctx.moveTo(p1.x, p1.y); ctx.lineTo(p2.x, p2.y); ctx.stroke();
                const levels = [0.236, 0.382, 0.5, 0.618, 1];
                const perpX = -dy * 0.3, perpY = dx * 0.3;
                levels.forEach((lvl, i) => {
                    ctx.globalAlpha = 1 - i * 0.15;
                    ctx.beginPath();
                    ctx.moveTo(p1.x + perpX * lvl, p1.y + perpY * lvl);
                    ctx.lineTo(p2.x + perpX * lvl, p2.y + perpY * lvl);
                    ctx.stroke();
                    ctx.moveTo(p1.x - perpX * lvl, p1.y - perpY * lvl);
                    ctx.lineTo(p2.x - perpX * lvl, p2.y - perpY * lvl);
                    ctx.stroke();
                });
                ctx.globalAlpha = preview ? 0.7 : 1;

            }

            ctx.setLineDash([]);
            ctx.globalAlpha = 1;

            // Show price labels when enabled or selected (for line tools)
            if ((d.showPrice || sel) && d.type.includes('LineTool')) {
                drawPriceLabel(ctx, d.type, p1, p2, pr1, pr2, col, L);
            }

            // Draw text if present (for non-text tools)
            if (d.text && !d.type.includes('TextTool')) {
                ctx.font = '12px Arial';
                ctx.fillStyle = col;
                ctx.textAlign = 'center';
                const textY = midY + 20;
                ctx.fillText(d.text, midX, textY);
                ctx.textAlign = 'left';
            }
        }

        // Draw handles (skip for tools with custom handles)
        ctx.setLineDash([]); ctx.globalAlpha = 1;
        if (!d.type.includes('TextTool:Text') && !d.type.includes('TextTool:Note') && !d.type.includes('PositionTool')) {
            (d.type.includes('HorzLine')||d.type.includes('VertLine')||d.type.includes('CrossLine')?pts.slice(0,1):pts).forEach(p => {
                ctx.beginPath(); ctx.arc(p.x, p.y, sel ? HANDLE_R : 4, 0, Math.PI * 2);
                ctx.fillStyle = sel ? '#7dd3fc' : col; ctx.fill();
                if (sel) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); }
            });
        }
        ctx.restore();
    };

    const drawPriceLabel = (ctx, type, p1, p2, pr1, pr2, col, L) => {
        ctx.font = '11px Arial';
        const delta = pr2 - pr1;
        const pct = ((pr2 / pr1 - 1) * 100).toFixed(2);
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;

        if (type.includes('HorzLine')||type.includes('VertLine')||type.includes('CrossLine')) {
            const label=type.includes('VertLine')?'':L.label(pr1);if(label){ctx.fillStyle=col;ctx.fillText(label,p1.x+10,p1.y-10);}return;
        }
        if (type.includes('LineTool')) {
            const lbl1 = pr1.toFixed(2);
            const lbl2 = pr2.toFixed(2);

            ctx.fillStyle = 'rgba(16,21,28,0.98)';
            ctx.fillRect(p1.x + 10, p1.y - 9, ctx.measureText(lbl1).width + 8, 18);
            ctx.fillStyle = col;
            ctx.fillText(lbl1, p1.x + 14, p1.y + 4);

            ctx.fillStyle = 'rgba(16,21,28,0.98)';
            ctx.fillRect(p2.x + 10, p2.y - 9, ctx.measureText(lbl2).width + 8, 18);
            ctx.fillStyle = col;
            ctx.fillText(lbl2, p2.x + 14, p2.y + 4);

            const deltaStr = `${delta >= 0 ? '+' : ''}${delta.toFixed(2)} (${delta >= 0 ? '+' : ''}${pct}%)`;
            const tw = ctx.measureText(deltaStr).width;
            ctx.fillStyle = 'rgba(16,21,28,0.98)';
            ctx.fillRect(midX - tw/2 - 5, midY - 22, tw + 10, 20);
            ctx.fillStyle = delta >= 0 ? '#26a69a' : '#ef5350';
            ctx.fillText(deltaStr, midX - tw/2, midY - 8);

        } else if (type.includes('Range')) {
            const lines = [];

            if (type.includes('Price') || type.includes('PriceTime')) {
                lines.push(`${delta >= 0 ? '+' : ''}${delta.toFixed(2)} (${delta >= 0 ? '+' : ''}${pct}%)`);
            }
            if (type.includes('Time') || type.includes('PriceTime')) {
                const numBars = Math.round(Math.abs(p2.x - p1.x) / (L.cW / L.vis.length));
                lines.push(`${numBars} bars`);
            }

            if (lines.length > 0) {
                const text = lines.join(' | ');
                const tw = ctx.measureText(text).width;
                const dir = p2.y > p1.y ? 1 : -1;
                const ly = p2.y + (dir > 0 ? 20 : -10);

                ctx.fillStyle = 'rgba(16,21,28,0.98)';
                ctx.fillRect(midX - tw/2 - 6, ly - 12, tw + 12, 20);
                ctx.fillStyle = delta >= 0 ? '#26a69a' : '#ef5350';
                ctx.textAlign = 'center';
                ctx.fillText(text, midX, ly + 3);
                ctx.textAlign = 'left';
            }
        }
    };

    const onMouseDown = e => {
        if (e.button !== undefined && e.button !== 0) return;
        canvasRef.current?.focus({ preventScroll: true });
        if (e.pointerId !== undefined) canvasRef.current?.setPointerCapture?.(e.pointerId);
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left, y = e.clientY - rect.top;
        const L = getLayout();
        if (!L) return;
        const t = L.s2t(x), y$ = L.s2$(y);

        // Y-axis (sidebar) interaction
        if (x >= L.cW) {
            setDrag({
                type: 'yaxis',
                sy: y,
                startZoom: yTransform.zoom,
                startOffset: yTransform.offset,
                baseHi: L.baseHi,
                baseLo: L.baseLo
            });
            setYTransform(prev => ({ ...prev, auto: false }));
            return;
        }

        if (tool !== 'Cursor') {
            if(tool.includes('HorzLine')||tool.includes('VertLine')||tool.includes('CrossLine')){
                const point={t,y$};setDrawings(previous=>[...previous,{id:crypto.randomUUID(),type:tool,p:[point,{...point}],color:'#7dd3fc',lineWidth:2,showPrice:false,text:''}]);setWipDrawing(null);onToolChange?.('Cursor');return;
            }
            if (!wipDrawing) {
                setWipDrawing({ id: crypto.randomUUID(), type: tool, p: [{ t, y$ }], color: '#7dd3fc', lineWidth: 2, showPrice: false, text: '' });
            } else {
                let finished = { ...wipDrawing, p: [...wipDrawing.p, { t, y$ }] };

                // For Position tools, add 3rd point for TP with default 2:1 RR
                if (tool.includes('PositionTool')) {
                    const entryPrice = wipDrawing.p[0].y$;
                    const clickPrice = y$;
                    const isLong = tool.includes('Long');

                    // SL is placed at click position
                    // Risk is calculated as distance from entry to SL
                    // TP is placed at 2:1 RR on opposite side of entry
                    let slPrice, tpPrice;
                    if (isLong) {
                        // Long: SL must be below entry, TP above entry
                        // If user clicked below entry, use click as SL; otherwise mirror it
                        slPrice = Math.min(clickPrice, entryPrice - Math.abs(clickPrice - entryPrice));
                        const risk = entryPrice - slPrice;
                        tpPrice = entryPrice + risk * 2;
                    } else {
                        // Short: SL must be above entry, TP below entry
                        // If user clicked above entry, use click as SL; otherwise mirror it
                        slPrice = Math.max(clickPrice, entryPrice + Math.abs(clickPrice - entryPrice));
                        const risk = slPrice - entryPrice;
                        tpPrice = entryPrice - risk * 2;
                    }

                    // Update p[1] to SL position, add p[2] for TP
                    finished.p[1] = { t, y$: slPrice };
                    finished = { ...finished, p: [...finished.p, { t, y$: tpPrice }] };
                }

                setDrawings(p => [...p, finished]);
                setWipDrawing(null);
                onToolChange?.('Cursor');
            }
        } else {
            const hit = hitTest(x, y, L);
            if (hit.d) {
                setSelectedId(hit.d.id);

                if (hit.pi >= 0) {
                    setDrag({ type: 'resize', id: hit.d.id, pi: hit.pi });
                } else {
                    setDrag({ type: 'move', id: hit.d.id, sx: x, sy: y });
                }
            } else {
                setSelectedId(null);
                setDrag({ type: 'pan', sx: x, sr: { ...viewRange } });
            }
        }
    };

    const onMouseMove = e => {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left, y = e.clientY - rect.top;
        const L = getLayout();
        if (!L) return;

        setCursor({ x, y, t: L.s2t(x), y$: L.s2$(y), visible: true });
        onHover?.(Math.max(0, Math.min(ohlcv.length - 1, Math.floor(L.s2t(x)))));

        if (drag.type === 'yaxis') {
            // Y-axis zoom: drag up = zoom in, drag down = zoom out
            const dy = drag.sy - y;
            const speed = dy > 0 ? 3 : 1;
            const k = 1 + speed * dy / L.cH;
            const newZoom = Math.max(0.1, Math.min(10, drag.startZoom * k));
            setYTransform({ zoom: newZoom, auto: false, offset: drag.startOffset });
        } else if (drag.type === 'pan') {
            const dx = x - drag.sx;
            const span = drag.sr.end - drag.sr.start;
            const shift = -dx * span / L.cW * 0.5;
            let ns = drag.sr.start + shift, ne = drag.sr.end + shift;
            const rightPadding = 20; // Allow empty space on right of candles
            if (ns < 0) { ns = 0; ne = span; }
            if (ne > ohlcv.length + rightPadding) { ne = ohlcv.length + rightPadding; ns = ne - span; }
            if (ns < 0) { ns = 0; } // Ensure start doesn't go negative
            if(ns>ohlcv.length-1){ns=Math.max(0,ohlcv.length-1);ne=ns+span;}
            setViewRange({ start: ns, end: ne });
        } else if (drag.type === 'move') {
            const dt = L.s2t(x) - L.s2t(drag.sx);
            const dy = L.s2$(y) - L.s2$(drag.sy);
            setDrawings(p => p.map(d => d.id !== drag.id ? d : { ...d, p: d.p.map(pt => ({ t: pt.t + dt, y$: pt.y$ + dy })) }));
            setDrag(prev => ({ ...prev, sx: x, sy: y }));
        } else if (drag.type === 'resize') {
            setDrawings(p => p.map(d => {
                if (d.id !== drag.id) return d;
                const np = [...d.p];

                // Special handling for Position tool handles (pi 10-13)
                // p[0] = entry, p[1] = SL, p[2] = TP (independent, not fixed RR)
                if (d.type.includes('PositionTool') && drag.pi >= 10) {
                    const handleIdx = drag.pi - 10; // 0=left, 1=right, 2=top, 3=bottom
                    const isLong = d.type.includes('Long');

                    if (handleIdx === 0) {
                        // Left handle - move x of entry point
                        np[0] = { ...np[0], t: L.s2t(x) };
                    } else if (handleIdx === 1) {
                        // Right handle - move x of SL point (width)
                        np[1] = { ...np[1], t: L.s2t(x) };
                    } else if (handleIdx === 2) {
                        // Top handle - Long: TP (p[2]), Short: SL (p[1])
                        if (isLong) {
                            // Ensure p[2] exists
                            if (np.length < 3) np.push({ t: np[1].t, y$: np[0].y$ });
                            np[2] = { ...np[2], y$: L.s2$(y) };
                        } else {
                            np[1] = { ...np[1], y$: L.s2$(y) };
                        }
                    } else if (handleIdx === 3) {
                        // Bottom handle - Long: SL (p[1]), Short: TP (p[2])
                        if (isLong) {
                            np[1] = { ...np[1], y$: L.s2$(y) };
                        } else {
                            // Ensure p[2] exists
                            if (np.length < 3) np.push({ t: np[1].t, y$: np[0].y$ });
                            np[2] = { ...np[2], y$: L.s2$(y) };
                        }
                    }
                } else {
                    // Standard resize
                    np[drag.pi] = { t: L.s2t(x), y$: L.s2$(y) };
                }
                return { ...d, p: np };
            }));
        }
    };

    const onMouseUp = () => setDrag({ type: null });
    const onMouseLeave = () => { setDrag({ type: null }); setCursor(c => ({ ...c, visible: false })); };

    // Use ref-based wheel handler to prevent page scroll
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleWheel = (e) => {
            e.preventDefault();
            e.stopPropagation();
            const f = e.deltaY > 0 ? 1.1 : 0.9;
            const span = viewRange.end - viewRange.start;
            const center = (viewRange.start + viewRange.end) / 2;
            const ns = Math.min(Math.max(span * f, 20), ohlcv.length);
            const start=Math.max(0,Math.min(ohlcv.length-1,center-ns/2));setViewRange({start,end:start+ns});
        };

        canvas.addEventListener('wheel', handleWheel, { passive: false });
        return () => canvas.removeEventListener('wheel', handleWheel);
    }, [viewRange, ohlcv.length]);

    const onDoubleClick = e => {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const L = getLayout();
        if (!L) return;

        // Double-click on y-axis resets to auto-scale
        if (x >= L.cW) {
            setYTransform({ zoom: 1.0, auto: true, offset: 0 });
        }
    };

    const getCursor = () => {
        if (tool !== 'Cursor') return wipDrawing ? 'crosshair' : 'cell';
        if (drag.type === 'yaxis') return 'ns-resize';
        if (drag.type === 'pan') return 'grabbing';
        if (drag.type === 'move') return 'move';
        if (drag.type === 'resize') return 'nwse-resize';
        const L = getLayout();
        if (L && cursor.visible) {
            // On y-axis sidebar
            if (cursor.x >= L.cW) return 'ns-resize';
            const hit = hitTest(cursor.x, cursor.y, L);
            if (hit.d) return hit.pi >= 0 ? 'nwse-resize' : 'move';
        }
        return 'crosshair';
    };

    return (
        <div ref={containerRef} style={{ position: 'relative' }}>
            <canvas aria-label="Interactive price chart. Drag to pan, scroll to zoom, drag the price axis to scale." tabIndex={0} ref={canvasRef} onPointerDown={onMouseDown} onPointerMove={onMouseMove} onPointerUp={onMouseUp} onPointerCancel={onMouseUp} onPointerLeave={e => { if (!e.currentTarget.hasPointerCapture(e.pointerId)) onMouseLeave(); }} onDoubleClick={onDoubleClick} style={{ cursor: getCursor(), display: 'block', touchAction: 'none', maxWidth: '100%' }} />
            {selectedDrawing && (
                <DrawingToolbox
                    drawing={selectedDrawing}
                    onUpdate={handleUpdateDrawing}
                    onDelete={handleDeleteDrawing}
                    onClose={() => setSelectedId(null)}
                />
            )}
        </div>
    );
}


export { Chart as LegacyCanvasChart, Toolbar as LegacyToolbar, TOOLS };
