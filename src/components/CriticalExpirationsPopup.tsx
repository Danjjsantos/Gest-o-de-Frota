import React from 'react';
import { 
  AlertTriangle, 
  Volume2, 
  VolumeX, 
  X, 
  ArrowRight, 
  ShieldAlert, 
  Calendar, 
  ExternalLink,
  Gauge,
  FileText,
  Clock,
  CheckCircle2,
  Bell
} from 'lucide-react';
import { useFleet, formatDisplayDate } from '../context/FleetContext';
import { playCriticalAlertSound } from '../utils/notificationAlerts';

interface CriticalExpirationsPopupProps {
  onNavigateToNotifications?: () => void;
  onNavigateToFleet?: () => void;
}

export const CriticalExpirationsPopup: React.FC<CriticalExpirationsPopupProps> = ({
  onNavigateToNotifications,
  onNavigateToFleet,
}) => {
  const { 
    isCriticalPopupOpen, 
    closeCriticalPopup, 
    criticalExpiringList, 
    settings, 
    updateSettings,
    currentUser 
  } = useFleet();

  const isFullAccessUser = currentUser?.role === 'Administrador' || currentUser?.role === 'Gerente';

  if (!isCriticalPopupOpen || criticalExpiringList.length === 0 || !isFullAccessUser) {
    return null;
  }

  const expiredCount = criticalExpiringList.filter(i => i.isExpired).length;
  const expiringSoonCount = criticalExpiringList.filter(i => !i.isExpired).length;
  const threshold = settings.criticalDaysThreshold || 7;

  const handleToggleSound = () => {
    if (currentUser?.role !== 'Administrador') return;
    const nextState = !settings.soundAlertEnabled;
    updateSettings({ soundAlertEnabled: nextState });
    if (nextState) {
      playCriticalAlertSound();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-red-200/80 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Top Header with Alert Accent */}
        <div className="p-5 sm:p-6 bg-gradient-to-r from-red-600 via-rose-600 to-orange-600 text-white flex items-start justify-between gap-4 shrink-0">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center shrink-0 shadow-inner">
              <ShieldAlert className="w-6 h-6 text-white animate-pulse" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 border border-white/30 text-white px-2.5 py-0.5 rounded-full">
                  🚨 Aviso Sonoro & Pop-up Ativo
                </span>
                <span className="text-[10px] font-bold bg-white text-red-700 px-2 py-0.5 rounded-full">
                  Menos de {threshold} dias
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black tracking-tight mt-1">
                Atenção Gestor: {criticalExpiringList.length} Item(ns) em Vencimento Crítico!
              </h3>
              <p className="text-xs text-white/90 mt-0.5">
                Olá {currentUser?.name || 'Gestor'}, há documentos ou instrumentos com prazo de expiração imediata ou vencidos na frota.
              </p>
            </div>
          </div>

          <button
            onClick={closeCriticalPopup}
            className="text-white/80 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition cursor-pointer shrink-0"
            title="Fechar aviso"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Pills */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between gap-2 text-xs flex-wrap shrink-0">
          <div className="flex items-center gap-2">
            {expiredCount > 0 && (
              <span className="inline-flex items-center gap-1.5 font-bold text-red-700 bg-red-100/80 px-2.5 py-1 rounded-lg">
                <span className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
                <span>{expiredCount} Vencido(s)</span>
              </span>
            )}
            {expiringSoonCount > 0 && (
              <span className="inline-flex items-center gap-1.5 font-bold text-amber-800 bg-amber-100/80 px-2.5 py-1 rounded-lg">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>{expiringSoonCount} Vencendo em até {threshold}d</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleSound}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition border cursor-pointer ${
                settings.soundAlertEnabled
                  ? 'bg-white text-slate-800 border-slate-200 hover:bg-slate-100'
                  : 'bg-slate-200/70 text-slate-500 border-transparent hover:bg-slate-200'
              }`}
              title={settings.soundAlertEnabled ? 'Desativar som de alerta' : 'Ativar som de alerta'}
            >
              {settings.soundAlertEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Som Ativo</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                  <span>Som Desativado</span>
                </>
              )}
            </button>

            <button
              onClick={() => playCriticalAlertSound()}
              className="text-[11px] font-bold text-[#ff5500] hover:underline cursor-pointer"
            >
              Replay do som
            </button>
          </div>
        </div>

        {/* Scrollable Items List */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1 custom-scrollbar">
          {criticalExpiringList.map((item, idx) => (
            <div 
              key={idx}
              className={`p-4 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                item.isExpired 
                  ? 'bg-red-50/70 border-red-200' 
                  : 'bg-amber-50/70 border-amber-200'
              }`}
            >
              <div className="flex items-start gap-3 min-w-0">
                <div className={`p-2.5 rounded-xl shrink-0 mt-0.5 ${
                  item.isExpired ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {item.isEquipment ? <Gauge className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                </div>

                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-slate-900 text-sm">
                      Frota {item.vehicle.fleetNumber}
                    </span>
                    <span className="font-mono text-[11px] text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                      {item.vehicle.plate}/{item.vehicle.uf}
                    </span>
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${
                      item.isEquipment 
                        ? 'bg-indigo-100 text-indigo-800 border-indigo-200' 
                        : 'bg-white text-slate-800 border-slate-300'
                    }`}>
                      {item.isEquipment ? `EQUIPAMENTO: ${item.equipmentTag || item.docType}` : `DOC: ${item.docType}`}
                    </span>
                  </div>

                  <p className="text-slate-600 text-[11px] truncate">
                    {item.isEquipment 
                      ? (item.equipmentDescription || 'Instrumento de medição ou segurança')
                      : `Documento oficial obrigatório da frota ${item.vehicle.fleetNumber}`}
                  </p>

                  <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                    <Calendar className="w-3 h-3" />
                    <span>Data de vencimento: <strong>{formatDisplayDate(item.expiryDate)}</strong></span>
                  </div>
                </div>
              </div>

              {/* Status Badge & Action */}
              <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-200/60">
                <span className={`font-black text-xs px-2.5 py-1 rounded-lg border ${
                  item.isExpired
                    ? 'bg-red-600 text-white border-red-700 shadow-2xs'
                    : 'bg-amber-500 text-white border-amber-600 shadow-2xs'
                }`}>
                  {item.isExpired 
                    ? `Vencido há ${Math.abs(item.daysRemaining)}d` 
                    : item.daysRemaining === 0 
                      ? 'Vence HOJE!' 
                      : `Vence em ${item.daysRemaining} dia(s)`}
                </span>

                {onNavigateToFleet && (
                  <button
                    onClick={() => {
                      onNavigateToFleet();
                      closeCriticalPopup();
                    }}
                    className="text-[11px] font-bold text-[#ff5500] hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>Ver na Frota</span>
                    <ExternalLink className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Configurável na aba <strong>Notificações</strong>.</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {onNavigateToNotifications && (
              <button
                onClick={() => {
                  onNavigateToNotifications();
                  closeCriticalPopup();
                }}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Central de Notificações</span>
              </button>
            )}

            <button
              onClick={closeCriticalPopup}
              className="flex-1 sm:flex-initial bg-[#ff5500] hover:bg-[#e64d00] text-white px-5 py-2 rounded-xl text-xs font-black shadow-md shadow-orange-500/20 transition cursor-pointer"
            >
              Entendido / Dispensar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
