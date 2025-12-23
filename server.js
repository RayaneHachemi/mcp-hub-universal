const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Liste des outils MCP
const mcpTools = [
  {
    name: 'gmail',
    description: 'Rechercher et lire des emails Gmail',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['search', 'read', 'send'] },
        query: { type: 'string', description: 'Recherche ou contenu' }
      },
      required: ['action']
    }
  },
  {
    name: 'calendar',
    description: 'Gérer Google Calendar',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list_events', 'create_event', 'delete_event'] },
        query: { type: 'string' }
      },
      required: ['action']
    }
  },
  {
    name: 'notion',
    description: 'Gérer les pages Notion',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['search', 'create_page', 'update_page'] },
        query: { type: 'string' }
      },
      required: ['action']
    }
  },
  {
    name: 'drive',
    description: 'Gérer Google Drive',
    inputSchema: {
      type: 'object',
      properties: {
        action: { type: 'string', enum: ['list_files', 'search', 'download'] },
        query: { type: 'string' }
      },
      required: ['action']
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

app.get('/tools', (req, res) => {
  res.json({ tools: mcpTools });
});

// ============ MCP HTTP STREAMABLE ============

app.post('/mcp', handleMcpRequest);
app.post('/mcp/message', handleMcpRequest);

function handleMcpRequest(req, res) {
  const { jsonrpc, id, method, params } = req.body;

  // Réponse JSON-RPC
  const respond = (result) => {
    res.json({ jsonrpc: '2.0', id, result });
  };

  const respondError = (code, message) => {
    res.json({ jsonrpc: '2.0', id, error: { code, message } });
  };

  // Initialize
  if (method === 'initialize') {
    return respond({
      protocolVersion: '2024-11-05',
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: 'mcp-hub-universal', version: '1.0.0' }
    });
  }

  // List tools
  if (method === 'tools/list') {
    return respond({ tools: mcpTools });
  }

  // Call tool
  if (method === 'tools/call') {
    const { name, arguments: args } = params || {};
    
    const results = {
      gmail: {
        search: { emails: [{ subject: 'Email test', from: 'test@example.com', snippet: 'Contenu...' }] },
        read: { content: 'Contenu de l\'email' },
        send: { success: true, messageId: '12345' }
      },
      calendar: {
        list_events: { events: [{ title: 'Réunion', start: '2025-12-24T10:00:00', end: '2025-12-24T11:00:00' }] },
        create_event: { success: true, eventId: '67890' },
        delete_event: { success: true }
      },
      notion: {
        search: { pages: [{ title: 'Ma page Notion', id: 'page123' }] },
        create_page: { success: true, pageId: 'newpage456' },
        update_page: { success: true }
      },
      drive: {
        list_files: { files: [{ name: 'Document.pdf', id: 'file123', mimeType: 'application/pdf' }] },
        search: { files: [{ name: 'Résultat.docx', id: 'file456' }] },
        download: { success: true, downloadUrl: 'https://...' }
      }
    };

    const action = args?.action || 'search';
    const result = results[name]?.[action] || { message: `${name}.${action} exécuté` };

    return respond({
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
    });
  }

  // Notifications (ignore)
  if (method === 'notifications/initialized') {
    return res.status(204).send();
  }

  return respondError(-32601, `Method not found: ${method}`);
}

// ============ ENDPOINTS DIRECTS ============

app.post('/call', (req, res) => {
  const { tool, action, params } = req.body;
  res.json({ success: true, tool, action, params, message: 'Connectez vos APIs pour activer' });
});

app.post('/gmail/search', (req, res) => {
  res.json({ success: true, emails: [{ subject: 'Test', from: 'test@test.com' }] });
});

app.post('/calendar/events', (req, res) => {
  res.json({ success: true, events: [{ title: 'Event', date: '2025-12-24' }] });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 MCP Hub Universal running on port ${PORT}`);
  console.log(`📡 MCP Endpoint: http://localhost:${PORT}/mcp`);
});
```

5. Clique **"Commit changes"** → **"Commit changes"**

---

## Étape 2 : Attendre le redéploiement (2-3 min)

---

## Étape 3 : Connecter à N8N

Dans ton nœud **MCP Tool** de N8N :

**URL :**
```
https://mcp-hub-universal.onrender.com/mcp
