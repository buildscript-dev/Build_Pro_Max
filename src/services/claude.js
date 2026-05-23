export async function callClaude(messages, maxTokens = 400) {
  try {
    const res = await fetch('/api/claude', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, max_tokens: maxTokens }),
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    // Anthropic response: { content: [{ type: 'text', text: '...' }] }
    return data.content?.[0]?.text?.trim() || null;
  } catch {
    return null;
  }
}

export async function checkClaudeStatus() {
  try {
    const res = await fetch('/api/claude/status', { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { online: false };
    const data = await res.json();
    return { online: data.configured === true };
  } catch {
    return { online: false };
  }
}
