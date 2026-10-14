import React, { useEffect } from 'react';
import { 
  LayoutDashboard, 
  Truck, 
  ClipboardList, 
  Users, 
  Bell, 
  FileText, 
  LogOut, 
  ChevronRight,
  Plus,
  X,
  KeyRound,
  Database
} from 'lucide-react';
import { useFleet } from '../context/FleetContext';
import { MyProfileModal } from './modals/MyProfileModal';

export type ActiveTab = 'dashboard' | 'frotas' | 'os' | 'usuarios' | 'notificacoes' | 'relatorio';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onOpenNewOS?: () => void;
  onOpenSupabase?: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab, 
  onOpenNewOS,
  onOpenSupabase,
  isOpen,
  onClose
}) => {
  const { currentUser, logout, notifications } = useFleet();
  const [showProfileModal, setShowProfileModal] = React.useState(false);

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const isFullAccessUser = currentUser?.role === 'Administrador' || currentUser?.role === 'Gerente';

  const menuItems: Array<{
    id: ActiveTab;
    label: string;
    icon: React.ElementType;
    badge?: number;
  }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'frotas', label: 'Frotas', icon: Truck },
    { id: 'os', label: 'Ordens de Serviço', icon: ClipboardList },
    ...(isFullAccessUser ? [
      { id: 'usuarios' as ActiveTab, label: 'Usuários', icon: Users },
      { id: 'notificacoes' as ActiveTab, label: 'Notificações', icon: Bell, badge: unreadCount > 0 ? unreadCount : undefined },
      { id: 'relatorio' as ActiveTab, label: 'Relatório PDF', icon: FileText },
    ] : []),
  ];

  const getRoleColor = (role?: string) => {
    switch (role) {
      case 'Administrador': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'Gerente': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'Encarregado': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'Mecânico': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'Borracheiro': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'Téc. Eletrica': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'Téc. Driox': return 'bg-violet-500/20 text-violet-400 border-violet-500/30';
      case 'Monitor': return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
      default: return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  const handleItemClick = (id: ActiveTab) => {
    setActiveTab(id);
    onClose();
  };

  const handleOpenOS = () => {
    if (onOpenNewOS) {
      onOpenNewOS();
      onClose();
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 transition-opacity animate-in fade-in duration-200"
        aria-hidden="true"
      />

      {/* Drawer menu */}
      <aside 
        className="fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-[#0f172a] text-slate-300 flex flex-col h-full shadow-2xl border-r border-slate-800 select-none animate-in slide-in-from-left duration-300 ease-out"
        role="dialog"
        aria-modal="true"
        aria-label="Menu principal"
      >
        {/* Brand Header with Close Button */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#ea580c] to-[#ff5500] flex items-center justify-center text-white shadow-md shadow-orange-950/40 shrink-0">
              <Truck className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-white font-extrabold text-sm tracking-wider uppercase font-sans leading-tight">
                Gestão Frotas
              </h1>
              <p className="text-[10px] font-bold tracking-widest text-[#f97316] uppercase">
                Sistema de Controle
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            title="Fechar menu"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Menu List */}
        <div className="flex-1 py-3 px-3 space-y-1.5 overflow-y-auto">
          <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Navegação Principal
          </div>

          {menuItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-[#ff5500] text-white font-semibold shadow-md shadow-orange-950/30'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'} shrink-0`} />
                  <span>{item.label}</span>
                </div>

                <div className="flex items-center gap-2">
                  {item.badge !== undefined && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isActive ? 'bg-white text-[#ff5500]' : 'bg-red-500 text-white'
                    }`}>
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-4 h-4 text-white/90" />}
                </div>
              </button>
            );
          })}

          {/* Quick Action Button for Nova OS */}
          {onOpenNewOS && (
            <div className="pt-3">
              <button
                onClick={handleOpenOS}
                className="w-full flex items-center justify-center gap-2 bg-[#ff5500] hover:bg-[#ea4e00] text-white py-2.5 px-3 rounded-xl text-xs font-bold shadow-md shadow-orange-950/30 transition active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Nova Ordem de Serviço</span>
              </button>
            </div>
          )}

          {/* Supabase Database Hub Button */}
          {onOpenSupabase && (
            <div className="pt-2">
              <button
                onClick={() => {
                  onOpenSupabase();
                  onClose();
                }}
                className="w-full flex items-center justify-between gap-2 bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-500/30 hover:border-emerald-500/60 py-2 px-3 rounded-xl text-xs font-semibold shadow-sm transition active:scale-95"
                title="Gerenciar tabelas e sincronização com Supabase"
              >
                <div className="flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Banco Supabase</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-200 border border-emerald-500/30">
                  SQL
                </span>
              </button>
            </div>
          )}
        </div>

        {/* User Card & Role Switcher */}
        <div className="border-t border-slate-800/80 bg-[#0b1320]/80 p-3">
          <div className="relative">
            <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/60">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-orange-600/20 border border-orange-500/30 text-orange-400 flex items-center justify-center font-bold text-xs shrink-0">
                    {currentUser?.name ? currentUser.name.slice(0, 2).toUpperCase() : 'US'}
                  </div>
                  <div className="truncate min-w-0">
                    <p className="text-xs font-semibold text-slate-200 truncate">
                      {currentUser?.name || 'Daniel Santos'}
                    </p>
                    <span className={`inline-block text-[9px] font-semibold px-1.5 py-0.2 rounded border ${getRoleColor(currentUser?.role)}`}>
                      {currentUser?.role || 'Administrador'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowProfileModal(true)}
                  title="Meu Perfil & Segurança (Alterar Senha e Telefone)"
                  className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-orange-400 transition shrink-0 cursor-pointer"
                >
                  <KeyRound className="w-4 h-4" />
                </button>
              </div>
            </div>

            <button
              onClick={() => {
                logout();
                onClose();
              }}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-slate-800/60 rounded-xl transition cursor-pointer"
              title="Encerrar sessão nesta conta"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair do Sistema</span>
            </button>
          </div>
        </div>

        {/* Modal para o usuário logado alterar sua própria senha e telefone */}
        <MyProfileModal
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)}
        />
      </aside>
    </>
  );
};
