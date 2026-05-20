import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

function genId() { return Math.random().toString(36).slice(2, 9); }

function escapeHtml(t) {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inlineMdToHtml(text) {
  if (!text) return '';
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/~~(.+?)~~/g, '<s>$1</s>')
    .replace(/`(.+?)`/g, '<code class="ne-code">$1</code>')
    .replace(/\[(.+?)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="ne-link">$1</a>');
}

function htmlToInlineMd(html) {
  if (!html) return '';
  return html
    .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
    .replace(/<b>(.*?)<\/b>/gi, '**$1**')
    .replace(/<em>(.*?)<\/em>/gi, '*$1*')
    .replace(/<i>(.*?)<\/i>/gi, '*$1*')
    .replace(/<s>(.*?)<\/s>/gi, '~~$1~~')
    .replace(/<del>(.*?)<\/del>/gi, '~~$1~~')
    .replace(/<u>(.*?)<\/u>/gi, '$1')
    .replace(/<code[^>]*>(.*?)<\/code>/gi, '`$1`')
    .replace(/<a[^>]+href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/<[^>]+>/g, '');
}

function htmlToText(html) {
  if (!html) return '';
  return html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '');
}

// ─────────────────────────────────────────────────────────────────────────────
// Markdown ↔ Blocks
// ─────────────────────────────────────────────────────────────────────────────

export function markdownToBlocks(md) {
  if (!md?.trim()) return [{ id: genId(), type: 'p', html: '', text: '' }];
  const lines = md.split('\n');
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) { i++; continue; }

    if (line.trimStart().startsWith('```')) {
      const lang = line.trimStart().slice(3).trim() || 'code';
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      blocks.push({ id: genId(), type: 'code', html: codeLines.join('\n'), text: codeLines.join('\n'), lang });
    } else if (line.trimStart().startsWith(':::container')) {
      const linesArr = [];
      i++;
      while (i < lines.length && !lines[i].trimStart().startsWith(':::')) {
        linesArr.push(lines[i]);
        i++;
      }
      const ctext = linesArr.join('\n');
      blocks.push({ id: genId(), type: 'container', html: ctext, text: ctext });
    } else if (line.startsWith('### ')) {
      blocks.push({ id: genId(), type: 'h3', html: line.slice(4), text: line.slice(4) });
    } else if (line.startsWith('## ')) {
      blocks.push({ id: genId(), type: 'h2', html: line.slice(3), text: line.slice(3) });
    } else if (line.startsWith('# ')) {
      blocks.push({ id: genId(), type: 'h1', html: line.slice(2), text: line.slice(2) });
    } else if (line.startsWith('- [x] ') || line.startsWith('- [X] ')) {
      blocks.push({ id: genId(), type: 'todo', html: line.slice(6), text: line.slice(6), checked: true });
    } else if (line.startsWith('- [ ] ')) {
      blocks.push({ id: genId(), type: 'todo', html: line.slice(6), text: line.slice(6), checked: false });
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      blocks.push({ id: genId(), type: 'bullet', html: line.slice(2), text: line.slice(2) });
    } else if (/^\d+\. /.test(line)) {
      const m = line.match(/^(\d+)\. (.*)/);
      if (m) blocks.push({ id: genId(), type: 'numbered', html: m[2], text: m[2], number: +m[1] });
    } else if (line.startsWith('> ')) {
      blocks.push({ id: genId(), type: 'quote', html: line.slice(2), text: line.slice(2) });
    } else if (line.trim() === '---' || line.trim() === '***') {
      blocks.push({ id: genId(), type: 'divider', html: '', text: '' });
    } else if (/^!\[.*?\]\(.*?\)/.test(line)) {
      const m = line.match(/^!\[(.*?)\]\((.*?)\)/);
      blocks.push({ id: genId(), type: 'image', html: '', text: '', alt: m?.[1] || '', url: m?.[2] || '' });
    } else {
      const html = inlineMdToHtml(line);
      blocks.push({ id: genId(), type: 'p', html, text: line });
    }
    i++;
  }

  return blocks.length > 0 ? blocks : [{ id: genId(), type: 'p', html: '', text: '' }];
}

