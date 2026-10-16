import React from 'react';
import { 
  Truck, 
  ClipboardList, 
  Clock, 
  AlertTriangle, 
  Settings2, 
  Wrench, 
  Zap, 
  Radio, 
  CircleDot,
  Eye,
  TrendingUp,
  ChevronRight,
  Plus,
  Bell,
  Download
} from 'lucide-react';
import { useFleet } from '../context/FleetContext';
import { OSCategory, ServiceOrder } from '../types';
import { FleetHealthSection } from '../components/FleetHealthSection';
import { VacuumMonthlyChart } from '../components/VacuumMonthlyChart';
import { PriorityBadge } from '../components/PriorityBadge';
import { generateDashboardPDF } from '../utils/pdfGenerator';

interface DashboardViewProps {
  onNavigateToFleet: () => void;
  onNavigateToOS: (filterCategory?: OSCategory) => void;
  onSelectOS: (os: ServiceOrder) => void;
  onNavigateToNotifications: () => void;
  onOpenNewOS?: () => void;
  onNavigateToReport?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  onNavigateToFleet,
  onNavigateToOS,
  onSelectOS,
  onNavigateToNotifications,
  onOpenNewOS,
  onNavigateToReport,
}) => {
  const { 
    stats, 
    serviceOrders, 
    currentUser, 
    notifications,
    vehicles,
    expiredDocumentsList,
    expiringDocumentsList
  } = useFleet();

  const [downloadSuccess, setDownloadSuccess] = React.useState(false);

  const handleExportPDF = () => {
    generateDashboardPDF(
      stats,
      vehicles,
      serviceOrders,
      expiredDocumentsList,
      expiringDocumentsList
    );
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3000);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // Time-aware greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia';
    if (hour >= 12 && hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const recentOrders = serviceOrders.slice(0, 5);

  const getCategoryIcon = (cat: OSCategory) => {
    switch (cat) {
      case 'Mecânica': return <Wrench className="w-5 h-5 text-blue-600" />;
      case 'Elétrica': return <Zap className="w-5 h-5 text-amber-600" />;
      case 'Borracharia': return <CircleDot className="w-5 h-5 text-orange-600" />;
      case 'Seva/Sacar':
      case 'Seva/Sascar': return <Radio className="w-5 h-5 text-emerald-600" />;
      case 'Motora': return <Eye className="w-5 h-5 text-indigo-600" />;
      case 'Driox': return <Settings2 className="w-5 h-5 text-purple-600" />;
    }
  };

  const getStatusBadge = (status: ServiceOrder['status']) => {
    switch (status) {
      case 'Resolvida':
        return (
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700">
            Resolvida
          </span>
        );
      case 'Encerrada':
        return (
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600">
            Encerrada
          </span>
        );
      case 'Em andamento':
        return (
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-700">
            Em andamento
          </span>
        );
      case 'Aberta':
        return (
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700">
            Aberta
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 max-w-7xl mx-auto">
      {/* Welcome & Quick Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-sans">
            {getGreeting()}, {currentUser?.name.split(' ')[0] || 'Daniel'}!
          </h2>
          <p className="text-sm font-medium text-slate-500 mt-0.5">
            Visão geral da frota
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {currentUser && (currentUser.role === 'Administrador' || currentUser.role === 'Gerente') && (
            <>
              <button
                onClick={onNavigateToNotifications}
                className="relative p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition shadow-2xs"
                title="Ver notificações e alertas"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-xs">
                    {unreadCount}
                  </span>
                )}
              </button>

              <button
                onClick={handleExportPDF}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold transition shadow-xs border cursor-pointer active:scale-95 ${
                  downloadSuccess
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
                title="Exportar Relatório Geral do Dashboard em PDF"
              >
                <Download className={`w-4 h-4 ${downloadSuccess ? 'text-white' : 'text-[#ff5500]'}`} />
                <span>{downloadSuccess ? 'PDF Baixado!' : 'Exportar PDF'}</span>
              </button>
            </>
          )}

          {onOpenNewOS && (
            <button
              onClick={onOpenNewOS}
              className="flex items-center gap-2 bg-[#ff5500] hover:bg-[#ea4e00] text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-orange-500/20 transition active:scale-95 whitespace-nowrap"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Nova OS</span>
            </button>
          )}
        </div>
      </div>

      {/* 4 Stat Cards - 2x2 no mobile/tablet, 4 colunas em telas grandes conforme screenshot */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 lg:gap-5">
        {/* Total de Veículos */}
        <div 
          onClick={onNavigateToFleet}
          className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-xs hover:shadow-md transition cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-50/80 flex items-center justify-center text-blue-600 mb-3">
            <Truck className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight tabular-nums">
              {stats.totalVehicles}
            </h3>
            <p className="text-xs sm:text-sm font-bold text-slate-700">
              Total de Veículos
            </p>
            <p className="text-[10px] sm:text-xs font-medium text-slate-400">
              {stats.caminhaoCount}T · {stats.carretaCount}C · {stats.cavaloCount}CM
            </p>
          </div>
        </div>

        {/* OS Abertas */}
        <div 
          onClick={() => onNavigateToOS()}
          className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-100 shadow-xs hover:shadow-md transition cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-orange-50/80 flex items-center justify-center text-[#ff5500] mb-3">
            <ClipboardList className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight tabular-nums">
              {stats.openOsCount}
            </h3>
            <p className="text-xs sm:text-sm font-bold text-slate-700">
              OS Abertas
            </p>
            <p className="text-[10px] sm:text-xs font-medium text-slate-400">
              {serviceOrders.filter(os => os.status === 'Aberta').length} abertas · {serviceOrders.filter(os => os.status === 'Em andamento').length} em andamento
            </p>
          </div>
        </div>

        {/* Docs Vencendo (com borda sutil amarela como no screenshot) */}
        <div 
          onClick={(currentUser?.role === 'Administrador' || currentUser?.role === 'Gerente') ? onNavigateToNotifications : onNavigateToFleet}
          className="bg-white rounded-2xl p-4 sm:p-5 border border-amber-200/90 shadow-xs hover:shadow-md transition cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-50/80 flex items-center justify-center text-amber-600 mb-3">
            <Clock className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight tabular-nums">
              {stats.expiringDocsCount}
            </h3>
            <p className="text-xs sm:text-sm font-bold text-slate-700">
              Docs. Vencendo
            </p>
            <p className="text-[10px] sm:text-xs font-medium text-slate-400">
              Nos próximos 30 dias
            </p>
          </div>
        </div>

        {/* Docs Vencidos (com borda sutil vermelha como no screenshot) */}
        <div 
          onClick={(currentUser?.role === 'Administrador' || currentUser?.role === 'Gerente') ? onNavigateToNotifications : onNavigateToFleet}
          className="bg-white rounded-2xl p-4 sm:p-5 border border-rose-200/90 shadow-xs hover:shadow-md transition cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-red-50/80 flex items-center justify-center text-red-600 mb-3">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl sm:text-3xl font-black text-slate-900 font-mono tracking-tight tabular-nums">
              {stats.expiredDocsCount}
            </h3>
            <p className="text-xs sm:text-sm font-bold text-slate-700">
              Docs. Vencidos
            </p>
            <p className="text-[10px] sm:text-xs font-medium text-slate-400">
              Requer atenção imediata
            </p>
          </div>
        </div>
      </div>

      {/* Fleet Health Section: Recharts Distribution & Active Documents Counter */}
      <FleetHealthSection
        onNavigateToFleet={onNavigateToFleet}
        onNavigateToOS={onNavigateToOS}
        onNavigateToNotifications={onNavigateToNotifications}
      />

      {/* Gráfico Mensal de Vácuo das Frotas de Gases do Ar */}
      <VacuumMonthlyChart
        vehicles={vehicles}
        onSelectVehicle={onNavigateToFleet}
      />

      {/* OS por Categoria & OS Recentes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* OS por Categoria */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-slate-900">
            <TrendingUp className="w-5 h-5 text-[#ff5500]" />
            <h3 className="text-sm font-extrabold uppercase tracking-wider">
              OS Por Categoria
            </h3>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Mecânica */}
            <div 
              onClick={() => onNavigateToOS('Mecânica')}
              className="p-3.5 rounded-2xl bg-[#eff6ff] border border-blue-100 flex items-center justify-between cursor-pointer hover:border-blue-300 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100/80 flex items-center justify-center">
                  <Wrench className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-700 block">Mecânica</span>
                  <span className="text-2xl font-black text-blue-700 font-mono tabular-nums">
                    {stats.osByCategory.Mecânica}
                  </span>
                </div>
              </div>
            </div>

            {/* Elétrica */}
            <div 
              onClick={() => onNavigateToOS('Elétrica')}
              className="p-3.5 rounded-2xl bg-[#fefce8] border border-amber-100 flex items-center justify-between cursor-pointer hover:border-amber-300 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-100/80 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-700 block">Elétrica</span>
                  <span className="text-2xl font-black text-amber-700 font-mono tabular-nums">
                    {stats.osByCategory.Elétrica}
                  </span>
                </div>
              </div>
            </div>

            {/* Borracharia */}
            <div 
              onClick={() => onNavigateToOS('Borracharia')}
              className="p-3.5 rounded-2xl bg-[#fff7ed] border border-orange-100 flex items-center justify-between cursor-pointer hover:border-orange-300 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-orange-100/80 flex items-center justify-center">
                  <CircleDot className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-700 block">Borracharia</span>
                  <span className="text-2xl font-black text-orange-700 font-mono tabular-nums">
                    {stats.osByCategory.Borracharia}
                  </span>
                </div>
              </div>
            </div>

            {/* Seva/Sacar */}
            <div 
              onClick={() => onNavigateToOS('Seva/Sacar')}
              className="p-3.5 rounded-2xl bg-[#f0fdf4] border border-emerald-100 flex items-center justify-between cursor-pointer hover:border-emerald-300 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-100/80 flex items-center justify-center">
                  <Radio className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-700 block">Seva/Sacar</span>
                  <span className="text-2xl font-black text-emerald-700 font-mono tabular-nums">
                    {stats.osByCategory['Seva/Sacar'] || stats.osByCategory['Seva/Sascar'] || 0}
                  </span>
                </div>
              </div>
            </div>

            {/* Motora */}
            <div 
              onClick={() => onNavigateToOS('Motora')}
              className="p-3.5 rounded-2xl bg-[#eef2ff] border border-indigo-100 flex items-center justify-between cursor-pointer hover:border-indigo-300 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-100/80 flex items-center justify-center">
                  <Eye className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-700 block">Motora</span>
                  <span className="text-2xl font-black text-indigo-700 font-mono tabular-nums">
                    {stats.osByCategory.Motora}
                  </span>
                </div>
              </div>
            </div>

            {/* Driox */}
            <div 
              onClick={() => onNavigateToOS('Driox')}
              className="p-3.5 rounded-2xl bg-[#faf5ff] border border-purple-100 flex items-center justify-between cursor-pointer hover:border-purple-300 transition"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-100/80 flex items-center justify-center">
                  <Settings2 className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-700 block">Driox</span>
                  <span className="text-2xl font-black text-purple-700 font-mono tabular-nums">
                    {stats.osByCategory.Driox}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* OS Recentes */}
        <div className="lg:col-span-6 bg-white rounded-2xl p-6 border border-slate-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-slate-900">
              <ClipboardList className="w-5 h-5 text-[#ff5500]" />
              <h3 className="text-sm font-extrabold uppercase tracking-wider">
                OS Recentes
              </h3>
            </div>
            <button
              onClick={() => onNavigateToOS()}
              className="text-xs font-bold text-[#ff5500] hover:text-[#e64d00] flex items-center gap-0.5 transition"
            >
              <span>Ver todas</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {recentOrders.map(os => (
              <div
                key={os.id}
                onClick={() => onSelectOS(os)}
                className="py-3 px-1 flex items-center justify-between hover:bg-slate-50/80 rounded-xl transition cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0">
                    {getCategoryIcon(os.category)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-bold text-slate-800 truncate">
                        {os.title}
                      </h4>
                      <PriorityBadge priority={os.priority} size="sm" showSeverityLabel={true} />
                    </div>
                    <p className="text-[11px] font-mono text-slate-400">
                      {os.code} · Frota {os.fleetNumber}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {getStatusBadge(os.status)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
