/**
 * Utilitário de disparo de e-mails de notificação via Resend API
 * Gestão Frotas - Sistema de Controle Operacional
 *
 * Utiliza a variável de ambiente RESEND_API_KEY para autenticação no Resend.
 */

export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface SendEmailPayload {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  from?: string;
  replyTo?: string;
  tags?: Array<{ name: string; value: string }>;
}

export interface EmailDispatchResult {
  success: boolean;
  id?: string;
  simulated?: boolean;
  message?: string;
  error?: string;
}

export interface DocumentExpirationAlertPayload {
  to: string | string[];
  fleetNumber: string;
  plate: string;
  documentType: 'CRLV' | 'CIV' | 'CIPP' | 'Tacógrafo' | 'Equipamento' | 'Laudo' | string;
  expirationDate: string;
  daysRemaining: number;
  isExpired?: boolean;
  managerName?: string;
}

export interface OSAlertPayload {
  to: string | string[];
  osNumber: string | number;
  fleetNumber: string;
  title: string;
  status: 'Pendente' | 'Em Andamento' | 'Resolvido' | 'Cancelado' | string;
  category?: string;
  priority?: 'Baixa' | 'Média' | 'Alta' | 'Crítica' | string;
  reportedBy?: string;
  mechanicAssigned?: string;
  description?: string;
}

/**
 * Obtém a chave de API do Resend a partir do ambiente
 */
export function getResendApiKey(): string | undefined {
  if (typeof process !== 'undefined' && process.env?.RESEND_API_KEY) {
    return process.env.RESEND_API_KEY;
  }
  // Suporte a variáveis Vite no client-side caso injetadas
  if (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_RESEND_API_KEY) {
    return (import.meta as any).env.VITE_RESEND_API_KEY;
  }
  return undefined;
}

/**
 * Obtém o remetente padrão configurado
 */
export function getDefaultFromEmail(): string {
  if (typeof process !== 'undefined' && process.env?.RESEND_FROM_EMAIL) {
    return process.env.RESEND_FROM_EMAIL;
  }
  return 'Gestao Frotas <onboarding@resend.dev>';
}

/**
 * Função principal para envio de e-mails via Resend API
 * Suporta envio via backend proxy (/api/email/send) e chamada direta à API REST do Resend (https://api.resend.com/emails).
 */
export async function sendEmail(payload: SendEmailPayload): Promise<EmailDispatchResult> {
  const { to, subject, html, text, from } = payload;
  const targetFrom = from || getDefaultFromEmail();
  const apiKey = getResendApiKey();

  // 1. Tentar primeiro via endpoint interno do backend (seguro, sem exposição de chave no browser e sem problemas de CORS)
  try {
    const res = await fetch('/api/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        to,
        subject,
        html,
        text,
        from: targetFrom,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      return {
        success: data.success ?? true,
        id: data.id,
        simulated: data.simulated ?? false,
        message: data.message,
      };
    } else {
      return {
        success: false,
        error: data.error || data.message || `Erro no servidor (${res.status})`,
      };
    }
  } catch (proxyError: any) {
    console.warn('[Resend Utils] Falha na rota proxy interna /api/email/send:', proxyError);
  }

  // 2. Fallback: Se a chave de API estiver acessível diretamente no ambiente atual, chama a API REST do Resend
  if (apiKey) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: targetFrom,
          to: Array.isArray(to) ? to : [to],
          subject,
          html: html || `<p>${text || subject}</p>`,
          text,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: data.message || 'Falha na requisição para https://api.resend.com/emails',
        };
      }

      return {
        success: true,
        id: data.id,
        simulated: false,
      };
    } catch (directError: any) {
      return {
        success: false,
        error: directError.message || 'Erro de conexão com o serviço Resend.',
      };
    }
  }

  return {
    success: false,
    error: 'Não foi possível disparar o e-mail: Chave RESEND_API_KEY não localizada.',
  };
}

/**
 * Notificação de Vencimento de Documentos da Frota (CRLV, CIV, CIPP, Tacógrafo)
 */
