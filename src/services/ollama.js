// Ollama local LLM service — primary AI provider for Hermes

const getOllamaBase  = () => localStorage.getItem('ollama_url')   || import.meta.env.VITE_OLLAMA_URL   || 'http://localhost:11434';
const getOllamaModel = () => localStorage.getItem('ollama_model') || import.meta.env.VITE_OLLAMA_MODEL || 'gemma3';

export { getOllamaModel };

export function setOllamaModel(model) {
  localStorage.setItem('ollama_model', model);
}

// Returns { online, models: string[], hasGemma3: bool }
export async function checkOllamaStatus() {
  try {
    const res = await fetch(`${getOllamaBase()}/api/tags`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return { online: false, models: [] };
    const data = await res.json();
    const models = (data.models || []).map(m => m.name);
    return {
      online: true,
      models,
      hasGemma3: models.some(m => m.startsWith('gemma3')),
    };
  } catch {
    return { online: false, models: [] };
  }
}

// Pull a model (fires and forgets — use for progress feedback elsewhere)
export async function pullOllamaModel(model, onProgress) {
  try {
    const res = await fetch(`${getOllamaBase()}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: model, stream: true }),
    });
    if (!res.ok) return false;
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value).split('\n').filter(Boolean);
      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          onProgress?.(json);
        } catch {}
      }
    }
    return true;
  } catch {
    return false;
  }
}

// Main chat call via Ollama's OpenAI-compatible endpoint
export async function callOllama(messages, maxTokens = 500) {
  const base  = getOllamaBase();
  const model = getOllamaModel();
  try {
    const res = await fetch(`${base}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature: 0.7,
        stream: false,
      }),
      signal: AbortSignal.timeout(60000), // local models need more time
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}
