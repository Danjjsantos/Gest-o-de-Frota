/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Menu, Truck, Database } from 'lucide-react';
import { FleetProvider, useFleet } from './context/FleetContext';
import { Sidebar, ActiveTab } from './components/Sidebar';
import { AlertBanner } from './components/AlertBanner';
import { LoginScreen } from './components/LoginScreen';
import { DashboardView } from './views/DashboardView';
import { FleetView } from './views/FleetView';
import { ServiceOrdersView } from './views/ServiceOrdersView';
import { UsersView } from './views/UsersView';
import { NotificationsView } from './views/NotificationsView';
import { ReportView } from './views/ReportView';

// Modals
import { NewVehicleModal } from './components/modals/NewVehicleModal';
import { NewServiceOrderModal } from './components/modals/NewServiceOrderModal';
import { NewUserModal } from './components/modals/NewUserModal';
import { VehicleDetailModal } from './components/modals/VehicleDetailModal';
import { ServiceOrderDetailModal } from './components/modals/ServiceOrderDetailModal';
import { CriticalExpirationsPopup } from './components/CriticalExpirationsPopup';
import { SupabaseSyncModal } from './components/modals/SupabaseSyncModal';

import { Vehicle, ServiceOrder, OSCategory } from './types';

function MainApp() {
  const { isAuthenticated, vehicles, serviceOrders, currentUser } = useFleet();

  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Somente Administrador e Gerente têm acesso a todos os módulos (Usuários, Relatórios, Notificações/Configurações)
  const isFullAccessUser = currentUser?.role === 'Administrador' || currentUser?.role === 'Gerente';

  // Guard: redireciona para o dashboard caso o usuário troque de perfil para um sem acesso à aba atual
  React.useEffect(() => {
    if (!isFullAccessUser && (activeTab === 'usuarios' || activeTab === 'notificacoes' || activeTab === 'relatorio')) {
      setActiveTab('dashboard');
    }
  }, [isFullAccessUser, activeTab]);

  // Modals state
  const [isNewVehicleModalOpen, setIsNewVehicleModalOpen] = useState(false);
  const [isNewOSModalOpen, setIsNewOSModalOpen] = useState(false);
  const [isNewUserModalOpen, setIsNewUserModalOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedOS, setSelectedOS] = useState<ServiceOrder | null>(null);
  const [preselectedVehicleId, setPreselectedVehicleId] = useState<string | undefined>(undefined);
  const [lockVehicleSelection, setLockVehicleSelection] = useState<boolean>(false);
  const [osCategoryFilter, setOsCategoryFilter] = useState<OSCategory | undefined>(undefined);

  // Automatically keep selectedVehicle and selectedOS updated with changes from context
  const currentSelectedVehicle = useMemo(() => {
    if (!selectedVehicle) return null;
    return vehicles.find(v => v.id === selectedVehicle.id) || selectedVehicle;
  }, [vehicles, selectedVehicle]);

  const currentSelectedOS = useMemo(() => {
    if (!selectedOS) return null;
    return serviceOrders.find(o => o.id === selectedOS.id) || selectedOS;
  }, [serviceOrders, selectedOS]);

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  const handleNavigateToOS = (category?: OSCategory) => {
    setOsCategoryFilter(category);
    setActiveTab('os');
  };

  return (
    <div className="flex flex-col h-screen bg-[#f8fafc] text-slate-800 antialiased overflow-hidden font-sans">
      {/* Cabeçalho Superior */}
      <header className="h-16 bg-[#0f172a] border-b border-slate-800/90 px-4 sm:px-6 flex items-center justify-between z-30 shrink-0 select-none shadow-md">
        {/* Esquerda: Ícone Laranja com Caminhão + GESTÃO FROTAS */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#ea580c] to-[#ff5500] flex items-center justify-center text-white shadow-md shadow-orange-950/40 shrink-0">
            <Truck className="w-5 h-5 stroke-[2.2]" />
          </div>
          <h1 className="text-white font-black text-lg sm:text-xl tracking-wider uppercase font-sans">
            GESTÃO FROTAS
          </h1>
        </div>

        {/* Direita: Acesso Supabase + Menu Hamburger */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={() => setIsSupabaseModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/30 transition shadow-sm cursor-pointer active:scale-95"
            title="Banco de Dados Supabase (Tabelas e Sincronização)"
          >
            <Database className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Supabase</span>
          </button>

          <button
            onClick={() => setIsMenuOpen(true)}
            className="p-2 rounded-xl text-slate-200 hover:text-white hover:bg-slate-800 transition active:scale-95 flex items-center justify-center cursor-pointer"
            title="Abrir menu lateral"
            aria-label="Menu principal"
          >
            <Menu className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>
      </header>

      {/* Floating Alert Banner for new OS and urgent document alerts */}
      <AlertBanner 
        onNavigateToOS={() => setActiveTab('os')} 
        onNavigateToFleet={() => setActiveTab('frotas')} 
      />

      {/* Pop-up Crítico e Alertas Visuais para o Gestor (< 7 dias) */}
      <CriticalExpirationsPopup
        onNavigateToNotifications={() => setActiveTab('notificacoes')}
        onNavigateToFleet={() => setActiveTab('frotas')}
      />

      {/* Menu Lateral Oculto nos Três Traços (Gaveta / Drawer) */}
      <Sidebar 
        isOpen={isMenuOpen}
        onClose={() => setIsMenuOpen(false)}
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onOpenNewOS={() => setIsNewOSModalOpen(true)}
        onOpenSupabase={() => setIsSupabaseModalOpen(true)}
      />

      {/* Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto custom-scrollbar bg-[#f8fafc]">
          {activeTab === 'dashboard' && (
            <DashboardView
              onNavigateToFleet={() => setActiveTab('frotas')}
              onNavigateToOS={handleNavigateToOS}
              onSelectOS={(os) => setSelectedOS(os)}
              onNavigateToNotifications={() => setActiveTab('notificacoes')}
              onOpenNewOS={() => setIsNewOSModalOpen(true)}
            />
          )}

          {activeTab === 'frotas' && (
            <FleetView
              onOpenNewVehicleModal={() => setIsNewVehicleModalOpen(true)}
              onOpenNewOSForVehicle={(vehicleId, lock) => {
                setPreselectedVehicleId(vehicleId);
                setLockVehicleSelection(!!lock);
                setIsNewOSModalOpen(true);
              }}
            />
          )}

          {activeTab === 'os' && (
            <ServiceOrdersView
              onOpenNewOS={() => setIsNewOSModalOpen(true)}
              onSelectOS={(os) => setSelectedOS(os)}
              initialCategory={osCategoryFilter}
            />
          )}

          {activeTab === 'usuarios' && isFullAccessUser && (
            <UsersView
              onOpenNewUserModal={() => setIsNewUserModalOpen(true)}
            />
          )}

          {activeTab === 'notificacoes' && isFullAccessUser && (
            <NotificationsView onNavigateToFleet={() => setActiveTab('frotas')} />
          )}

          {activeTab === 'relatorio' && isFullAccessUser && (
            <ReportView />
          )}
        </main>
      </div>

      {/* Global Modals */}
      <NewVehicleModal
        isOpen={isNewVehicleModalOpen}
        onClose={() => setIsNewVehicleModalOpen(false)}
      />

      <NewServiceOrderModal
        isOpen={isNewOSModalOpen}
        onClose={() => {
          setIsNewOSModalOpen(false);
          setPreselectedVehicleId(undefined);
          setLockVehicleSelection(false);
        }}
        preselectedVehicleId={preselectedVehicleId}
        lockVehicleSelection={lockVehicleSelection}
      />

      <NewUserModal
        isOpen={isNewUserModalOpen}
        onClose={() => setIsNewUserModalOpen(false)}
      />

      <VehicleDetailModal
        vehicle={currentSelectedVehicle}
        isOpen={!!selectedVehicle}
        onClose={() => setSelectedVehicle(null)}
        onOpenNewOSForVehicle={(vehicleId) => {
          setPreselectedVehicleId(vehicleId);
          setLockVehicleSelection(true);
          setIsNewOSModalOpen(true);
        }}
      />

      <ServiceOrderDetailModal
        os={currentSelectedOS}
        isOpen={!!selectedOS}
        onClose={() => setSelectedOS(null)}
      />

      <SupabaseSyncModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <FleetProvider>
      <MainApp />
    </FleetProvider>
  );
}
