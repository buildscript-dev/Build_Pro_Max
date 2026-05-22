import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';
import util from 'util';

const execAsync = util.promisify(exec);

export default function hermesAgentPlugin() {
  return {
    name: 'vite-plugin-hermes',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
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
