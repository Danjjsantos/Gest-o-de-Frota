import React, { useMemo } from 'react';
import { 
  Gauge, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ShieldCheck, 
  Tag
} from 'lucide-react';
import { useFleet } from '../context/FleetContext';

interface EquipmentsDashboardSectionProps {
  onNavigateToFleet?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToReport?: () => void;
}

export const EquipmentsDashboardSection: React.FC<EquipmentsDashboardSectionProps> = ({
  onNavigateToFleet,
  onNavigateToNotifications,
}) => {
  const { allEquipmentsList, stats } = useFleet();

  const vehiclesWithEquipmentCount = useMemo(() => {
    const ids = new Set(allEquipmentsList.map(item => item.vehicle.id));
    return ids.size;
  }, [allEquipmentsList]);

  const complianceRate = stats.totalEquipmentsCount > 0 
    ? Math.round((stats.validEquipmentsCount / stats.totalEquipmentsCount) * 100) 
    : 0;

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-100 shadow-xs space-y-5">
      {/* Header do Quadro */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100/80 flex items-center justify-center text-indigo-600 shadow-2xs">
            <Gauge className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                Equipamentos & Instrumentos Cadastrados
              </h3>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
                Status de Calibração
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Quadro de monitoramento metrológico e conformidade periódica dos equipamentos da frota
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 self-start sm:self-auto">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-200/80 text-slate-700 font-mono">
            <Tag className="w-3.5 h-3.5 text-[#ff5500]" />
            <strong className="text-slate-900">{stats.totalEquipmentsCount}</strong> instrumentos em <strong className="text-slate-900">{vehiclesWithEquipmentCount}</strong> frotas
          </span>
        </div>
      </div>

      {/* Quadro com os Números de Equipamentos e seus Status */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 lg:gap-5">
        {/* Total Equipamentos */}
        <div 
          onClick={onNavigateToFleet}
          className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-blue-200 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50/80 flex items-center justify-center text-blue-600 group-hover:scale-105 transition">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
              Frota
            </span>
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight tabular-nums">
              {stats.totalEquipmentsCount}
            </h3>
            <p className="text-xs sm:text-sm font-bold text-slate-700">
              Total de Equipamentos
            </p>
            <p className="text-[10px] sm:text-xs font-medium text-slate-400">
              {vehiclesWithEquipmentCount} veículos monitorados
            </p>
          </div>
        </div>

        {/* Calibração em Dia */}
        <div 
          className="bg-white rounded-2xl p-4 sm:p-5 border border-emerald-200/80 shadow-2xs hover:shadow-md hover:border-emerald-300 transition group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50/80 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/70 font-mono">
              {complianceRate}%
            </span>
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl sm:text-3xl font-black text-emerald-700 font-mono tracking-tight tabular-nums">
              {stats.validEquipmentsCount}
            </h3>
            <p className="text-xs sm:text-sm font-bold text-slate-700">
              Calibração em Dia
            </p>
            <p className="text-[10px] sm:text-xs font-medium text-slate-400">
              Instrumentos válidos e conformes
            </p>
          </div>
        </div>

        {/* Vencendo em 30 Dias */}
        <div 
          onClick={onNavigateToNotifications || onNavigateToFleet}
          className="bg-white rounded-2xl p-4 sm:p-5 border border-amber-200/90 shadow-2xs hover:shadow-md hover:border-amber-300 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50/80 flex items-center justify-center text-amber-600 group-hover:scale-105 transition">
              <Clock className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/70">
              Atenção
            </span>
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight tabular-nums">
              {stats.expiringEquipmentsCount}
            </h3>
            <p className="text-xs sm:text-sm font-bold text-slate-700">
              Vencendo em 30 Dias
            </p>
            <p className="text-[10px] sm:text-xs font-medium text-slate-400">
              Requer agendamento de aferição
            </p>
          </div>
        </div>

        {/* Calibração Vencida */}
        <div 
          onClick={onNavigateToNotifications || onNavigateToFleet}
          className="bg-white rounded-2xl p-4 sm:p-5 border border-rose-200/90 shadow-2xs hover:shadow-md hover:border-rose-300 transition cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-3">
            <div className="w-10 h-10 rounded-xl bg-red-50/80 flex items-center justify-center text-red-600 group-hover:scale-105 transition">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-red-800 bg-red-50 px-2 py-0.5 rounded-md border border-red-200/70">
              Crítico
            </span>
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight tabular-nums">
              {stats.expiredEquipmentsCount}
            </h3>
            <p className="text-xs sm:text-sm font-bold text-slate-700">
              Calibração Vencida
            </p>
            <p className="text-[10px] sm:text-xs font-medium text-slate-400">
              Ação corretiva imediata
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
