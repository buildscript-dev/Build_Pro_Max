export function genId() {
  return Math.random().toString(36).slice(2, 9);
}

const CONTAINER_LAYOUTS = [
  { id: 'hero', label: 'Hero', icon: '📰', w: 360, h: 200,
    desc: 'Heading + paragraph + image side-by-side' },
  { id: 'heading-only', label: 'Heading', icon: 'H1', w: 260, h: 80,
    desc: 'Just a large heading' },
  { id: 'text-only', label: 'Text', icon: '¶', w: 280, h: 140,
    desc: 'Paragraph text block' },
  { id: 'two-column', label: '2-Column', icon: '⬜', w: 380, h: 160,
    desc: 'Two text blocks side by side' },
  { id: 'card', label: 'Card', icon: '📇', w: 280, h: 200,
    desc: 'Header + list + optional image' },
  { id: 'quote', label: 'Quote', icon: '"', w: 280, h: 100,
    desc: 'Blockquote with attribution' },
];

export function getContainerLayouts() {
  return CONTAINER_LAYOUTS;
}

export function createContainerContent(layoutId) {
  const defaults = {
    hero: { header: 'Big Idea', paragraph: 'Supporting text that explains the big idea in more detail. Add your thoughts here.', imageUrl: '' },
    'heading-only': { header: 'Section Title' },
    'text-only': { paragraph: 'Start writing your paragraph here. This is a clean text block for longer-form content.' },
    'two-column': { left: 'Left column content goes here.', right: 'Right column content goes here.' },
    card: { header: 'Card Title', items: ['Item one', 'Item two', 'Item three'], imageUrl: '' },
    quote: { text: 'The best way to predict the future is to create it.', attribution: '— Peter Drucker' },
  };
  return defaults[layoutId] || { header: 'Container', paragraph: '' };
}

export function createElement(type, x, y, opts = {}) {
  const base = {
    id: genId(),
    type,
    x,
    y,
    width: 160,
    height: 60,
    rotation: 0,
    zIndex: Date.now(),
  };
  switch (type) {
    case 'image':
      return { ...base, width: 200, height: 200, url: opts.url || '', alt: opts.alt || '' };
    case 'text':
      return { ...base, content: opts.content || 'Double-click to edit', fontSize: opts.fontSize || 15, color: opts.color || 'var(--ink-1)' };
    case 'sticky':
      return { ...base, content: opts.content || 'New note', color: opts.color || '#fef3c7', width: 180, height: 120 };
    case 'shape':
      return { ...base, shape: opts.shape || 'rect', color: opts.color || 'var(--ink-line)', width: 120, height: 80 };
    case 'container': {
      const layout = CONTAINER_LAYOUTS.find(l => l.id === opts.layout) || CONTAINER_LAYOUTS[0];
      return {
        ...base,
        layout: layout.id,
        width: opts.width || layout.w,
        height: opts.height || layout.h,
        content: opts.content || createContainerContent(layout.id),
      };
    }
    default:
      return base;
  }
}

export function createConnector(fromId, toId) {
  return {
    id: genId(),
    fromId,
    toId,
    fromAnchor: 'right',
    toAnchor: 'left',
    color: 'var(--ink-3)',
    width: 2,
    style: 'solid',
  };
}

let pathIdCounter = 0;
export function createStroke(points, tool = 'pen', color = '#000', width = 3) {
  pathIdCounter++;
  return {
    id: `stroke_${pathIdCounter}_${Date.now()}`,
    points: points.map((p, i) => ({ x: p.x, y: p.y })),
    tool,
    color,
    width,
  };
}

export function getAnchorPoint(el, anchor) {
  if (!el) return { x: 0, y: 0 };
  switch (anchor) {
    case 'top': return { x: el.x + el.width / 2, y: el.y };
    case 'bottom': return { x: el.x + el.width / 2, y: el.y + el.height };
    case 'left': return { x: el.x, y: el.y + el.height / 2 };
    case 'right': return { x: el.x + el.width, y: el.y + el.height / 2 };
    default: return { x: el.x + el.width / 2, y: el.y + el.height / 2 };
  }
}

export function buildConnectorPath(from, to) {
  const dx = to.x - from.x;
  const cpOffset = Math.max(Math.abs(dx) * 0.5, 50);
  return `M ${from.x} ${from.y} C ${from.x + cpOffset} ${from.y}, ${to.x - cpOffset} ${to.y}, ${to.x} ${to.y}`;
}

export function hitTest(px, py, elements) {
  for (let i = elements.length - 1; i >= 0; i--) {
    const e = elements[i];
    if (px >= e.x && px <= e.x + e.width && py >= e.y && py <= e.y + e.height) {
      return e;
    }
  }
  return null;
}