export async function sendDocumentExpirationEmail(payload: DocumentExpirationAlertPayload): Promise<EmailDispatchResult> {
  const { fleetNumber, plate, documentType, expirationDate, daysRemaining, isExpired, to } = payload;
  const statusLabel = isExpired || daysRemaining <= 0 ? 'VENCIDO' : `VENCE EM ${daysRemaining} DIAS`;
  const statusColor = isExpired || daysRemaining <= 0 ? '#ef4444' : '#f97316';
  const subject = `[ALERTA DE FROTA] Documento ${documentType} ${statusLabel} - Frota ${fleetNumber} (${plate})`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .header { background: #0f172a; padding: 28px 24px; text-align: center; border-bottom: 3px solid #ff5500; }
        .logo { color: #ffffff; font-size: 20px; font-weight: 900; letter-spacing: 1px; margin: 0; }
        .badge-alert { display: inline-block; background-color: ${statusColor}; color: #ffffff; font-size: 11px; font-weight: 800; padding: 6px 14px; border-radius: 9999px; margin-top: 12px; letter-spacing: 1px; }
        .body { padding: 32px 28px; }
        .info-card { background: #f1f5f9; border-radius: 12px; padding: 20px; margin: 20px 0; border-left: 4px solid ${statusColor}; }
        .field { margin-bottom: 12px; font-size: 13px; }
        .field strong { color: #0f172a; }
        .cta { text-align: center; margin-top: 28px; }
        .btn { display: inline-block; background: #ff5500; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: bold; font-size: 13px; }
        .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 18px 24px; text-align: center; font-size: 11px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">GESTÃO FROTAS</div>
          <div class="badge-alert">${statusLabel}</div>
        </div>
        <div class="body">
          <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">Aviso de Regularização de Documentação</h2>
          <p style="font-size: 14px; color: #475569; line-height: 1.6;">
            O sistema identificou uma pendência documental que requer atenção imediata do departamento de tráfego/manutenção:
          </p>
          <div class="info-card">
            <div class="field"><strong>Veículo / Frota:</strong> ${fleetNumber}</div>
            <div class="field"><strong>Placa:</strong> ${plate}</div>
            <div class="field"><strong>Tipo de Documento:</strong> ${documentType}</div>
            <div class="field"><strong>Data de Validade:</strong> ${expirationDate}</div>
            <div class="field" style="margin-bottom: 0;"><strong>Situação Atual:</strong> <span style="color: ${statusColor}; font-weight: bold;">${statusLabel}</span></div>
          </div>
          <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
            Veículos com documentação vencida estão sujeitos a retenção pela autoridade de trânsito e paralisação da operação. Providencie a renovação com brevidade.
          </p>
          <div class="cta">
            <a href="#" class="btn">Visualizar Ficha do Veículo</a>
          </div>
        </div>
        <div class="footer">
          Notificação gerada automaticamente pela plataforma Gestão Frotas via Resend API.<br>
          &copy; ${new Date().getFullYear()} Gestão Frotas.
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject,
    html,
    text: `Alerta Gestão Frotas: Documento ${documentType} da frota ${fleetNumber} (${plate}) está ${statusLabel}. Validade: ${expirationDate}.`,
  });
}

/**
 * Notificação de Abertura ou Atualização de Ordem de Serviço (OS)
 */
export async function sendOSNotificationEmail(payload: OSAlertPayload): Promise<EmailDispatchResult> {
  const { to, osNumber, fleetNumber, title, status, category, priority, reportedBy, mechanicAssigned, description } = payload;
  const subject = `[OS #${osNumber}] ${title} - Frota ${fleetNumber} (${status})`;

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b; }
        .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); }
        .header { background: #0f172a; padding: 24px; text-align: center; border-bottom: 3px solid #ff5500; }
        .logo { color: #ffffff; font-size: 18px; font-weight: 900; letter-spacing: 1px; margin: 0; }
        .body { padding: 28px 24px; }
        .title { font-size: 17px; font-weight: bold; color: #0f172a; margin-top: 0; }
        .status-badge { display: inline-block; background: #fff7ed; border: 1px solid #ff5500; color: #ea580c; font-weight: bold; padding: 4px 10px; border-radius: 6px; font-size: 11px; }
        .grid { background: #f8fafc; border-radius: 12px; padding: 18px; margin: 18px 0; border: 1px solid #e2e8f0; font-size: 13px; }
        .item { margin-bottom: 10px; }
        .item:last-child { margin-bottom: 0; }
        .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">GESTÃO FROTAS · MANUTENÇÃO</div>
        </div>
        <div class="body">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <h2 class="title" style="margin: 0;">Ordem de Serviço #${osNumber}</h2>
            <span class="status-badge">${status.toUpperCase()}</span>
          </div>
          <p style="font-size: 14px; color: #475569; margin-top: 4px;">
            <strong>${title}</strong>
          </p>
          <div class="grid">
            <div class="item"><strong>Veículo / Frota:</strong> ${fleetNumber}</div>
            ${category ? `<div class="item"><strong>Categoria:</strong> ${category}</div>` : ''}
            ${priority ? `<div class="item"><strong>Prioridade:</strong> ${priority}</div>` : ''}
            ${reportedBy ? `<div class="item"><strong>Solicitante:</strong> ${reportedBy}</div>` : ''}
            ${mechanicAssigned ? `<div class="item"><strong>Responsável:</strong> ${mechanicAssigned}</div>` : ''}
            ${description ? `<div class="item"><strong>Descrição do Defeito:</strong> ${description}</div>` : ''}
          </div>
          <p style="font-size: 12px; color: #64748b;">
            Acompanhe o andamento detalhado e o registro de peças no painel web.
          </p>
        </div>
        <div class="footer">
          Enviado via Resend API pelo sistema Gestão Frotas.<br>
          &copy; ${new Date().getFullYear()} Gestão Frotas.
        </div>
      </div>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject,
    html,
    text: `Ordem de Serviço #${osNumber} (${status}) para Frota ${fleetNumber}: ${title}.`,
  });
}

/**
 * Notificação genérica de alerta operacional
 */
export async function sendNotificationEmail(
  to: string | string[],
  subject: string,
  message: string,
  extraDetails?: Record<string, string>
): Promise<EmailDispatchResult> {
  const detailsHtml = extraDetails
    ? `<div style="background: #f1f5f9; padding: 14px; border-radius: 8px; margin-top: 14px;">
        ${Object.entries(extraDetails)
          .map(([k, v]) => `<div style="font-size: 12px; margin-bottom: 4px;"><strong>${k}:</strong> ${v}</div>`)
          .join('')}
       </div>`
    : '';

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 540px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
      <h3 style="color: #0f172a; margin-top: 0; font-size: 18px;">${subject}</h3>
      <p style="color: #475569; font-size: 14px; line-height: 1.5;">${message}</p>
      ${detailsHtml}
      <hr style="border: 0; border-top: 1px solid #f1f5f9; margin: 20px 0;">
      <p style="color: #94a3b8; font-size: 11px; margin: 0;">Gestão Frotas · Notificação automática via Resend</p>
    </div>
  `;

  return sendEmail({
    to,
    subject,
    html,
    text: message,
  });
}
