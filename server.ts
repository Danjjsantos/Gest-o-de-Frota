import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { Resend } from 'resend';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json());

  // Initialize Resend
  const resendApiKey = process.env.RESEND_API_KEY;
  const resend = resendApiKey ? new Resend(resendApiKey) : null;
  let verifiedOwnerEmail = process.env.RESEND_TO_EMAIL || process.env.USER_EMAIL || 'danjs23@gmail.com';
  let isSandbox = true;

  // Check if Resend has verified custom domains
  if (resend) {
    resend.domains.list().then(res => {
      if (res?.data?.data && res.data.data.some((d: any) => d.status === 'verified')) {
        isSandbox = false;
        console.log('[Resend] Domínio verificado encontrado. Modo de produção ativo.');
      } else {
        isSandbox = true;
        console.log(`[Resend] Modo Sandbox ativo (onboarding@resend.dev). E-mail de teste verificado: ${verifiedOwnerEmail}`);
      }
    }).catch(() => {
      isSandbox = true;
    });
  }

  // Resend strictly requires onboarding@resend.dev for test accounts,
  // and rejects unverified public webmail domains like @gmail.com, @hotmail.com, etc.
  // ASCII-only friendly sender name is strictly enforced to prevent validation_error.
  function sanitizeFromEmail(fromEnv?: string): string {
    if (!fromEnv) return 'Gestao Frotas <onboarding@resend.dev>';
    const lower = fromEnv.toLowerCase();
    if (lower.includes('@gmail.com') || lower.includes('@hotmail.com') || lower.includes('@outlook.com') || lower.includes('@yahoo.com')) {
      return 'Gestao Frotas <onboarding@resend.dev>';
    }
    // Remove diacritics/accents to avoid RFC header validation issues
    const asciiSafe = fromEnv.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
    if (!asciiSafe.includes('<') && asciiSafe.includes('@')) {
      return `Gestao Frotas <${asciiSafe}>`;
    }
    return asciiSafe || 'Gestao Frotas <onboarding@resend.dev>';
  }

  const defaultFrom = sanitizeFromEmail(process.env.RESEND_FROM_EMAIL);

  // Status check for Resend integration
  app.get('/api/email/status', (_req: Request, res: Response) => {
    res.json({
      configured: !!resendApiKey,
      maskedKey: resendApiKey ? `${resendApiKey.slice(0, 6)}...${resendApiKey.slice(-4)}` : null,
      fromEmail: defaultFrom,
      isSandbox,
      ownerEmail: verifiedOwnerEmail,
      supportedFeatures: [
        'Recuperação de Senha (Código 6 dígitos)',
        'Notificação de Ordens de Serviço (Abertura e Conclusão)',
        'Alertas de Vencimento de Documentos da Frota (CRLV, CIV, CIPP, Tacógrafo)',
        'Disparo de E-mails de Teste'
      ]
    });
  });

  // Send password recovery code via Resend
  app.post('/api/email/send-code', async (req: Request, res: Response) => {
    const { email, code, userName, from } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: 'E-mail e código são obrigatórios.' });
    }

    if (!resend) {
      console.log(`[Resend Simulado] Código de recuperação ${code} para ${email}`);
      return res.json({
        success: true,
        simulated: true,
        message: 'RESEND_API_KEY não configurada no ambiente. Código simulado com sucesso.',
        code,
      });
    }

    const targetFrom = sanitizeFromEmail(from || defaultFrom);
    const usingSandboxSender = targetFrom.includes('resend.dev');

    // In sandbox mode with onboarding@resend.dev, deliver to verifiedOwnerEmail to avoid validation_error
    const targetEmail = (usingSandboxSender || isSandbox) ? verifiedOwnerEmail : email;
    const isRedirected = targetEmail.toLowerCase() !== email.toLowerCase();

    const bannerHtml = isRedirected ? `
      <div style="background: #fff7ed; border: 1px solid #fed7aa; border-left: 4px solid #ff5500; border-radius: 8px; padding: 12px 16px; margin: 0 0 20px 0; font-family: sans-serif; font-size: 12px; color: #9a3412; line-height: 1.5; text-align: left;">
        <strong>ℹ️ Modo de Teste Resend (Sandbox):</strong> Este código foi solicitado para a conta: <code>${email}</code>.<br>
        Como o domínio próprio ainda não foi ativado no Resend (remetente oficial de teste <code>onboarding@resend.dev</code>), a mensagem real foi entregue no e-mail do titular da conta: <strong>${verifiedOwnerEmail}</strong>.
      </div>
    ` : '';

    try {
      const response = await resend.emails.send({
        from: targetFrom,
        to: [targetEmail],
        subject: isRedirected
          ? `Código de Recuperação: ${code} - Gestão Frotas (Conta: ${email})`
          : `Código de Recuperação: ${code} - Gestão Frotas`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #1e293b; }
              .card { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); }
              .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 24px; text-align: center; }
              .logo { color: #ffffff; font-size: 22px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase; margin: 0; }
              .subtitle { color: #ff5500; font-size: 11px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase; margin-top: 6px; }
              .content { padding: 32px 28px; text-align: center; }
              .title { font-size: 18px; font-weight: bold; color: #0f172a; margin-top: 0; }
              .text { font-size: 14px; line-height: 1.6; color: #64748b; margin-bottom: 24px; }
              .code-box { display: inline-block; background: #fff7ed; border: 2px dashed #ff5500; border-radius: 12px; padding: 14px 28px; margin: 8px 0 24px; }
              .code { font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 900; color: #ea580c; letter-spacing: 6px; }
              .footer { background: #f8fafc; border-top: 1px solid #f1f5f9; padding: 18px 24px; text-align: center; font-size: 12px; color: #94a3b8; }
            </style>
          </head>
          <body>
            <div class="card">
              <div class="header">
                <div class="logo">Gestão Frotas</div>
                <div class="subtitle">Sistema de Controle Operacional</div>
              </div>
              <div class="content">
                ${bannerHtml}
                <h3 class="title">Recuperação de Senha</h3>
                <p class="text">
                  Olá, <strong>${userName || 'Colaborador'}</strong>!<br>
                  Recebemos uma solicitação para redefinir a sua senha de acesso. Utilize o código de segurança abaixo para prosseguir:
                </p>
                <div class="code-box">
                  <span class="code">${code}</span>
                </div>
                <p class="text" style="font-size: 12px; margin-bottom: 0;">
                  Este código é de uso único e expira em 15 minutos. Caso não tenha solicitado esta alteração, ignore este e-mail.
                </p>
              </div>
              <div class="footer">
                Enviado com segurança pela plataforma Gestão Frotas via Resend.<br>
                &copy; ${new Date().getFullYear()} Gestão Frotas.
              </div>
            </div>
          </body>
          </html>
        `,
      });

      if (response.error) {
        const errMsg = response.error.message || '';
        const match = errMsg.match(/own email address \(([^)]+)\)/i);
        if (match && match[1]) {
          verifiedOwnerEmail = match[1];
          try {
            const retryRes = await resend.emails.send({
              from: targetFrom,
              to: [verifiedOwnerEmail],
              subject: `Código de Recuperação: ${code} - Gestao Frotas (Conta: ${email})`,
              html: `
                <div style="font-family: sans-serif; padding: 20px;">
                  <p>Código de recuperação para <strong>${email}</strong>: <strong style="font-size: 24px; color: #ff5500;">${code}</strong></p>
                </div>
              `,
            });
            if (!retryRes.error) {
              return res.json({
                success: true,
                id: retryRes.data?.id,
                simulated: false,
                sandboxRedirected: true,
                deliveredTo: verifiedOwnerEmail,
                code,
              });
            }
          } catch (retryErr) {
            console.warn('[Resend Retry Error]', retryErr);
          }
        }
        // Fallback for sandbox restrictions or validation errors to ensure recovery flow is never blocked
        console.warn(`[Resend Sandbox Warning] ${response.error.message}. Simulando código ${code}.`);
        return res.json({
          success: true,
          simulated: true,
          sandboxRestricted: true,
          message: `Código gerado com sucesso: ${code}. (Aviso Resend: ${response.error.message})`,
          code,
        });
      }

      return res.json({
        success: true,
        id: response.data?.id,
        simulated: false,
        sandboxRedirected: isRedirected,
        deliveredTo: targetEmail,
        code,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Falha ao enviar e-mail com Resend' });
    }
  });

  // Generic Email Dispatcher / Test Route
  app.post('/api/email/send', async (req: Request, res: Response) => {
    const { to, subject, html, text } = req.body;

    if (!to || !subject) {
      return res.status(400).json({ error: 'Destinatário (to) e assunto (subject) são obrigatórios.' });
    }

    if (!resend) {
      console.log(`[Resend Simulado] Para: ${to} | Assunto: ${subject}`);
      return res.json({
        success: true,
        simulated: true,
        message: 'RESEND_API_KEY não configurada no servidor. Disparo simulado.',
      });
    }

    const recipientList: string[] = Array.isArray(to) ? to : [to];
    const targetFrom = sanitizeFromEmail(req.body.from || defaultFrom);
    const usingSandboxSender = targetFrom.includes('resend.dev');

    let sendRecipients = recipientList;
    let sandboxRedirected = false;

    if (usingSandboxSender || isSandbox) {
      const hasOwner = recipientList.some(r => r.trim().toLowerCase() === verifiedOwnerEmail.toLowerCase());
      if (hasOwner && recipientList.length === 1) {
        sendRecipients = [verifiedOwnerEmail];
      } else {
        // Delivering to verified sandbox email to prevent Resend validation_error
        sendRecipients = [verifiedOwnerEmail];
        sandboxRedirected = true;
      }
    }

    let finalHtml = html || `<div style="font-family: sans-serif; padding: 20px;">${text || subject}</div>`;
    if (sandboxRedirected && usingSandboxSender) {
      const banner = `
        <div style="background: #fff7ed; border: 1px solid #fed7aa; border-left: 4px solid #ff5500; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; font-family: sans-serif; font-size: 12px; color: #9a3412; line-height: 1.5;">
          <strong>ℹ️ Modo de Teste Resend (Sandbox):</strong> Este e-mail foi destinado operacionalmente para: <code>${recipientList.join(', ')}</code>.<br>
          Como o domínio próprio ainda não foi validado no Resend (remetente <code>onboarding@resend.dev</code>), a mensagem real foi entregue para a sua conta vinculada (<strong>${verifiedOwnerEmail}</strong>).
        </div>
      `;
      finalHtml = banner + finalHtml;
    }

    try {
      const response = await resend.emails.send({
        from: targetFrom,
        to: sendRecipients,
        subject: sandboxRedirected && usingSandboxSender ? `${subject} [Sandbox -> ${verifiedOwnerEmail}]` : subject,
        html: finalHtml,
        text: text ? (sandboxRedirected ? `[Sandbox entregue para ${verifiedOwnerEmail} | Destinatários: ${recipientList.join(', ')}]\n\n${text}` : text) : undefined,
      });

      if (response.error) {
        const errMsg = response.error.message || '';
        const match = errMsg.match(/own email address \(([^)]+)\)/i);
        if (match && match[1]) {
          verifiedOwnerEmail = match[1];
          try {
            const retryRes = await resend.emails.send({
              from: targetFrom,
              to: [verifiedOwnerEmail],
              subject: `${subject} [Sandbox -> ${verifiedOwnerEmail}]`,
              html: finalHtml,
            });
            if (!retryRes.error) {
              return res.json({
                success: true,
                id: retryRes.data?.id,
                simulated: false,
                sandboxRedirected: true,
                deliveredTo: verifiedOwnerEmail,
                intendedRecipients: recipientList,
                message: `E-mail real entregue na caixa de entrada ${verifiedOwnerEmail} (modo Sandbox do Resend).`,
              });
            }
          } catch (retryErr) {
            console.warn('[Resend Retry Error]', retryErr);
          }
        }

        // Informative graceful response for testing mode so the application UI does not throw validation error
        const isValidationOrSandbox = response.error.name === 'validation_error' || errMsg.includes('testing emails');
        console.warn(`[Resend Warning] ${errMsg}`);
        return res.json({
          success: true,
          simulated: true,
          sandboxRestricted: true,
          warning: errMsg,
          intendedRecipients: recipientList,
          message: isValidationOrSandbox
            ? `Disparo registrado (Modo Sandbox Resend). Em ambiente de teste o Resend limita o envio à conta cadastrada (${verifiedOwnerEmail}). Para disparo a múltiplos destinatários, ative um domínio em resend.com.`
            : `Aviso Resend: ${errMsg}`,
        });
      }

      return res.json({
        success: true,
        id: response.data?.id,
        simulated: false,
        sandboxRedirected,
        deliveredTo: sendRecipients,
        intendedRecipients: recipientList,
        message: sandboxRedirected
          ? `E-mail entregue com sucesso em ${verifiedOwnerEmail} (Sandbox Resend).`
          : `E-mail enviado com sucesso para ${sendRecipients.join(', ')}!`,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'Erro ao processar envio de e-mail.' });
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Gestão Frotas Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
