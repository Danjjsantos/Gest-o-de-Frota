import React from 'react';
import { 
  AlertOctagon, 
  AlertTriangle, 
  Clock, 
  CheckCircle2 
} from 'lucide-react';
import { OSPriority } from '../types';

interface PriorityBadgeProps {
  priority: OSPriority;
  size?: 'sm' | 'md' | 'lg';
  showSeverityLabel?: boolean; // Shows "Alta", "Média", "Baixa"
  className?: string;
}

export const PriorityBadge: React.FC<PriorityBadgeProps> = ({
  priority,
  size = 'md',
  showSeverityLabel = true,
  className = '',
}) => {
  // Map OSPriority to visual config: Alta, Média, Baixa
  const getConfig = () => {
    switch (priority) {
      case 'Urgente':
        return {
          severity: 'Alta',
          label: 'Urgente',
          subLabel: 'Crítica',
          bg: 'bg-rose-50',
          text: 'text-rose-700',
          border: 'border-rose-200/90',
          dot: 'bg-rose-500',
          ping: true,
          icon: AlertOctagon,
          accentBorder: 'border-l-rose-500',
        };
      case 'Alta':
        return {
          severity: 'Alta',
          label: 'Alta',
          subLabel: 'Elevada',
          bg: 'bg-orange-50',
          text: 'text-orange-700',
          border: 'border-orange-200/90',
          dot: 'bg-orange-500',
          ping: false,
          icon: AlertTriangle,
          accentBorder: 'border-l-orange-500',
        };
      case 'Média':
        return {
          severity: 'Média',
          label: 'Média',
          subLabel: 'Moderada',
          bg: 'bg-amber-50',
          text: 'text-amber-800',
          border: 'border-amber-200/80',
          dot: 'bg-amber-500',
          ping: false,
          icon: Clock,
          accentBorder: 'border-l-amber-500',
        };
      case 'Baixa':
      default:
        return {
          severity: 'Baixa',
          label: 'Baixa',
          subLabel: 'Preventiva',
          bg: 'bg-slate-50',
          text: 'text-slate-600',
          border: 'border-slate-200',
          dot: 'bg-slate-400',
          ping: false,
          icon: CheckCircle2,
          accentBorder: 'border-l-slate-400',
        };
    }
  };

  const config = getConfig();
  const Icon = config.icon;

  if (size === 'sm') {
    return (
      <span
        title={`Severidade: ${config.severity}`}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md font-bold text-[10px] uppercase tracking-wide border ${config.bg} ${config.text} ${config.border} ${className}`}
      >
        <span className="relative flex h-1.5 w-1.5">
          {config.ping && (
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.dot} opacity-75`} />
          )}
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${config.dot}`} />
        </span>
        <Icon className="w-3 h-3 stroke-[2.5]" />
        <span>{config.label}</span>
        {showSeverityLabel && config.label !== config.severity && (
          <span className="opacity-75 text-[9px] font-semibold">({config.severity})</span>
        )}
      </span>
    );
  }

  if (size === 'lg') {
    return (
      <span
        title={`Severidade: ${config.severity}`}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wide border shadow-2xs ${config.bg} ${config.text} ${config.border} ${className}`}
      >
        <span className="relative flex h-2 w-2">
          {config.ping && (
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.dot} opacity-75`} />
          )}
          <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dot}`} />
        </span>
        <Icon className="w-4 h-4 stroke-[2.5]" />
        <span>{config.label}</span>
        {showSeverityLabel && config.label !== config.severity && (
          <span className="px-1.5 py-0.2 rounded font-semibold text-[10px] bg-white/70 border border-current/20">
            {config.severity}
          </span>
        )}
      </span>
    );
  }

  // Default 'md'
  return (
    <span
      title={`Prioridade: ${config.label} · Severidade: ${config.severity}`}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold text-xs tracking-tight border shadow-2xs ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      <span className="relative flex h-2 w-2 shrink-0">
        {config.ping && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${config.dot} opacity-75`} />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dot}`} />
      </span>
      <Icon className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
      <span className="font-bold">{config.label}</span>
      {showSeverityLabel && config.label !== config.severity && (
        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-white/80 border border-current/20">
          {config.severity}
        </span>
      )}
    </span>
  );
};
