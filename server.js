const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Stockage des outils MCP
const mcpTools = {
  gmail: {
    name: 'gmail',
    description: 'Rechercher et lire des emails Gmail',
    enabled: true,
    actions: ['search', 'read', 'send']
  },
  calendar: {
    name: 'calendar',
    description: 'Gérer Google Calendar',
    enabled: true,
    actions: ['list_events', 'create_event', 'delete_event']
  },
  notion: {
    name: 'notion',
    description: 'Gérer les pages Notion',
    enabled: true,
    actions: ['search', 'create_page', 'update_page']
  },
  drive: {
    name: 'drive',
    description: 'Gérer Google Drive',
    enabled: true,
    actions: ['list_files', 'search', 'download']
  }
};

// ============ ROUTES MCP ============

// Health check
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    name: 'MCP Hub Universal',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    authenticated: true,
    timestamp: new Date().toISOString()
  });
});

// Liste tous les outils disponibles (MCP standard)
app.get('/tools', (req, res) => {
  const tools = Object.values(mcpTools).map(tool => ({
    name: tool.name,
    description: tool.description,
    inputSchema: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: tool.actions,
          description: `Action à effectuer: ${tool.actions.join(', ')}`
        },
        query: {
          type: 'string',
          description: 'Paramètre de recherche ou données'
        }
      },
      required: ['action']
    }
  }));

  res.json({ tools });
});

// SSE Endpoint pour MCP
app.get('/sse', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Envoie la liste des outils
  const toolsData = {
    type: 'tools',
    tools: Object.values(mcpTools)
  };
  res.write(`data: ${JSON.stringify(toolsData)}\n\n`);

  // Keep alive
  const keepAlive = setInterval(() => {
    res.write(`: keep-alive\n\n`);
  }, 30000);

  req.on('close', () => {
    clearInterval(keepAlive);
  });
});

// Endpoint pour appeler un outil
app.post('/call', async (req, res) => {
  const { tool, action, params } = req.body;

  if (!mcpTools[tool]) {
    return res.status(404).json({ error: `Tool '${tool}' not found` });
  }

  // Simuler les réponses pour l'instant
  // Plus tard on connectera les vraies APIs
  const responses = {
    gmail: {
      search: { emails: [{ subject: 'Test email', from: 'test@example.com' }] },
      read: { content: 'Contenu de l\'email...' },
      send: { success: true, messageId: '12345' }
    },
    calendar: {
      list_events: { events: [{ title: 'Réunion', date: '2025-12-24' }] },
      create_event: { success: true, eventId: '67890' },
      delete_event: { success: true }
    },
    notion: {
      search: { pages: [{ title: 'Ma page', id: 'abc123' }] },
      create_page: { success: true, pageId: 'def456' },
      update_page: { success: true }
    },
    drive: {
      list_files: { files: [{ name: 'Document.pdf', id: 'file123' }] },
      search: { files: [] },
      download: { success: true, url: 'https://...' }
    }
  };

  const result = responses[tool]?.[action] || { message: 'Action executed' };
  res.json({ success: true, tool, action, result });
});

// ============ GMAIL ENDPOINTS ============

app.post('/gmail/search', (req, res) => {
  const { query, maxResults = 5 } = req.body;
  res.json({
    success: true,
    message: `Gmail search for: ${query}`,
    note: 'Connectez vos credentials Google pour activer'
  });
});

// ============ CALENDAR ENDPOINTS ============

app.post('/calendar/events', (req, res) => {
  const { maxResults = 10 } = req.body;
  res.json({
    success: true,
    message: 'Calendar events',
    note: 'Connectez vos credentials Google pour activer'
  });
});

// ============ NOTION ENDPOINTS ============

app.post('/notion/search', (req, res) => {
  const { query } = req.body;
  res.json({
    success: true,
    message: `Notion search for: ${query}`,
    note: 'Connectez votre token Notion pour activer'
  });
});

// ============ DRIVE ENDPOINTS ============

app.post('/drive/list', (req, res) => {
  const { query } = req.body;
  res.json({
    success: true,
    message: 'Drive files list',
    note: 'Connectez vos credentials Google pour activer'
  });
});

// Démarrer le serveur
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 MCP Hub Universal running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 Tools list: http://localhost:${PORT}/tools`);
  console.log(`📡 SSE endpoint: http://localhost:${PORT}/sse`);
});
