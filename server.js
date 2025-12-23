const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Liste des outils MCP
const mcpTools = [
  {
    name: 'gmail_search',
    description: 'Rechercher des emails Gmail',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Recherche email' }
      }
    }
  },
  {
    name: 'calendar_events',
    description: 'Lister les événements du calendrier',
    inputSchema: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Nombre de jours' }
      }
    }
  },
  {
    name: 'notion_search',
    description: 'Rechercher dans Notion',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Recherche Notion' }
      }
    }
  }
];

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', name: 'MCP Hub Universal', version: '1.0.0' });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', authenticated: true, timestamp: new Date().toISOString() });
});

// Liste des outils
app.get('/tools', (req, res) => {
  res.json({ tools: mcpTools });
});

// SSE Endpoint pour MCP
app.get('/sse', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  // Envoie immédiatement les outils
  const data = JSON.stringify({ type: 'tools', tools: mcpTools });
  res.write(`data: ${data}\n\n`);

  // Keep alive toutes les 15 secondes
  const keepAlive = setInterval(() => {
    res.write(`:ping\n\n`);
  }, 15000);

  req.on('close', () => {
    clearInterval(keepAlive);
  });
});

// MCP JSON-RPC endpoint (pour N8N)
app.post('/mcp', (req, res) => {
  const { method, params } = req.body;

  if (method === 'tools/list') {
    return res.json({ tools: mcpTools });
  }

  if (method === 'tools/call') {
    const { name, arguments: args } = params;
    return res.json({
      content: [{ type: 'text', text: `Tool ${name} appelé avec: ${JSON.stringify(args)}` }]
    });
  }

  res.json({ error: 'Method not found' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 MCP Hub Universal running on port ${PORT}`);
});
```

7. Clique **"Commit changes"** → **"Commit changes"**

---

## Étape 2 : Attendre le redéploiement

Render redéploie automatiquement. Attends 2-3 minutes.

---

## Étape 3 : Teste à nouveau

Ouvre dans ton navigateur :
```
https://mcp-hub-universal.onrender.com/sse
