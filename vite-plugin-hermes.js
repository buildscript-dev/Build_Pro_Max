import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import util from 'util';
import https from 'https';

const execAsync = util.promisify(exec);

const CLAUDE_MODEL = 'claude-sonnet-4-5';

function proxyToAnthropic(reqBody, apiKey) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(reqBody);
    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(); reject(new Error('Anthropic request timeout')); });
    req.write(body);
    req.end();
  });
}

export default function hermesAgentPlugin() {
  return {
    name: 'vite-plugin-hermes',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {

        // ── Claude status check ─────────────────────────────────────
        if (req.url === '/api/claude/status') {
          const apiKey = process.env.ANTHROPIC_API_KEY;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ configured: !!(apiKey && apiKey.trim().startsWith('sk-ant-')) }));
        }

        // ── Claude messages proxy ───────────────────────────────────
        if (req.url === '/api/claude' && req.method === 'POST') {
          const apiKey = process.env.ANTHROPIC_API_KEY;
          if (!apiKey || !apiKey.trim().startsWith('sk-ant-')) {
            res.statusCode = 503;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }));
          }

          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', async () => {
            try {
              const payload = JSON.parse(body);
              const { messages = [], max_tokens = 400 } = payload;

              // Separate system message (Anthropic format requires it outside messages array)
              const systemMsg = messages.find(m => m.role === 'system');
              const chatMessages = messages
                .filter(m => m.role !== 'system')
                .map(m => ({
                  role: m.role === 'ai' ? 'assistant' : m.role,
                  content: m.content || m.text || '',
                }));

              if (chatMessages.length === 0) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ error: 'No chat messages provided' }));
              }

              const anthropicBody = { model: CLAUDE_MODEL, max_tokens, messages: chatMessages };
              if (systemMsg) anthropicBody.system = systemMsg.content;

              const { status, body: responseBody } = await proxyToAnthropic(anthropicBody, apiKey.trim());
              res.statusCode = status;
              res.setHeader('Content-Type', 'application/json');
              res.end(responseBody);
            } catch (e) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: e.message }));
            }
          });
          return;
        }

        // ── Hermes agent actions ────────────────────────────────────
        if (!req.url.startsWith('/api/hermes')) {
          return next();
        }

        if (req.method !== 'POST') {
          res.statusCode = 405;
          return res.end('Method not allowed');
        }

        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', async () => {
          try {
            const payload = JSON.parse(body);
            const { action, args } = payload;

            res.setHeader('Content-Type', 'application/json');

            if (action === 'run_command') {
              const cwd = args.cwd || process.cwd();
              try {
                const { stdout, stderr } = await execAsync(args.cmd, { cwd });
                res.end(JSON.stringify({ success: true, stdout, stderr }));
              } catch (err) {
                res.end(JSON.stringify({ success: false, error: err.message, stdout: err.stdout, stderr: err.stderr }));
              }
            }
            else if (action === 'read_file') {
              const filePath = path.resolve(process.cwd(), args.path);
              try {
                const content = await fs.readFile(filePath, 'utf-8');
                res.end(JSON.stringify({ success: true, content }));
              } catch (err) {
                res.end(JSON.stringify({ success: false, error: err.message }));
              }
            }
            else if (action === 'write_file') {
              const filePath = path.resolve(process.cwd(), args.path);
              try {
                await fs.mkdir(path.dirname(filePath), { recursive: true });
                await fs.writeFile(filePath, args.content, 'utf-8');
                res.end(JSON.stringify({ success: true }));
              } catch (err) {
                res.end(JSON.stringify({ success: false, error: err.message }));
              }
            }
            else {
              res.statusCode = 400;
              res.end(JSON.stringify({ success: false, error: 'Unknown action' }));
            }
          } catch (e) {
            res.statusCode = 500;
            res.end(JSON.stringify({ success: false, error: e.message }));
          }
        });
      });
    }
  };
}
