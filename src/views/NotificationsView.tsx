import React, { useState } from 'react';
import { 
  Bell, 
  Send, 
  Settings, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  Check, 
  Info,
  Wrench, 
  Mail,
  RefreshCw,
  Search,
  FileText,
  Gauge,
  ShieldAlert,
  Trash2,
  ExternalLink,
  ShieldCheck,
  Layers,
  Sparkles,
  Filter,
  Volume2,
  VolumeX,
  Monitor,
  Radio,
  Zap,
  Plus,
  UserPlus,
  Lock,
  AlertCircle,
  Share2
} from 'lucide-react';
import { useFleet, formatDisplayDate } from '../context/FleetContext';
import { sendEmail } from '../utils/email';
import { 
  playCriticalAlertSound, 
  playTestChime, 
  requestBrowserNotificationPermission, 
  getNotificationPermission, 
  isNotificationSupported 
} from '../utils/notificationAlerts';

interface NotificationsViewProps {
  onNavigateToFleet?: () => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({ onNavigateToFleet }) => {
  const { 
    settings, 
    updateSettings, 
    currentUser,
    users,
    expiredDocumentsList, 
    expiringDocumentsList,
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    clearNotification,
    verifyExpirationsNow,
    testCriticalAlert,
    openCriticalPopup,
    criticalExpiringList
  } = useFleet();

  const isAdmin = currentUser?.role === 'Administrador';

  const [senderEmail, setSenderEmail] = useState(settings.senderEmail);
  const [daysThreshold, setDaysThreshold] = useState(settings.daysThreshold);
  const [criticalDaysThreshold, setCriticalDaysThreshold] = useState(settings.criticalDaysThreshold || 7);
  const [soundAlertEnabled, setSoundAlertEnabled] = useState(settings.soundAlertEnabled ?? true);
  const [popupAlertEnabled, setPopupAlertEnabled] = useState(settings.popupAlertEnabled ?? true);
  const [browserPushEnabled, setBrowserPushEnabled] = useState(settings.browserPushEnabled ?? true);
  const [pushPermission, setPushPermission] = useState(getNotificationPermission());

  // Email Recipients Management
  const [recipientsList, setRecipientsList] = useState<string[]>(settings.recipientsList || []);
  const [newRecipientEmail, setNewRecipientEmail] = useState('');
  const [recipientError, setRecipientError] = useState('');
  const [recipientSuccessMsg, setRecipientSuccessMsg] = useState('');

  // Sync if settings change externally
  React.useEffect(() => {
    if (settings.recipientsList) {
      setRecipientsList(settings.recipientsList);
    }
  }, [settings.recipientsList]);

  const [isSaved, setIsSaved] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendSuccessMessage, setSendSuccessMessage] = useState('');
  
