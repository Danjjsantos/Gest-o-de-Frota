/**
 * Utilitário de Alertas Sonoros e Notificações Push no Navegador
 * Utiliza a Web Audio API (funciona 100% offline sem arquivos externos)
 * e a API de Notificações do Navegador (Web Notifications API).
 */

// Singleton AudioContext para evitar limitações de limites de contexto
let globalAudioCtx: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  try {
    if (!globalAudioCtx) {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        globalAudioCtx = new AudioContextClass();
      }
    }
    if (globalAudioCtx && globalAudioCtx.state === 'suspended') {
      globalAudioCtx.resume().catch(() => {});
    }
    return globalAudioCtx;
  } catch (e) {
    return null;
  }
};

/**
 * Toca sinal sonoro duplo de alerta crítico (menos de 7 dias ou vencido)
 */
export const playCriticalAlertSound = (): void => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Primeiro pulso de alerta (Nota Alta - 880 Hz / A5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.exponentialRampToValueAtTime(1046.5, now + 0.12); // C6
    gain1.gain.setValueAtTime(0.35, now);
    gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.18);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.18);

    // Segundo pulso de alerta mais urgente (Nota 1318.5 Hz / E6)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1174.66, now + 0.22); // D6
    osc2.frequency.exponentialRampToValueAtTime(1318.5, now + 0.35); // E6
    gain2.gain.setValueAtTime(0.4, now + 0.22);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.22);
    osc2.stop(now + 0.55);
  } catch (e) {
    // Silently handle environment blocking audio
  }
};

/**
 * Toca sinal suave de teste / confirmação
 */
export const playTestChime = (): void => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.15); // A5
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.4);
  } catch (e) {
    // Silently handle
  }
};

/**
 * Verifica se a API de Notificações é suportada pelo navegador
 */
export const isNotificationSupported = (): boolean => {
  return typeof window !== 'undefined' && 'Notification' in window;
};

/**
 * Retorna o status atual de permissão do navegador
 */
export const getNotificationPermission = (): NotificationPermission | 'unsupported' => {
  if (!isNotificationSupported()) return 'unsupported';
  return Notification.permission;
};

/**
 * Solicita permissão ao usuário para envio de notificações do navegador
 */
export const requestBrowserNotificationPermission = async (): Promise<boolean> => {
  if (!isNotificationSupported()) return false;
  try {
    const result = await Notification.requestPermission();
    return result === 'granted';
  } catch (e) {
    return false;
  }
};

/**
 * Dispara uma notificação nativa do sistema operacional / navegador
 */
export const sendBrowserPushNotification = (
  title: string,
  body: string,
  tag: string = 'fleet-critical-alert'
): boolean => {
  if (!isNotificationSupported()) return false;
  if (Notification.permission !== 'granted') return false;

  try {
    const notif = new Notification(title, {
      body,
      tag,
      icon: '/favicon.ico',
      requireInteraction: true,
      silent: false
    });

    notif.onclick = () => {
      window.focus();
      notif.close();
    };

    return true;
  } catch (e) {
    // If inside an iframe where Notification is restricted, handle gracefully
    return false;
  }
};
