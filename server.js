const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// ============ GOOGLE AUTH ============
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN;
const NOTION_TOKEN = process.env.NOTION_TOKEN;

let googleAccessToken = null;
let tokenExpiry = 0;

async function getGoogleAccessToken() {
  if (googleAccessToken && Date.now() < tokenExpiry) {
    return googleAccessToken;
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token'
    })
  });

  const data = await response.json();
  googleAccessToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;
  return googleAccessToken;
}

// ============ GMAIL ============
async function gmailSearch(query, maxResults = 5) {
  const token = await getGoogleAccessToken();
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${encodeURIComponent(query)}&maxResults=${maxResults}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await response.json();
  
  if (!data.messages) return { emails: [] };

  const emails = await Promise.all(
    data.messages.slice(0, maxResults).map(async (msg) => {
      const msgResponse = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=Subject&metadataHeaders=From&metadataHeaders=Date`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const msgData = await msgResponse.json();
      const headers = msgData.payload?.headers || [];
      return {
        id: msg.id,
        subject: headers.find(h => h.name === 'Subject')?.value || 'No subject',
        from: headers.find(h => h.name === 'From')?.value || 'Unknown',
        date: headers.find(h => h.name === 'Date')?.value || ''
      };
    })
  );

  return { emails };
}

// ============ CALENDAR ============
async function calendarListEvents(maxResults = 10) {
  const token = await getGoogleAccessToken();
  const now = new Date().toISOString();
  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&maxResults=${maxResults}&singleEvents=true&orderBy=startTime`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  const data = await response.json();
  
  const events = (data.items || []).map(event => ({
    id: event.id,
    title: event.summary || 'No title',
    start: event.start?.dateTime || event.start?.date,
    end: event.end?.dateTime || event.end?.date,
    location: event.location || ''
  }));

  return { events };
}

// ============ DRIVE ============
async function driveListFiles(query = '', maxResults = 10) {
  const token = await getGoogleAccessToken();
  let url = `https://www.googleapis.com/drive/v3/files?pageSize=${maxResults}&fields=files(id,name,mimeType,modifiedTime)`;
  if (query) url += `&q=name contains '${query}'`;
  
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const data = await response.json();
  
  return { files: data.files || [] };
}

// ============ NOTION ============
async function notionSearch(query = '') {
  const response = await fetch('https://api.notion.com/v1/search', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NOTION_TOKEN}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28'
    },
    body: JSON.stringify({ query, page_size: 10 })
  });
  const data = await response.json();
  
  const pages = (data.results || []).map(page => ({
    id: page.id,
    title: page.properties?.title?.title?.[0]?.plain_text || page.properties?.Name?.title?.[0]?.plain_text || 'Untitled',
    url: page.url
  }));

  return { pages };
}

// ============ MCP TOOLS ============
const mcpTools = [
  { name: 'gmail', description: 'Rechercher des emails Gmail. Actions: search', inputSchema: { type: 'object', properties: { action: { type: 'string' }, query: { type: 'string' } } } },
  { name: 'calendar', description: 'Lister les événements Google Calendar. Actions: list_events', inputSchema: { type: 'object', properties: { action: { type: 'string' }, maxResults: { type: 'number' } } } },
  { name: 'drive', description: 'Lister les fichiers Google Drive. Actions: list_files', inputSchema: { type: 'object', properties: { action: { type: 'string' }, query: { type: 'string' } } } },
  { name: 'notion', description: 'Rechercher dans Notion. Actions: search', inputSchema: { type: 'object', properties: { action: { type: 'string' }, query: { type: 'string' } } } }
];

// ============ ROUTES ============
app.get('/', (req, res) => res.json({ status: 'ok', name: 'MCP Hub Universal' }));
app.get('/health', (req, res) => res.json({ status: 'ok', authenticated: true }));
app.get('/tools', (req, res) => res.json({ tools: mcpTools }));

app.post('/mcp', async (req, res) => {
  const { method, params, id } = req.body;

  if (method === 'initialize') {
    return res.json({ jsonrpc: '2.0', id, result: { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'mcp-hub-universal', version: '1.0.0' } } });
  }

  if (method === 'tools/list') {
    return res.json({ jsonrpc: '2.0', id, result: { tools: mcpTools } });
  }

  if (method === 'tools/call') {
    const { name, arguments: args } = params || {};
    let result;

    try {
      if (name === 'gmail') {
        result = await gmailSearch(args?.query || '', 5);
      } else if (name === 'calendar') {
        result = await calendarListEvents(args?.maxResults || 10);
      } else if (name === 'drive') {
        result = await driveListFiles(args?.query || '', 10);
      } else if (name === 'notion') {
        result = await notionSearch(args?.query || '');
      } else {
        result = { error: 'Tool not found' };
      }
    } catch (error) {
      result = { error: error.message };
    }

    return res.json({ jsonrpc: '2.0', id, result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] } });
  }

  res.json({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } });
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('MCP Hub Universal running on port ' + PORT);
});

server.keepAliveTimeout = 120000;
server.headersTimeout = 120000;