  // Verification states
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationFeedback, setVerificationFeedback] = useState<string | null>(null);

  // Active Alerts Filtering
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'documents' | 'equipments'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'expired' | 'expiring'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // History Tab Filter
  const [historyFilter, setHistoryFilter] = useState<'all' | 'equipments' | 'documents' | 'os' | 'unread'>('all');

  // Breakdown counts
  const totalExpiredDocs = expiredDocumentsList.filter(d => !d.isEquipment).length;
  const totalExpiredEqs = expiredDocumentsList.filter(d => d.isEquipment).length;
  const totalExpiringDocs = expiringDocumentsList.filter(d => !d.isEquipment).length;
  const totalExpiringEqs = expiringDocumentsList.filter(d => d.isEquipment).length;
  const totalAlerts = expiredDocumentsList.length + expiringDocumentsList.length;

  const handleAddRecipient = (emailToAdd?: string) => {
    if (!isAdmin) {
      setRecipientError('Apenas Administradores podem alterar os e-mails de notificação.');
      return;
    }
    setRecipientError('');
    setRecipientSuccessMsg('');
    const emailCandidate = (emailToAdd || newRecipientEmail).trim().toLowerCase();

    if (!emailCandidate) {
      setRecipientError('Por favor, informe um endereço de e-mail.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailCandidate)) {
      setRecipientError('Formato de e-mail inválido. Exemplo: gestor@empresa.com.br');
      return;
    }

    if (recipientsList.some(r => r.toLowerCase() === emailCandidate)) {
      setRecipientError('Este e-mail já está incluído na lista de destinatários.');
      return;
    }

    const updated = [...recipientsList, emailCandidate];
    setRecipientsList(updated);
    updateSettings({ recipientsList: updated });
    setNewRecipientEmail('');
    setRecipientSuccessMsg(`E-mail "${emailCandidate}" adicionado com sucesso!`);
    setTimeout(() => setRecipientSuccessMsg(''), 4000);
  };

  const handleRemoveRecipient = (emailToRemove: string) => {
    if (!isAdmin) {
      setRecipientError('Apenas Administradores podem remover destinatários.');
      return;
    }
    setRecipientError('');
    setRecipientSuccessMsg('');
    const updated = recipientsList.filter(r => r.toLowerCase() !== emailToRemove.toLowerCase());
    setRecipientsList(updated);
    updateSettings({ recipientsList: updated });
    setRecipientSuccessMsg(`E-mail "${emailToRemove}" removido.`);
    setTimeout(() => setRecipientSuccessMsg(''), 4000);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    const parsed = Number(daysThreshold) || 30;
    const parsedCritical = Number(criticalDaysThreshold) || 7;
    updateSettings({
      senderEmail,
      daysThreshold: parsed,
      criticalDaysThreshold: parsedCritical,
      soundAlertEnabled,
      popupAlertEnabled,
      browserPushEnabled,
      recipientsList,
    });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleApplyCriticalThreshold = (days: number) => {
    if (!isAdmin) return;
    setCriticalDaysThreshold(days);
    updateSettings({ criticalDaysThreshold: days });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleRequestPush = async () => {
    const granted = await requestBrowserNotificationPermission();
    setPushPermission(getNotificationPermission());
    if (granted && isAdmin) {
      setBrowserPushEnabled(true);
      updateSettings({ browserPushEnabled: true });
    }
  };

  const handleApplyThresholdPreset = (days: number) => {
    if (!isAdmin) return;
    setDaysThreshold(days);
    updateSettings({ daysThreshold: days });
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleVerifyNow = () => {
    setIsVerifying(true);
    setTimeout(() => {
      const result = verifyExpirationsNow();
      setIsVerifying(false);
      setVerificationFeedback(
        `✓ Verificação completa: ${result.totalAlerts} alertas vigentes confirmados (${result.docAlerts} em CRLV/CIV/CIPP/Tacógrafo e ${result.equipmentAlerts} em Equipamentos).`
      );
      setTimeout(() => setVerificationFeedback(null), 6000);
    }, 600);
  };

  const handleSendEmailAlerts = async () => {
    setIsSending(true);
    setSendSuccessMessage('');
    const targetRecipients = recipientsList.length > 0 ? recipientsList : settings.recipientsList;

    if (targetRecipients.length === 0) {
      setSendSuccessMessage('Nenhum e-mail destinatário configurado. Adicione e-mails na seção de destinatários abaixo.');
      setIsSending(false);
      setTimeout(() => setSendSuccessMessage(''), 5000);
      return;
    }

    try {
      const summaryText = `Resumo de Alertas Gestão Frotas: ${expiredDocumentsList.length} itens vencidos e ${expiringDocumentsList.length} itens com vencimento próximo nos próximos ${daysThreshold} dias.`;
      
      const emailResult = await sendEmail({
        to: targetRecipients,
        subject: `[ALERTA DE FROTA] Resumo de Vencimentos - ${totalAlerts} Alertas Ativos`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px;">
            <div style="background: #0f172a; padding: 20px; border-radius: 8px; margin: -24px -24px 20px -24px; text-align: center; border-bottom: 3px solid #ff5500;">
              <h2 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 900;">GESTÃO FROTAS</h2>
              <span style="color: #ff5500; font-size: 11px; font-weight: bold; letter-spacing: 1px;">RELATÓRIO DE ALERTAS OPERACIONAIS</span>
            </div>
            <p style="color: #334155; font-size: 14px;">Olá! Este é o resumo automático de documentação e equipamentos emitido para a equipe de gestão:</p>
            <div style="display: flex; gap: 12px; margin: 16px 0;">
              <div style="flex: 1; background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 12px; text-align: center;">
                <span style="display: block; font-size: 24px; font-weight: bold; color: #dc2626;">${expiredDocumentsList.length}</span>
                <span style="font-size: 11px; color: #991b1b; font-weight: bold;">VENCIDOS</span>
              </div>
              <div style="flex: 1; background: #fff7ed; border: 1px solid #fed7aa; border-radius: 8px; padding: 12px; text-align: center;">
                <span style="display: block; font-size: 24px; font-weight: bold; color: #ea580c;">${expiringDocumentsList.length}</span>
                <span style="font-size: 11px; color: #9a3412; font-weight: bold;">VENCENDO EM ${daysThreshold}D</span>
              </div>
            </div>
            <p style="color: #64748b; font-size: 13px; line-height: 1.5;">${summaryText}</p>
            <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #f1f5f9; font-size: 11px; color: #94a3b8; text-align: center;">
              Enviado para os e-mails cadastrados: ${targetRecipients.join(', ')}<br>
              &copy; ${new Date().getFullYear()} Gestão Frotas.
            </div>
          </div>
        `,
        text: summaryText,
      });

      if (emailResult.success) {
        setSendSuccessMessage(`Alerta enviado com sucesso para ${targetRecipients.join(', ')}.`);
      } else {
        setSendSuccessMessage(`Alerta processado para ${targetRecipients.join(', ')}.`);
      }
    } catch (err: any) {
      setSendSuccessMessage(`Falha no envio de e-mails: ${err.message || 'Erro desconhecido'}`);
    } finally {
      setIsSending(false);
      setTimeout(() => setSendSuccessMessage(''), 7000);
    }
  };

  // Filter Active Alert Items
  const filterList = <T extends { vehicle: { fleetNumber: string; plate: string; uf: string }; docType: string; isEquipment?: boolean; equipmentTag?: string; equipmentDescription?: string }>(list: T[]) => {
    return list.filter(item => {
      if (categoryFilter === 'documents' && item.isEquipment) return false;
      if (categoryFilter === 'equipments' && !item.isEquipment) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const matchFleet = item.vehicle.fleetNumber.toLowerCase().includes(q);
      const matchPlate = `${item.vehicle.plate}/${item.vehicle.uf}`.toLowerCase().includes(q);
      const matchDoc = item.docType.toLowerCase().includes(q);
      const matchEqTag = (item.equipmentTag || '').toLowerCase().includes(q);
      const matchEqDesc = (item.equipmentDescription || '').toLowerCase().includes(q);

      return matchFleet || matchPlate || matchDoc || matchEqTag || matchEqDesc;
    });
  };

  const filteredExpired = filterList(expiredDocumentsList);
  const filteredExpiring = filterList(expiringDocumentsList);

  // Filter History Items
  const filteredNotifications = notifications.filter(n => {
    if (historyFilter === 'unread') return !n.read;
    if (historyFilter === 'equipments') return n.type === 'equipment_expired' || n.type === 'equipment_expiring';
    if (historyFilter === 'documents') return n.type === 'doc_expired' || n.type === 'doc_expiring';
    if (historyFilter === 'os') return n.type === 'os_opened' || n.type === 'os_updated';
    return true;
  });

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto font-sans">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-orange-100 text-[#ff5500]">
              <Bell className="w-5 h-5" />
            </span>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
              Notificações e Alertas Automáticos
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Verificação contínua de validades de documentos obrigatórios (CRLV, CIV, CIPP, Tacógrafo) e calibrações de todos os equipamentos da frota.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleVerifyNow}
            disabled={isVerifying}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-60 cursor-pointer"
            title="Executar verificação imediata de todos os documentos e equipamentos"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isVerifying ? 'animate-spin text-[#ff5500]' : ''}`} />
            <span>{isVerifying ? 'Verificando...' : 'Verificar Prazos Agora'}</span>
          </button>

          <button
            onClick={handleSendEmailAlerts}
            disabled={isSending}
            className="flex items-center gap-1.5 bg-[#ff5500] hover:bg-[#e64d00] text-white px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSending ? 'Disparando...' : 'Enviar por Email'}</span>
          </button>
        </div>
      </div>

      {verificationFeedback && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs rounded-xl flex items-center justify-between gap-2 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{verificationFeedback}</span>
          </div>
          <span className="text-[10px] text-emerald-700 font-mono bg-emerald-100/70 px-2 py-0.5 rounded">
            Atualizado agora
          </span>
        </div>
      )}

      {sendSuccessMessage && (
        <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-900 text-xs rounded-xl flex items-center gap-2 shadow-xs animate-in fade-in">
          <Mail className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{sendSuccessMessage}</span>
        </div>
      )}

      {/* 5-Card Stats Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Total Alertas */}
        <div className="bg-white rounded-xl p-4 border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total de Alertas</span>
            <span className="w-6 h-6 rounded-lg bg-orange-100 text-[#ff5500] flex items-center justify-center font-bold text-xs">
              {totalAlerts}
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-slate-900 font-mono tabular-nums">{totalAlerts}</span>
            <span className="text-[11px] text-slate-400">na frota</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500 font-medium">
            Janela de alerta: <strong className="text-slate-700">{settings.daysThreshold} dias</strong>
          </div>
        </div>

        {/* Documentos Vencidos */}
        <div className="bg-white rounded-xl p-4 border border-red-200/80 bg-gradient-to-br from-red-50/30 to-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-red-600 flex items-center gap-1">
              <FileText className="w-3 h-3" />
              <span>Docs Vencidos</span>
            </span>
            <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-red-700 font-mono tabular-nums">{totalExpiredDocs}</span>
            <span className="text-[11px] text-red-500 font-medium">críticos</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500">
            CRLV, CIV, CIPP, Tacógrafo
          </div>
        </div>

        {/* Equipamentos Vencidos */}
        <div className="bg-white rounded-xl p-4 border border-rose-200/80 bg-gradient-to-br from-rose-50/30 to-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1">
              <Gauge className="w-3 h-3" />
              <span>Equip. Vencidos</span>
            </span>
            <span className="w-2 h-2 rounded-full bg-rose-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-rose-800 font-mono tabular-nums">{totalExpiredEqs}</span>
            <span className="text-[11px] text-rose-600 font-medium">calibrações</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500">
            Manômetros, Válvulas, etc.
          </div>
        </div>

        {/* Documentos Vencendo */}
        <div className="bg-white rounded-xl p-4 border border-amber-200/80 bg-gradient-to-br from-amber-50/30 to-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Docs Vencendo</span>
            </span>
            <span className="w-2 h-2 rounded-full bg-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-amber-800 font-mono tabular-nums">{totalExpiringDocs}</span>
            <span className="text-[11px] text-amber-600 font-medium">em breve</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500">
            Menos de {settings.daysThreshold} dias
          </div>
        </div>

        {/* Equipamentos Vencendo */}
        <div className="bg-white rounded-xl p-4 border border-indigo-200/80 bg-gradient-to-br from-indigo-50/30 to-white shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 flex items-center gap-1">
              <Gauge className="w-3 h-3" />
              <span>Equip. Vencendo</span>
            </span>
            <span className="w-2 h-2 rounded-full bg-indigo-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-indigo-800 font-mono tabular-nums">{totalExpiringEqs}</span>
            <span className="text-[11px] text-indigo-600 font-medium">calibrações</span>
          </div>
          <div className="mt-2 text-[10px] text-slate-500">
            Menos de {settings.daysThreshold} dias
          </div>
        </div>
      </div>

      {/* 2-Column Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (8 cols): Alertas Ativos */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
            {/* Header of Alertas Ativos */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-[#ff5500]" />
                  <span>Alertas Ativos de Validade</span>
                </span>
                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold tabular-nums">
                  {totalAlerts}
                </span>
                <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1 font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Monitoramento Ativo
                </span>
              </div>

              {onNavigateToFleet && (
                <button
                  onClick={onNavigateToFleet}
                  className="text-xs font-bold text-[#ff5500] hover:text-[#e64d00] flex items-center gap-1 self-start sm:self-auto cursor-pointer"
                >
                  <span>Gerenciar Frotas</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Tabs & Search Bar */}
            <div className="space-y-3">
              {/* Category Filter Tabs */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setCategoryFilter('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    categoryFilter === 'all'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Todos os Alertas ({totalAlerts})</span>
                </button>

                <button
                  onClick={() => setCategoryFilter('documents')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    categoryFilter === 'documents'
                      ? 'bg-[#ff5500] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Documentos ({totalExpiredDocs + totalExpiringDocs})</span>
                </button>

                <button
                  onClick={() => setCategoryFilter('equipments')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                    categoryFilter === 'equipments'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Gauge className="w-3.5 h-3.5" />
                  <span>Equipamentos Calibráveis ({totalExpiredEqs + totalExpiringEqs})</span>
                </button>
              </div>

              {/* Status Filter & Search input */}
              <div className="flex flex-col sm:flex-row items-center gap-2.5">
                <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
                  <button
                    onClick={() => setStatusFilter('all')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setStatusFilter('expired')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      statusFilter === 'expired' ? 'bg-red-600 text-white shadow-xs' : 'text-red-600 hover:bg-red-50'
                    }`}
                  >
                    Vencidos ({filteredExpired.length})
                  </button>
                  <button
                    onClick={() => setStatusFilter('expiring')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                      statusFilter === 'expiring' ? 'bg-amber-500 text-white shadow-xs' : 'text-amber-700 hover:bg-amber-50'
                    }`}
                  >
                    Vencendo ({filteredExpiring.length})
                  </button>
                </div>

                <div className="relative flex-1 w-full">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Buscar por frota, placa, documento ou tag de equipamento..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#ff5500] placeholder:text-slate-400"
                  />
                </div>
              </div>
            </div>

            {/* VENCIDOS SECTION */}
            {(statusFilter === 'all' || statusFilter === 'expired') && (
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-black text-red-600 uppercase tracking-wider">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse" />
                    <span>Vencidos ({filteredExpired.length})</span>
                  </div>
                  <span className="text-[11px] text-red-500 font-medium">Regularização imediata necessária</span>
                </div>

                <div className="space-y-2">
                  {filteredExpired.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-red-50/70 border border-red-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-red-300 transition"
                    >
                      <div className="flex items-start sm:items-center gap-3 min-w-0">
                        <div className="p-2 rounded-xl bg-red-100 text-red-700 shrink-0 mt-0.5 sm:mt-0">
                          {item.isEquipment ? <Gauge className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-black text-slate-900 text-sm">
                              Frota {item.vehicle.fleetNumber}
                            </span>
                            <span className="font-mono text-slate-500 text-[11px] bg-white px-1.5 py-0.5 rounded border border-slate-200">
                              {item.vehicle.plate}/{item.vehicle.uf}
                            </span>

                            {/* Badge distinguishing Equipment vs Document */}
                            {item.isEquipment ? (
                              <span className="inline-flex items-center gap-1 font-black text-rose-800 bg-rose-100 px-2 py-0.5 rounded-md border border-rose-200 text-[10px] uppercase">
                                <Gauge className="w-3 h-3" />
                                <span>EQUIPAMENTO: {item.equipmentTag || item.docType}</span>
                              </span>
                            ) : (
                              <span className="font-black text-red-800 bg-white px-2 py-0.5 rounded-md border border-red-300 text-[10px] uppercase">
                                DOC: {item.docType}
                              </span>
                            )}
                          </div>

                          <p className="text-slate-600 text-[11px] truncate">
                            {item.isEquipment ? (
                              <span>
                                <strong>{item.equipmentDescription}</strong>
                                {item.company ? ` · Lab: ${item.company}` : ''}
                                {item.certificateNumber ? ` · Certificado: ${item.certificateNumber}` : ''}
                              </span>
                            ) : (
                              <span>Documento oficial obrigatório da frota {item.vehicle.fleetNumber}</span>
                            )}
                          </p>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            Data de vencimento: {formatDisplayDate(item.expiryDate)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center sm:flex-col items-end gap-1 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-red-200/60">
                        <span className="text-red-700 font-black text-xs tabular-nums bg-white sm:bg-transparent px-2 sm:px-0 py-0.5 rounded border sm:border-0 border-red-200">
                          Vencido há {item.daysDiff}d
                        </span>
                        {onNavigateToFleet && (
                          <button
                            onClick={onNavigateToFleet}
                            className="text-[11px] text-[#ff5500] hover:underline flex items-center gap-0.5 font-bold cursor-pointer"
                          >
                            <span>Ver veículo</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {filteredExpired.length === 0 && (
                    <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                      Nenhum item vencido encontrado para o filtro atual.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* VENCENDO EM BREVE SECTION */}
            {(statusFilter === 'all' || statusFilter === 'expiring') && (
              <div className="space-y-2.5 pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-black text-amber-700 uppercase tracking-wider">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span>Vencendo em breve ({filteredExpiring.length})</span>
                  </div>
                  <span className="text-[11px] text-amber-600 font-medium">
                    Janela menor ou igual a {settings.daysThreshold} dias
                  </span>
                </div>

                <div className="space-y-2">
                  {filteredExpiring.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-amber-50/60 border border-amber-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:border-amber-300 transition"
                    >
                      <div className="flex items-start sm:items-center gap-3 min-w-0">
                        <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0 mt-0.5 sm:mt-0">
                          {item.isEquipment ? <Gauge className="w-4 h-4 text-indigo-600" /> : <Clock className="w-4 h-4 text-amber-600" />}
                        </div>

                        <div className="min-w-0 space-y-0.5">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-black text-slate-900 text-sm">
                              Frota {item.vehicle.fleetNumber}
                            </span>
                            <span className="font-mono text-slate-500 text-[11px] bg-white px-1.5 py-0.5 rounded border border-slate-200">
                              {item.vehicle.plate}/{item.vehicle.uf}
                            </span>

                            {/* Badge distinguishing Equipment vs Document */}
                            {item.isEquipment ? (
                              <span className="inline-flex items-center gap-1 font-black text-indigo-800 bg-indigo-100 px-2 py-0.5 rounded-md border border-indigo-200 text-[10px] uppercase">
                                <Gauge className="w-3 h-3" />
                                <span>EQUIPAMENTO: {item.equipmentTag || item.docType}</span>
                              </span>
                            ) : (
                              <span className="font-black text-amber-800 bg-white px-2 py-0.5 rounded-md border border-amber-300 text-[10px] uppercase">
                                DOC: {item.docType}
                              </span>
                            )}
                          </div>

                          <p className="text-slate-600 text-[11px] truncate">
                            {item.isEquipment ? (
                              <span>
                                <strong>{item.equipmentDescription}</strong>
                                {item.company ? ` · Lab: ${item.company}` : ''}
                                {item.certificateNumber ? ` · Certificado: ${item.certificateNumber}` : ''}
                              </span>
                            ) : (
                              <span>Renovação preventiva recomendada antes da expiração.</span>
                            )}
                          </p>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            Data de vencimento: {formatDisplayDate(item.expiryDate)}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center sm:flex-col items-end gap-1 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-amber-200/60">
                        <span className="text-amber-800 font-black text-xs tabular-nums bg-white sm:bg-transparent px-2 sm:px-0 py-0.5 rounded border sm:border-0 border-amber-200">
                          {item.daysRemaining}d restantes
                        </span>
                        {onNavigateToFleet && (
                          <button
                            onClick={onNavigateToFleet}
                            className="text-[11px] text-[#ff5500] hover:underline flex items-center gap-0.5 font-bold cursor-pointer"
                          >
                            <span>Ver veículo</span>
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {filteredExpiring.length === 0 && (
                    <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                      Nenhum item vencendo nos próximos {settings.daysThreshold} dias para o filtro selecionado.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Histórico Recente de Notificações do Sistema */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <Bell className="w-4 h-4 text-slate-700" />
                  <span>Histórico de Alertas do Sistema</span>
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Registro de notificações geradas automaticamente para Ordens de Serviço, Documentos e Calibrações.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={markAllNotificationsAsRead}
                  className="text-xs font-bold text-[#ff5500] hover:underline cursor-pointer"
                >
                  Marcar todas como lidas
                </button>
              </div>
            </div>

            {/* Filter Pills for System History */}
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                onClick={() => setHistoryFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  historyFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todas ({notifications.length})
              </button>
              <button
                onClick={() => setHistoryFilter('equipments')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  historyFilter === 'equipments' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Equipamentos Calibráveis
              </button>
              <button
                onClick={() => setHistoryFilter('documents')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  historyFilter === 'documents' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Documentos da Frota
              </button>
              <button
                onClick={() => setHistoryFilter('os')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  historyFilter === 'os' ? 'bg-[#ff5500] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Ordens de Serviço
              </button>
              <button
                onClick={() => setHistoryFilter('unread')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                  historyFilter === 'unread' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Não lidas ({notifications.filter(n => !n.read).length})
              </button>
            </div>

            {/* Notification items */}
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {filteredNotifications.map(n => {
                const isEq = n.type === 'equipment_expired' || n.type === 'equipment_expiring';
                const isDoc = n.type === 'doc_expired' || n.type === 'doc_expiring';
                const isOS = n.type === 'os_opened' || n.type === 'os_updated';

                return (
                  <div 
                    key={n.id} 
                    className={`p-3 rounded-xl border text-xs flex items-start gap-3 transition ${
                      n.read ? 'bg-slate-50/40 border-slate-200/60' : 'bg-orange-50/30 border-orange-200 shadow-xs'
                    }`}
                  >
                    <div className="p-2 rounded-xl bg-white shadow-2xs shrink-0 mt-0.5">
                      {isOS && <Wrench className="w-4 h-4 text-[#ff5500]" />}
                      {isEq && <Gauge className="w-4 h-4 text-indigo-600" />}
                      {isDoc && <FileText className="w-4 h-4 text-amber-600" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900">{n.title}</span>
                        {isEq && (
                          <span className="text-[10px] font-black uppercase text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                            Equipamento
                          </span>
                        )}
                        {isDoc && (
                          <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            Documento
                          </span>
                        )}
                        {isOS && (
                          <span className="text-[10px] font-black uppercase text-[#ff5500] bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200">
                            Ordem de Serviço
                          </span>
                        )}
                        {!n.read && (
                          <span className="w-2 h-2 rounded-full bg-[#ff5500]" title="Não lida" />
                        )}
                      </div>

                      <p className="text-slate-600 text-[11px] mt-1 leading-relaxed">{n.message}</p>
                      
                      <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100">
                        <span className="text-[10px] text-slate-400 font-mono">{n.timestamp}</span>
                        
                        <div className="flex items-center gap-2">
                          {!n.read && (
                            <button
                              onClick={() => markNotificationAsRead(n.id)}
                              className="text-[11px] text-[#ff5500] hover:underline font-bold cursor-pointer"
                            >
                              Marcar como lida
                            </button>
                          )}
                          <button
                            onClick={() => clearNotification(n.id)}
                            className="text-slate-400 hover:text-red-500 p-1 rounded transition cursor-pointer"
                            title="Remover alerta"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredNotifications.length === 0 && (
                <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-400">
                  Nenhuma notificação no histórico para este filtro.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Configurações e Parâmetros */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Settings className="w-4 h-4 text-slate-700" />
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
              Parâmetros de Verificação
            </h3>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-5">
            {/* Bloco de Alertas Críticos, Sonoros e Pop-up do Navegador */}
            <div className="p-4 bg-gradient-to-br from-red-50/70 via-orange-50/40 to-slate-50 rounded-2xl border-2 border-red-200/90 space-y-3.5 shadow-2xs">
              <div className="flex items-center justify-between pb-2 border-b border-red-200/60">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
                  <span className="text-xs font-black uppercase tracking-wider text-red-900">
                    Avisos Sonoros e Pop-up ao Logar
                  </span>
                </div>
                <span className="text-[10px] font-bold text-red-700 bg-white px-2 py-0.5 rounded-full border border-red-200">
                  {criticalExpiringList.length} itens críticos
                </span>
              </div>

              {/* Limite de dias para aviso crítico */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-bold text-slate-800">
                    Prazo Crítico para Disparar Alerta:
                  </label>
                  <span className="text-xs font-black text-red-600 font-mono">
                    {criticalDaysThreshold} dias
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-1 mb-2">
                  {[3, 5, 7, 10].map(days => (
                    <button
                      type="button"
                      key={days}
                      disabled={!isAdmin}
                      onClick={() => handleApplyCriticalThreshold(days)}
                      className={`py-1 px-1.5 rounded-lg text-[11px] font-black transition text-center ${
                        !isAdmin ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                      } ${
                        Number(criticalDaysThreshold) === days
                          ? 'bg-red-600 text-white shadow-2xs'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-red-50'
                      }`}
                    >
                      {days}d {days === 7 ? '★' : ''}
                    </button>
                  ))}
                </div>
              </div>

              {/* Toggle 1: Aviso Sonoro */}
              <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200/80">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${soundAlertEnabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                    {soundAlertEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Aviso Sonoro ao Logar
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Toca sinal duplo se houver vencimento em &lt; {criticalDaysThreshold}d
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => playCriticalAlertSound()}
                    className="text-[10px] font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
                    title="Ouvir amostra do som de alerta"
                  >
                    Ouvir
                  </button>
                  <input
                    type="checkbox"
                    disabled={!isAdmin}
                    checked={soundAlertEnabled}
                    onChange={e => {
                      if (!isAdmin) return;
                      setSoundAlertEnabled(e.target.checked);
                      updateSettings({ soundAlertEnabled: e.target.checked });
                    }}
                    className="w-4 h-4 text-[#ff5500] rounded focus:ring-0 cursor-pointer accent-[#ff5500] disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Toggle 2: Pop-up em Tela */}
              <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200/80">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${popupAlertEnabled ? 'bg-orange-100 text-[#ff5500]' : 'bg-slate-100 text-slate-400'}`}>
                    <Monitor className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Pop-up de Alerta em Tela
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Abre janela visual com lista dos itens críticos
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openCriticalPopup()}
                    className="text-[10px] font-bold text-slate-500 hover:text-slate-800 underline cursor-pointer"
                    title="Abrir janela de pop-up agora"
                  >
                    Abrir
                  </button>
                  <input
                    type="checkbox"
                    disabled={!isAdmin}
                    checked={popupAlertEnabled}
                    onChange={e => {
                      if (!isAdmin) return;
                      setPopupAlertEnabled(e.target.checked);
                      updateSettings({ popupAlertEnabled: e.target.checked });
                    }}
                    className="w-4 h-4 text-[#ff5500] rounded focus:ring-0 cursor-pointer accent-[#ff5500] disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Toggle 3: Notificações Push do Navegador */}
              <div className="flex items-center justify-between p-2.5 bg-white rounded-xl border border-slate-200/80">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${browserPushEnabled ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'}`}>
                    <Radio className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Push do Navegador (Web)
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Notificações nativas no sistema
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isNotificationSupported() && pushPermission !== 'granted' ? (
                    <button
                      type="button"
                      onClick={handleRequestPush}
                      className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer"
                    >
                      Permitir
                    </button>
                  ) : null}
                  <input
                    type="checkbox"
                    disabled={!isAdmin}
                    checked={browserPushEnabled}
                    onChange={e => {
                      if (!isAdmin) return;
                      setBrowserPushEnabled(e.target.checked);
                      updateSettings({ browserPushEnabled: e.target.checked });
                      if (e.target.checked && pushPermission !== 'granted') {
                        handleRequestPush();
                      }
                    }}
                    className="w-4 h-4 text-[#ff5500] rounded focus:ring-0 cursor-pointer accent-[#ff5500] disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Botão de Teste Completo */}
              <button
                type="button"
                onClick={testCriticalAlert}
                className="w-full py-2 px-3 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Testar Alerta Completo (Som + Pop-up)</span>
              </button>
            </div>

            {/* Antecedência de Alerta Geral */}
            <div>
              <label className="block text-xs font-black text-slate-800 mb-1">
                Janela de Alerta de Vencimento
              </label>
              <p className="text-[11px] text-slate-500 mb-2 leading-relaxed">
                Dispara notificações quando o vencimento de qualquer documento ou calibração de equipamento estiver a menos de:
              </p>

              {/* Quick Presets */}
              <div className="grid grid-cols-4 gap-1.5 mb-2.5">
                {[15, 30, 45, 60].map(days => (
                  <button
                    type="button"
                    key={days}
                    disabled={!isAdmin}
                    onClick={() => handleApplyThresholdPreset(days)}
                    className={`py-1.5 px-2 rounded-lg text-xs font-bold transition text-center ${
                      !isAdmin ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                    } ${
                      Number(daysThreshold) === days
                        ? 'bg-[#ff5500] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {days} dias
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="number"
                  disabled={!isAdmin}
                  value={daysThreshold}
                  onChange={e => setDaysThreshold(Number(e.target.value))}
                  min={1}
                  max={120}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-2 focus:ring-[#ff5500] disabled:opacity-60 disabled:cursor-not-allowed"
                />
                <span className="text-xs text-slate-500 font-bold whitespace-nowrap">dias</span>
              </div>
            </div>

            {/* Checklist of tracked items */}
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/70 space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 block">
                Itens Monitorados Automaticamente
              </span>
              <ul className="space-y-1.5 text-[11px] text-slate-600">
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span><strong>CRLV</strong> (Registro e Licenciamento)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span><strong>CIV</strong> (Inspeção Veicular)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span><strong>CIPP</strong> (Produtos Perigosos)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span><strong>Tacógrafo</strong> (Verificação Inmetro)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                  <span><strong>Todos Equipamentos</strong> (Calibração, TAG e Certificado)</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span><strong>Laudos e Anexos</strong> com validade informada</span>
                </li>
              </ul>
            </div>

            {/* Email Remetente */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email Remetente
              </label>
              <input
                type="email"
                disabled={!isAdmin}
                value={senderEmail}
                onChange={e => setSenderEmail(e.target.value)}
                placeholder="notificacoes@gestaofrotas.com.br"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#ff5500] disabled:opacity-60 disabled:cursor-not-allowed"
              />
            </div>

            {/* Destinatários dos Alertas (Gerenciável por Administradores) */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-xs font-bold text-slate-800">
                    Destinatários das Notificações
                  </label>
                  <p className="text-[11px] text-slate-500">
                    E-mails que recebem os relatórios e avisos de vencimento da frota
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {recipientsList.length} e-mail{recipientsList.length === 1 ? '' : 's'}
                  </span>
                  {isAdmin ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-600" />
                      <span>Admin</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-slate-400" />
                      <span>Leitura</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Feedback messages */}
              {recipientError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{recipientError}</span>
                </div>
              )}
              {recipientSuccessMsg && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{recipientSuccessMsg}</span>
                </div>
              )}

              {/* Add New Email Form (Admin Only) */}
              {isAdmin ? (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        value={newRecipientEmail}
                        onChange={e => {
                          setNewRecipientEmail(e.target.value);
                          setRecipientError('');
                        }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddRecipient();
                          }
                        }}
                        placeholder="Adicionar novo e-mail (ex: gestor@empresa.com.br)"
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#ff5500]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddRecipient()}
                      className="px-3.5 py-2 bg-[#ff5500] hover:bg-[#e64d00] text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer shadow-xs"
                      title="Adicionar à lista de destinatários"
                    >
                      <Plus className="w-3.5 h-3.5 stroke-[3]" />
                      <span>Adicionar</span>
                    </button>
                  </div>

                  {/* Quick-add from registered system users */}
                  {(() => {
                    const availableUsers = (users || []).filter(
                      u => u.email && !recipientsList.some(r => r.toLowerCase() === u.email.toLowerCase())
                    );
                    if (availableUsers.length === 0) return null;
                    return (
                      <div className="pt-1">
                        <span className="text-[10px] text-slate-400 font-semibold block mb-1.5">
                          Adicionar com 1 clique de usuários cadastrados:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {availableUsers.slice(0, 4).map(u => (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => handleAddRecipient(u.email)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-900 text-[11px] font-medium transition cursor-pointer"
                              title={`Adicionar ${u.email}`}
                            >
                              <UserPlus className="w-3 h-3 text-[#ff5500]" />
                              <span>{u.name} ({u.role})</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-center gap-2">
                  <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                  <span>Apenas usuários com perfil de Administrador ou Gerente podem alterar os e-mails desta lista.</span>
                </div>
              )}

              {/* List of Current Recipients */}
              <div className="space-y-1.5 max-h-52 overflow-y-auto custom-scrollbar pr-0.5">
                {recipientsList.length === 0 ? (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Nenhum e-mail cadastrado. Adicione ao menos um destinatário para receber os avisos.</span>
                  </div>
                ) : (
                  recipientsList.map((rec, i) => {
                    const matchedUser = (users || []).find(u => u.email.toLowerCase() === rec.toLowerCase());
                    return (
                      <div 
                        key={i} 
                        className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-200/70 rounded-xl transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-500 shrink-0 shadow-2xs">
                            <Mail className="w-3.5 h-3.5 text-[#ff5500]" />
                          </div>
                          <div className="min-w-0">
                            <span className="font-mono text-xs font-semibold text-slate-800 block truncate">
                              {rec}
                            </span>
                            {matchedUser && (
                              <span className="text-[10px] text-slate-500 truncate block">
                                {matchedUser.name} · <strong className="text-slate-700">{matchedUser.role}</strong>
                              </span>
                            )}
                          </div>
                        </div>

                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleRemoveRecipient(rec)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer shrink-0"
                            title={`Remover ${rec} da lista`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {isAdmin ? (
              <button
                type="submit"
                className="w-full bg-[#ff5500] hover:bg-[#e64d00] text-white font-black py-2.5 px-4 rounded-xl text-xs shadow-md shadow-orange-500/20 transition flex items-center justify-center gap-2 cursor-pointer active:scale-98"
              >
                {isSaved ? <Check className="w-4 h-4" /> : null}
                <span>{isSaved ? 'Configurações Salvas!' : 'Salvar Parâmetros'}</span>
              </button>
            ) : (
              <div className="w-full bg-slate-100 text-slate-500 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-200">
                <Lock className="w-3.5 h-3.5 text-slate-400" />
                <span>Alteração restrita ao Administrador</span>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};
