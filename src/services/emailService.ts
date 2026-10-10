export * from '../utils/email';

export interface ResendStatus {
  configured: boolean;
  fromEmail: string;
  maskedKey?: string | null;
  supportedFeatures?: string[];
  isSandbox?: boolean;
  ownerEmail?: string;
}

export interface EmailSendResult {
  success: boolean;
  id?: string;
  simulated?: boolean;
  message?: string;
  error?: string;
}

export const emailService = {
  // Check if Resend is configured on server
  async checkStatus(): Promise<ResendStatus> {
    try {
      const res = await fetch('/api/email/status');
      if (!res.ok) throw new Error('Falha ao checar status do e-mail');
      return await res.json();
    } catch (err) {
      console.warn('Erro ao consultar /api/email/status:', err);
      return {
        configured: false,
        fromEmail: 'onboarding@resend.dev',
      };
    }
  },

  // Send password recovery code
  async sendRecoveryCode(email: string, code: string, userName?: string): Promise<EmailSendResult> {
    try {
      const res = await fetch('/api/email/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, userName }),
      });
      const data = await res.json();
      if (!res.ok) {
        return {
          success: false,
          error: data.error || 'Erro ao enviar código de e-mail.',
        };
      }
      return data;
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Falha de comunicação com o servidor de e-mail.',
      };
    }
  },

  // Send test email
  async sendTestEmail(to: string): Promise<EmailSendResult> {
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          subject: 'Teste de Integração Resend - Gestão Frotas',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h2 style="color: #0f172a; margin-top: 0;">Gestão Frotas</h2>
              <div style="padding: 12px; background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; color: #065f46; font-weight: bold; margin-bottom: 16px;">
                ✅ Integração com Resend funcionando com sucesso!
              </div>
              <p style="color: #475569; font-size: 14px; line-height: 1.5;">
                Este é um e-mail de teste disparado a partir da sua plataforma <strong>Gestão Frotas</strong> utilizando o serviço <strong>Resend</strong>.
              </p>
              <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">
                Horário do disparo: ${new Date().toLocaleString('pt-BR')}
              </p>
            </div>
          `,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Erro no envio do teste.' };
      }
      return data;
    } catch (err: any) {
      return { success: false, error: err.message || 'Falha de rede.' };
    }
  },

  // Send OS notification
  async sendOSNotification(to: string, osTitle: string, osCode: string, fleetNumber: string, status: string): Promise<EmailSendResult> {
    try {
      const res = await fetch('/api/email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          subject: `Ordem de Serviço #${osCode} - Frota ${fleetNumber} (${status})`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 560px; padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h3 style="color: #0f172a; margin-top: 0;">Atualização de Manutenção - Frota ${fleetNumber}</h3>
              <p style="color: #475569; font-size: 14px;">
                A Ordem de Serviço <strong>#${osCode}</strong> - <em>"${osTitle}"</em> foi atualizada para o status: <span style="font-weight: bold; color: #ff5500;">${status}</span>.
              </p>
              <p style="color: #94a3b8; font-size: 12px;">Acesse a plataforma Gestão Frotas para conferir os detalhes.</p>
            </div>
          `,
        }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }
};
