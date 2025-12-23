const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const mcpTools = [
  { name: 'gmail', description: 'Emails Gmail', inputSchema: { type: 'object', properties: { action: { type: 'string' }, query: { type: 'string' } } } },
  { name: 'calendar', description: 'Google Calendar', inputSchema: { type: 'object', properties: { action: { type: 'string' }, query: { type: 'string' } } } },
  { name: 'notion', description: 'Pages Notion', inputSchema: { type: 'object', properties: { action: { type: 'string' }, query: { type: 'string' } } } },
  { name: 'drive', description: 'Google Drive', inputSchema: { type: 'object', properties: { action: { type: 'string' }, query: { type: 'string' } } } }
];

app.get('/', (req, res) => res.json({ status: 'ok', name: 'MCP Hub Universal' }));
app.get('/health', (req, res) => res.json({ status: 'ok', authenticated: true }));
app.get('/tools', (req, res) => res.json({ tools: mcpTools }));

app.post('/mcp', (req, res) => {
  const { method, params, id } = req.body;
  
  if (method === 'initialize') {
    return res.json({ jsonrpc: '2.0', id, result: { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'mcp-hub-universal', version: '1.0.0' } } });
  }
  
  if (method === 'tools/list') {
    return res.json({ jsonrpc: '2.0', id, result: { tools: mcpTools } });
  }
  
  if (method === 'tools/call') {
    const { name, arguments: args } = params || {};
    return res.json({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify({ tool: name, args, message: 'OK' }) }] } });
  }
  
  res.json({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } });
});

app.listen(PORT, () => console.log('MCP Hub running on port ' + PORT));
