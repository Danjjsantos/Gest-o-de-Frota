import React from 'react';
import { 
  Settings2, 
  Wrench, 
  Zap, 
  Radio, 
  CircleDot,
  Eye,
  ChevronRight, 
  UserCheck, 
  Clock, 
  Truck, 
  Calendar, 
  Camera,
  ShieldCheck,
  Trash2
} from 'lucide-react';
import { ServiceOrder, OSCategory, OSStatus } from '../types';
import { PriorityBadge } from './PriorityBadge';

interface ServiceOrderCardProps {
  os: ServiceOrder;
  onClick: (os: ServiceOrder) => void;
  onDelete?: (os: ServiceOrder) => void;
  compact?: boolean;
}

export const ServiceOrderCard: React.FC<ServiceOrderCardProps> = ({
  os,
  onClick,
  onDelete,
  compact = false,
}) => {
  const getCategoryIcon = (cat: OSCategory) => {
    switch (cat) {
      case 'Mecânica': 
        return <Wrench className="w-4 h-4 text-blue-600" />;
      case 'Elétrica': 
        return <Zap className="w-4 h-4 text-amber-600" />;
      case 'Borracharia': 
        return <CircleDot className="w-4 h-4 text-orange-600" />;
      case 'Seva/Sacar':
      case 'Seva/Sascar': 
        return <Radio className="w-4 h-4 text-emerald-600" />;
      case 'Motora': 
        return <Eye className="w-4 h-4 text-indigo-600" />;
      case 'Driox': 
        return <Settings2 className="w-4 h-4 text-purple-600" />;
    }
  };

  const getStatusBadge = (st: OSStatus) => {
    switch (st) {
      case 'Resolvida':
        return (
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200/60">
            Resolvida
          </span>
        );
      case 'Encerrada':
        return (
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
            Encerrada
          </span>
        );
      case 'Em andamento':
        return (
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200/60">
            Em andamento
          </span>
        );
      case 'Aberta':
        return (
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200/60">
            Aberta
          </span>
        );
    }
  };

  // Severity border on the left to allow immediate peripheral scanning
  const getSeverityBorder = () => {
    switch (os.priority) {
      case 'Urgente':
        return 'border-l-4 border-l-rose-500 hover:border-l-rose-600';
      case 'Alta':
        return 'border-l-4 border-l-orange-500 hover:border-l-orange-600';
      case 'Média':
        return 'border-l-4 border-l-amber-500 hover:border-l-amber-600';
      case 'Baixa':
      default:
        return 'border-l-4 border-l-slate-300 hover:border-l-slate-400';
    }
  };

  if (compact) {
    return (
      <div
        onClick={() => onClick(os)}
        className={`bg-white rounded-xl p-3.5 border border-slate-100 hover:border-slate-300 shadow-2xs hover:shadow-xs transition cursor-pointer flex items-center justify-between gap-3 ${getSeverityBorder()}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100">
            {getCategoryIcon(os.category)}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-[11px] font-bold text-slate-400">
                {os.code}
              </span>
              <PriorityBadge priority={os.priority} size="sm" showSeverityLabel={true} />
            </div>
            <h4 className="text-xs font-bold text-slate-800 truncate mt-0.5">
              {os.title}
            </h4>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-sans">
              <span>Frota {os.fleetNumber} · {os.category}</span>
              {os.images && os.images.length > 0 && (
                <span className="inline-flex items-center gap-0.5 text-orange-600 font-bold bg-orange-50 px-1 py-0.2 rounded border border-orange-200/50">
                  <Camera className="w-2.5 h-2.5" />
                  <span>{os.images.length}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {getStatusBadge(os.status)}
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(os);
              }}
              className="p-1 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
              title={`Excluir OS #${os.code}`}
              aria-label="Excluir OS"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => onClick(os)}
      className={`bg-white rounded-2xl p-5 border border-slate-100 hover:border-slate-300 shadow-2xs hover:shadow-md transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 group ${getSeverityBorder()}`}
    >
      <div className="flex items-start sm:items-center gap-4 min-w-0">
        {/* Category Icon Badge */}
        <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100 group-hover:bg-slate-100/70 transition">
          {getCategoryIcon(os.category)}
        </div>

        <div className="min-w-0 space-y-1.5 flex-1">
          {/* Top metadata row with Priority Badge prominent */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Visual Priority Badge: Alta, Média, Baixa */}
            <PriorityBadge priority={os.priority} size="md" showSeverityLabel={true} />

            <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
              {os.code}
            </span>

            <span className="text-xs font-semibold text-slate-700 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
              {os.category}
            </span>
          </div>

          {/* Main Title & Description snippet */}
          <div>
            <h3 className="text-base font-bold text-slate-900 leading-snug group-hover:text-[#ff5500] transition">
              {os.title}
            </h3>
            {os.description && (
              <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                {os.description}
              </p>
            )}
          </div>

          {/* Bottom metadata tags */}
          <div className="flex items-center gap-2.5 text-xs text-slate-500 flex-wrap font-sans pt-0.5">
            <span className="font-semibold text-slate-700 flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-slate-400" />
              <span>Frota {os.fleetNumber}</span>
            </span>

            <span className="text-slate-300">·</span>
            <span className="font-mono text-slate-600">{os.plate}/{os.uf}</span>

            <span className="text-slate-300">·</span>
            <span className="flex items-center gap-1 text-slate-500">
              <Calendar className="w-3 h-3 text-slate-400" />
              <span>{os.createdAt}</span>
            </span>

            <span className="text-slate-300">·</span>
            <span className="text-slate-500 truncate">
              Por: <strong className="text-slate-700 font-medium">{os.openedByName}</strong>
            </span>

            {os.assignedToName && (
              <>
                <span className="text-slate-300">·</span>
                <span className="text-[#ff5500] bg-orange-50/80 border border-orange-200/50 px-2 py-0.5 rounded-md text-[11px] font-semibold flex items-center gap-1">
                  <UserCheck className="w-3 h-3 text-[#ff5500]" />
                  <span>Técnico: {os.assignedToName}</span>
                </span>
              </>
            )}

            <span className="text-slate-300">·</span>
            <span 
              className="text-slate-700 bg-slate-100 hover:bg-slate-200/70 border border-slate-200/80 px-2 py-0.5 rounded-md text-[11px] font-medium flex items-center gap-1 transition"
              title="Direcionada automaticamente para as lideranças: Gerente, Encarregado, Monitor e Administrador"
            >
              <ShieldCheck className="w-3 h-3 text-emerald-600" />
              <span>+ Lideranças (4)</span>
            </span>

            {os.images && os.images.length > 0 && (
              <>
                <span className="text-slate-300">·</span>
                <span className="text-slate-700 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-md text-[11px] font-semibold flex items-center gap-1 shadow-2xs">
                  <Camera className="w-3 h-3 text-[#ff5500]" />
                  <span>{os.images.length} {os.images.length === 1 ? 'foto anexada' : 'fotos anexadas'}</span>
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Right column: Status badge and Action indicator */}
      <div className="flex items-center justify-between md:justify-end gap-3 shrink-0 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
        <div className="flex items-center gap-2">
          {getStatusBadge(os.status)}
          {onDelete && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(os);
              }}
              className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
              title={`Excluir OS #${os.code}`}
              aria-label="Excluir Ordem de Serviço"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="w-8 h-8 rounded-lg bg-slate-50 group-hover:bg-[#ff5500] group-hover:text-white text-slate-400 flex items-center justify-center transition">
          <ChevronRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
};
