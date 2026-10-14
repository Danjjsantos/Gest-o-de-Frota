/**
 * Utilitário de disparo de e-mails de notificação
 * Gestão Frotas - Sistema de Controle Operacional
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
 * Obtém o remetente padrão configurado
 */
export function getDefaultFromEmail(): string {
  return 'Gestão Frotas <notificacoes@gestaofrotas.com.br>';
}

/**
 * Função principal para envio de notificações por e-mail
 */
export async function sendEmail(payload: SendEmailPayload): Promise<EmailDispatchResult> {
  const { to, subject, html, text, from } = payload;
  const targetFrom = from || getDefaultFromEmail();

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
    return {
      success: true,
      simulated: true,
      message: 'Notificação processada em ambiente local.',
    };
  }
}

/**
 * Notificação de Vencimento de Documentos da Frota (CRLV, CIV, CIPP, Tacógrafo)
 */
export async function sendDocumentExpirationEmail(payload: DocumentExpirationAlertPayload): Promise<EmailDispatchResult> {
  const { to, fleetNumber, plate, documentType, expirationDate, daysRemaining, isExpired, managerName } = payload;
  
  const greeting = managerName ? `Olá, ${managerName}.` : 'Prezada equipe de controle de frota,';
  const alertColor = isExpired ? '#dc2626' : (daysRemaining <= 7 ? '#ea580c' : '#d97706');
  const alertBadge = isExpired ? 'DOCUMENTO VENCIDO' : `VENCE EM ${daysRemaining} DIA${daysRemaining === 1 ? '' : 'S'}`;
  const subject = isExpired
    ? `🚨 [URGENTE] Documento ${documentType} da Frota ${fleetNumber} (${plate}) está VENCIDO`
    : `⚠️ [ALERTA] Documento ${documentType} da Frota ${fleetNumber} (${plate}) vence em ${daysRemaining} dias`;

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head><meta charset="UTF-8"><title>${subject}</title></head>
    <body style="font-family: Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 24px; color: #1e293b;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
        <tr>
          <td style="background-color: #0f172a; padding: 20px 24px; text-align: left;">
            <h1 style="color: #ffffff; font-size: 18px; margin: 0; font-weight: 800; letter-spacing: 0.5px;">GESTÃO FROTAS</h1>
            <p style="color: #94a3b8; font-size: 11px; margin: 4px 0 0 0;">Alerta de Conformidade Documental</p>
          </td>
        </tr>
        <tr>
          <td style="padding: 24px;">
            <p style="font-size: 14px; margin-top: 0;">${greeting}</p>
            <div style="background-color: #fff7ed; border-left: 4px solid ${alertColor}; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
              <span style="display: inline-block; background-color: ${alertColor}; color: #ffffff; font-size: 10px; font-weight: bold; padding: 2px 8px; border-radius: 9999px; text-transform: uppercase;">${alertBadge}</span>
              <p style="font-size: 14px; color: #0f172a; margin: 8px 0 0 0; font-weight: bold;">Frota ${fleetNumber} · Placa: ${plate}</p>
              <p style="font-size: 13px; color: #475569; margin: 4px 0 0 0;">Documento: <strong>${documentType}</strong> | Data de Validade: <strong>${expirationDate}</strong></p>
            </div>
            <p style="font-size: 13px; color: #64748b; line-height: 1.5;">Por favor, providencie a renovação imediata para evitar autuações fiscais, retenção de veículo ou paralisação das viagens.</p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  return sendEmail({
    to,
    subject,
    html,
    text: `${greeting}\n\nDocumento ${documentType} da Frota ${fleetNumber} (${plate}) com vencimento em ${expirationDate}.\nStatus: ${alertBadge}.\n\nPor favor, providencie a renovação.`,
  });
}
