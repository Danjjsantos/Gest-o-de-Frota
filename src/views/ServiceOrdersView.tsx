import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  AlertOctagon,
  Clock,
  CheckCircle2,
  Table as TableIcon,
  LayoutGrid,
  Info,
  Camera,
  Eye,
  Truck,
  UserCheck,
  Calendar,
  Users,
  ShieldCheck,
  Trash2
} from 'lucide-react';
import { useFleet } from '../context/FleetContext';
import { ServiceOrder, OSCategory, OSStatus } from '../types';
import { ServiceOrderCard } from '../components/ServiceOrderCard';
import { PriorityBadge } from '../components/PriorityBadge';
import { ConfirmDeleteModal } from '../components/modals/ConfirmDeleteModal';

interface ServiceOrdersViewProps {
  onOpenNewOS: () => void;
  onSelectOS: (os: ServiceOrder) => void;
  initialCategory?: OSCategory;
}

type PriorityFilter = 'Todas prioridades' | 'Alta' | 'Média' | 'Baixa';
type ViewMode = 'cards' | 'tabela';

export const ServiceOrdersView: React.FC<ServiceOrdersViewProps> = ({
  onOpenNewOS,
  onSelectOS,
  initialCategory,
}) => {
  const { serviceOrders, currentUser, deleteServiceOrder } = useFleet();
  const isAdmin = currentUser?.role === 'Administrador';

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos status' | OSStatus>('Todos status');
  const [categoryFilter, setCategoryFilter] = useState<'Todas cat.' | OSCategory>(initialCategory || 'Todas cat.');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('Todas prioridades');
  const [directedToMeOnly, setDirectedToMeOnly] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [osToDelete, setOsToDelete] = useState<ServiceOrder | null>(null);

  // Summary counts for technicians to prioritize work
  const priorityCounts = useMemo(() => {
    let alta = 0;
    let media = 0;
    let baixa = 0;
    serviceOrders.forEach(os => {
      const isPending = os.status === 'Aberta' || os.status === 'Em andamento';
      if (isPending) {
        if (os.priority === 'Urgente' || os.priority === 'Alta') alta++;
        else if (os.priority === 'Média') media++;
        else if (os.priority === 'Baixa') baixa++;
      }
    });
    return { alta, media, baixa };
  }, [serviceOrders]);

  const filteredOrders = useMemo(() => {
    return serviceOrders.filter(os => {
      const matchesStatus = statusFilter === 'Todos status' || os.status === statusFilter;
      const matchesCategory = 
        categoryFilter === 'Todas cat.' || 
        os.category === categoryFilter ||
        (categoryFilter === 'Seva/Sacar' && (os.category as string) === 'Seva/Sascar') ||
        (categoryFilter === 'Seva/Sascar' && (os.category as string) === 'Seva/Sacar');
      
      let matchesPriority = true;
      if (priorityFilter === 'Alta') {
        matchesPriority = os.priority === 'Urgente' || os.priority === 'Alta';
      } else if (priorityFilter === 'Média') {
        matchesPriority = os.priority === 'Média';
      } else if (priorityFilter === 'Baixa') {
        matchesPriority = os.priority === 'Baixa';
      }

      // Filter: Direcionadas a Mim
      if (directedToMeOnly && currentUser) {
        const isLeadership = ['Administrador', 'Gerente', 'Encarregado', 'Monitor'].includes(currentUser.role);
        const isExplicitAssignee = os.assignedToUserId === currentUser.id;
        const isInDirectedUserIds = os.directedUserIds?.includes(currentUser.id);
        const roleMatches = 
          (currentUser.role === 'Téc. Eletrica' && os.category === 'Elétrica') ||
          (currentUser.role === 'Mecânico' && os.category === 'Mecânica') ||
          (currentUser.role === 'Borracheiro' && os.category === 'Borracharia') ||
          (currentUser.role === 'Téc. Driox' && os.category === 'Driox');

        if (!isLeadership && !isExplicitAssignee && !isInDirectedUserIds && !roleMatches) {
          return false;
        }
      }

      const searchLower = search.toLowerCase();
      const matchesSearch = 
        os.code.toLowerCase().includes(searchLower) ||
        os.title.toLowerCase().includes(searchLower) ||
        os.fleetNumber.toLowerCase().includes(searchLower) ||
        os.plate.toLowerCase().includes(searchLower) ||
        os.openedByName.toLowerCase().includes(searchLower) ||
        (os.assignedToName && os.assignedToName.toLowerCase().includes(searchLower));

      return matchesStatus && matchesCategory && matchesPriority && matchesSearch;
    });
  }, [serviceOrders, statusFilter, categoryFilter, priorityFilter, directedToMeOnly, currentUser, search]);

  const getStatusBadge = (st: OSStatus) => {
    switch (st) {
      case 'Resolvida':
        return (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
            Resolvida
          </span>
        );
      case 'Encerrada':
        return (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
            Encerrada
          </span>
        );
      case 'Em andamento':
        return (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
            Em andamento
          </span>
        );
      case 'Aberta':
        return (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
            Aberta
          </span>
        );
    }
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-[1650px] mx-auto">
      {/* Title & Action */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase font-sans">
              Ordens de Serviço
            </h2>
            <span className="bg-orange-100 text-orange-800 font-mono text-xs font-bold px-2.5 py-0.5 rounded-full border border-orange-200">
              {filteredOrders.length} de {serviceOrders.length} chamados
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Gerencie, priorize e visualize todos os dados das ordens de serviço por severidade técnica e categoria
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Mode Switcher */}
          <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === 'cards'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
              title="Visualização em cards"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
            <button
              onClick={() => setViewMode('tabela')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === 'tabela'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
              title="Visualização em tabela completa com barra de rolagem horizontal"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Tabela Geral</span>
            </button>
          </div>

          <button
            onClick={onOpenNewOS}
            className="flex items-center gap-2 bg-[#ff5500] hover:bg-[#e64d00] text-white px-4 sm:px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-orange-500/20 transition active:scale-95 whitespace-nowrap"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Nova OS</span>
          </button>
        </div>
      </div>

      {/* Technician Priority Queue Quick Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => setPriorityFilter(priorityFilter === 'Alta' ? 'Todas prioridades' : 'Alta')}
          className={`p-3.5 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
            priorityFilter === 'Alta'
              ? 'bg-rose-50/95 border-rose-300 ring-2 ring-rose-400/40 shadow-xs'
              : 'bg-white border-slate-200/80 hover:border-rose-200 hover:bg-rose-50/30'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-100/90 text-rose-700 flex items-center justify-center shrink-0">
              <AlertOctagon className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 block">Alta Severidade</span>
              <span className="text-[11px] text-slate-500">Urgente & Alta prioridade</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xl font-black text-rose-600 font-mono tabular-nums">
              {priorityCounts.alta}
            </span>
            <span className="text-[10px] text-slate-400 block font-medium">pendentes</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setPriorityFilter(priorityFilter === 'Média' ? 'Todas prioridades' : 'Média')}
          className={`p-3.5 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
            priorityFilter === 'Média'
              ? 'bg-amber-50/95 border-amber-300 ring-2 ring-amber-400/40 shadow-xs'
              : 'bg-white border-slate-200/80 hover:border-amber-200 hover:bg-amber-50/30'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100/90 text-amber-800 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 block">Média Severidade</span>
              <span className="text-[11px] text-slate-500">Intervenção agendada</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xl font-black text-amber-600 font-mono tabular-nums">
              {priorityCounts.media}
            </span>
            <span className="text-[10px] text-slate-400 block font-medium">pendentes</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setPriorityFilter(priorityFilter === 'Baixa' ? 'Todas prioridades' : 'Baixa')}
          className={`p-3.5 rounded-2xl border text-left transition flex items-center justify-between cursor-pointer ${
            priorityFilter === 'Baixa'
              ? 'bg-slate-100 border-slate-300 ring-2 ring-slate-400/40 shadow-xs'
              : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-800 block">Baixa Severidade</span>
              <span className="text-[11px] text-slate-500">Manutenção preventiva</span>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xl font-black text-slate-700 font-mono tabular-nums">
              {priorityCounts.baixa}
            </span>
            <span className="text-[10px] text-slate-400 block font-medium">pendentes</span>
          </div>
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por OS, título, frota, placa ou responsável..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#ff5500] transition"
          />
        </div>

        {/* Filter Badges Row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Priority Quick Filter */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">
              Severidade:
            </span>
            {(['Todas prioridades', 'Alta', 'Média', 'Baixa'] as const).map(tab => {
              const isActive = priorityFilter === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setPriorityFilter(tab)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap cursor-pointer ${
                    isActive
                      ? tab === 'Alta'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : tab === 'Média'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : tab === 'Baixa'
                        ? 'bg-slate-700 text-white shadow-xs'
                        : 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab === 'Todas prioridades' ? 'Todas' : tab}
                </button>
              );
            })}
          </div>

          <div className="h-5 w-[1px] bg-slate-200 hidden md:block" />

          {/* Status Filters */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {(['Todos status', 'Aberta', 'Em andamento', 'Resolvida', 'Encerrada'] as const).map(tab => {
              const isActive = statusFilter === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-[#ff5500] text-white shadow-xs'
                      : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          <div className="h-5 w-[1px] bg-slate-200 hidden md:block" />

          {/* Category Filters */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1">
            {(['Todas cat.', 'Mecânica', 'Elétrica', 'Borracharia', 'Driox', 'Seva/Sacar', 'Motora'] as const).map(tab => {
              const isActive = categoryFilter === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setCategoryFilter(tab)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {tab}
                </button>
              );
            })}
          </div>

          <div className="h-5 w-[1px] bg-slate-200 hidden md:block" />

          {/* User auto-direction quick toggle */}
          {currentUser && (
            <button
              onClick={() => setDirectedToMeOnly(!directedToMeOnly)}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition flex items-center gap-1.5 border cursor-pointer ${
                directedToMeOnly
                  ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                  : 'bg-orange-50/80 text-orange-900 border-orange-200 hover:bg-orange-100'
              }`}
              title="Filtrar apenas ordens direcionadas ao meu perfil / função"
            >
              <Users className="w-3.5 h-3.5" />
              <span>Direcionadas a Mim ({currentUser.name})</span>
            </button>
          )}
        </div>

        {/* Scrollbar Tip for Table */}
        {viewMode === 'tabela' && (
          <div className="flex items-center justify-between text-[11px] text-slate-500 bg-orange-50/60 border border-orange-200/60 px-3.5 py-1.5 rounded-xl">
            <div className="flex items-center gap-2">
              <Info className="w-3.5 h-3.5 text-[#ff5500] shrink-0" />
              <span>
                <strong>Modo Tabela Geral:</strong> Visualize todos os detalhes (Código, Severidade, Categoria, Defeito, Frota, Solicitante, Técnico, Fotos, Data e Status). Role horizontalmente se necessário.
              </span>
            </div>
            <span className="hidden sm:inline-block font-medium text-slate-400">
              Clique em qualquer linha para abrir os detalhes da OS
            </span>
          </div>
        )}
      </div>

      {/* VIEW MODE: TABELA GERAL COM BARRA DE ROLAGEM HORIZONTAL */}
      {viewMode === 'tabela' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1300px]">
              <thead>
                <tr className="bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider select-none">
                  <th className="py-3.5 px-4 sticky left-0 z-20 bg-slate-900 border-r border-slate-800">OS</th>
                  <th className="py-3.5 px-3">Severidade</th>
                  <th className="py-3.5 px-3">Categoria</th>
                  <th className="py-3.5 px-3">Título do Defeito</th>
                  <th className="py-3.5 px-3">Frota & Placa</th>
                  <th className="py-3.5 px-3">Aberto Por</th>
                  <th className="py-3.5 px-3">Direcionamento da OS</th>
                  <th className="py-3.5 px-3 text-center">Fotos</th>
                  <th className="py-3.5 px-3">Abertura</th>
                  <th className="py-3.5 px-3 text-center">Status</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-sans">
                {filteredOrders.map(os => {
                  const photoCount = os.images ? os.images.length : 0;
                  return (
                    <tr
                      key={os.id}
                      onClick={() => onSelectOS(os)}
                      className="hover:bg-orange-50/40 transition cursor-pointer group"
                    >
                      {/* Código OS (Sticky Column) */}
                      <td className="py-3.5 px-4 sticky left-0 z-10 bg-white group-hover:bg-[#fff9f5] border-r border-slate-100 font-mono font-black text-slate-900">
                        <span className="bg-slate-100 px-2 py-1 rounded text-xs">
                          {os.code}
                        </span>
                      </td>

                      {/* Severidade */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <PriorityBadge priority={os.priority} size="sm" showSeverityLabel={true} />
                      </td>

                      {/* Categoria */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="font-semibold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">
                          {os.category}
                        </span>
                      </td>

                      {/* Título / Defeito */}
                      <td className="py-3.5 px-3 max-w-xs">
                        <span className="font-bold text-slate-900 block truncate group-hover:text-[#ff5500] transition">
                          {os.title}
                        </span>
                        {os.description && (
                          <span className="text-[11px] text-slate-500 block truncate mt-0.5">
                            {os.description}
                          </span>
                        )}
                      </td>

                      {/* Frota & Placa */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-bold text-slate-900">Frota {os.fleetNumber}</span>
                          <span className="font-mono text-slate-500 text-[11px]">({os.plate}/{os.uf})</span>
                        </div>
                      </td>

                      {/* Aberto Por */}
                      <td className="py-3.5 px-3 whitespace-nowrap text-slate-600">
                        <span>{os.openedByName}</span>
                      </td>

                      {/* Direcionamento da OS (Função Responsável + Lideranças) */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          {os.assignedToName ? (
                            <div className="flex items-center gap-1 text-[#ff5500] font-bold bg-orange-50 px-2 py-0.5 rounded border border-orange-200/50 w-fit text-xs">
                              <UserCheck className="w-3 h-3 text-[#ff5500] shrink-0" />
                              <span>{os.assignedToName}</span>
                              <span className="text-[10px] text-slate-500 font-normal">({os.assignedRole || os.category})</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-xs">Equipe Técnica</span>
                          )}
                          <div 
                            className="flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200/80 px-1.5 py-0.5 rounded border border-slate-200/70 w-fit transition"
                            title="Direcionada automaticamente para as lideranças: Gerente, Encarregado, Monitor e Administrador"
                          >
                            <ShieldCheck className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span>+ Lideranças (4)</span>
                          </div>
                        </div>
                      </td>

                      {/* Fotos Anexadas */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        {photoCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[#ff5500] font-bold bg-orange-50 px-2 py-0.5 rounded border border-orange-200 text-[11px]">
                            <Camera className="w-3 h-3" />
                            <span>{photoCount}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Abertura */}
                      <td className="py-3.5 px-3 whitespace-nowrap font-mono text-[11px] text-slate-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>{os.createdAt}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        {getStatusBadge(os.status)}
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5 ml-auto">
                          <button
                            onClick={() => onSelectOS(os)}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-[#ff5500] hover:text-white transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Ver</span>
                          </button>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOsToDelete(os);
                              }}
                              className="p-1 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              title={`Excluir OS #${os.code}`}
                              aria-label="Excluir OS"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredOrders.length === 0 && (
            <div className="text-center py-12 bg-white p-6 text-slate-400 text-xs">
              Nenhuma ordem de serviço encontrada com os filtros selecionados.
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE: CARDS */}
      {viewMode === 'cards' && (
        <div className="space-y-3">
          {filteredOrders.map(os => (
            <ServiceOrderCard
              key={os.id}
              os={os}
              onClick={onSelectOS}
              onDelete={isAdmin ? (targetOs) => setOsToDelete(targetOs) : undefined}
            />
          ))}

          {filteredOrders.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 p-6 text-slate-400 text-xs">
              Nenhuma ordem de serviço encontrada para os filtros aplicados.
            </div>
          )}
        </div>
      )}

      {/* Modal: Excluir Ordem de Serviço (Administrador) */}
      <ConfirmDeleteModal
        isOpen={!!osToDelete}
        onClose={() => setOsToDelete(null)}
        onConfirm={() => {
          if (osToDelete) {
            deleteServiceOrder(osToDelete.id);
            setOsToDelete(null);
          }
        }}
        title="Excluir Ordem de Serviço"
        itemCategory="Manutenção / OS"
        itemName={osToDelete ? `OS #${osToDelete.code} - ${osToDelete.title}` : ''}
        description={`Tem certeza que deseja excluir permanentemente a Ordem de Serviço #${osToDelete?.code}? Todos os registros, fotos e notas de resolução serão removidos.`}
        warningNote="Esta ação é irreversível e excluirá a OS da base de dados."
        confirmButtonText="Excluir OS"
      />

    </div>
  );
};
