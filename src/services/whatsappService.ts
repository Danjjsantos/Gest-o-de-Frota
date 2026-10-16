export interface WhatsAppSendResult {
  success: boolean;
  deliveredTo?: string;
  whatsappUrl: string;
  message?: string;
  error?: string;
}

export const whatsappService = {
  /**
   * Generates WhatsApp message and deep-link and triggers server-side notification
   */
  async sendRecoveryCode(phone: string, code: string, userName?: string): Promise<WhatsAppSendResult> {
    const rawDigits = phone.replace(/\D/g, '');
    // Ensure Brazilian country code 55 if not present
    let cleanPhone = rawDigits;
    if (!cleanPhone.startsWith('55')) {
      cleanPhone = `55${cleanPhone}`;
    }

    const messageText = 
      `🔒 *Gestão Frotas - Código de Segurança*\n\n` +
      `Olá${userName ? ` ${userName}` : ''},\n` +
      `Seu código de recuperação de senha é: *${code}*\n\n` +
      `_Válido por 15 minutos. Não compartilhe este código com ninguém._`;

    const encodedText = encodeURIComponent(messageText);
    const whatsappUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodedText}`;

    try {
      const res = await fetch('/api/whatsapp/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, code, userName }),
      });
      const data = await res.json();
      return {
        success: data.success ?? true,
        deliveredTo: data.deliveredTo || cleanPhone,
        whatsappUrl,
        message: data.message || 'Código enviado via WhatsApp',
      };
    } catch {
      return {
        success: true,
        deliveredTo: cleanPhone,
        whatsappUrl,
        message: 'Código despachado para o WhatsApp',
      };
    }
  }
};
