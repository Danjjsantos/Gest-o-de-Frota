import React, { useState, useMemo } from 'react';
import { 
  Download, 
  FileText, 
  Check, 
  AlertTriangle, 
  Clock, 
  Truck,
  Filter,
  Search,
  CheckCircle2,
  Calendar,
  Layers,
  Wrench,
  Zap,
  CircleDot,
  Radio,
  Eye,
  Settings2,
  FileCheck,
  ShieldCheck,
  UserCheck,
  FileSpreadsheet,
  BarChart3,
  Gauge,
  ChevronDown,
  Tag
} from 'lucide-react';
import { useFleet, getDaysDifference, formatDisplayDate } from '../context/FleetContext';
import { Vehicle, DocumentType, OSCategory, ServiceOrder, getVacuumClassification } from '../types';
import { 
  generateDashboardPDF, 
  generateVehicleDossierPDF, 
  generateFullFleetReportPDF 
} from '../utils/pdfGenerator';

type ReportTab = 'dashboard' | 'by_vehicle' | 'fleet_summary';

export const ReportView: React.FC = () => {
  const { 
    vehicles, 
    stats, 
    serviceOrders, 
    users, 
    expiredDocumentsList, 
    expiringDocumentsList,
    allEquipmentsList,
  } = useFleet();

  const [activeTab, setActiveTab] = useState<ReportTab>('dashboard');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(vehicles[0]?.id || '');
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending'>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const selectedVehicle = useMemo(() => {
    return vehicles.find(v => v.id === selectedVehicleId) || vehicles[0];
  }, [vehicles, selectedVehicleId]);

  const vehicleOrders = useMemo(() => {
    if (!selectedVehicle) return [];
    return serviceOrders.filter(
      os => os.vehicleId === selectedVehicle.id || os.fleetNumber === selectedVehicle.fleetNumber
    );
  }, [serviceOrders, selectedVehicle]);

  const filteredVehiclesList = useMemo(() => {
    if (!vehicleSearch.trim()) return vehicles;
    const term = vehicleSearch.toLowerCase();
    return vehicles.filter(
      v =>
        v.fleetNumber.toLowerCase().includes(term) ||
        v.plate.toLowerCase().includes(term) ||
        v.model.toLowerCase().includes(term) ||
        v.brand.toLowerCase().includes(term)
    );
  }, [vehicles, vehicleSearch]);

  // Vehicles with pending documents or open service orders
  const pendingVehicles = useMemo(() => {
    return vehicles.filter(v => {
      const hasOpenOS = serviceOrders.some(
        os => (os.vehicleId === v.id || os.fleetNumber === v.fleetNumber) && (os.status === 'Aberta' || os.status === 'Em andamento')
      );
      const hasDocIssue = (['CRLV', 'CIV', 'CIPP', 'Tacógrafo'] as DocumentType[]).some(dtype => {
        const doc = v.documents[dtype];
        return doc && (doc.status === 'expired' || doc.status === 'expiring');
      });
      return hasOpenOS || hasDocIssue;
    });
  }, [vehicles, serviceOrders]);

  const displayVehicles = activeFilter === 'all' ? vehicles : pendingVehicles;

  // Carretas e Caminhões exclusivos de Gases do Ar (LO2, LN2, LAR) para monitoramento de vácuo (excluindo tipo CO2)
  const vacuumCarretasGasesDoAr = useMemo(() => {
    return vehicles.filter(v => {
      // 1. Deve ser Carreta ou Caminhão
      if (v.type !== 'Carreta' && v.type !== 'Caminhão') return false;

      // 2. Não pode ser veículo do tipo CO2
      const isCO2 = (v.cargoProduct && v.cargoProduct.includes('CO2')) || 
                    (v.cargoProducts && v.cargoProducts.some(p => p.includes('CO2')));
      if (isCO2) return false;

      // 3. Deve transportar Gases do Ar (LO2, LN2, LAR)
      const isGasesDoAr = (v.cargoProduct && v.cargoProduct.includes('Gases do Ar')) ||
                          (v.cargoProducts && v.cargoProducts.some(p => p.includes('Gases do Ar')));
      return isGasesDoAr;
    });
  }, [vehicles]);

  const handleExportDashboardPDF = () => {
    const filename = generateDashboardPDF(
      stats,
      vehicles,
      serviceOrders,
      expiredDocumentsList,
      expiringDocumentsList
    );
    showToast(`PDF do Dashboard baixado com sucesso: ${filename}`);
  };

  const handleExportVehiclePDF = () => {
    if (!selectedVehicle) return;
    const filename = generateVehicleDossierPDF(selectedVehicle, serviceOrders, users);
    showToast(`Relatório da Frota ${selectedVehicle.fleetNumber} baixado em PDF: ${filename}`);
  };

  const handleExportSummaryPDF = () => {
    const filename = generateFullFleetReportPDF(displayVehicles, serviceOrders);
    showToast(`Relatório Consolidado da Frota baixado em PDF: ${filename}`);
  };

  const renderDocCell = (vehicle: Vehicle, docType: DocumentType) => {
    if (docType === 'Tacógrafo' && vehicle.type === 'Carreta') {
      return <span className="text-slate-300 font-mono">—</span>;
    }

    const doc = vehicle.documents[docType];
    if (!doc) {
      return <span className="text-slate-300 font-mono">—</span>;
    }

    const formattedDate = doc.expiryDate ? doc.expiryDate.split('-').reverse().join('/') : '';

    if (doc.status === 'expired') {
      return (
        <div className="flex flex-col items-center justify-center p-1 rounded bg-red-100/80 text-red-800 text-[10px] font-bold border border-red-200">
          <div className="flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-red-600" />
            <span>Vencido</span>
          </div>
          <span className="font-mono text-[9px]">{formattedDate}</span>
        </div>
      );
    }

    if (doc.status === 'expiring') {
      return (
        <div className="flex flex-col items-center justify-center p-1 rounded bg-amber-100/80 text-amber-800 text-[10px] font-bold border border-amber-200">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600" />
            <span>Vencendo</span>
          </div>
          <span className="font-mono text-[9px]">{formattedDate}</span>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center p-1 rounded bg-emerald-50 text-emerald-800 text-[10px] font-medium border border-emerald-100">
        <Check className="w-3 h-3 text-emerald-600" />
        <span className="font-mono text-[9px]">{formattedDate}</span>
      </div>
    );
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto print:p-0 print:max-w-none">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200 print:hidden">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Top Header & Navigation Tabs (hidden in print) */}
      <div className="space-y-4 print:hidden">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase font-sans">
              Central de Relatórios & Exportação
            </h2>
            <p className="text-xs font-medium text-slate-500 mt-0.5">
              Exporte relatórios individuais por frota ou o relatório consolidado do dashboard em PDF
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'dashboard' && (
              <button
                onClick={handleExportDashboardPDF}
                className="flex items-center gap-2 bg-[#ff5500] hover:bg-[#ea4e00] text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-orange-500/20 transition active:scale-95"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>Exportar Dashboard em PDF</span>
              </button>
            )}

            {activeTab === 'by_vehicle' && (
              <button
                onClick={handleExportVehiclePDF}
                className="flex items-center gap-2 bg-[#ff5500] hover:bg-[#ea4e00] text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-orange-500/20 transition active:scale-95"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>Exportar Relatório Frota {selectedVehicle?.fleetNumber} em PDF</span>
              </button>
            )}

            {activeTab === 'fleet_summary' && (
              <button
                onClick={handleExportSummaryPDF}
                className="flex items-center gap-2 bg-[#ff5500] hover:bg-[#ea4e00] text-white px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-orange-500/20 transition active:scale-95"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>Exportar Relatório Geral em PDF</span>
              </button>
            )}
          </div>
        </div>

        {/* Report Mode Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-[#ff5500]" />
            <span>Relatório do Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('by_vehicle')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'by_vehicle'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Truck className="w-4 h-4 text-[#ff5500]" />
            <span>Relatório por Frota</span>
          </button>

          <button
            onClick={() => setActiveTab('fleet_summary')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
              activeTab === 'fleet_summary'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-[#ff5500]" />
            <span>Consolidado</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: RELATÓRIO DO DASHBOARD                                            */}
      {/* ========================================================================= */}
      {activeTab === 'dashboard' && (
        <div className="bg-white rounded-2xl p-8 border border-slate-200/80 shadow-xs space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b-2 border-slate-900">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#ff5500] flex items-center justify-center text-white shadow-md">
                <Truck className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none font-sans">
                  Gestão de Frotas
                </h2>
                <p className="text-xs font-bold text-slate-500 tracking-wider uppercase mt-1">
                  Relatório Executivo do Dashboard & Indicadores Operacionais
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase tracking-wider mb-1">
                Operação Conforme
              </span>
              <p className="text-xs text-slate-500 font-mono">
                Emitido em: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          {/* 1. Quantidades de Frotas Cadastradas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#ff5500]" />
                <span>1. Quantitativo de Frotas Cadastradas e Composição</span>
              </h3>
              <span className="text-xs font-semibold text-slate-500">
                Base Total: <strong className="text-slate-900 font-mono">{stats.totalVehicles} veículos</strong>
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-center">
                <span className="text-3xl font-black text-slate-900 font-mono tabular-nums block">
                  {stats.totalVehicles}
                </span>
                <span className="text-xs font-medium text-slate-500">Total de Frotas</span>
                <span className="text-[10px] text-slate-400 block mt-0.5">100% monitoradas</span>
              </div>

              <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-100 text-center">
                <span className="text-3xl font-black text-blue-700 font-mono tabular-nums block">
                  {stats.caminhaoCount}
                </span>
                <span className="text-xs font-bold text-blue-900">Caminhões</span>
                <span className="text-[10px] text-blue-600 block mt-0.5">
                  {stats.totalVehicles > 0 ? Math.round((stats.caminhaoCount / stats.totalVehicles) * 100) : 0}% da frota
                </span>
              </div>

              <div className="p-4 rounded-xl bg-purple-50/70 border border-purple-100 text-center">
                <span className="text-3xl font-black text-purple-700 font-mono tabular-nums block">
                  {stats.carretaCount}
                </span>
                <span className="text-xs font-bold text-purple-900">Carretas / Tanques</span>
                <span className="text-[10px] text-purple-600 block mt-0.5">
                  {stats.totalVehicles > 0 ? Math.round((stats.carretaCount / stats.totalVehicles) * 100) : 0}% da frota
                </span>
              </div>

              <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-100 text-center">
                <span className="text-3xl font-black text-emerald-700 font-mono tabular-nums block">
                  {stats.cavaloCount}
                </span>
                <span className="text-xs font-bold text-emerald-900">Cavalos Mecânicos</span>
                <span className="text-[10px] text-emerald-600 block mt-0.5">
                  {stats.totalVehicles > 0 ? Math.round((stats.cavaloCount / stats.totalVehicles) * 100) : 0}% da frota
                </span>
              </div>
            </div>

            {/* Sub-cards de Status Operacional */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-emerald-800 uppercase block">Veículos Ativos</span>
                  <span className="text-xs text-emerald-600 font-medium">Disponíveis em operação</span>
                </div>
                <span className="text-2xl font-black text-emerald-700 font-mono">
                  {vehicles.filter(v => v.status === 'Ativo').length}
                </span>
              </div>

              <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-amber-800 uppercase block">Em Manutenção</span>
                  <span className="text-xs text-amber-600 font-medium">Paradas / Intervenções</span>
                </div>
                <span className="text-2xl font-black text-amber-700 font-mono">
                  {vehicles.filter(v => v.status === 'Em Manutenção').length}
                </span>
              </div>

              <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-bold text-slate-700 uppercase block">Inativos / Reserva</span>
                  <span className="text-xs text-slate-500 font-medium">Imobilizados</span>
                </div>
                <span className="text-2xl font-black text-slate-700 font-mono">
                  {vehicles.filter(v => v.status === 'Inativo').length}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Situação de Vencimentos de Documentos */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-red-600" />
                <span>2. Controle de Vencimentos de Documentos Obrigatórios (CRLV, CIPP, CIV, Tacógrafo)</span>
              </h3>
              <div className="flex items-center gap-3 text-xs">
                <span className="text-red-600 font-bold font-mono">
                  {stats.expiredDocsCount} Vencidos
                </span>
                <span className="text-amber-600 font-bold font-mono">
                  {stats.expiringDocsCount} Vencendo em 30d
                </span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white text-[10px] uppercase font-bold tracking-wider">
                    <th className="py-2.5 px-3">Frota</th>
                    <th className="py-2.5 px-3">Placa/UF</th>
                    <th className="py-2.5 px-3">Tipo</th>
                    <th className="py-2.5 px-3">Documento</th>
                    <th className="py-2.5 px-3">Data Vencimento</th>
                    <th className="py-2.5 px-3">Situação / Prazo</th>
                    <th className="py-2.5 px-3 text-center">Classificação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white font-mono">
                  {expiredDocumentsList.map((item, idx) => (
                    <tr key={`exp-${item.vehicle.id}-${item.docType}-${item.expiryDate}-${idx}`} className="bg-red-50/50 hover:bg-red-50">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{item.vehicle.fleetNumber}</td>
                      <td className="py-2.5 px-3 text-slate-700">{item.vehicle.plate}/{item.vehicle.uf}</td>
                      <td className="py-2.5 px-3 font-sans text-slate-600">{item.vehicle.type}</td>
                      <td className="py-2.5 px-3 font-bold text-red-700">{item.docType}</td>
                      <td className="py-2.5 px-3 text-slate-800">{item.expiryDate.split('-').reverse().join('/')}</td>
                      <td className="py-2.5 px-3 font-sans font-bold text-red-700">Vencido há {item.daysDiff} dias</td>
                      <td className="py-2.5 px-3 text-center font-sans">
                        <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-black uppercase">
                          Crítico Imediato
                        </span>
                      </td>
                    </tr>
                  ))}

                  {expiringDocumentsList.map((item, idx) => (
                    <tr key={`urg-${item.vehicle.id}-${item.docType}-${item.expiryDate}-${idx}`} className="bg-amber-50/40 hover:bg-amber-50">
                      <td className="py-2.5 px-3 font-bold text-slate-900">{item.vehicle.fleetNumber}</td>
                      <td className="py-2.5 px-3 text-slate-700">{item.vehicle.plate}/{item.vehicle.uf}</td>
                      <td className="py-2.5 px-3 font-sans text-slate-600">{item.vehicle.type}</td>
                      <td className="py-2.5 px-3 font-bold text-amber-800">{item.docType}</td>
                      <td className="py-2.5 px-3 text-slate-800">{item.expiryDate.split('-').reverse().join('/')}</td>
                      <td className="py-2.5 px-3 font-sans font-semibold text-amber-800">Vence em {item.daysRemaining} dias</td>
                      <td className="py-2.5 px-3 text-center font-sans">
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-bold uppercase">
                          Atenção (30d)
                        </span>
                      </td>
                    </tr>
                  ))}

                  {expiredDocumentsList.length === 0 && expiringDocumentsList.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400 font-sans text-xs">
                        Nenhum documento vencido ou a vencer nos próximos 30 dias.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 3. Ordens de Serviço por Categorias de Defeitos */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Wrench className="w-4 h-4 text-[#ff5500]" />
                <span>3. Ordens de Serviço por Categorias de Defeitos & Especialidades</span>
              </h3>
              <span className="text-xs font-semibold text-slate-500">
                Total de OS: <strong className="text-slate-900 font-mono">{stats.totalOsCount}</strong> ({stats.openOsCount} em andamento)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { cat: 'Mecânica' as OSCategory, icon: Wrench, color: 'text-blue-600', bg: 'bg-blue-50/80 border-blue-100' },
                { cat: 'Elétrica' as OSCategory, icon: Zap, color: 'text-amber-600', bg: 'bg-amber-50/80 border-amber-100' },
                { cat: 'Borracharia' as OSCategory, icon: CircleDot, color: 'text-orange-600', bg: 'bg-orange-50/80 border-orange-100' },
                { cat: 'Driox' as OSCategory, icon: Settings2, color: 'text-purple-600', bg: 'bg-purple-50/80 border-purple-100' },
                { cat: 'Seva/Sacar' as OSCategory, icon: Radio, color: 'text-emerald-600', bg: 'bg-emerald-50/80 border-emerald-100' },
                { cat: 'Motora' as OSCategory, icon: Eye, color: 'text-indigo-600', bg: 'bg-indigo-50/80 border-indigo-100' },
              ].map(({ cat, icon: Icon, color, bg }) => {
                const count = stats.osByCategory[cat] || (cat === 'Seva/Sacar' ? stats.osByCategory['Seva/Sascar'] : 0) || 0;
                const openCat = serviceOrders.filter(o => 
                  (o.category === cat || (cat === 'Seva/Sacar' && (o.category as string) === 'Seva/Sascar')) && 
                  (o.status === 'Aberta' || o.status === 'Em andamento')
                ).length;
                const pct = stats.totalOsCount > 0 ? Math.round((count / stats.totalOsCount) * 100) : 0;

                return (
                  <div key={cat} className={`p-3.5 rounded-xl border ${bg} text-center space-y-1`}>
                    <div className="flex items-center justify-center mb-1">
                      <Icon className={`w-4 h-4 ${color}`} />
                    </div>
                    <span className="text-xs font-bold text-slate-800 block truncate">{cat}</span>
                    <span className="text-2xl font-black text-slate-900 font-mono block tabular-nums">
                      {count}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium block">
                      {openCat} aberta(s) &bull; {pct}%
                    </span>
                  </div>
                );
              })}
            </div>

            {/* 4. Ordens de Serviço em Aberto / Em Andamento */}
            <div className="mt-4">
              <h4 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">
                4. Ocorrências e Ordens de Serviço em Aberto
              </h4>
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-700 text-[10px] uppercase font-bold tracking-wider">
                      <th className="py-2.5 px-3">Código</th>
                      <th className="py-2.5 px-3">Frota</th>
                      <th className="py-2.5 px-3">Defeito / Título</th>
                      <th className="py-2.5 px-3">Categoria</th>
                      <th className="py-2.5 px-3">Prioridade</th>
                      <th className="py-2.5 px-3">Responsável Técnico</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white font-sans">
                    {serviceOrders.filter(os => os.status === 'Aberta' || os.status === 'Em andamento').map(os => (
                      <tr key={os.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{os.code}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-blue-700">{os.fleetNumber}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-800 truncate max-w-[200px]">{os.title}</td>
                        <td className="py-2.5 px-3 text-slate-600">{os.category}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            os.priority === 'Urgente' ? 'bg-red-100 text-red-800' :
                            os.priority === 'Alta' ? 'bg-orange-100 text-orange-800' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {os.priority}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 font-medium">
                          {os.assignedToName || 'Equipe Geral'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            {os.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 5. Monitoramento de Vácuo das Frotas Criogênicas (Gases do Ar) */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Gauge className="w-4 h-4 text-blue-600" />
                <span>5. Monitoramento de Vácuo das Frotas Criogênicas (Gases do Ar)</span>
              </h3>
              <span className="text-xs font-semibold text-slate-500">
                Frotas Gases do Ar: <strong className="text-slate-900 font-mono">{vacuumCarretasGasesDoAr.length}</strong> (Carretas e Caminhões)
              </span>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white text-[10px] uppercase font-bold tracking-wider">
                    <th className="py-2.5 px-3">Frota</th>
                    <th className="py-2.5 px-3">Placa/UF</th>
                    <th className="py-2.5 px-3">Modelo</th>
                    <th className="py-2.5 px-3">Carga / Produto</th>
                    <th className="py-2.5 px-3 text-center">Nível de Vácuo</th>
                    <th className="py-2.5 px-3 text-center">Data Medição</th>
                    <th className="py-2.5 px-3 text-left">Status de Isolamento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white font-sans">
                  {vacuumCarretasGasesDoAr.map(v => {
                    const val = v.vacuumValue !== undefined && v.vacuumValue !== '' ? String(v.vacuumValue) : '';
                    const classification = getVacuumClassification(val);
                    const statusText = val ? classification.label : 'Sem medição';
                    return (
                      <tr key={`vac-${v.id}`} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{v.fleetNumber}</td>
                        <td className="py-2.5 px-3 font-mono text-slate-700">{v.plate}/{v.uf}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">{v.brand} {v.model}</td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {v.cargoProduct || (v.cargoProducts && v.cargoProducts.join(', ')) || 'Gases do Ar (LO2, LN2, LAR)'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-indigo-700">
                          {val ? `${val} ${v.vacuumUnit || 'mtorr'}` : <span className="text-slate-300 font-normal">Pendente</span>}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                          {v.vacuumDate ? v.vacuumDate.split('-').reverse().join('/') : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-left whitespace-normal break-words">
                          <span className={`inline-block px-2.5 py-1 rounded-md text-[11px] font-bold border text-left leading-tight ${classification.badgeClass}`}>
                            {statusText}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {vacuumCarretasGasesDoAr.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400 text-xs">
                        Nenhuma carreta criogênica de Gases do Ar cadastrada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* 6. Controle e Status dos Equipamentos Cadastrados (Calibração Metrológica) */}
          <div className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Tag className="w-4 h-4 text-indigo-600" />
                <span>6. Controle e Status dos Equipamentos Cadastrados (Calibração Metrológica)</span>
              </h3>
              <div className="flex items-center gap-3 text-xs flex-wrap">
                <span className="text-slate-600 font-semibold">
                  Total: <strong className="text-slate-900 font-mono">{allEquipmentsList.length}</strong>
                </span>
                <span className="text-emerald-700 font-bold font-mono">
                  {stats.validEquipmentsCount} Em Dia
                </span>
                <span className="text-amber-700 font-bold font-mono">
                  {stats.expiringEquipmentsCount} Vencendo (30d)
                </span>
                <span className="text-red-700 font-bold font-mono">
                  {stats.expiredEquipmentsCount} Vencidos
                </span>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-white text-[10px] uppercase font-bold tracking-wider">
                    <th className="py-2.5 px-3">Frota</th>
                    <th className="py-2.5 px-3">Placa/UF</th>
                    <th className="py-2.5 px-3">Tipo</th>
                    <th className="py-2.5 px-3">Equipamento / Instrumento</th>
                    <th className="py-2.5 px-3">TAG</th>
                    <th className="py-2.5 px-3">Certificado</th>
                    <th className="py-2.5 px-3">Laboratório / Empresa</th>
                    <th className="py-2.5 px-3 text-center">Última Calibração</th>
                    <th className="py-2.5 px-3 text-center">Próx. Calibração</th>
                    <th className="py-2.5 px-3">Situação / Prazo</th>
                    <th className="py-2.5 px-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white font-sans">
                  {allEquipmentsList.map(item => {
                    const isExpired = item.status === 'expired';
                    const isExpiring = item.status === 'expiring';
                    return (
                      <tr 
                        key={`rpt-eq-${item.vehicle.id}-${item.equipment.id}`}
                        className={`hover:bg-slate-50 ${
                          isExpired ? 'bg-red-50/50' : isExpiring ? 'bg-amber-50/40' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                          {item.vehicle.fleetNumber}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-700">
                          {item.vehicle.plate}/{item.vehicle.uf}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">
                          {item.vehicle.type}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-800">
                          {item.equipment.description}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-200 text-[10px]">
                            {item.equipment.tag || 'S/TAG'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-700">
                          {item.equipment.certificateNumber || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 truncate max-w-[160px]">
                          {item.equipment.company || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                          {formatDisplayDate(item.equipment.calibrationDate) || '—'}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">
                          {formatDisplayDate(item.effectiveDate) || '—'}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {isExpired ? (
                            <span className="text-red-700 font-bold">Vencido há {Math.abs(item.daysDiff)} dias</span>
                          ) : isExpiring ? (
                            <span className="text-amber-800 font-semibold">Vence em {item.daysDiff} dias</span>
                          ) : (
                            <span className="text-emerald-700">Válido por {item.daysDiff} dias</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            isExpired
                              ? 'bg-red-100 text-red-800'
                              : isExpiring
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {isExpired ? 'Vencido' : isExpiring ? 'Vencendo' : 'Em Dia'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {allEquipmentsList.length === 0 && (
                    <tr>
                      <td colSpan={11} className="py-6 text-center text-slate-400 text-xs">
                        Nenhum equipamento cadastrado na frota.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer oficial de impressão */}
          <div className="pt-6 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400">
            <span>Sistema de Gestão de Frotas &bull; Relatório Oficial Corporativo</span>
            <span>Documento emitido digitalmente</span>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: RELATÓRIO INDIVIDUAL POR FROTA                                     */}
      {/* ========================================================================= */}
      {activeTab === 'by_vehicle' && (
        <div className="space-y-6">
          {/* Vehicle Selector Bar (hidden on print) */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 print:hidden">
            <div className="flex items-center justify-between">
              <label className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Search className="w-4 h-4 text-[#ff5500]" />
                <span>Selecione a Frota para Gerar o Relatório:</span>
              </label>
              <span className="text-xs text-slate-500 font-medium">
                {filteredVehiclesList.length} de {vehicles.length} frotas
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Filter Search Input */}
              <div className="sm:col-span-1">
                <input
                  type="text"
                  placeholder="Filtrar por frota ou modelo..."
                  value={vehicleSearch}
                  onChange={e => setVehicleSearch(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#ff5500]"
                />
              </div>

              {/* Direct Dropdown */}
              <div className="sm:col-span-2">
                <select
                  value={selectedVehicle?.id || ''}
                  onChange={e => setSelectedVehicleId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ff5500]"
                >
                  {filteredVehiclesList.map(v => (
                    <option key={v.id} value={v.id}>
                      Frota {v.fleetNumber} — {v.model}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick selector chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-1 pb-0.5">
              {vehicles.slice(0, 10).map(v => (
                <button
                  key={v.id}
                  onClick={() => setSelectedVehicleId(v.id)}
                  className={`px-3 py-1 text-[11px] font-mono font-bold rounded-lg transition whitespace-nowrap ${
                    selectedVehicle?.id === v.id
                      ? 'bg-[#ff5500] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {v.fleetNumber} — {v.model}
                </button>
              ))}
            </div>
          </div>

          {/* Dossier Document Preview */}
          {selectedVehicle && (
            <div className="bg-white rounded-2xl p-8 border border-slate-200/80 shadow-xs print:border-none print:shadow-none print:p-0 space-y-8">
              {/* Dossier Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b-2 border-slate-900">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-[#ff5500] flex items-center justify-center text-white shadow-md font-mono font-black text-xl">
                    {selectedVehicle.fleetNumber}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight font-sans">
                        Relatório Individual da Frota {selectedVehicle.fleetNumber}
                      </h2>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        selectedVehicle.status === 'Ativo' ? 'bg-emerald-100 text-emerald-800' :
                        selectedVehicle.status === 'Em Manutenção' ? 'bg-amber-100 text-amber-800' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {selectedVehicle.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 font-mono mt-1">
                      Placa: <strong className="text-slate-800">{selectedVehicle.plate}/{selectedVehicle.uf}</strong> &bull; Tipo: <strong className="text-slate-800">{selectedVehicle.type}</strong>
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs font-bold text-slate-800 uppercase">
                    Ficha Cadastral e Técnica
                  </p>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">
                    Emissão: {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {/* 1. Dados Cadastrais e Técnicos */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#ff5500]" />
                  <span>1. Dados Cadastrais, Atribuições e Especificações</span>
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-xs">
                  <div>
                    <span className="text-slate-400 block font-semibold text-[10px] uppercase">Número da Frota</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">{selectedVehicle.fleetNumber}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-semibold text-[10px] uppercase">Placa / UF</span>
                    <span className="font-mono font-bold text-slate-900 text-sm">{selectedVehicle.plate} / {selectedVehicle.uf}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-semibold text-[10px] uppercase">Tipo de Veículo</span>
                    <span className="font-bold text-slate-800">{selectedVehicle.type}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-semibold text-[10px] uppercase">Marca / Fabricante</span>
                    <span className="font-bold text-slate-800">{selectedVehicle.brand || '—'}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-semibold text-[10px] uppercase">Modelo Comercial</span>
                    <span className="font-bold text-slate-800">{selectedVehicle.model || '—'}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-semibold text-[10px] uppercase">Ano Fabricação/Mod.</span>
                    <span className="font-mono font-bold text-slate-800">{selectedVehicle.year}</span>
                  </div>

                  <div>
                    <span className="text-slate-400 block font-semibold text-[10px] uppercase">Data de Cadastro</span>
                    <span className="font-mono font-semibold text-slate-800">
                      {selectedVehicle.createdAt ? selectedVehicle.createdAt.split('-').reverse().join('/') : '01/01/2026'}
                    </span>
                  </div>

                  <div className="col-span-2">
                    <span className="text-slate-400 block font-semibold text-[10px] uppercase">Observações Gerais</span>
                    <span className="text-slate-700">{selectedVehicle.notes || 'Nenhuma observação complementar registrada para este veículo.'}</span>
                  </div>
                </div>
              </div>

              {/* 2. Documentação e Prazos */}
              <div className="space-y-3 pt-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-emerald-600" />
                  <span>2. Quadro de Regularidade Documental</span>
                </h3>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white text-[10px] uppercase font-bold tracking-wider">
                        <th className="py-2.5 px-3">Documento</th>
                        <th className="py-2.5 px-3">Número / Registro</th>
                        <th className="py-2.5 px-3">Data de Emissão</th>
                        <th className="py-2.5 px-3">Data de Vencimento</th>
                        <th className="py-2.5 px-3">Situação Operacional</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {(['CRLV', 'CIV', 'CIPP', 'Tacógrafo'] as DocumentType[]).map(dtype => {
                        if (dtype === 'Tacógrafo' && selectedVehicle.type === 'Carreta') {
                          return (
                            <tr key={dtype} className="text-slate-400">
                              <td className="py-2.5 px-3 font-bold">{dtype}</td>
                              <td className="py-2.5 px-3 font-mono">—</td>
                              <td className="py-2.5 px-3 font-mono">—</td>
                              <td className="py-2.5 px-3 font-mono">—</td>
                              <td className="py-2.5 px-3">Isento (Não aplicável para Carretas)</td>
                              <td className="py-2.5 px-3 text-center font-bold text-slate-400">Isento</td>
                            </tr>
                          );
                        }

                        const doc = selectedVehicle.documents[dtype];
                        if (!doc) {
                          return (
                            <tr key={dtype} className="bg-slate-50 text-slate-400">
                              <td className="py-2.5 px-3 font-bold text-slate-700">{dtype}</td>
                              <td className="py-2.5 px-3 font-mono">—</td>
                              <td className="py-2.5 px-3 font-mono">—</td>
                              <td className="py-2.5 px-3 font-mono">—</td>
                              <td className="py-2.5 px-3">Documento não cadastrado</td>
                              <td className="py-2.5 px-3 text-center font-bold text-slate-400">Pendente</td>
                            </tr>
                          );
                        }

                        const expDate = new Date(doc.expiryDate);
                        const refDate = new Date('2026-09-02T12:00:00Z');
                        const diffDays = Math.ceil((expDate.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));

                        return (
                          <tr key={dtype} className={`hover:bg-slate-50 ${
                            doc.status === 'expired' ? 'bg-red-50/40' :
                            doc.status === 'expiring' ? 'bg-amber-50/40' : ''
                          }`}>
                            <td className="py-2.5 px-3 font-bold text-slate-900">{dtype}</td>
                            <td className="py-2.5 px-3 font-mono font-semibold text-slate-700">{doc.number || 'Registrado'}</td>
                            <td className="py-2.5 px-3 font-mono text-slate-600">{doc.issueDate ? doc.issueDate.split('-').reverse().join('/') : '—'}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{doc.expiryDate.split('-').reverse().join('/')}</td>
                            <td className="py-2.5 px-3 font-medium">
                              {diffDays < 0 ? (
                                <span className="text-red-700 font-bold">Vencido há {Math.abs(diffDays)} dias</span>
                              ) : diffDays <= 30 ? (
                                <span className="text-amber-800 font-semibold">Expira em {diffDays} dias</span>
                              ) : (
                                <span className="text-emerald-700">Válido por mais {diffDays} dias</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                doc.status === 'expired' ? 'bg-red-100 text-red-800' :
                                doc.status === 'expiring' ? 'bg-amber-100 text-amber-800' :
                                'bg-emerald-100 text-emerald-800'
                              }`}>
                                {doc.status === 'expired' ? 'Vencido' :
                                 doc.status === 'expiring' ? 'Vencendo' : 'Válido'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3. Histórico de Ordens de Serviço */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-[#ff5500]" />
                    <span>3. Histórico Completo de Manutenções e Ordens de Serviço ({vehicleOrders.length})</span>
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">
                    {vehicleOrders.filter(o => o.status === 'Resolvida' || o.status === 'Encerrada').length} resolvidas &bull; {vehicleOrders.filter(o => o.status === 'Aberta' || o.status === 'Em andamento').length} abertas
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white text-[10px] uppercase font-bold tracking-wider">
                        <th className="py-2.5 px-3">Código</th>
                        <th className="py-2.5 px-3">Defeito Reclamado</th>
                        <th className="py-2.5 px-3">Categoria</th>
                        <th className="py-2.5 px-3">Prioridade</th>
                        <th className="py-2.5 px-3">Técnico Atribuído</th>
                        <th className="py-2.5 px-3">Data Abertura</th>
                        <th className="py-2.5 px-3">Data Conclusão</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Solução / Notas</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {vehicleOrders.map(os => (
                        <tr key={os.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{os.code}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-800">{os.title}</td>
                          <td className="py-2.5 px-3 text-slate-600">{os.category}</td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              os.priority === 'Urgente' ? 'bg-red-100 text-red-800' :
                              os.priority === 'Alta' ? 'bg-orange-100 text-orange-800' :
                              'bg-slate-100 text-slate-700'
                            }`}>
                              {os.priority}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 font-medium">
                            {os.assignedToName || 'Equipe Geral'}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">
                            {os.createdAt.includes('T') ? os.createdAt.split('T')[0].split('-').reverse().join('/') : os.createdAt}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">
                            {os.resolvedAt || 'Pendente'}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              os.status === 'Resolvida' || os.status === 'Encerrada'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {os.status}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 truncate max-w-[200px]">
                            {os.resolutionNotes || os.description || '—'}
                          </td>
                        </tr>
                      ))}

                      {vehicleOrders.length === 0 && (
                        <tr>
                          <td colSpan={9} className="py-6 text-center text-slate-400 text-xs">
                            Nenhuma Ordem de Serviço registrada para este veículo.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 4. CONTROLE DE EQUIPAMENTOS */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <Gauge className="w-4 h-4 text-indigo-600" />
                    <span>4. CONTROLE DE EQUIPAMENTOS ({(selectedVehicle.equipments || []).length})</span>
                  </h3>
                  <span className="text-xs text-slate-500 font-medium">
                    {(selectedVehicle.equipments || []).filter(e => e.status === 'valid').length} calibrados &bull; {(selectedVehicle.equipments || []).filter(e => e.status === 'expiring').length} a vencer &bull; {(selectedVehicle.equipments || []).filter(e => e.status === 'expired').length} vencidos
                  </span>
                </div>

                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-900 text-white text-[10px] uppercase font-bold tracking-wider">
                        <th className="py-2.5 px-3">TAG</th>
                        <th className="py-2.5 px-3">Descrição do Equipamento</th>
                        <th className="py-2.5 px-3">Empresa / Laboratório</th>
                        <th className="py-2.5 px-3">Nº Certificado</th>
                        <th className="py-2.5 px-3">Última Calibração</th>
                        <th className="py-2.5 px-3">Validade / Próxima</th>
                        <th className="py-2.5 px-3">Situação</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {(selectedVehicle.equipments || []).map(eq => {
                        const targetDate = eq.nextCalibrationDate || eq.calibrationDate;
                        const diffDays = targetDate ? getDaysDifference(targetDate) : null;

                        let statusColor = 'bg-emerald-100 text-emerald-800';
                        let statusText = 'Calibrado';
                        let situationText = 'Regular';

                        if (diffDays !== null) {
                          if (diffDays < 0) {
                            statusColor = 'bg-red-100 text-red-800';
                            statusText = 'Vencido';
                            situationText = `Vencido há ${Math.abs(diffDays)}d`;
                          } else if (diffDays <= 30) {
                            statusColor = 'bg-amber-100 text-amber-800';
                            statusText = 'Vencendo';
                            situationText = `Vence em ${diffDays}d`;
                          } else {
                            situationText = `${diffDays}d restantes`;
                          }
                        }

                        return (
                          <tr key={eq.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                {eq.tag || 'S/TAG'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-800">
                              {eq.description}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              {eq.company || '—'}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-700">
                              {eq.certificateNumber || '—'}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-600">
                              {formatDisplayDate(eq.calibrationDate)}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-semibold text-slate-900">
                              {formatDisplayDate(eq.nextCalibrationDate)}
                            </td>
                            <td className="py-2.5 px-3 text-[11px] font-medium text-slate-600">
                              {situationText}
                            </td>
                            <td className="py-2.5 px-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${statusColor}`}>
                                {statusText}
                              </span>
                            </td>
                          </tr>
                        );
                      })}

                      {(!selectedVehicle.equipments || selectedVehicle.equipments.length === 0) && (
                        <tr>
                          <td colSpan={8} className="py-6 text-center text-slate-400 text-xs">
                            Nenhum equipamento ou instrumento calibrável cadastrado para esta frota.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Signatures for formal report print */}
              <div className="pt-10 border-t border-slate-200 grid grid-cols-2 gap-8 text-center text-xs">
                <div>
                  <div className="border-t border-slate-400 mx-auto w-48 mb-2"></div>
                  <span className="font-bold text-slate-800 block">Responsável Técnico / Mecânica</span>
                  <span className="text-[10px] text-slate-400">Visto de inspeção e reparos</span>
                </div>

                <div>
                  <div className="border-t border-slate-400 mx-auto w-48 mb-2"></div>
                  <span className="font-bold text-slate-800 block">Gestor da Frota / Supervisão</span>
                  <span className="text-[10px] text-slate-400">Aprovação operacional</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: VISÃO CONSOLIDADA DA FROTA                                         */}
      {/* ========================================================================= */}
      {activeTab === 'fleet_summary' && (
        <div className="bg-white rounded-2xl p-8 border border-slate-200/80 shadow-xs space-y-8">
          {/* Controls Bar for filters */}
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-slate-200 print:hidden">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                  activeFilter === 'all'
                    ? 'bg-[#ff5500] text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Todos os veículos ({vehicles.length})
              </button>
              <button
                onClick={() => setActiveFilter('pending')}
                className={`px-4 py-2 text-xs font-bold rounded-xl transition ${
                  activeFilter === 'pending'
                    ? 'bg-[#ff5500] text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                Com Pendências ({pendingVehicles.length})
              </button>
            </div>

            <div className="text-xs text-slate-500 font-mono">
              Listando {displayVehicles.length} veículo(s)
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#1e293b] text-white uppercase text-[10px] tracking-wider font-bold">
                  <th className="py-3 px-3">Frota</th>
                  <th className="py-3 px-3">Tipo</th>
                  <th className="py-3 px-3">Placa/UF</th>
                  <th className="py-3 px-3">Modelo / Ano de Fabricação</th>
                  <th className="py-3 px-2 text-center">CRLV</th>
                  <th className="py-3 px-2 text-center">CIPP</th>
                  <th className="py-3 px-2 text-center">CIV</th>
                  <th className="py-3 px-2 text-center">Tacógrafo</th>
                  <th className="py-3 px-2 text-center">OS Abertas</th>
                  <th className="py-3 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {displayVehicles.map(v => {
                  const openOs = serviceOrders.filter(
                    o => (o.vehicleId === v.id || o.fleetNumber === v.fleetNumber) && (o.status === 'Aberta' || o.status === 'Em andamento')
                  );
                  const hasProblem = v.status === 'Em Manutenção' || openOs.length > 0;

                  return (
                    <tr 
                      key={v.id} 
                      className={`hover:bg-slate-50/80 transition ${hasProblem ? 'bg-red-50/20' : ''}`}
                    >
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">
                        {v.fleetNumber}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {v.type}
                      </td>
                      <td className="py-3 px-3 font-mono font-semibold text-slate-800">
                        {v.plate}/{v.uf}
                      </td>
                      <td className="py-3 px-3 text-slate-700 truncate max-w-[200px]">
                        <span className="font-bold text-slate-900">{v.model}</span>
                        <span className="text-slate-500 font-medium ml-1.5">({v.year})</span>
                      </td>
                      <td className="py-2 px-2 text-center">
                        {renderDocCell(v, 'CRLV')}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {renderDocCell(v, 'CIPP')}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {renderDocCell(v, 'CIV')}
                      </td>
                      <td className="py-2 px-2 text-center">
                        {renderDocCell(v, 'Tacógrafo')}
                      </td>
                      <td className="py-3 px-2 text-center font-mono font-semibold">
                        {openOs.length > 0 ? (
                          <span className="text-red-600 font-bold bg-red-50 px-2 py-0.5 rounded">
                            {openOs.length}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          v.status === 'Ativo' ? 'bg-emerald-100 text-emerald-800' :
                          v.status === 'Em Manutenção' ? 'bg-amber-100 text-amber-800' :
                          'bg-slate-200 text-slate-700'
                        }`}>
                          {v.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer info for print */}
          <div className="pt-6 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-400">
            <span>Sistema de Gestão de Frotas &bull; Documento Oficial</span>
            <span>Emitido em {new Date().toLocaleDateString('pt-BR')}</span>
          </div>
        </div>
      )}
    </div>
  );
};