export function blocksToMarkdown(blocks) {
  return blocks.map(b => {
    const text = b.type === 'p' ? htmlToInlineMd(b.html) : (b.text || htmlToText(b.html));
    switch (b.type) {
      case 'h1': return `# ${text}`;
      case 'h2': return `## ${text}`;
      case 'h3': return `### ${text}`;
      case 'bullet': return `- ${text}`;
      case 'numbered': return `${b.number ?? 1}. ${text}`;
      case 'todo': return `- [${b.checked ? 'x' : ' '}] ${text}`;
      case 'quote': return `> ${text}`;
      case 'code': return '```' + (b.lang && b.lang !== 'code' ? b.lang : '') + '\n' + (b.text || '') + '\n```';
      case 'container': return `:::container\n${b.text || ''}\n:::`;
      case 'divider': return '---';
      case 'image': return `![${b.alt || ''}](${b.url || ''})`;
      default: return text;
    }
  }).filter(s => s != null).join('\n\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Style helpers
// ─────────────────────────────────────────────────────────────────────────────

function wrapStyle(type) {
  const base = { position: 'relative', margin: 0 };
  switch (type) {
    case 'h1': return { ...base, marginTop: 20, marginBottom: 2 };
    case 'h2': return { ...base, marginTop: 14, marginBottom: 2 };
    case 'h3': return { ...base, marginTop: 10, marginBottom: 2 };
    case 'bullet':
    case 'numbered': return { ...base, display: 'flex', alignItems: 'flex-start', gap: 8 };
    case 'todo': return { ...base, display: 'flex', alignItems: 'flex-start', gap: 8 };
    case 'code': return { ...base, marginTop: 6, marginBottom: 6 };
    case 'container': return { ...base, padding: 14, background: 'rgba(26,20,16,.04)', border: '0.5px solid var(--ink-line)', borderRadius: 10, margin: '8px 0' };
    case 'quote': return { ...base, borderLeft: '3px solid var(--accent-orange)', paddingLeft: 14, margin: '2px 0' };
    case 'image': return { ...base, margin: '6px 0' };
    case 'divider': return { ...base, margin: '10px 0' };
    default: return base;
  }
}

function editStyle(type, checked) {
  const base = { outline: 'none', wordBreak: 'break-word', minHeight: '1.4em', color: 'var(--ink-1)' };
  switch (type) {
    case 'h1': return { ...base, fontSize: 28, fontWeight: 700, lineHeight: 1.25, letterSpacing: '-0.02em', fontFamily: 'var(--font-display)' };
    case 'h2': return { ...base, fontSize: 22, fontWeight: 650, lineHeight: 1.3 };
    case 'h3': return { ...base, fontSize: 17, fontWeight: 600, lineHeight: 1.4 };
    case 'bullet':
    case 'numbered': return { ...base, flex: 1, fontSize: 15, lineHeight: 1.65 };
    case 'todo': return { ...base, flex: 1, fontSize: 15, lineHeight: 1.65, textDecoration: checked ? 'line-through' : 'none', color: checked ? 'var(--ink-3)' : 'var(--ink-1)' };
    case 'quote': return { ...base, fontSize: 15, lineHeight: 1.7, fontStyle: 'italic', color: 'var(--ink-2)' };
    case 'code': return { ...base, fontFamily: '"Fira Code","Cascadia Code","Courier New",monospace', fontSize: 13, lineHeight: 1.65, whiteSpace: 'pre-wrap', wordBreak: 'break-all' };
    case 'container': return { ...base, fontSize: 14, lineHeight: 1.65, whiteSpace: 'pre-wrap', minHeight: 60 };
    default: return { ...base, fontSize: 15, lineHeight: 1.7 };
  }
}

function placeholder(type, isFirst) {
  if (isFirst && type === 'p') return "Start writing, or type / for commands…";
  switch (type) {
    case 'h1': return 'Heading 1';
    case 'h2': return 'Heading 2';
    case 'h3': return 'Heading 3';
    case 'bullet': return 'List item…';
    case 'numbered': return 'List item…';
    case 'todo': return 'To-do item…';
    case 'quote': return 'Empty quote…';
    case 'container': return 'Container... (Shift+Enter for newline)';
    case 'code': return 'Enter code…';
    case 'image': return '';
    case 'divider': return '';
    default: return "Type / for commands…";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// NoteEditor
// ─────────────────────────────────────────────────────────────────────────────

export function NoteEditor({ value = '', onChange, readOnly = false }) {
  const [blocks, setBlocks] = useState(() => markdownToBlocks(value));
  const [formatBar, setFormatBar] = useState(null); // { top, left }
  const blockRefs = useRef({});
  const editorRef = useRef(null);
  const serializedRef = useRef(value);
  const blocksRef = useRef(blocks);
  const slashRef = useRef(null);

  // Always keep blocksRef current so keydown handlers read fresh state
  useEffect(() => { blocksRef.current = blocks; }, [blocks]);

  // Sync incoming value → blocks when note switches or external update
  useEffect(() => {
    if (value !== serializedRef.current) {
      setBlocks(markdownToBlocks(value));
      serializedRef.current = value;
    }
  }, [value]);

  const debounceRef = useRef(null);

  // Serialize blocks → markdown → fire onChange
  const serialize = useCallback((nextBlocks) => {
    const md = blocksToMarkdown(nextBlocks);
    if (md !== serializedRef.current) {
      serializedRef.current = md;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onChange?.(md);
      }, 300);
    }
  }, [onChange]);

  // Focus a block (by DOM ref)
  const focusBlock = useCallback((id, atEnd = true) => {
    requestAnimationFrame(() => {
      const el = blockRefs.current[id];
      if (!el?.focus) return;
      el.focus();
      try {
        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(el);
        range.collapse(!atEnd);
        sel.removeAllRanges();
        sel.addRange(range);
      } catch { /* ignore */ }
    });
  }, []);

  // Get cursor text-offset inside an element
  const cursorOffset = (el) => {
    try {
      const sel = window.getSelection();
      if (!sel?.rangeCount || !el.contains(sel.anchorNode)) return 0;
      const range = sel.getRangeAt(0);
      const pre = range.cloneRange();
      pre.selectNodeContents(el);
      pre.setEnd(range.startContainer, range.startOffset);
      return pre.toString().length;
    } catch { return 0; }
  };

  // Extract HTML before/after cursor for splitting
  const splitAtCursor = (el) => {
    try {
      const sel = window.getSelection();
      if (!sel?.rangeCount) return { before: el.innerHTML, after: '' };
      const range = sel.getRangeAt(0);

      const beforeRange = range.cloneRange();
      beforeRange.selectNodeContents(el);
      beforeRange.setEnd(range.startContainer, range.startOffset);
      const beforeEl = document.createElement('div');
      beforeEl.appendChild(beforeRange.cloneContents());

      const afterRange = range.cloneRange();
      afterRange.selectNodeContents(el);
      afterRange.setStart(range.endContainer, range.endOffset);
      const afterEl = document.createElement('div');
      afterEl.appendChild(afterRange.cloneContents());

      return { before: beforeEl.innerHTML, after: afterEl.innerHTML };
    } catch { return { before: el.innerHTML, after: '' }; }
  };

  // ── Selection toolbar ──────────────────────────────────────────────────────
  useEffect(() => {
    const onSel = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount || !editorRef.current?.contains(sel.anchorNode)) {
        setFormatBar(null);
        return;
      }
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      const edRect = editorRef.current.getBoundingClientRect();
      if (!rect.width) { setFormatBar(null); return; }
      setFormatBar({ top: rect.top - edRect.top - 48, left: rect.left - edRect.left + rect.width / 2 });
    };
    document.addEventListener('selectionchange', onSel);
    return () => document.removeEventListener('selectionchange', onSel);
  }, []);

  // Close format bar on click outside
  useEffect(() => {
    const handler = (e) => {
      // Allow format bar buttons to be clicked
      if (e.target.closest('button')) return;
      if (editorRef.current && !editorRef.current.contains(e.target)) {
        setFormatBar(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const autoConvert = useCallback((blockId, newType) => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === blockId);
      if (idx < 0) return prev;
      const newId = genId();
      const next = [...prev];
      next[idx] = { id: newId, type: newType, html: '', text: '', checked: false, url: '', alt: '', lang: 'code', number: newType === 'numbered' ? 1 : undefined };
      setTimeout(() => focusBlock(newId), 20);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => onChange?.(blocksToMarkdown(next)), 300);
      return next;
    });
  }, [focusBlock, onChange]);

  // ── onInput ────────────────────────────────────────────────────────────────
  const handleInput = useCallback((blockId, el) => {
    const blockType = blocksRef.current.find(b => b.id === blockId)?.type || 'p';
    const isRich = blockType === 'p' || blockType === 'container';
    const html = isRich ? (el.innerHTML || '') : (el.textContent || '');
    const text = el.textContent || '';

    // Quick auto-convert commands
    if (text === '/h' || text === '/h1') { autoConvert(blockId, 'h1'); return; }
    if (text === '/h2') { autoConvert(blockId, 'h2'); return; }
    if (text === '/h3') { autoConvert(blockId, 'h3'); return; }
    if (text === '/img') { autoConvert(blockId, 'image'); return; }
    if (text === '/c') { autoConvert(blockId, 'container'); return; }
    if (text === '/quote') { autoConvert(blockId, 'quote'); return; }
    if (text === '/code') { autoConvert(blockId, 'code'); return; }
    if (text === '/todo' || text === '/[]') { autoConvert(blockId, 'todo'); return; }
    if (text === '/bullet' || text === '/-') { autoConvert(blockId, 'bullet'); return; }
    if (text === '/div' || text === '/--') { autoConvert(blockId, 'divider'); return; }

    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === blockId);
      if (idx < 0) return prev;
      const next = [...prev];
      next[idx] = { ...next[idx], html, text };
      serialize(next);
      return next;
    });
  }, [serialize, autoConvert]);

  // ── onKeyDown ──────────────────────────────────────────────────────────────
  const handleKeyDown = useCallback((e, blockId) => {
    const el = blockRefs.current[blockId];
    const currentBlocks = blocksRef.current;
    const idx = currentBlocks.findIndex(b => b.id === blockId);
    const block = currentBlocks[idx];
    if (!block) return;

    // Keyboard shortcuts
    if (e.metaKey || e.ctrlKey) {
      if (e.key === 'b' && !e.shiftKey) { e.preventDefault(); document.execCommand('bold'); return; }
      if (e.key === 'i' && !e.shiftKey) { e.preventDefault(); document.execCommand('italic'); return; }
      if (e.key === 'u' && !e.shiftKey) { e.preventDefault(); document.execCommand('underline'); return; }
      if (e.key === 'k') {
        e.preventDefault();
        const url = window.prompt('Enter link URL:');
        if (url) document.execCommand('createLink', false, url);
        return;
      }
    }

    // Enter — create new block or split
    if (e.key === 'Enter' && !e.shiftKey) {
      if (block.type === 'code' || block.type === 'container') return; // let browser handle newline
      e.preventDefault();

      const isEmpty = !block.text?.trim();

      // Empty list item → convert to paragraph
      if (isEmpty && (block.type === 'bullet' || block.type === 'numbered' || block.type === 'todo')) {
        const newId = genId();
        setBlocks(prev => {
          const i = prev.findIndex(b => b.id === blockId);
          const next = [...prev];
          next[i] = { ...next[i], id: newId, type: 'p', html: '', text: '' };
          setTimeout(() => focusBlock(newId), 20);
          serialize(next);
          return next;
        });
        return;
      }

      // Split at cursor for paragraph / continue list type
      const { before, after } = el ? splitAtCursor(el) : { before: block.html, after: '' };
      const newId = genId();
      const newType = ['bullet', 'numbered', 'todo'].includes(block.type) ? block.type : 'p';

      setBlocks(prev => {
        const i = prev.findIndex(b => b.id === blockId);
        const next = [...prev];
        next[i] = { ...next[i], html: before, text: htmlToText(before) };
        const newBlock = {
          id: newId, type: newType,
          html: after, text: htmlToText(after),
          checked: false,
          number: block.type === 'numbered' ? (block.number ?? 1) + 1 : undefined,
        };
        next.splice(i + 1, 0, newBlock);
        setTimeout(() => focusBlock(newId, false), 20);
        serialize(next);
        return next;
      });
      return;
    }

    // Backspace
    if (e.key === 'Backspace') {
      const offset = el ? cursorOffset(el) : 0;
      const isEmpty = !block.text?.trim();

      // At start of styled block → convert to paragraph
      if (offset === 0 && !isEmpty && block.type !== 'p') {
        e.preventDefault();
        const newId = genId();
        setBlocks(prev => {
          const i = prev.findIndex(b => b.id === blockId);
          const next = [...prev];
          next[i] = { ...next[i], id: newId, type: 'p' };
          setTimeout(() => focusBlock(newId, false), 20);
          return next;
        });
        return;
      }

      // Empty block (not first) → delete and focus previous
      if (isEmpty && idx > 0) {
        e.preventDefault();
        const prevId = currentBlocks[idx - 1].id;
        setBlocks(prev => {
          const next = prev.filter((_, j) => j !== idx);
          setTimeout(() => focusBlock(prevId), 20);
          serialize(next);
          return next;
        });
        return;
      }
    }

    // Tab — indent list items (simple: add two spaces to text)
    if (e.key === 'Tab' && (block.type === 'bullet' || block.type === 'numbered')) {
      e.preventDefault();
      if (el) document.execCommand('insertText', false, '  ');
    }
  }, [focusBlock, serialize]);

  // ── Format toolbar actions ────────────────────────────────────────────────
  const execFmt = (cmd) => {
    if (cmd === 'link') {
      const url = window.prompt('Link URL (include https://):');
      if (url) document.execCommand('createLink', false, url);
    } else {
      document.execCommand(cmd, false, null);
    }
    setFormatBar(null);
  };

  // ── Todo toggle ───────────────────────────────────────────────────────────
  const toggleTodo = useCallback((blockId) => {
    setBlocks(prev => {
      const next = prev.map(b => b.id === blockId ? { ...b, checked: !b.checked } : b);
      serialize(next);
      return next;
    });
  }, [serialize]);

  // ── Image URL commit ──────────────────────────────────────────────────────
  const commitImage = useCallback((blockId, url) => {
    setBlocks(prev => {
      const next = prev.map(b => b.id === blockId ? { ...b, url, text: `![](${url})` } : b);
      serialize(next);
      return next;
    });
  }, [serialize]);

  // ── Add empty paragraph at end ────────────────────────────────────────────
  const addBlock = () => {
    const newId = genId();
    setBlocks(prev => {
      const next = [...prev, { id: newId, type: 'p', html: '', text: '' }];
      serialize(next);
      return next;
    });
    setTimeout(() => focusBlock(newId), 30);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div ref={editorRef} style={{ position: 'relative', width: '100%' }} className="ne-root">
      {/* Placeholder + inline formatting CSS */}
      <style>{`
        @keyframes neBlockIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: none; } }
        .ne-root [contenteditable]:empty::before { content: attr(data-ph); color: rgba(26,20,16,.26); pointer-events: none; }
        .ne-code { background: rgba(26,20,16,.07); padding: 1px 5px; border-radius: 4px; font-family: monospace; font-size: .88em; }
        .ne-link { color: var(--accent-orange); text-decoration: underline; cursor: pointer; }
        .ne-root [contenteditable]:focus { outline: none; }
        .ne-block { animation: neBlockIn 180ms ease backwards; }
        @media (max-width: 768px) {
          .ne-root [contenteditable] { font-size: 16px !important; }
        }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {blocks.map((block, i) => (
          <BlockRow
            key={block.id}
            block={block}
            isFirst={i === 0}
            blockRef={el => { if (el) blockRefs.current[block.id] = el; }}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onToggleTodo={toggleTodo}
            onImageUrl={commitImage}
            readOnly={readOnly}
          />
        ))}
      </div>

      {/* Click-to-add tap zone */}
      {!readOnly && (
        <div onClick={addBlock} style={{ minHeight: 40, cursor: 'text' }} />
      )}

      {/* Floating format toolbar */}
      {formatBar && (
        <div style={{
          position: 'absolute', top: formatBar.top, left: formatBar.left,
          transform: 'translateX(-50%)', zIndex: 201,
          display: 'flex', alignItems: 'center', gap: 1,
          padding: '4px 5px',
          background: 'rgba(22,16,10,.93)', backdropFilter: 'blur(12px)',
          borderRadius: 9, boxShadow: '0 4px 16px -4px rgba(0,0,0,.35)',
        }}>
          {[
            { cmd: 'bold',          label: 'B',  tip: 'Bold (⌘B)',      s: { fontWeight: 800 } },
            { cmd: 'italic',        label: 'I',  tip: 'Italic (⌘I)',    s: { fontStyle: 'italic' } },
            { cmd: 'underline',     label: 'U',  tip: 'Underline (⌘U)', s: { textDecoration: 'underline' } },
            { cmd: 'strikeThrough', label: 'S',  tip: 'Strike',         s: { textDecoration: 'line-through' } },
            { cmd: 'link',          label: '🔗', tip: 'Link (⌘K)',      s: {} },
            { cmd: 'removeFormat',  label: '✕',  tip: 'Clear format',   s: { opacity: 0.6 } },
          ].map(({ cmd, label, tip, s }) => (
            <button
              key={cmd}
              title={tip}
              onMouseDown={(e) => { e.preventDefault(); execFmt(cmd); }}
              style={{
                background: 'transparent', border: 'none', cursor: 'pointer',
                padding: '3px 8px', borderRadius: 5, fontSize: 13, color: '#fff',
                transition: 'background 80ms', ...s,
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.14)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >{label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BlockRow — single block renderer
// ─────────────────────────────────────────────────────────────────────────────

const BlockRow = React.memo(function BlockRow({
  block, isFirst, blockRef, onInput, onKeyDown, onToggleTodo, onImageUrl, readOnly,
}) {
  const elRef = useRef(null);
  const [imgUrl, setImgUrl] = useState(block.url || '');
  const [editingImg, setEditingImg] = useState(!block.url && block.type === 'image');

  const setRef = useCallback((el) => {
    elRef.current = el;
    blockRef(el);
  }, [blockRef]);

  // Set initial content imperatively — avoids React controlling innerHTML (no cursor jump)
  useLayoutEffect(() => {
    if (!elRef.current || block.type === 'divider' || block.type === 'image') return;
    if (block.type === 'p' || block.type === 'quote' || block.type === 'container') {
      elRef.current.innerHTML = block.html || '';
    } else {
      elRef.current.textContent = block.text || '';
    }
  }, [block.id]); // Only on block ID change (mount or type-switch which generates new id)

  if (block.type === 'divider') {
    return (
      <div className="ne-block" style={{ padding: '4px 0' }}>
        <hr style={{ border: 'none', borderTop: '1.5px solid var(--ink-line)', margin: 0, borderRadius: 2 }} />
      </div>
    );
  }

  if (block.type === 'image') {
    return (
      <div className="ne-block" style={wrapStyle('image')}>
        {block.url && !editingImg ? (
          <div style={{ position: 'relative' }}>
            <img
              src={block.url}
              alt={block.alt || ''}
              onError={e => { e.currentTarget.style.opacity = '0.3'; }}
              style={{ maxWidth: '100%', maxHeight: 380, borderRadius: 10, display: 'block', objectFit: 'cover' }}
            />
            {!readOnly && (
              <button
                onMouseDown={e => e.preventDefault()}
                onClick={() => { setImgUrl(block.url); setEditingImg(true); }}
                style={{
                  position: 'absolute', top: 8, right: 8, background: 'rgba(0,0,0,.52)',
                  border: 'none', borderRadius: 5, color: '#fff', cursor: 'pointer',
                  padding: '3px 9px', fontSize: 11, fontWeight: 500,
                }}
              >Edit URL</button>
            )}
          </div>
        ) : null}
        {(editingImg || !block.url) && !readOnly && (
          <div style={{
            display: 'flex', gap: 8, alignItems: 'center', padding: 14, borderRadius: 10,
            border: '1.5px dashed var(--ink-line)', background: 'rgba(26,20,16,.02)',
          }}>
            <span style={{ fontSize: 20, flexShrink: 0 }}>🖼</span>
            <input
              autoFocus
              placeholder="Paste image URL and press Enter…"
              value={imgUrl}
              onChange={e => setImgUrl(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && imgUrl.trim()) {
                  onImageUrl(block.id, imgUrl.trim());
                  setEditingImg(false);
                }
              }}
              style={{
                flex: 1, padding: '7px 10px', fontSize: 13, borderRadius: 7,
                border: '0.5px solid var(--ink-line)', background: 'rgba(255,252,244,.8)',
                color: 'var(--ink-1)', outline: 'none',
              }}
            />
            <button
              onMouseDown={e => e.preventDefault()}
              onClick={() => { if (imgUrl.trim()) { onImageUrl(block.id, imgUrl.trim()); setEditingImg(false); } }}
              style={{
                padding: '7px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600,
                background: 'var(--accent-orange)', color: '#fff', border: 'none', cursor: 'pointer',
              }}
            >Embed</button>
          </div>
        )}
      </div>
    );
  }

  if (block.type === 'code') {
    return (
      <div className="ne-block" style={wrapStyle('code')}>
        <div style={{ background: 'rgba(26,20,16,.04)', borderRadius: 10, border: '0.5px solid var(--ink-line)', overflow: 'hidden' }}>
          <div style={{ padding: '5px 14px', fontSize: 10, fontWeight: 700, color: 'var(--ink-3)', borderBottom: '0.5px solid var(--ink-line)', textTransform: 'uppercase', letterSpacing: '0.07em', userSelect: 'none' }}>
            {block.lang || 'code'}
          </div>
          <pre
            ref={setRef}
            contentEditable={!readOnly}
            suppressContentEditableWarning
            data-ph={placeholder('code')}
            onInput={e => onInput(block.id, e.currentTarget)}
            onKeyDown={e => onKeyDown(e, block.id)}
            style={{ margin: 0, padding: '12px 16px', ...editStyle('code'), outline: 'none' }}
          />
        </div>
      </div>
    );
  }

  const isListType = block.type === 'bullet' || block.type === 'numbered';

  return (
    <div className="ne-block" style={wrapStyle(block.type)}>
      {/* Bullet prefix */}
      {block.type === 'bullet' && (
        <span style={{ flexShrink: 0, fontSize: 18, color: 'var(--accent-orange)', lineHeight: '1.65', userSelect: 'none', marginTop: 0 }}>•</span>
      )}
      {/* Number prefix */}
      {block.type === 'numbered' && (
        <span style={{ flexShrink: 0, fontSize: 13, fontWeight: 700, color: 'var(--accent-orange)', lineHeight: '1.65', minWidth: 20, textAlign: 'right', userSelect: 'none' }}>
          {block.number ?? 1}.
        </span>
      )}
      {/* Todo checkbox */}
      {block.type === 'todo' && (
        <input
          type="checkbox"
          checked={!!block.checked}
          onChange={() => onToggleTodo(block.id)}
          style={{ marginTop: 3, flexShrink: 0, accentColor: 'var(--accent-orange)', cursor: 'pointer', width: 15, height: 15 }}
        />
      )}
      {/* Content editable */}
      <div
        ref={setRef}
        contentEditable={!readOnly}
        suppressContentEditableWarning
        data-ph={placeholder(block.type, isFirst)}
        onInput={e => onInput(block.id, e.currentTarget)}
        onKeyDown={e => onKeyDown(e, block.id)}
        style={editStyle(block.type, block.checked)}
      />
    </div>
  );
}, (prev, next) =>
  prev.block.id === next.block.id &&
  prev.block.type === next.block.type &&
  prev.block.checked === next.block.checked &&
  prev.block.url === next.block.url &&
  prev.block.number === next.block.number &&
  prev.isFirst === next.isFirst &&
  prev.readOnly === next.readOnly
);
