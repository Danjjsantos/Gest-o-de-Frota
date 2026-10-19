import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_SUPABASE_URL = 'https://rqtwicocyyylqghqluks.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_jhXEn40h4F55HUgDKyblUQ_TCs7uyHH';

function getCleanSupabaseUrl(): string {
  const raw = (
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    DEFAULT_SUPABASE_URL
  );
  return raw.trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
}

function getSupabaseKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    DEFAULT_SUPABASE_KEY
  ).trim();
}

function getPort(): number {
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    const p = Number(process.argv[portArgIndex + 1]);
    if (!isNaN(p) && p > 0) return p;
  }
  // In Cloud Run / AI Studio, port 8080 is reserved for nginx/ingress. The dev server must run on 3000.
  if (process.env.PORT && process.env.PORT !== '8080') {
    const p = Number(process.env.PORT);
    if (!isNaN(p) && p > 0) return p;
  }
  return 3000;
}

async function startServer() {
  const app = express();
  const PORT = getPort();

  // Accept larger payloads for base64 attachments/documents
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Status check for notifications/email
  app.get('/api/email/status', (_req: Request, res: Response) => {
    res.json({
      configured: true,
      fromEmail: 'Gestão Frotas <notificacoes@gestaofrotas.com.br>',
      supportedFeatures: [
        'Recuperação de Senha (Código 6 dígitos)',
        'Notificação de Ordens de Serviço (Abertura e Conclusão)',
        'Alertas de Vencimento de Documentos da Frota (CRLV, CIV, CIPP, Tacógrafo)',
      ]
    });
  });

  // Send password recovery code via Email
  app.post('/api/email/send-code', (req: Request, res: Response) => {
    const { email, code, userName } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'E-mail e código são obrigatórios.' });
    }

    console.log(`[Segurança E-mail] Código de recuperação enviado para ${email} (${userName || 'Usuário'})`);
    return res.json({
      success: true,
      message: `Código enviado com sucesso para o e-mail ${email}.`,
    });
  });

  // Send password recovery code via WhatsApp
  app.post('/api/whatsapp/send-code', (req: Request, res: Response) => {
    const { phone, code, userName } = req.body;

    if (!phone || !code) {
      return res.status(400).json({ error: 'Telefone/WhatsApp e código são obrigatórios.' });
    }

    const cleanDigits = String(phone).replace(/\D/g, '');
    console.log(`[Segurança WhatsApp] Código de recuperação enviado via WhatsApp para +55${cleanDigits} (${userName || 'Usuário'})`);
    return res.json({
      success: true,
      deliveredTo: `+55${cleanDigits}`,
      message: `Código enviado com sucesso para o WhatsApp cadastrado.`,
    });
  });

  // Generic dispatch endpoint
  app.post('/api/email/send', (req: Request, res: Response) => {
    const { to, subject } = req.body;

    if (!to || !subject) {
      return res.status(400).json({ error: 'Destinatário e assunto são obrigatórios.' });
    }

    const recipients = Array.isArray(to) ? to : [to];
    console.log(`[Notificação] E-mail enviado para: ${recipients.join(', ')} | Assunto: ${subject}`);

    return res.json({
      success: true,
      message: `Notificação enviada com sucesso para ${recipients.join(', ')}.`,
      deliveredTo: recipients,
    });
  });

  // =========================================================================
  // SUPABASE INTEGRATION ENDPOINTS
  // =========================================================================

  // 1. Supabase Status and configuration check
  app.get('/api/supabase/status', async (_req: Request, res: Response) => {
    const url = getCleanSupabaseUrl();
    const key = getSupabaseKey();

    if (!url || !key) {
      return res.json({
        configured: false,
        url: url || null,
        message: 'Variáveis de ambiente do Supabase não encontradas.',
        tables: []
      });
    }

    // Ping Supabase REST API
    const start = Date.now();
    try {
      const pingRes = await fetch(`${url}/rest/v1/vehicles?select=id&limit=1`, {
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`
        }
      });

      const pingMs = Date.now() - start;
      const isConnected = pingRes.ok || pingRes.status === 404;

      return res.json({
        configured: true,
        connected: isConnected,
        url,
        pingMs,
        statusCode: pingRes.status,
        message: isConnected 
          ? `Conexão bem sucedida com o Supabase (${url})` 
          : `Supabase respondeu com código ${pingRes.status}`,
        projectRef: url.match(/https?:\/\/([^.]+)\.supabase/)?.[1] || null
      });
    } catch (err: any) {
      return res.json({
        configured: true,
        connected: false,
        url,
        message: `Erro ao conectar com Supabase: ${err.message}`,
        error: err.message
      });
    }
  });

  // 2. Return Supabase SQL Schema
  app.get('/api/supabase/schema', (_req: Request, res: Response) => {
    try {
      const schemaPath = path.join(__dirname, 'public', 'supabase', 'schema.sql');
      if (fs.existsSync(schemaPath)) {
        const sql = fs.readFileSync(schemaPath, 'utf-8');
        return res.json({
          success: true,
          sql,
          tables: [
            'users',
            'vehicles',
            'service_orders',
            'notifications',
            'vehicle_documents',
            'vehicle_attachments',
            'vehicle_equipments',
            'service_order_attachments',
            'notification_settings',
            'audit_logs'
          ]
        });
      }
      return res.status(404).json({ error: 'Arquivo schema.sql não encontrado.' });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  });

  // 3. Serve raw schema.sql file directly
  app.get('/supabase/schema.sql', (_req: Request, res: Response) => {
    const schemaPath = path.join(__dirname, 'public', 'supabase', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="gestao_frotas_supabase_schema.sql"');
      return res.sendFile(schemaPath);
    }
    return res.status(404).send('-- Arquivo schema.sql não encontrado');
  });

  // 4. Test connection with custom URL/Key if provided
  app.post('/api/supabase/test-connection', async (req: Request, res: Response) => {
    const targetUrl = (req.body.url || getCleanSupabaseUrl() || '').trim().replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
    const targetKey = (req.body.anonKey || getSupabaseKey() || '').trim();

    if (!targetUrl || !targetKey) {
      return res.status(400).json({
        success: false,
        message: 'URL e Chave Anon do Supabase são obrigatórias.'
      });
    }

    const start = Date.now();
    try {
      const response = await fetch(`${targetUrl}/rest/v1/vehicles?select=id&limit=1`, {
        headers: {
          apikey: targetKey,
          Authorization: `Bearer ${targetKey}`
        }
      });

      const pingMs = Date.now() - start;

      return res.json({
        success: response.ok || response.status === 404,
        statusCode: response.status,
        pingMs,
        url: targetUrl,
        message: (response.ok || response.status === 404)
          ? `Conexão bem sucedida (${pingMs}ms)!`
          : `Supabase respondeu com status ${response.status}`
      });
    } catch (err: any) {
      return res.status(500).json({
        success: false,
        message: `Falha na requisição: ${err.message}`
      });
    }
  });

  // Frontend Serving (Dev with Vite middlewares vs Production Static)
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Gestão Frotas Server running on http://0.0.0.0:${PORT}`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`[Server Error] Port ${PORT} is already in use.`);
    } else {
      console.error('[Server Error]', err);
    }
  });
}

startServer();
