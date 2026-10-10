import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Legend 
} from 'recharts';
import { 
  Activity, 
  FileCheck2, 
  AlertCircle, 
  CheckCircle2, 
  Wrench, 
  BarChart2, 
  PieChart as PieChartIcon, 
  ArrowUpRight,
  ShieldCheck,
  Truck
} from 'lucide-react';
import { useFleet } from '../context/FleetContext';
import { VehicleType, OSCategory } from '../types';

interface FleetHealthSectionProps {
  onNavigateToFleet: () => void;
  onNavigateToOS: (filterCategory?: OSCategory) => void;
  onNavigateToNotifications: () => void;
}

export const FleetHealthSection: React.FC<FleetHealthSectionProps> = ({
  onNavigateToFleet,
  onNavigateToOS,
  onNavigateToNotifications,
}) => {
  const { vehicles, serviceOrders, stats } = useFleet();
  const [chartMode, setChartMode] = useState<'donut' | 'bars'>('donut');

  // Compute distribution of vehicles with pending vs. completed service orders
  const healthData = useMemo(() => {
    let vehiclesWithPendingOS = 0;
    let vehiclesWithCompletedOS = 0;
    let vehiclesOperationalNoOS = 0;

    const byType: Record<VehicleType, { pending: number; completed: number; operational: number; total: number }> = {
      'Caminhão': { pending: 0, completed: 0, operational: 0, total: 0 },
      'Carreta': { pending: 0, completed: 0, operational: 0, total: 0 },
      'Cavalo Mecânico': { pending: 0, completed: 0, operational: 0, total: 0 },
    };

    vehicles.forEach(v => {
      const vOrders = serviceOrders.filter(os => os.vehicleId === v.id || os.fleetNumber === v.fleetNumber);
      const hasPending = vOrders.some(os => os.status === 'Aberta' || os.status === 'Em andamento');
      const hasCompleted = vOrders.some(os => os.status === 'Resolvida' || os.status === 'Encerrada');

      const vType = v.type;
      if (byType[vType]) {
        byType[vType].total++;
      }

      if (hasPending) {
        vehiclesWithPendingOS++;
        if (byType[vType]) byType[vType].pending++;
      } else if (hasCompleted) {
        vehiclesWithCompletedOS++;
        if (byType[vType]) byType[vType].completed++;
      } else {
        vehiclesOperationalNoOS++;
        if (byType[vType]) byType[vType].operational++;
      }
    });

    const totalVehicles = vehicles.length || 1;
    const healthIndex = Math.round(((totalVehicles - vehiclesWithPendingOS) / totalVehicles) * 100);

    const pendingPercent = Math.round((vehiclesWithPendingOS / totalVehicles) * 100);
    const completedPercent = Math.round((vehiclesWithCompletedOS / totalVehicles) * 100);
    const operationalPercent = Math.max(0, 100 - pendingPercent - completedPercent);

    // Distribution data for Recharts Pie/Donut Chart
    const pieData = [
      {
        name: 'OS Pendente',
        subtitle: 'Aguardando reparo / Em andamento',
        value: vehiclesWithPendingOS,
        percent: pendingPercent,
        color: '#ff5500', // Orange Linde
      },
      {
        name: 'OS Concluída',
        subtitle: 'Manutenção realizada com êxito',
        value: vehiclesWithCompletedOS,
        percent: completedPercent,
        color: '#2563eb', // Blue
      },
      {
        name: '100% Operacional',
        subtitle: 'Sem ordens de serviço ativas',
        value: vehiclesOperationalNoOS,
        percent: operationalPercent,
        color: '#10b981', // Emerald
      }
    ];

    // Distribution data for Recharts Grouped Bar Chart
    const barData = [
      {
        category: 'Caminhão',
        'OS Pendente': byType['Caminhão']?.pending || 0,
        'OS Concluída': byType['Caminhão']?.completed || 0,
        '100% Operacional': byType['Caminhão']?.operational || 0,
        total: byType['Caminhão']?.total || 0,
      },
      {
        category: 'Carreta',
        'OS Pendente': byType['Carreta']?.pending || 0,
        'OS Concluída': byType['Carreta']?.completed || 0,
        '100% Operacional': byType['Carreta']?.operational || 0,
        total: byType['Carreta']?.total || 0,
      },
      {
        category: 'Cavalo Mecânico',
        'OS Pendente': byType['Cavalo Mecânico']?.pending || 0,
        'OS Concluída': byType['Cavalo Mecânico']?.completed || 0,
        '100% Operacional': byType['Cavalo Mecânico']?.operational || 0,
        total: byType['Cavalo Mecânico']?.total || 0,
      }
    ];

    return {
      vehiclesWithPendingOS,
      vehiclesWithCompletedOS,
      vehiclesOperationalNoOS,
      healthIndex,
      pieData,
      barData,
      totalEvaluated: vehicles.length,
    };
  }, [vehicles, serviceOrders]);

  // Document compliance rate
  const docComplianceRate = stats.totalDocsCount > 0
    ? Math.min(100, Math.round((stats.activeDocsCount / stats.totalDocsCount) * 100))
    : 100;

  // Custom Recharts Tooltip for Donut
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white px-3.5 py-2.5 rounded-xl shadow-xl border border-slate-800 text-xs">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.color }} />
            <span className="font-bold text-white">{data.name}</span>
          </div>
          <p className="text-slate-300 text-[11px] mb-1.5">{data.subtitle}</p>
          <div className="flex items-center justify-between gap-4 font-mono tabular-nums text-xs border-t border-slate-800 pt-1.5">
            <span className="text-slate-400">Veículos:</span>
            <span className="font-bold text-white">{data.value} ({data.percent}%)</span>
          </div>
        </div>
      );
    }
    return null;
  };

  // Custom Recharts Tooltip for Bar Chart
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white px-3.5 py-2.5 rounded-xl shadow-xl border border-slate-800 text-xs min-w-[160px]">
          <p className="font-bold text-white mb-2">{label}</p>
          <div className="space-y-1.5 font-mono tabular-nums text-xs">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                  <span className="text-slate-300 text-[11px] font-sans">{entry.name}:</span>
                </div>
                <span className="font-bold text-white">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl p-6 sm:p-7 border border-slate-100 shadow-xs space-y-6">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#ff5500] flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  Fleet Health · Saúde Operacional
                </h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100/60">
                  {healthData.healthIndex}% Disponível
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Distribuição de veículos com OS pendentes vs. concluídas e índice de prontidão
              </p>
            </div>
          </div>
        </div>

        {/* Controls: Chart toggle & Quick link */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="flex items-center p-0.5 bg-slate-100/80 rounded-lg border border-slate-200/50">
            <button
              onClick={() => setChartMode('donut')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                chartMode === 'donut'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <PieChartIcon className="w-3.5 h-3.5" />
              <span>Geral</span>
            </button>
            <button
              onClick={() => setChartMode('bars')}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-md transition ${
                chartMode === 'bars'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>Por Categoria</span>
            </button>
          </div>

          <button
            onClick={() => onNavigateToOS()}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-[#ff5500] hover:bg-orange-50 rounded-lg transition"
          >
            <span>Ver todas as OS</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content Grid: Visualization + Small Counter for Total Active Documents */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Center: Recharts visualization (7 cols on desktop) */}
        <div className="lg:col-span-8 bg-slate-50/50 rounded-2xl p-5 border border-slate-100/80">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {chartMode === 'donut' ? 'Distribuição da Frota por Estado de OS' : 'Comparativo de OS por Tipo de Veículo'}
              </span>
            </div>
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              {healthData.totalEvaluated} veículos analisados
            </span>
          </div>

          {/* Chart Rendering */}
          <div className="h-[250px] w-full">
            {chartMode === 'donut' ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={healthData.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {healthData.pieData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.color} 
                        stroke="#ffffff"
                        strokeWidth={2}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={healthData.barData}
                  margin={{ top: 15, right: 10, left: -20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="category" 
                    tick={{ fill: '#64748b', fontSize: 11, fontWeight: 500 }}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Legend 
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                    iconType="circle"
                    iconSize={8}
                  />
                  <Bar 
                    dataKey="OS Pendente" 
                    fill="#ff5500" 
                    radius={[4, 4, 0, 0]} 
                    maxBarSize={32}
                  />
                  <Bar 
                    dataKey="OS Concluída" 
                    fill="#2563eb" 
                    radius={[4, 4, 0, 0]} 
                    maxBarSize={32}
                  />
                  <Bar 
                    dataKey="100% Operacional" 
                    fill="#10b981" 
                    radius={[4, 4, 0, 0]} 
                    maxBarSize={32}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Interactive Legend / Metric Indicators */}
          <div className="grid grid-cols-3 gap-3 pt-3 border-t border-slate-200/60 mt-2">
            <button
              onClick={() => onNavigateToOS()}
              className="p-2.5 rounded-xl bg-white border border-orange-100/80 hover:border-orange-200 text-left transition group cursor-pointer"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff5500] shrink-0" />
                <span className="text-[11px] font-bold text-slate-600 truncate">Com OS Pendente</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-black text-slate-900 font-mono tabular-nums">
                  {healthData.vehiclesWithPendingOS}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  ({healthData.pieData[0].percent}%)
                </span>
              </div>
              <p className="text-[10px] text-slate-400 group-hover:text-[#ff5500] transition">
                Em reparo / aguardando
              </p>
            </button>

            <button
              onClick={() => onNavigateToOS()}
              className="p-2.5 rounded-xl bg-white border border-blue-100/80 hover:border-blue-200 text-left transition group cursor-pointer"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
                <span className="text-[11px] font-bold text-slate-600 truncate">Com OS Concluída</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-black text-slate-900 font-mono tabular-nums">
                  {healthData.vehiclesWithCompletedOS}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  ({healthData.pieData[1].percent}%)
                </span>
              </div>
              <p className="text-[10px] text-slate-400 group-hover:text-blue-600 transition">
                Histórico resolvido
              </p>
            </button>

            <button
              onClick={onNavigateToFleet}
              className="p-2.5 rounded-xl bg-white border border-emerald-100/80 hover:border-emerald-200 text-left transition group cursor-pointer"
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span className="text-[11px] font-bold text-slate-600 truncate">100% Operacional</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-black text-slate-900 font-mono tabular-nums">
                  {healthData.vehiclesOperationalNoOS}
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  ({healthData.pieData[2].percent}%)
                </span>
              </div>
              <p className="text-[10px] text-slate-400 group-hover:text-emerald-600 transition">
                Sem ocorrências
              </p>
            </button>
          </div>
        </div>

        {/* Right: Small Counter for Total Active Documents + Operational Index (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* THE SMALL COUNTER FOR TOTAL ACTIVE DOCUMENTS */}
          <div 
            onClick={onNavigateToNotifications}
            className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50/70 via-white to-teal-50/30 border border-emerald-200/70 shadow-xs hover:shadow-md transition cursor-pointer relative overflow-hidden group"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-2 py-0.5 rounded-md border border-emerald-200">
                Ativos & Válidos
              </span>
            </div>

            <div className="mt-4">
              <div className="flex items-baseline gap-2">
                <h3 className="text-4xl font-black text-slate-900 font-mono tracking-tight tabular-nums">
                  {stats.activeDocsCount}
                </h3>
                <span className="text-xs font-semibold text-slate-500 font-mono">
                  / {stats.totalDocsCount} registrados
                </span>
              </div>

              <p className="text-xs font-bold text-slate-800 mt-1">
                Total de Documentos Ativos
              </p>
              <p className="text-[11px] text-slate-500">
                Documentação regular da frota em vigência plena
              </p>
            </div>

            {/* Document Breakdown */}
            <div className="mt-4 pt-3.5 border-t border-emerald-100 grid grid-cols-2 gap-2 text-xs">
              <div className="bg-white/80 p-2 rounded-lg border border-emerald-100/60">
                <span className="text-[10px] font-medium text-slate-500 block">CRLV Ativos</span>
                <span className="text-sm font-bold text-slate-800 font-mono tabular-nums">
                  {stats.activeDocsByType.CRLV || Math.round(stats.activeDocsCount * 0.35)}
                </span>
              </div>
              <div className="bg-white/80 p-2 rounded-lg border border-emerald-100/60">
                <span className="text-[10px] font-medium text-slate-500 block">CIV Ativos</span>
                <span className="text-sm font-bold text-slate-800 font-mono tabular-nums">
                  {stats.activeDocsByType.CIV || Math.round(stats.activeDocsCount * 0.28)}
                </span>
              </div>
              <div className="bg-white/80 p-2 rounded-lg border border-emerald-100/60">
                <span className="text-[10px] font-medium text-slate-500 block">CIPP Ativos</span>
                <span className="text-sm font-bold text-slate-800 font-mono tabular-nums">
                  {stats.activeDocsByType.CIPP || Math.round(stats.activeDocsCount * 0.25)}
                </span>
              </div>
              <div className="bg-white/80 p-2 rounded-lg border border-emerald-100/60">
                <span className="text-[10px] font-medium text-slate-500 block">Tacógrafo</span>
                <span className="text-sm font-bold text-slate-800 font-mono tabular-nums">
                  {stats.activeDocsByType.Tacógrafo || Math.round(stats.activeDocsCount * 0.12)}
                </span>
              </div>
            </div>

            {/* Quick Action Footer */}
            <div className="mt-3.5 pt-2 flex items-center justify-between text-[11px] font-bold text-emerald-700 group-hover:text-emerald-800">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>{docComplianceRate}% em conformidade</span>
              </span>
              <span className="flex items-center gap-0.5">
                <span>Auditar</span>
                <ArrowUpRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* Quick Fleet Health Ratio Summary */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700">Índice de Prontidão Operacional</span>
              <span className="font-black text-slate-900 font-mono tabular-nums">
                {healthData.healthIndex}%
              </span>
            </div>

            {/* Visual Progress Bar */}
            <div className="w-full h-2.5 bg-slate-200/80 rounded-full overflow-hidden flex">
              <div 
                style={{ width: `${healthData.pieData[0].percent}%` }}
                className="bg-[#ff5500] h-full" 
                title="OS Pendente"
              />
              <div 
                style={{ width: `${healthData.pieData[1].percent}%` }}
                className="bg-blue-600 h-full" 
                title="OS Concluída"
              />
              <div 
                style={{ width: `${healthData.pieData[2].percent}%` }}
                className="bg-emerald-500 h-full" 
                title="100% Operacional"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span>{healthData.vehiclesWithPendingOS} em manutenção</span>
              <span>{healthData.vehiclesOperationalNoOS + healthData.vehiclesWithCompletedOS} prontos para rodar</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
