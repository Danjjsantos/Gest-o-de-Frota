import React from 'react';
import { Plus, Bell, Volume2, VolumeX } from 'lucide-react';
import { useFleet } from '../context/FleetContext';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  onOpenNewOS: () => void;
  onNavigateToNotifications?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
  title, 
  subtitle, 
  onOpenNewOS, 
  onNavigateToNotifications 
}) => {
  const { currentUser, notifications } = useFleet();
  const [soundEnabled, setSoundEnabled] = React.useState(true);

  const unreadNotifications = notifications.filter(n => !n.read);

  // Time-aware greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'Bom dia';
    if (hour >= 12 && hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  const defaultTitle = `${getGreeting()}, ${currentUser?.name.split(' ')[0] || 'Daniel'}!`;
  const defaultSubtitle = 'Visão geral da frota';

  // Date formatting matching screenshot: "quarta-feira, 2 de setembro de 2026"
  const formattedDate = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(new Date('2026-09-02T19:30:00'));

  return (
    <header className="px-8 py-6 bg-white border-b border-slate-200/80 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
      <div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight font-sans">
          {title || defaultTitle}
        </h2>
        <p className="text-sm font-medium text-slate-500 mt-0.5">
          {subtitle || defaultSubtitle}
        </p>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-xs font-medium text-slate-500 lowercase hidden lg:inline-block">
          {formattedDate}
        </span>

        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          title={soundEnabled ? 'Alertas sonoros ativados' : 'Alertas sonoros desativados'}
          className={`p-2 rounded-lg border transition ${
            soundEnabled 
              ? 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100' 
              : 'bg-red-50 text-red-500 border-red-200'
          }`}
        >
          {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Notifications Icon Button */}
        <button
          onClick={onNavigateToNotifications}
          className="relative p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
          title="Ver notificações e alertas"
        >
          <Bell className="w-4 h-4" />
          {unreadNotifications.length > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 px-1 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white shadow-sm">
              {unreadNotifications.length}
            </span>
          )}
        </button>

        {/* New OS Button */}
        <button
          onClick={onOpenNewOS}
          className="flex items-center gap-2 bg-[#ff5500] hover:bg-[#ea4e00] text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md shadow-orange-500/20 transition active:scale-95 whitespace-nowrap"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span>Nova OS</span>
        </button>
      </div>
    </header>
  );
};
