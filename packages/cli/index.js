import WebSocket from 'ws';
import http from 'http';
import { parseArgs } from 'util';
import chalk from 'chalk';
import logUpdate from 'log-update';

const { values: options } = parseArgs({
  options: {
    token: {
      type: 'string',
      short: 't',
    },
    port: {
      type: 'string',
      short: 'p',
      default: '3000',
    },
    proxy: {
      type: 'string',
      default: 'ws://localhost:8080/_ws',
    }
  },
});

if (!options.token) {
  console.error(chalk.red("Error: --token is required. Grab your token from the ZeroConfig dashboard."));
  process.exit(1);
}

const WS_URL = `${options.proxy}?token=${options.token}`;
const ports = options.port.split(',').map(p => parseInt(p.trim(), 10));
let portIndex = 0;

// CLI State
const state = {
  status: 'connecting',
  latency: 0,
  requests: [], // { method, path, status, time, duration }
  token: options.token
};

function formatStatus(status) {
  if (status === 'online') return chalk.green('online');
  if (status === 'connecting') return chalk.yellow('connecting...');
  return chalk.red('offline');
}

function render() {
  const header = `
${chalk.bold.blue('ZeroConfig')}                                                              (Ctrl+C to quit)

Session Status                ${formatStatus(state.status)}
Agent Token                   ${chalk.cyan(state.token)}
Version                       1.0.0
Latency                       ${state.latency > 0 ? state.latency + 'ms' : 'N/A'}
Web Interface                 ${chalk.underline('http://localhost:3001')}
Forwarding                    ${chalk.underline('http://<subdomain>.localhost:8080')} -> ${chalk.underline(`http://localhost:[${ports.join(',')}]`)}

${chalk.bold('HTTP Requests')}
${chalk.gray('-------------')}
`;

  let reqTable = '';
  if (state.requests.length === 0) {
    reqTable = chalk.gray('Waiting for requests...');
  } else {
    // Show last 10 requests
    const recent = state.requests.slice(0, 10);
    reqTable = recent.map(req => {
      let statusColor = chalk.green;
      if (req.status >= 400) statusColor = chalk.red;
      if (req.status >= 300 && req.status < 400) statusColor = chalk.yellow;
      
      const method = req.method.padEnd(5, ' ');
      const status = statusColor(req.status.toString().padEnd(4, ' '));
      const path = req.path;
      
      return `${method} ${path} ${status}`;
    }).join('\n');
  }

  logUpdate(header + reqTable);
}

// Initial render
render();

function connect() {
  const ws = new WebSocket(WS_URL);

  ws.on('open', () => {
    state.status = 'online';
    render();
  });

  ws.on('message', async (data) => {
    try {
      const msg = JSON.parse(data);
      
      if (msg.type === 'request') {
        const reqStart = Date.now();
        
        const fetchHeaders = {};
        if (msg.headers) {
          for (const [key, value] of Object.entries(msg.headers)) {
            if (key.toLowerCase() !== 'host' && key.toLowerCase() !== 'connection') {
              fetchHeaders[key] = value.join(", ");
            }
          }
        }

        let fetchBody = undefined;
        if (msg.body) {
          fetchBody = Buffer.from(msg.body, 'base64');
        }

        const currentPort = ports[portIndex % ports.length];
        portIndex++;
        const targetUrl = `http://localhost:${currentPort}${msg.path}`;
        
        const reqLog = {
          method: msg.method,
          path: msg.path,
          status: '...',
          time: new Date(),
          duration: 0
        };
        state.requests.unshift(reqLog);
        render();

        try {
          const fetchParams = {
            method: msg.method,
            headers: fetchHeaders,
          };
          if (msg.method !== 'GET' && msg.method !== 'HEAD') {
            fetchParams.body = fetchBody;
          }

          // Native Node fetch (Node 18+)
          const res = await fetch(targetUrl, fetchParams);
          const arrayBuffer = await res.arrayBuffer();
          const base64Body = Buffer.from(arrayBuffer).toString('base64');

          const respHeaders = {};
          res.headers.forEach((value, key) => {
            respHeaders[key] = [value];
          });

          ws.send(JSON.stringify({
            type: 'response',
            requestId: msg.requestId,
            status: res.status,
            headers: respHeaders,
            body: base64Body
          }));

          reqLog.status = res.status;
          reqLog.duration = Date.now() - reqStart;
          state.latency = reqLog.duration;
          render();

        } catch (fetchErr) {
          ws.send(JSON.stringify({
            type: 'response',
            requestId: msg.requestId,
            status: 502,
            headers: { 'Content-Type': ['text/plain'] },
            body: Buffer.from("502 Bad Gateway - Local server refused connection").toString('base64')
          }));

          reqLog.status = 502;
          render();
        }
      }
    } catch (e) {
      // Ignore parse errors
    }
  });

  ws.on('close', () => {
    state.status = 'offline';
    render();
    setTimeout(connect, 3000);
  });

  ws.on('error', () => {
    state.status = 'offline';
    render();
  });
}

connect();
