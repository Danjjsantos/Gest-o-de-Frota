import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Truck, 
  ChevronRight, 
  Clock, 
  Download, 
  FileText,
  FileCheck,
  Gauge
} from 'lucide-react';
import { useFleet, formatDisplayDate } from '../context/FleetContext';
import { Vehicle, VehicleType, DocumentType, ServiceOrder } from '../types';
import { generateFullFleetReportPDF } from '../utils/pdfGenerator';
import { VehicleDetailPage } from './VehicleDetailPage';
import { ServiceOrderDetailModal } from '../components/modals/ServiceOrderDetailModal';

interface FleetViewProps {
  onOpenNewVehicleModal: () => void;
  onOpenNewOSForVehicle?: (vehicleId: string, lockVehicle?: boolean) => void;
  onSelectVehicle?: (vehicle: Vehicle) => void;
}

export const FleetView: React.FC<FleetViewProps> = ({
  onOpenNewVehicleModal,
  onOpenNewOSForVehicle,
  onSelectVehicle,
}) => {
  const { vehicles, serviceOrders, currentUser } = useFleet();
  const isFullAccessUser = currentUser?.role === 'Administrador' || currentUser?.role === 'Gerente';
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [selectedOS, setSelectedOS] = useState<ServiceOrder | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'Todos' | VehicleType>('Todos');
  const [exportSuccess, setExportSuccess] = useState(false);

  // If a vehicle is selected, open the dedicated full page for that vehicle
  const activeVehicle = useMemo(() => {
    if (!selectedVehicleId) return null;
    return vehicles.find(v => v.id === selectedVehicleId) || null;
  }, [vehicles, selectedVehicleId]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      const matchesType = typeFilter === 'Todos' || v.type === typeFilter;
      const searchLower = search.toLowerCase().trim();
      if (!searchLower) return matchesType;

      const matchesSearch = 
        v.fleetNumber.toLowerCase().includes(searchLower) ||
        v.plate.toLowerCase().includes(searchLower) ||
        v.model.toLowerCase().includes(searchLower) ||
        v.brand.toLowerCase().includes(searchLower) ||
        (v.cargoProduct && v.cargoProduct.toLowerCase().includes(searchLower)) ||
        (v.cargoProducts && v.cargoProducts.some(p => p.toLowerCase().includes(searchLower))) ||
        (v.renavam && v.renavam.toLowerCase().includes(searchLower)) ||
        (v.chassis && v.chassis.toLowerCase().includes(searchLower));

      return matchesType && matchesSearch;
    });
  }, [vehicles, typeFilter, search]);

  if (activeVehicle) {
    return (
      <VehicleDetailPage
        vehicle={activeVehicle}
        onBack={() => setSelectedVehicleId(null)}
        onOpenNewOS={(vehicleId) => {
          if (onOpenNewOSForVehicle) {
            onOpenNewOSForVehicle(vehicleId, true);
          }
        }}
      />
    );
  }

  const handleExportAll = () => {
    generateFullFleetReportPDF(filteredVehicles, serviceOrders);
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 3000);
  };

  // Document tags renderer matching the reference image
  const renderDocumentBadges = (vehicle: Vehicle) => {
    const isCarreta = vehicle.type === 'Carreta';
    const isCavalo = vehicle.type === 'Cavalo Mecânico';

    const badges: Array<{
      type: DocumentType;
      status: 'valid' | 'expiring' | 'expired' | 'missing';
      label: string;
      isExpiring: boolean;
    }> = [];

    // Relevant documents depending on vehicle type
    const docTypesToCheck: DocumentType[] = isCavalo 
      ? ['CRLV', 'Tacógrafo']
      : isCarreta 
      ? ['CRLV', 'CIPP', 'CIV']
      : ['CRLV', 'CIPP', 'CIV', 'Tacógrafo'];

    docTypesToCheck.forEach(dtype => {
      const doc = vehicle.documents[dtype];
      if (!doc) {
        badges.push({
          type: dtype,
          status: 'missing',
          label: dtype,
          isExpiring: false,
        });
      } else if (doc.status === 'expired') {
        badges.push({
          type: dtype,
          status: 'expired',
          label: dtype,
          isExpiring: false,
        });
      } else if (doc.status === 'expiring') {
        badges.push({
          type: dtype,
          status: 'expiring',
          label: dtype,
          isExpiring: true,
        });
      } else {
        badges.push({
          type: dtype,
          status: 'valid',
          label: dtype,
          isExpiring: false,
        });
      }
    });

    const attachmentCount = vehicle.attachments ? vehicle.attachments.length : 0;

    return (
      <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
        {badges.map(b => {
          if (b.isExpiring) {
            return (
              <span
                key={b.type}
                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200/90"
                title={`${b.type} com vencimento próximo`}
              >
                <Clock className="w-3 h-3 text-amber-600 shrink-0" />
                <span>{b.label}</span>
              </span>
            );
          }

          if (b.status === 'expired') {
            return (
              <span
                key={b.type}
                className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200"
                title={`${b.type} vencido`}
              >
                <span>{b.label}</span>
              </span>
            );
          }

          return (
            <span
              key={b.type}
              className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200/80"
              title={`${b.type} válido`}
            >
              <span>{b.label}</span>
            </span>
          );
        })}

        {attachmentCount > 0 && (
          <span 
            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-orange-50 text-orange-800 border border-orange-200"
            title={`${attachmentCount} documento(s) em PDF ou JPG anexado(s)`}
          >
            <FileText className="w-3 h-3 text-[#ff5500]" />
            <span>{attachmentCount} anexo(s)</span>
          </span>
        )}
      </div>
    );
  };

  // Sinalização sucinta de ordens de serviço ativas (Aberta, Em andamento ou Resolvida)
  const renderActiveOSBadges = (vehicle: Vehicle) => {
    const activeOrders = serviceOrders.filter(
      os => (os.vehicleId === vehicle.id || os.fleetNumber === vehicle.fleetNumber) &&
      (os.status === 'Aberta' || os.status === 'Em andamento' || os.status === 'Resolvida')
    );

    if (activeOrders.length === 0) return null;

    const countAberta = activeOrders.filter(o => o.status === 'Aberta').length;
    const countAndamento = activeOrders.filter(o => o.status === 'Em andamento').length;
    const countResolvida = activeOrders.filter(o => o.status === 'Resolvida').length;

    return (
      <div className="flex items-center gap-1.5 flex-wrap">
        {countAberta > 0 && (
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const os = activeOrders.find(o => o.status === 'Aberta');
              if (os) setSelectedOS(os);
            }}
            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs hover:bg-blue-100 hover:border-blue-300 transition cursor-pointer active:scale-95"
            title={`${countAberta} ordem(ns) de serviço aberta(s). Clique para visualizar, dar baixa ou encerrar.`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
            <span>OS Aberta{countAberta > 1 ? ` (${countAberta})` : ''}</span>
          </button>
        )}
        {countAndamento > 0 && (
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const os = activeOrders.find(o => o.status === 'Em andamento');
              if (os) setSelectedOS(os);
            }}
            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs hover:bg-amber-100 hover:border-amber-300 transition cursor-pointer active:scale-95"
            title={`${countAndamento} ordem(ns) de serviço em andamento. Clique para visualizar, dar baixa ou encerrar.`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <span>OS em Andamento{countAndamento > 1 ? ` (${countAndamento})` : ''}</span>
          </button>
        )}
        {countResolvida > 0 && (
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              const os = activeOrders.find(o => o.status === 'Resolvida');
              if (os) setSelectedOS(os);
            }}
            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs hover:bg-emerald-100 hover:border-emerald-300 transition cursor-pointer active:scale-95"
            title={`${countResolvida} ordem(ns) de serviço resolvida(s). Clique para visualizar ou encerrar.`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
            <span>OS Resolvida{countResolvida > 1 ? ` (${countResolvida})` : ''}</span>
          </button>
        )}
      </div>
    );
  };

  // Specific avatar/icon background styling matching reference screenshot
  const getVehicleIconBox = (vehicle: Vehicle) => {
    if (vehicle.imageUrl) {
      return (
        <img 
          src={vehicle.imageUrl} 
          alt={vehicle.fleetNumber}
          className="w-12 h-12 rounded-xl object-cover border border-slate-200/80 shadow-2xs shrink-0" 
        />
      );
    }

    // In the screenshot:
    // Some carretas (like 0379, 0380) have warm yellow/amber box
    // Others (like 9156, 1181) and cavalos (2554, 2548, 2547, 2541) have soft sky-blue box
    const isAmberCarreta = vehicle.type === 'Carreta' && (vehicle.fleetNumber === '0379' || vehicle.fleetNumber === '0380' || vehicle.fleetNumber.endsWith('9') || vehicle.fleetNumber.endsWith('0'));

    if (isAmberCarreta) {
      return (
        <div className="w-12 h-12 rounded-xl bg-[#fffbeb] text-amber-500 border border-amber-100 flex items-center justify-center shrink-0">
          <Truck className="w-5 h-5 stroke-[1.8]" />
        </div>
      );
    }

    if (vehicle.type === 'Cavalo Mecânico' || vehicle.type === 'Carreta') {
      return (
        <div className="w-12 h-12 rounded-xl bg-[#f0f9ff] text-sky-500 border border-sky-100 flex items-center justify-center shrink-0">
          <Truck className="w-5 h-5 stroke-[1.8]" />
        </div>
      );
    }

    return (
      <div className="w-12 h-12 rounded-xl bg-[#fff7ed] text-[#ff5500] border border-orange-100 flex items-center justify-center shrink-0">
        <Truck className="w-5 h-5 stroke-[1.8]" />
      </div>
    );
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-6xl mx-auto">
      
      {/* Title & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase font-sans">
            Gestão de Frotas
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Gerencie todos os veículos da frota
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {isFullAccessUser && (
            <>
              <button
                onClick={handleExportAll}
                className={`hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition border shadow-xs ${
                  exportSuccess
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
                title="Exportar listagem completa da frota em PDF"
              >
                <Download className={`w-3.5 h-3.5 ${exportSuccess ? 'text-white' : 'text-[#ff5500]'}`} />
                <span>{exportSuccess ? 'PDF Baixado!' : 'Exportar PDF'}</span>
              </button>

              <button
                onClick={onOpenNewVehicleModal}
                className="flex items-center gap-2 bg-[#ff5500] hover:bg-[#e64d00] text-white px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-orange-500/20 transition active:scale-95 whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Novo Veículo</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Search and Filters Bar matching reference screenshot */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
        {/* Search input with magnifying glass */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por frota, placa, modelo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/90 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ff5500] focus:border-transparent transition shadow-2xs"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 shrink-0">
          {(['Todos', 'Caminhão', 'Carreta', 'Cavalo Mecânico'] as const).map(tab => {
            const isActive = typeFilter === tab;
            return (
              <button
                key={tab}
                onClick={() => setTypeFilter(tab)}
                className={`px-4 py-2 text-xs font-semibold rounded-xl transition whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-[#ff5500] text-white shadow-xs font-bold'
                    : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </div>

      {/* Fleet Vehicles List Cards */}
      <div className="space-y-3">
        {filteredVehicles.length === 0 ? (
          <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 space-y-3">
            <Truck className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">
              Nenhum veículo encontrado para a busca "{search}"
            </p>
            <p className="text-xs text-slate-400">
              Tente pesquisar por outro número de frota, placa ou fabricante.
            </p>
            <button
              onClick={() => {
                setSearch('');
                setTypeFilter('Todos');
              }}
              className="text-xs font-bold text-[#ff5500] hover:underline pt-2 cursor-pointer"
            >
              Limpar filtros de pesquisa
            </button>
          </div>
        ) : (
          filteredVehicles.map(vehicle => {
            return (
              <div
                key={vehicle.id}
                onClick={() => {
                  setSelectedVehicleId(vehicle.id);
                  if (onSelectVehicle) onSelectVehicle(vehicle);
                }}
                className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-orange-300 transition-all cursor-pointer p-4 sm:p-4.5 flex items-center justify-between group"
              >
                {/* Left section: icon/image + basic fleet info */}
                <div className="flex items-center gap-3.5 min-w-0">
                  {getVehicleIconBox(vehicle)}

                  <div className="min-w-0">
                    {/* Line 1: Fleet number + Type pill + Active OS badge */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-base font-black text-slate-900 font-sans tracking-tight">
                        {vehicle.fleetNumber}
                      </span>
                      <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                        vehicle.type === 'Carreta' ? 'bg-purple-100 text-purple-700' :
                        vehicle.type === 'Cavalo Mecânico' ? 'bg-emerald-100 text-emerald-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {vehicle.type}
                      </span>

                      {/* Informação dos Produtos Carregados (Gases do Ar / CO2) no Cabeçalho do Card */}
                      {((vehicle.type === 'Caminhão' || vehicle.type === 'Carreta') && ((vehicle.cargoProducts && vehicle.cargoProducts.length > 0) || vehicle.cargoProduct)) && (
                        <div className="flex items-center gap-1 flex-wrap">
                          {(vehicle.cargoProducts && vehicle.cargoProducts.length > 0
                            ? vehicle.cargoProducts
                            : (vehicle.cargoProduct ? [vehicle.cargoProduct as any] : [])
                          ).map((product: string) => {
                            const isCO2 = product.includes('CO2');
                            return (
                              <span
                                key={product}
                                className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border shadow-2xs ${
                                  isCO2
                                    ? 'bg-teal-50 text-teal-800 border-teal-200'
                                    : 'bg-cyan-50 text-cyan-800 border-cyan-200'
                                }`}
                                title={`Carga: ${product}`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${isCO2 ? 'bg-teal-500' : 'bg-cyan-500 animate-pulse'}`} />
                                <span>{product}</span>
                              </span>
                            );
                          })}
                        </div>
                      )}

                      {/* Para frotas de Gases do Ar: exibir somente o valor e unidade de medida (ex: 12mtorr) */}
                      {((vehicle.cargoProducts?.includes('Gases do Ar (LO2, LN2, LAR)') || vehicle.cargoProduct?.includes('Gases do Ar')) && vehicle.vacuumValue != null && vehicle.vacuumValue !== '') && (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border shadow-2xs bg-indigo-50 text-indigo-800 border-indigo-200"
                          title={`Vácuo medido: ${vehicle.vacuumValue}mtorr${vehicle.vacuumDate ? ` em ${formatDisplayDate(vehicle.vacuumDate)}` : ''}`}
                        >
                          <Gauge className="w-2.5 h-2.5 text-indigo-600 shrink-0" />
                          <span>{vehicle.vacuumValue}mtorr</span>
                        </span>
                      )}

                      {renderActiveOSBadges(vehicle)}
                    </div>

                    {/* Line 2: Modelo da frota abaixo do número da frota, em seguida a placa */}
                    <div className="text-xs text-slate-600 font-medium mt-0.5 truncate flex items-center flex-wrap">
                      <span className="font-bold text-slate-900">{vehicle.model}</span>
                      <span className="mx-1.5 text-slate-300 select-none">·</span>
                      <span className="font-mono font-bold text-slate-800">{vehicle.plate}/{vehicle.uf}</span>
                      {vehicle.brand && (
                        <>
                          <span className="mx-1.5 text-slate-300 select-none">·</span>
                          <span className="text-slate-600 uppercase text-[11px] font-medium">{vehicle.brand}</span>
                        </>
                      )}
                      {vehicle.year && (
                        <>
                          <span className="mx-1.5 text-slate-300 select-none">·</span>
                          <span>{vehicle.year}</span>
                        </>
                      )}
                    </div>

                    {/* Line 3: Document tags */}
                    {renderDocumentBadges(vehicle)}
                  </div>
                </div>

                {/* Right section: Chevron arrow indicating clickable */}
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[#ff5500] group-hover:translate-x-1 transition-all shrink-0 ml-3" />
              </div>
            );
          })
        )}
      </div>

      {/* Footer counter */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1 pt-1">
        <span>Exibindo {filteredVehicles.length} de {vehicles.length} frotas cadastradas</span>
        <span className="hidden sm:inline">Clique no veículo para abrir a aba com informações completas e anexos</span>
      </div>

      {/* Modal de Detalhe da Ordem de Serviço */}
      <ServiceOrderDetailModal
        isOpen={!!selectedOS}
        onClose={() => setSelectedOS(null)}
        os={selectedOS}
      />

    </div>
  );
};
