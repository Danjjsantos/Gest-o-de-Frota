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
  Gauge,
  Fuel,
  Trash2
} from 'lucide-react';
import { useFleet, formatDisplayDate } from '../context/FleetContext';
import { Vehicle, VehicleType, DocumentType, ServiceOrder } from '../types';
import { generateFullFleetReportPDF } from '../utils/pdfGenerator';
import { VehicleDetailPage } from './VehicleDetailPage';
import { ServiceOrderDetailModal } from '../components/modals/ServiceOrderDetailModal';
import { ConfirmDeleteModal } from '../components/modals/ConfirmDeleteModal';

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
  const { vehicles, serviceOrders, currentUser, deleteVehicle } = useFleet();
  const isAdmin = currentUser?.role === 'Administrador';
  const isFullAccessUser = currentUser?.role === 'Administrador' || currentUser?.role === 'Gerente';
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [selectedOS, setSelectedOS] = useState<ServiceOrder | null>(null);
  const [vehicleToDelete, setVehicleToDelete] = useState<Vehicle | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'Todos' | 'Gases do Ar' | 'CO2' | VehicleType>('Todos');
  const [exportSuccess, setExportSuccess] = useState(false);

  // Helper to determine if vehicle carries Gases do Ar
  const isGasesDoArVehicle = (v: Vehicle) => {
    return Boolean(
      (v.cargoProducts && v.cargoProducts.some(p => p.includes('Gases do Ar') || p.includes('LO2') || p.includes('LN2') || p.includes('LAR'))) ||
      (v.cargoProduct && (v.cargoProduct.includes('Gases do Ar') || v.cargoProduct.includes('LO2') || v.cargoProduct.includes('LN2') || v.cargoProduct.includes('LAR')))
    );
  };

  // Helper to determine if vehicle carries CO2
  const isCO2Vehicle = (v: Vehicle) => {
    if (isGasesDoArVehicle(v)) return false;
    return Boolean(
      (v.cargoProducts && v.cargoProducts.some(p => p.includes('CO2'))) ||
      (v.cargoProduct && v.cargoProduct.includes('CO2'))
    );
  };

  // If a vehicle is selected, open the dedicated full page for that vehicle
  const activeVehicle = useMemo(() => {
    if (!selectedVehicleId) return null;
    return vehicles.find(v => v.id === selectedVehicleId) || null;
  }, [vehicles, selectedVehicleId]);

  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => {
      let matchesType = true;
      if (typeFilter === 'Gases do Ar') {
        matchesType = isGasesDoArVehicle(v);
      } else if (typeFilter === 'CO2') {
        matchesType = isCO2Vehicle(v);
      } else if (typeFilter !== 'Todos') {
        matchesType = v.type === typeFilter;
      }

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

  // Group vehicles in the requested presentation order:
  // 1. Gases do Ar
  // 2. CO2
  // 3. Cavalo Mecânico (separar como os veículos são cadastrados)
  // 4. Outras frotas (se houver)
  const fleetSections = useMemo(() => {
    const sortByFleet = (a: Vehicle, b: Vehicle) =>
      a.fleetNumber.localeCompare(b.fleetNumber, undefined, { numeric: true });

    if (typeFilter === 'Gases do Ar') {
      const list = filteredVehicles.filter(isGasesDoArVehicle).sort(sortByFleet);
      return [
        {
          id: 'gases-do-ar',
          title: 'Gases do Ar',
          subtitle: 'Frotas criogênicas (LO2, LN2, LAR) · Monitoramento de vácuo',
          icon: <Gauge className="w-4 h-4 text-cyan-600" />,
          badgeClass: 'bg-cyan-50 text-cyan-800 border-cyan-200',
          vehicles: list,
        }
      ];
    }

    if (typeFilter === 'CO2') {
      const list = filteredVehicles.filter(isCO2Vehicle).sort(sortByFleet);
      return [
        {
          id: 'co2',
          title: 'CO2',
          subtitle: 'Frotas de dióxido de carbono líquido',
          icon: <Fuel className="w-4 h-4 text-teal-600" />,
          badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
          vehicles: list,
        }
      ];
    }

    if (typeFilter === 'Cavalo Mecânico') {
      const list = filteredVehicles.filter(v => v.type === 'Cavalo Mecânico').sort(sortByFleet);
      return [
        {
          id: 'cavalo',
          title: 'Cavalos Mecânicos',
          subtitle: 'Unidades tratoras de tração mecânica pesada',
          icon: <Truck className="w-4 h-4 text-emerald-600" />,
          badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          vehicles: list,
        }
      ];
    }

    if (typeFilter === 'Caminhão') {
      const gasesDoArTrucks = filteredVehicles.filter(v => v.type === 'Caminhão' && isGasesDoArVehicle(v)).sort(sortByFleet);
      const co2Trucks = filteredVehicles.filter(v => v.type === 'Caminhão' && isCO2Vehicle(v)).sort(sortByFleet);
      const otherTrucks = filteredVehicles.filter(v => v.type === 'Caminhão' && !isGasesDoArVehicle(v) && !isCO2Vehicle(v)).sort(sortByFleet);

      const sections = [];
      if (gasesDoArTrucks.length > 0) {
        sections.push({
          id: 'caminhao-gases-do-ar',
          title: 'Caminhões — Gases do Ar',
          subtitle: 'Caminhões criogênicos (LO2, LN2, LAR)',
          icon: <Gauge className="w-4 h-4 text-cyan-600" />,
          badgeClass: 'bg-cyan-50 text-cyan-800 border-cyan-200',
          vehicles: gasesDoArTrucks,
        });
      }
      if (co2Trucks.length > 0) {
        sections.push({
          id: 'caminhao-co2',
          title: 'Caminhões — CO2',
          subtitle: 'Caminhões tanque de dióxido de carbono',
          icon: <Fuel className="w-4 h-4 text-teal-600" />,
          badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
          vehicles: co2Trucks,
        });
      }
      if (otherTrucks.length > 0) {
        sections.push({
          id: 'caminhao-outros',
          title: 'Caminhões',
          subtitle: 'Demais caminhões da frota',
          icon: <Truck className="w-4 h-4 text-blue-600" />,
          badgeClass: 'bg-blue-50 text-blue-800 border-blue-200',
          vehicles: otherTrucks,
        });
      }
      return sections;
    }

    if (typeFilter === 'Carreta') {
      const gasesDoArTrailers = filteredVehicles.filter(v => v.type === 'Carreta' && isGasesDoArVehicle(v)).sort(sortByFleet);
      const co2Trailers = filteredVehicles.filter(v => v.type === 'Carreta' && isCO2Vehicle(v)).sort(sortByFleet);
      const otherTrailers = filteredVehicles.filter(v => v.type === 'Carreta' && !isGasesDoArVehicle(v) && !isCO2Vehicle(v)).sort(sortByFleet);

      const sections = [];
      if (gasesDoArTrailers.length > 0) {
        sections.push({
          id: 'carreta-gases-do-ar',
          title: 'Carretas — Gases do Ar',
          subtitle: 'Carretas criogênicas (LO2, LN2, LAR)',
          icon: <Gauge className="w-4 h-4 text-cyan-600" />,
          badgeClass: 'bg-cyan-50 text-cyan-800 border-cyan-200',
          vehicles: gasesDoArTrailers,
        });
      }
      if (co2Trailers.length > 0) {
        sections.push({
          id: 'carreta-co2',
          title: 'Carretas — CO2',
          subtitle: 'Carretas tanque de dióxido de carbono',
          icon: <Fuel className="w-4 h-4 text-teal-600" />,
          badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
          vehicles: co2Trailers,
        });
      }
      if (otherTrailers.length > 0) {
        sections.push({
          id: 'carreta-outras',
          title: 'Carretas',
          subtitle: 'Demais carretas da frota',
          icon: <Truck className="w-4 h-4 text-purple-600" />,
          badgeClass: 'bg-purple-50 text-purple-800 border-purple-200',
          vehicles: otherTrailers,
        });
      }
      return sections;
    }

    // Default 'Todos': strictly in the order requested:
    // 1. Gases do Ar
    // 2. CO2
    // 3. Cavalo Mecânico
    // 4. Outras frotas (se houver)
    const gasesDoAr = filteredVehicles.filter(isGasesDoArVehicle).sort(sortByFleet);
    const co2 = filteredVehicles.filter(isCO2Vehicle).sort(sortByFleet);
    const cavalos = filteredVehicles.filter(v => v.type === 'Cavalo Mecânico').sort(sortByFleet);
    const outros = filteredVehicles.filter(v => !isGasesDoArVehicle(v) && !isCO2Vehicle(v) && v.type !== 'Cavalo Mecânico').sort(sortByFleet);

    const sections = [
      {
        id: 'gases-do-ar',
        title: 'Gases do Ar',
        subtitle: 'Frotas criogênicas (LO2, LN2, LAR) · Monitoramento de vácuo',
        icon: <Gauge className="w-4 h-4 text-cyan-600" />,
        badgeClass: 'bg-cyan-50 text-cyan-800 border-cyan-200',
        vehicles: gasesDoAr,
      },
      {
        id: 'co2',
        title: 'CO2',
        subtitle: 'Frotas de dióxido de carbono líquido',
        icon: <Fuel className="w-4 h-4 text-teal-600" />,
        badgeClass: 'bg-teal-50 text-teal-800 border-teal-200',
        vehicles: co2,
      },
      {
        id: 'cavalo',
        title: 'Cavalos Mecânicos',
        subtitle: 'Unidades tratoras de tração mecânica pesada',
        icon: <Truck className="w-4 h-4 text-emerald-600" />,
        badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
        vehicles: cavalos,
      },
    ];

    if (outros.length > 0) {
      sections.push({
        id: 'outros',
        title: 'Outras Frotas',
        subtitle: 'Veículos cadastrados sem produto específico',
        icon: <Truck className="w-4 h-4 text-slate-600" />,
        badgeClass: 'bg-slate-50 text-slate-800 border-slate-200',
        vehicles: outros,
      });
    }

    return sections;
  }, [filteredVehicles, typeFilter]);

  const totalVisibleVehicles = useMemo(() => {
    return fleetSections.reduce((acc, s) => acc + s.vehicles.length, 0);
  }, [fleetSections]);

  const renderVehicleCard = (vehicle: Vehicle) => (
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

      {/* Right section: Admin delete button + Chevron arrow indicating clickable */}
      <div className="flex items-center gap-1 shrink-0 ml-3">
        {isAdmin && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setVehicleToDelete(vehicle);
            }}
            className="p-2 rounded-xl text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
            title={`Excluir cadastro da Frota ${vehicle.fleetNumber}`}
            aria-label="Excluir Frota"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-[#ff5500] group-hover:translate-x-1 transition-all" />
      </div>
    </div>
  );

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
          {(['Todos', 'Gases do Ar', 'CO2', 'Caminhão', 'Carreta', 'Cavalo Mecânico'] as const).map(tab => {
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

      {/* Fleet Vehicles List Cards Separated by Category */}
      <div className="space-y-8">
        {totalVisibleVehicles === 0 ? (
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
          fleetSections.map(section => {
            if (section.vehicles.length === 0) return null;

            return (
              <div key={section.id} className="space-y-3">
                {/* Section Header */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-200/90">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      {section.icon}
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                        {section.title}
                      </h3>
                      <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                        {section.subtitle}
                      </p>
                    </div>
                  </div>

                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${section.badgeClass}`}>
                    {section.vehicles.length} {section.vehicles.length === 1 ? 'frota' : 'frotas'}
                  </span>
                </div>

                {/* Section Cards List */}
                <div className="space-y-3">
                  {section.vehicles.map(renderVehicleCard)}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer counter */}
      <div className="flex items-center justify-between text-xs text-slate-400 px-1 pt-1">
        <span>Exibindo {totalVisibleVehicles} de {vehicles.length} frotas cadastradas</span>
        <span className="hidden sm:inline">Clique no veículo para abrir a aba com informações completas e anexos</span>
      </div>

      {/* Modal de Detalhe da Ordem de Serviço */}
      <ServiceOrderDetailModal
        isOpen={!!selectedOS}
        onClose={() => setSelectedOS(null)}
        os={selectedOS}
      />

      {/* Modal de Confirmação de Exclusão de Frota (Administrador) */}
      <ConfirmDeleteModal
        isOpen={!!vehicleToDelete}
        onClose={() => setVehicleToDelete(null)}
        onConfirm={() => {
          if (vehicleToDelete) {
            deleteVehicle(vehicleToDelete.id);
            setVehicleToDelete(null);
          }
        }}
        title="Excluir Cadastro da Frota"
        itemCategory="Veículo / Frota"
        itemName={vehicleToDelete ? `Frota ${vehicleToDelete.fleetNumber} (${vehicleToDelete.plate}/${vehicleToDelete.uf})` : ''}
        description={`Tem certeza que deseja excluir permanentemente o cadastro do veículo Frota ${vehicleToDelete?.fleetNumber}? Todos os registros, especificações e documentos desta frota serão removidos.`}
        warningNote="Esta ação é irreversível e excluirá o veículo e seus vínculos do sistema."
        confirmButtonText="Excluir Frota"
      />

    </div>
  );
};
