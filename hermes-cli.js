import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import inquirer from 'inquirer';
import { exec } from 'child_process';
import util from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = util.promisify(exec);

// --- Initialization ---
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
let openRouterKey = process.env.OPENROUTER_API_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase URL or Anon Key in .env. Exiting.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// --- Session Cache ---
const SESSION_FILE = path.join(process.cwd(), '.hermes_session.json');

async function getCachedSession() {
  try {
    const data = await fs.readFile(SESSION_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    return null;
  }
}

async function saveSession(session) {
  await fs.writeFile(SESSION_FILE, JSON.stringify(session), 'utf-8');
}

// --- AI Engine ---
const OPENROUTER_API = 'https://openrouter.ai/api/v1/chat/completions';

function buildSystemPrompt() {
  return `You are Hermes, an advanced local autonomous developer agent running directly in the user's terminal.
You have native access to their OS and file system.
Your purpose is to help the user code, manage their local tasks, and explore their machine.

CRITICAL: You can execute ACTIONS directly by outputting a token anywhere in your response:
[action: <ActionName>, <JSONParams>]

Available Developer Actions (EXECUTES ON LOCAL OS):
- [action: run_command, {"cmd": "..."}] (Runs a bash command)
- [action: read_file, {"path": "..."}] (Reads a file)
- [action: write_file, {"path": "...", "content": "..."}] (Writes a file)

Available Productivity Actions (SYNCED TO SUPABASE):
- [action: addTask, {"title":"...","priority":"P0|P1|P2","due":"Today|Tomorrow"}]
- [action: addNote, {"title":"...","content":"..."}]

When the user asks you to do something, do it autonomously by providing the action token. Place the action at the end of your response on its own line.
Always be concise, professional, and act as a skilled engineer.`;
}

async function generateAiResponse(userMessage, chatHistory = []) {
  if (!openRouterKey) {
    return "I am missing the OpenRouter API Key in my environment. I cannot process this without it.";
  }

  const messages = [
    { role: 'system', content: buildSystemPrompt() },
    ...chatHistory,
    { role: 'user', content: userMessage }
  ];

  try {
    const res = await fetch(OPENROUTER_API, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'Hermes Terminal'
      },
      body: JSON.stringify({
        model: 'mistralai/mistral-7b-instruct:free', // Default fast model
        messages
      })
    });
    
    if (!res.ok) {
      throw new Error(`API Error: ${res.status}`);
    }
    const data = await res.json();
    return data.choices[0].message.content;
  } catch (err) {
    return `[LLM Error]: ${err.message}`;
  }
}

// --- Chat Loop ---
let history = [];
let userSession = null;

async function executeAction(type, params) {
  try {
    switch (type) {
      case 'run_command': {
        const { cmd } = params;
        const { confirm } = await inquirer.prompt([{
          type: 'confirm',
          name: 'confirm',
          message: `Hermes wants to run: \`${cmd}\`. Allow?`,
          default: true
        }]);
        if (!confirm) return "[Tool Result - run_command]: Cancelled by user.";
        
        const { stdout, stderr } = await execAsync(cmd, { cwd: process.cwd() });
        return `[Tool Result - run_command]:\n${stdout || 'Success'}\n${stderr ? 'Errors:\n' + stderr : ''}`;
      }
      case 'read_file': {
        const { path: filePath } = params;
        const content = await fs.readFile(path.resolve(process.cwd(), filePath), 'utf-8');
        return `[Tool Result - read_file]:\n${content}`;
      }
      case 'write_file': {
        const { path: filePath, content } = params;
        const absPath = path.resolve(process.cwd(), filePath);
        await fs.mkdir(path.dirname(absPath), { recursive: true });
        await fs.writeFile(absPath, content, 'utf-8');
        return `[Tool Result - write_file]: File ${filePath} written successfully.`;
      }
      case 'addTask': {
        if (!userSession) return "[Tool Result - addTask]: No authenticated user.";
        const { error } = await supabase.from('tasks').insert([{
          user_id: userSession.user.id,
          title: params.title,
          priority: params.priority || 'P2',
          status: 'todo'
        }]);
        return error ? `[Tool Result - addTask]: Failed ${error.message}` : "[Tool Result - addTask]: Task added to Supabase.";
      }
      case 'addNote': {
        if (!userSession) return "[Tool Result - addNote]: No authenticated user.";
        const { error } = await supabase.from('notes').insert([{
          user_id: userSession.user.id,
          title: params.title,
          content: params.content || '',
        }]);
        return error ? `[Tool Result - addNote]: Failed ${error.message}` : "[Tool Result - addNote]: Note added to Supabase.";
      }
      default:
        return `[Tool Result]: Unknown action ${type}`;
    }
  } catch (err) {
    return `[Tool Error - ${type}]: ${err.message}`;
  }
}

async function startChat() {
  console.log('\n--- 🧠 Hermes Terminal Online ---\n');
  
  while (true) {
    const { input } = await inquirer.prompt([{
      type: 'input',
      name: 'input',
      message: 'You:'
    }]);

    if (input.toLowerCase() === 'exit' || input.toLowerCase() === 'quit') {
      console.log('Hermes powering down...');
      break;
    }

    process.stdout.write('Hermes is thinking...\r');
    
    let response = await generateAiResponse(input, history);
    process.stdout.write('                     \r'); // clear thinking text
    
    console.log(`\nHermes: ${response}\n`);

    const actionRegex = /\[action:\s*(\w+)\s*,\s*([^\]]+)\]/gi;
    let match;
    let toolResults = [];

    while ((match = actionRegex.exec(response || '')) !== null) {
      const type = match[1];
      const params = JSON.parse(match[2]);
      const res = await executeAction(type, params);
      console.log(`\x1b[36m${res}\x1b[0m\n`); // Cyan color for system messages
      toolResults.push(res);
    }

    history.push({ role: 'user', content: input });
    history.push({ role: 'assistant', content: response });

    if (toolResults.length > 0) {
      process.stdout.write('Hermes is processing results...\r');
      const systemMsg = toolResults.join('\n\n');
      const followup = await generateAiResponse(`I executed your tools. Here are the results:\n${systemMsg}\n\nPlease summarize or continue.`, history);
      process.stdout.write('                                 \r');
      console.log(`Hermes: ${followup}\n`);
      history.push({ role: 'assistant', content: followup });
    }
  }
}

async function main() {
  if (!openRouterKey) {
    const { key } = await inquirer.prompt([{
      type: 'password',
      name: 'key',
      message: 'Enter OpenRouter API Key:'
    }]);
    openRouterKey = key;
  }

  const cached = await getCachedSession();
  if (cached) {
    const { data: { session }, error } = await supabase.auth.setSession(cached);
    if (!error && session) userSession = session;
  }

  if (!userSession) {
    console.log('You need to authenticate to sync tasks and notes to Supabase.');
    const { email, password } = await inquirer.prompt([
      { type: 'input', name: 'email', message: 'Email:' },
      { type: 'password', name: 'password', message: 'Password:' }
    ]);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error('Login failed:', error.message);
      console.log('Continuing without Supabase sync. Tasks and notes will fail.');
    } else {
      userSession = data.session;
      await saveSession(data.session);
      console.log('Logged in successfully!');
    }
  }

  await startChat();
}

main();
