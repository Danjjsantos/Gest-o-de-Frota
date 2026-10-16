import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import { 
  Vehicle, 
  VehicleAttachment,
  VehicleEquipment,
  ServiceOrder, 
  User, 
  UserRole,
  UserAtribuicao,
  NotificationSettings, 
  SystemNotification,
  DocumentType,
  OSCategory,
  OSPriority,
  OSAttachment,
  DirectedUserTarget
} from '../types';
import { 
  INITIAL_USERS, 
  INITIAL_VEHICLES, 
  INITIAL_SERVICE_ORDERS, 
  INITIAL_NOTIFICATIONS, 
  INITIAL_SETTINGS 
} from '../data/initialData';
import { getAutoDirectedUsers, AutoDirectedResult } from '../utils/osAssignment';
import { 
  playCriticalAlertSound, 
  playTestChime, 
  sendBrowserPushNotification 
} from '../utils/notificationAlerts';
import { 
  SupabaseService, 
  toFrontendVehicle, 
  toFrontendServiceOrder, 
  toFrontendUser 
} from '../services/supabaseService';
import { getSupabaseConfig } from '../services/supabaseClient';


interface ActiveAlertBanner {
  id: string;
  type: 'os_opened' | 'doc_warning' | 'info';
  title: string;
  message: string;
  code?: string;
  vehicleFleet?: string;
  category?: string;
}

interface FleetContextType {
  currentUser: User | null;
  isAuthenticated: boolean;
  login: (email: string, password?: string, skipPasswordCheck?: boolean) => { success: boolean; error?: string };
  logout: () => void;
  switchUser: (userId: string) => void;
  syncSupabaseNow: () => Promise<{ success: boolean; message: string }>;
  
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  addUser: (userData: Omit<User, 'id' | 'createdAt'>) => User;
  updateUser: (id: string, updates: Partial<User>) => void;
  deleteUser: (id: string) => void;

  vehicles: Vehicle[];
  setVehicles: React.Dispatch<React.SetStateAction<Vehicle[]>>;
  addVehicle: (vehicleData: Omit<Vehicle, 'id' | 'createdAt'>) => Vehicle;
  updateVehicle: (id: string, updates: Partial<Vehicle>) => void;
  deleteVehicle: (id: string) => void;
  deleteVehicleDocument: (vehicleId: string, docType: DocumentType) => void;
  updateVehicleDocument: (vehicleId: string, docType: DocumentType, expiryDate: string, number?: string) => void;
  updateVehicleDocumentWithFile: (
    vehicleId: string, 
    docType: DocumentType, 
    data: { 
      expiryDate: string; 
      number?: string; 
      fileUrl?: string; 
      fileName?: string; 
      fileType?: string; 
      fileSize?: number; 
      notes?: string; 
    }
  ) => void;
  addVehicleAttachment: (vehicleId: string, attachment: Omit<VehicleAttachment, 'id' | 'uploadedAt'>) => void;
  removeVehicleAttachment: (vehicleId: string, attachmentId: string) => void;
  addVehicleEquipment: (vehicleId: string, equipment: Omit<VehicleEquipment, 'id'>) => void;
  updateVehicleEquipment: (vehicleId: string, equipmentId: string, updates: Partial<VehicleEquipment>) => void;
  deleteVehicleEquipment: (vehicleId: string, equipmentId: string) => void;

  serviceOrders: ServiceOrder[];
  setServiceOrders: React.Dispatch<React.SetStateAction<ServiceOrder[]>>;
  openServiceOrder: (data: {
    vehicleId: string;
    title: string;
    description: string;
    category: OSCategory;
    priority: OSPriority;
    assignedToUserId?: string;
    images?: string[];
    attachments?: OSAttachment[];
  }) => ServiceOrder;
  updateServiceOrderStatus: (
    id: string, 
    status: ServiceOrder['status'], 
    notes?: string, 
    additionalImages?: string[],
    audit?: {
      executedByName?: string;
      executedByRole?: string;
      closedByName?: string;
      closedByRole?: string;
    }
  ) => void;
  deleteServiceOrder: (id: string) => void;

  notifications: SystemNotification[];
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  clearNotification: (id: string) => void;

  settings: NotificationSettings;
  updateSettings: (newSettings: Partial<NotificationSettings>) => void;

  activeBanner: ActiveAlertBanner | null;
  dismissBanner: () => void;

  // Computed stats
  stats: {
    totalVehicles: number;
    caminhaoCount: number;
    carretaCount: number;
    cavaloCount: number;
    openOsCount: number;
    totalOsCount: number;
    osByCategory: Record<OSCategory, number>;
    expiredDocsCount: number;
    expiringDocsCount: number;
    activeDocsCount: number;
    totalDocsCount: number;
    activeDocsByType: Record<DocumentType, number>;
  };
  
  // Document and Equipment Alert lists
  expiredDocumentsList: Array<{
    vehicle: Vehicle;
    docType: DocumentType | string;
    expiryDate: string;
    daysDiff: number;
    isEquipment?: boolean;
    equipmentId?: string;
    equipmentTag?: string;
    equipmentDescription?: string;
    certificateNumber?: string;
    company?: string;
  }>;
  expiringDocumentsList: Array<{
    vehicle: Vehicle;
    docType: DocumentType | string;
    expiryDate: string;
    daysRemaining: number;
    isEquipment?: boolean;
    equipmentId?: string;
    equipmentTag?: string;
    equipmentDescription?: string;
    certificateNumber?: string;
    company?: string;
  }>;

  verifyExpirationsNow: () => {
    totalAlerts: number;
    totalExpiring: number;
    totalExpired: number;
    docAlerts: number;
    equipmentAlerts: number;
    newAlertsCount: number;
  };

  // Auto-assignment helpers
  getRecommendedAssigneesForCategory: (category: OSCategory) => User[];
  getAutoDirectedUsersForCategory: (category: OSCategory) => AutoDirectedResult;

  // Alertas Críticos em Tempo Real (< 7 dias)
  criticalExpiringList: Array<{
    vehicle: Vehicle;
    docType: DocumentType | string;
    expiryDate: string;
    daysRemaining: number;
    isEquipment?: boolean;
    equipmentTag?: string;
    equipmentDescription?: string;
    isExpired?: boolean;
  }>;
  isCriticalPopupOpen: boolean;
  openCriticalPopup: () => void;
  closeCriticalPopup: () => void;
  testCriticalAlert: () => void;

  // Permissions
  canCloseOS: boolean;
  canUserCloseOS: (user?: User | null) => boolean;
}

const FleetContext = createContext<FleetContextType | undefined>(undefined);

const REFERENCE_DATE = new Date('2026-09-02T12:00:00Z'); // Fixed reference date from screenshots

export const getDaysDifference = (targetDateStr: string): number => {
  if (!targetDateStr) return 9999;
  const target = new Date(targetDateStr.includes('T') ? targetDateStr : `${targetDateStr}T12:00:00Z`);
  const diffMs = target.getTime() - REFERENCE_DATE.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
};

export const formatDisplayDate = (dateStr?: string): string => {
  if (!dateStr) return '';
  if (dateStr.includes('/')) return dateStr;
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

// Helper to purge deprecated "supervisor de pátio" or supervisor from user atribuicoes
const sanitizeUserAtribuicoes = (user: User): User => ({
  ...user,
  atribuicoes: (user.atribuicoes || []).filter(
    a => !String(a).toLowerCase().includes('supervisor') &&
         !String(a).toLowerCase().includes('pátio') &&
         !String(a).toLowerCase().includes('patio')
  ),
});

// Helper to ensure all Caminhão and Carreta vehicles have their cargo products and vacuum measurement defined
const enrichVehicleCargoProducts = (v: Vehicle): Vehicle => {
  if (v.type === 'Cavalo Mecânico') return v;
  let updated = { ...v };

  if (!updated.cargoProducts || updated.cargoProducts.length === 0) {
    if (updated.cargoProduct) {
      updated.cargoProducts = [updated.cargoProduct as any];
    } else {
      const isCO2 = v.fleetNumber === '0379' || v.fleetNumber === '0380' || v.fleetNumber === '0139' || v.fleetNumber === '1364' || v.fleetNumber === '0219' || v.fleetNumber === '0415';
      const assigned = isCO2 ? ['CO2'] : ['Gases do Ar (LO2, LN2, LAR)'];
      updated.cargoProducts = assigned as any;
      updated.cargoProduct = assigned.join(', ');
    }
  }

  // Se carrega Gases do Ar e ainda não possui vácuo medido no cache local ou tem data antiga
  if (
    updated.cargoProducts?.includes('Gases do Ar (LO2, LN2, LAR)') || updated.cargoProduct?.includes('Gases do Ar')
  ) {
    const init = INITIAL_VEHICLES.find(iv => iv.id === v.id || iv.fleetNumber === v.fleetNumber);
    if (init && init.vacuumValue && (updated.vacuumValue == null || updated.vacuumValue === '')) {
      updated.vacuumValue = init.vacuumValue;
      updated.vacuumDate = init.vacuumDate;
      updated.vacuumUnit = 'mtorr';
    }
    // Sincronizar data para o mês corrente de Outubro/2026 caso estivesse em mês anterior
    if (init && init.vacuumDate && updated.vacuumDate && !updated.vacuumDate.startsWith('2026-10')) {
      updated.vacuumDate = init.vacuumDate;
    }
  }

  return updated;
};

export const FleetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Initialize with localStorage persistence
  const [users, setUsers] = useState<User[]>(() => {
    const saved = localStorage.getItem('gestao_frotas_users');
    const rawList: User[] = saved ? JSON.parse(saved) : INITIAL_USERS;
    const sanitized = rawList.map(sanitizeUserAtribuicoes);
    if (saved) {
      localStorage.setItem('gestao_frotas_users', JSON.stringify(sanitized));
    }
    return sanitized;
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    // Ao acessar o Link, exigir autenticação. Só restaura se houver sessão ativa na aba atual.
    const isSessionAuth = sessionStorage.getItem('gestao_frotas_session_auth') === 'true';
    if (!isSessionAuth) return null;
    const savedId = sessionStorage.getItem('gestao_frotas_current_user_id') || localStorage.getItem('gestao_frotas_current_user_id');
    if (!savedId) return null;
    const found = INITIAL_USERS.find(u => u.id === savedId);
    return found ? sanitizeUserAtribuicoes(found) : null;
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    // Ao acessar o Link, solicitar login e senha de usuários, não acessar direto.
    return sessionStorage.getItem('gestao_frotas_session_auth') === 'true';
  });

  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    const saved = localStorage.getItem('gestao_frotas_vehicles');
    const rawList: Vehicle[] = saved ? JSON.parse(saved) : INITIAL_VEHICLES;
    return rawList.map(enrichVehicleCargoProducts);
  });

  const [serviceOrders, setServiceOrders] = useState<ServiceOrder[]>(() => {
    const saved = localStorage.getItem('gestao_frotas_os');
    const rawList: ServiceOrder[] = saved ? JSON.parse(saved) : INITIAL_SERVICE_ORDERS;
    return rawList.map(os => {
      if (!os.directedUserIds || os.directedUserIds.length === 0) {
        const auto = getAutoDirectedUsers(os.category, INITIAL_USERS);
        return {
          ...os,
          directedUsers: auto.directedTargets,
          directedUserIds: auto.allDirectedUsers.map(u => u.id),
          directedRoles: Array.from(new Set(auto.allDirectedUsers.map(u => u.role))),
        };
      }
      return os;
    });
  });

  const [notifications, setNotifications] = useState<SystemNotification[]>(() => {
    const saved = localStorage.getItem('gestao_frotas_notifications');
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });

  const [settings, setSettings] = useState<NotificationSettings>(() => {
    // Clear any residual WhatsApp data from browser storage
    try {
      localStorage.removeItem('gestao_frotas_whatsapp_logs');
      sessionStorage.removeItem('open_whatsapp_tab');
    } catch {}

    const saved = localStorage.getItem('gestao_frotas_settings');
    if (!saved) return INITIAL_SETTINGS;
    try {
      const parsed = JSON.parse(saved);
      if (parsed.whatsapp) {
        delete parsed.whatsapp;
        localStorage.setItem('gestao_frotas_settings', JSON.stringify(parsed));
      }
      return {
        ...INITIAL_SETTINGS,
        ...parsed,
        daysThreshold: (parsed.daysThreshold && parsed.daysThreshold !== 10) ? parsed.daysThreshold : 30,
        criticalDaysThreshold: parsed.criticalDaysThreshold ?? 7,
        soundAlertEnabled: parsed.soundAlertEnabled ?? true,
        popupAlertEnabled: parsed.popupAlertEnabled ?? true,
        browserPushEnabled: parsed.browserPushEnabled ?? true,
      };
    } catch {
      return INITIAL_SETTINGS;
    }
  });

  const [activeBanner, setActiveBanner] = useState<ActiveAlertBanner | null>(null);
  const [isCriticalPopupOpen, setIsCriticalPopupOpen] = useState<boolean>(false);
  const hasTriggeredAlertForSessionRef = useRef<string | null>(null);



  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem('gestao_frotas_users', JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem('gestao_frotas_vehicles', JSON.stringify(vehicles));
  }, [vehicles]);

  useEffect(() => {
    localStorage.setItem('gestao_frotas_os', JSON.stringify(serviceOrders));
  }, [serviceOrders]);

  useEffect(() => {
    localStorage.setItem('gestao_frotas_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('gestao_frotas_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('gestao_frotas_current_user_id', currentUser.id);
    }
  }, [currentUser]);

  // Automatic verification function for all documents (CRLV, CIV, CIPP, Tacógrafo)
  // and all equipments added to fleet with dates
  const checkAndGenerateExpirations = (
    currentVehicles: Vehicle[],
    thresholdDays: number
  ): { 
    autoNotifs: SystemNotification[]; 
    expiringCount: number; 
    expiredCount: number;
    docAlertsCount: number;
    equipmentAlertsCount: number;
  } => {
    const generated: SystemNotification[] = [];
    const nowStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const standardDocTypes: DocumentType[] = ['CRLV', 'CIV', 'CIPP', 'Tacógrafo'];
    let expiringCount = 0;
    let expiredCount = 0;
    let docAlertsCount = 0;
    let equipmentAlertsCount = 0;

    currentVehicles.forEach(vehicle => {
      // 1. Vehicle Documents (CRLV, CIV, CIPP, Tacógrafo)
      standardDocTypes.forEach(dtype => {
        const doc = vehicle.documents[dtype];
        if (doc && doc.expiryDate) {
          const diffDays = getDaysDifference(doc.expiryDate);
          const formattedExp = formatDisplayDate(doc.expiryDate);

          if (diffDays < 0) {
            expiredCount++;
            docAlertsCount++;
            generated.push({
              id: `notif-auto-doc-${vehicle.id}-${dtype}`,
              type: 'doc_expired',
              title: `🚨 Documento Vencido: ${dtype} - Frota ${vehicle.fleetNumber}`,
              message: `Frota ${vehicle.fleetNumber} (${vehicle.plate}/${vehicle.uf}) - O documento ${dtype} está vencido há ${Math.abs(diffDays)} dia(s) (vencido em ${formattedExp}). Regularização imediata obrigatória.`,
              vehicleId: vehicle.id,
              fleetNumber: vehicle.fleetNumber,
              plate: `${vehicle.plate}/${vehicle.uf}`,
              docType: dtype,
              daysDiff: Math.abs(diffDays),
              timestamp: `Hoje às ${nowStr}`,
              read: false,
            });
          } else if (diffDays <= thresholdDays) {
            expiringCount++;
            docAlertsCount++;
            generated.push({
              id: `notif-auto-doc-${vehicle.id}-${dtype}`,
              type: 'doc_expiring',
              title: `⚠️ Documento Vencendo: ${dtype} - Frota ${vehicle.fleetNumber}`,
              message: `Frota ${vehicle.fleetNumber} (${vehicle.plate}/${vehicle.uf}) - O documento ${dtype} vence em ${diffDays} dia(s) (${formattedExp}). Providencie a renovação.`,
              vehicleId: vehicle.id,
              fleetNumber: vehicle.fleetNumber,
              plate: `${vehicle.plate}/${vehicle.uf}`,
              docType: dtype,
              daysRemaining: diffDays,
              timestamp: `Hoje às ${nowStr}`,
              read: false,
            });
          }
        }
      });

      // 2. All Equipments added to fleet with dates (nextCalibrationDate or calibrationDate)
      (vehicle.equipments || []).forEach(eq => {
        const eqDate = eq.nextCalibrationDate || eq.calibrationDate;
        if (eqDate) {
          const diffDays = getDaysDifference(eqDate);
          const formattedExp = formatDisplayDate(eqDate);
          const eqName = eq.description || 'Equipamento';
          const tagInfo = eq.tag ? ` (${eq.tag})` : '';

          if (diffDays < 0) {
            expiredCount++;
            equipmentAlertsCount++;
            generated.push({
              id: `notif-auto-eq-${vehicle.id}-${eq.id}`,
              type: 'equipment_expired',
              title: `🚨 Calibração Vencida: ${eqName}${tagInfo} - Frota ${vehicle.fleetNumber}`,
              message: `Frota ${vehicle.fleetNumber} (${vehicle.plate}/${vehicle.uf}) - Equipamento ${eqName}${tagInfo} está com calibração vencida há ${Math.abs(diffDays)} dia(s) (venceu em ${formattedExp}). Certificado: ${eq.certificateNumber || 'N/A'}.`,
              vehicleId: vehicle.id,
              fleetNumber: vehicle.fleetNumber,
              plate: `${vehicle.plate}/${vehicle.uf}`,
              docType: eq.tag || eqName,
              equipmentDescription: eqName,
              equipmentTag: eq.tag,
              daysDiff: Math.abs(diffDays),
              timestamp: `Hoje às ${nowStr}`,
              read: false,
            });
          } else if (diffDays <= thresholdDays) {
            expiringCount++;
            equipmentAlertsCount++;
            generated.push({
              id: `notif-auto-eq-${vehicle.id}-${eq.id}`,
              type: 'equipment_expiring',
              title: `⚠️ Calibração Vencendo: ${eqName}${tagInfo} - Frota ${vehicle.fleetNumber}`,
              message: `Frota ${vehicle.fleetNumber} (${vehicle.plate}/${vehicle.uf}) - Equipamento ${eqName}${tagInfo} vence em ${diffDays} dia(s) (${formattedExp}). Agende calibração antes do vencimento. Certificado: ${eq.certificateNumber || 'N/A'}.`,
              vehicleId: vehicle.id,
              fleetNumber: vehicle.fleetNumber,
              plate: `${vehicle.plate}/${vehicle.uf}`,
              docType: eq.tag || eqName,
              equipmentDescription: eqName,
              equipmentTag: eq.tag,
              daysRemaining: diffDays,
              timestamp: `Hoje às ${nowStr}`,
              read: false,
            });
          }
        }
      });

      // 3. Any attachments with explicit expiration dates (e.g. Laudos)
      (vehicle.attachments || []).forEach(att => {
        if (att.expiryDate) {
          const diffDays = getDaysDifference(att.expiryDate);
          const formattedExp = formatDisplayDate(att.expiryDate);
          const attName = att.name || att.category || 'Anexo Técnico';

          if (diffDays < 0) {
            expiredCount++;
            docAlertsCount++;
            generated.push({
              id: `notif-auto-att-${vehicle.id}-${att.id}`,
              type: 'doc_expired',
              title: `🚨 Anexo/Laudo Vencido: ${attName} - Frota ${vehicle.fleetNumber}`,
              message: `Frota ${vehicle.fleetNumber} (${vehicle.plate}/${vehicle.uf}) - O anexo ${attName} está vencido há ${Math.abs(diffDays)} dia(s) (vencido em ${formattedExp}).`,
              vehicleId: vehicle.id,
              fleetNumber: vehicle.fleetNumber,
              plate: `${vehicle.plate}/${vehicle.uf}`,
              docType: att.category || 'Laudo',
              daysDiff: Math.abs(diffDays),
              timestamp: `Hoje às ${nowStr}`,
              read: false,
            });
          } else if (diffDays <= thresholdDays) {
            expiringCount++;
            docAlertsCount++;
            generated.push({
              id: `notif-auto-att-${vehicle.id}-${att.id}`,
              type: 'doc_expiring',
              title: `⚠️ Anexo/Laudo Vencendo: ${attName} - Frota ${vehicle.fleetNumber}`,
              message: `Frota ${vehicle.fleetNumber} (${vehicle.plate}/${vehicle.uf}) - O anexo ${attName} vence em ${diffDays} dia(s) (${formattedExp}).`,
              vehicleId: vehicle.id,
              fleetNumber: vehicle.fleetNumber,
              plate: `${vehicle.plate}/${vehicle.uf}`,
              docType: att.category || 'Laudo',
              daysRemaining: diffDays,
              timestamp: `Hoje às ${nowStr}`,
              read: false,
            });
          }
        }
      });
    });

    return { 
      autoNotifs: generated, 
      expiringCount, 
      expiredCount,
      docAlertsCount,
      equipmentAlertsCount 
    };
  };

  // Sync automatic expiration notifications on vehicle updates or threshold change
  useEffect(() => {
    const { autoNotifs } = checkAndGenerateExpirations(vehicles, settings.daysThreshold);

    setNotifications(prev => {
      // Keep non-auto notifications (like OS events)
      const nonAutoNotifs = prev.filter(n => !n.id.startsWith('notif-auto-'));
      const prevAutoMap = new Map(prev.filter(n => n.id.startsWith('notif-auto-')).map(n => [n.id, n]));

      // Merge new auto notifications, preserving read state if previously marked read
      const mergedAuto = autoNotifs.map(an => {
        const existing = prevAutoMap.get(an.id);
        return existing ? { ...an, read: existing.read } : an;
      });

      return [...mergedAuto, ...nonAutoNotifs];
    });
  }, [vehicles, settings.daysThreshold]);

  // Sincronização Bidirecional com o Supabase (Tempo Real via WebSockets + Heartbeat)
  useEffect(() => {
    const config = getSupabaseConfig();
    if (!config.isConfigured) return;

    let isMounted = true;

    const syncFromRemote = async (isInitial = false) => {
      try {
        const remote = await SupabaseService.fetchAll();
        if (!isMounted) return;

        // Se o Supabase já tem veículos, sincroniza o estado da aplicação
        if (remote.vehicles.length > 0) {
          const enriched = remote.vehicles.map(enrichVehicleCargoProducts);
          setVehicles(enriched);
        } else if (isInitial && vehicles.length > 0) {
          // Se o banco estiver vazio na primeira execução, popula com os dados atuais
          SupabaseService.pushAll(vehicles, serviceOrders, users, notifications).catch(err => {
            console.debug('Background Supabase seed notice:', err?.message);
          });
        }

        if (remote.serviceOrders.length > 0) {
          setServiceOrders(remote.serviceOrders);
        }
        if (remote.users.length > 0) {
          const sanitizedUsers = remote.users.map(sanitizeUserAtribuicoes);
          setUsers(sanitizedUsers);
        }
      } catch (err: any) {
        console.debug('Supabase sync notice:', err?.message);
      }
    };

    // 1. Carga inicial
    syncFromRemote(true);

    // 2. Inscrição em Tempo Real (Supabase Realtime WebSockets)
    const unsubscribe = SupabaseService.subscribeToChanges({
      onVehicleChange: (event, payload) => {
        if (!isMounted) return;
        if ((event === 'INSERT' || event === 'UPDATE') && payload.new) {
          const veh = enrichVehicleCargoProducts(toFrontendVehicle(payload.new));
          setVehicles(prev => {
            const exists = prev.some(v => v.id === veh.id);
            if (exists) {
              return prev.map(v => v.id === veh.id ? veh : v);
            }
            return [veh, ...prev];
          });
        } else if (event === 'DELETE' && payload.old) {
          setVehicles(prev => prev.filter(v => v.id !== payload.old.id));
        }
      },
      onServiceOrderChange: (event, payload) => {
        if (!isMounted) return;
        if ((event === 'INSERT' || event === 'UPDATE') && payload.new) {
          const so = toFrontendServiceOrder(payload.new);
          setServiceOrders(prev => {
            const exists = prev.some(o => o.id === so.id);
            if (exists) {
              return prev.map(o => o.id === so.id ? so : o);
            }
            return [so, ...prev];
          });
        } else if (event === 'DELETE' && payload.old) {
          setServiceOrders(prev => prev.filter(o => o.id !== payload.old.id));
        }
      },
      onUserChange: (event, payload) => {
        if (!isMounted) return;
        if ((event === 'INSERT' || event === 'UPDATE') && payload.new) {
          const u = sanitizeUserAtribuicoes(toFrontendUser(payload.new));
          setUsers(prev => {
            const exists = prev.some(user => user.id === u.id);
            if (exists) {
              return prev.map(user => user.id === u.id ? u : user);
            }
            return [u, ...prev];
          });
        } else if (event === 'DELETE' && payload.old) {
          setUsers(prev => prev.filter(user => user.id !== payload.old.id));
        }
      }
    });

    // 3. Heartbeat periódico a cada 20 segundos e ao focar a aba
    const interval = setInterval(() => syncFromRemote(false), 20000);
    const handleFocus = () => syncFromRemote(false);
    window.addEventListener('focus', handleFocus);

    return () => {
      isMounted = false;
      unsubscribe();
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const syncSupabaseNow = async (): Promise<{ success: boolean; message: string }> => {
    try {
      const remote = await SupabaseService.fetchAll();
      if (remote.vehicles.length > 0) {
        setVehicles(remote.vehicles.map(enrichVehicleCargoProducts));
      }
      if (remote.serviceOrders.length > 0) {
        setServiceOrders(remote.serviceOrders);
      }
      if (remote.users.length > 0) {
        setUsers(remote.users.map(sanitizeUserAtribuicoes));
      }
      return {
        success: true,
        message: `Sincronizado com sucesso! (${remote.vehicles.length} veículos, ${remote.serviceOrders.length} OSs, ${remote.users.length} usuários)`
      };
    } catch (err: any) {
      return {
        success: false,
        message: err?.message || 'Erro ao sincronizar com o Supabase'
      };
    }
  };

  const login = (identifier: string, password?: string, skipPasswordCheck = false): { success: boolean; error?: string } => {
    const cleanId = (identifier || '').trim().toLowerCase();
    if (!cleanId) {
      return { success: false, error: 'Por favor, informe seu e-mail ou nome de usuário.' };
    }

    const cleanPass = (password || '').trim();
    if (!skipPasswordCheck && !cleanPass) {
      return { success: false, error: 'Por favor, digite sua senha de acesso.' };
    }

    const user = users.find(u => 
      u.email.toLowerCase().trim() === cleanId || 
      u.name.toLowerCase().trim() === cleanId
    );

    if (!user) {
      return { success: false, error: 'Usuário não encontrado. Verifique o e-mail ou nome digitado.' };
    }

    if (!skipPasswordCheck) {
      // Se o usuário possui senha gravada
      if (user.password && user.password.trim() !== '') {
        if (user.password.trim() !== cleanPass) {
          return { success: false, error: 'Senha incorreta. Tente novamente ou use "Esqueceu a senha?".' };
        }
      } else {
        // Se ainda não tiver senha cadastrada no banco, aceita a senha digitada (mínimo 4 caracteres)
        if (cleanPass.length < 4) {
          return { success: false, error: 'A senha de acesso deve ter pelo menos 4 caracteres.' };
        }
        const updatedUser = { ...user, password: cleanPass };
        updateUser(user.id, { password: cleanPass });
        SupabaseService.upsertUser(updatedUser).catch(err => {
          console.debug('Aviso ao registrar senha inicial no Supabase:', err);
        });
      }
    }

    setCurrentUser(user);
    setIsAuthenticated(true);
    sessionStorage.setItem('gestao_frotas_session_auth', 'true');
    sessionStorage.setItem('gestao_frotas_current_user_id', user.id);
    localStorage.setItem('gestao_frotas_current_user_id', user.id);
    return { success: true };
  };

  const logout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
    sessionStorage.removeItem('gestao_frotas_session_auth');
    sessionStorage.removeItem('gestao_frotas_current_user_id');
    localStorage.removeItem('gestao_frotas_auth');
    localStorage.removeItem('gestao_frotas_current_user_id');
    hasTriggeredAlertForSessionRef.current = null;
    setIsCriticalPopupOpen(false);
  };

  const switchUser = (userId: string) => {
    const found = users.find(u => u.id === userId);
    if (found) {
      setCurrentUser(found);
    }
  };

  const addUser = (userData: Omit<User, 'id' | 'createdAt'>): User => {
    const sanitized = sanitizeUserAtribuicoes({
      ...userData,
      id: `user-${Date.now()}`,
      createdAt: new Date().toLocaleDateString('pt-BR'),
      avatarColor: userData.role === 'Administrador' ? '#f97316' : 
                   userData.role === 'Gerente' ? '#10b981' :
                   userData.role === 'Encarregado' ? '#3b82f6' :
                   userData.role === 'Borracheiro' ? '#f59e0b' :
                   userData.role === 'Téc. Eletrica' ? '#eab308' :
                   userData.role === 'Téc. Driox' ? '#8b5cf6' :
                   userData.role === 'Mecânico' ? '#6366f1' :
                   userData.role === 'Monitor' ? '#06b6d4' : '#64748b'
    });
    setUsers(prev => [sanitized, ...prev]);
    SupabaseService.upsertUser(sanitized).catch(err => {
      console.debug('Supabase add user notice:', err?.message);
    });
    return sanitized;
  };

  const updateUser = (id: string, updates: Partial<User>) => {
    setUsers(prev => {
      const updated = prev.map(u => {
        if (u.id !== id) return u;
        return sanitizeUserAtribuicoes({ ...u, ...updates });
      });
      const target = updated.find(u => u.id === id);
      if (target) {
        SupabaseService.upsertUser(target).catch(err => {
          console.debug('Supabase update user notice:', err?.message);
        });
      }
      return updated;
    });
    if (currentUser && currentUser.id === id) {
      setCurrentUser(prev => prev ? sanitizeUserAtribuicoes({ ...prev, ...updates }) : null);
    }
  };

  const deleteUser = (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
    SupabaseService.deleteUser(id).catch(err => {
      console.debug('Supabase delete user notice:', err?.message);
    });
  };

  const addVehicle = (vehicleData: Omit<Vehicle, 'id' | 'createdAt'>): Vehicle => {
    const newVehicle: Vehicle = {
      ...vehicleData,
      id: `veh-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setVehicles(prev => [newVehicle, ...prev]);
    SupabaseService.upsertVehicle(newVehicle).catch(err => {
      console.debug('Supabase add vehicle background notice:', err?.message);
    });
    return newVehicle;
  };

  const updateVehicle = (id: string, updates: Partial<Vehicle>) => {
    setVehicles(prev => {
      const updated = prev.map(v => v.id === id ? { ...v, ...updates } : v);
      const target = updated.find(v => v.id === id);
      if (target) {
        SupabaseService.upsertVehicle(target).catch(err => {
          console.debug('Supabase update vehicle background notice:', err?.message);
        });
      }
      return updated;
    });
  };

  const deleteVehicle = (id: string) => {
    setVehicles(prev => prev.filter(v => v.id !== id));
    SupabaseService.deleteVehicle(id).catch(err => {
      console.debug('Supabase delete vehicle background notice:', err?.message);
    });
  };

  const syncVehicleToSupabase = (vehicleId: string, updatedVehiclesList: Vehicle[]) => {
    const target = updatedVehiclesList.find(v => v.id === vehicleId);
    if (target) {
      SupabaseService.upsertVehicle(target).catch(err => {
        console.debug('Supabase sync vehicle notice:', err?.message);
      });
    }
  };

  const updateVehicleDocument = (vehicleId: string, docType: DocumentType, expiryDate: string, number?: string) => {
    setVehicles(prev => {
      const updated = prev.map(v => {
        if (v.id !== vehicleId) return v;
        const targetDate = new Date(expiryDate);
        const diffDays = Math.ceil((targetDate.getTime() - REFERENCE_DATE.getTime()) / (1000 * 60 * 60 * 24));
        
        let status: 'valid' | 'expiring' | 'expired' = 'valid';
        if (diffDays < 0) {
          status = 'expired';
        } else if (diffDays <= settings.daysThreshold) {
          status = 'expiring';
        }

        const updatedDocs = {
          ...v.documents,
          [docType]: {
            type: docType,
            expiryDate,
            number: number || v.documents[docType]?.number,
            status,
          }
        };
        return { ...v, documents: updatedDocs };
      });
      syncVehicleToSupabase(vehicleId, updated);
      return updated;
    });
  };

  const updateVehicleDocumentWithFile = (
    vehicleId: string, 
    docType: DocumentType, 
    data: { 
      expiryDate: string; 
      number?: string; 
      fileUrl?: string; 
      fileName?: string; 
      fileType?: string; 
      fileSize?: number; 
      notes?: string; 
    }
  ) => {
    setVehicles(prev => {
      const updated = prev.map(v => {
        if (v.id !== vehicleId) return v;
        const targetDate = new Date(data.expiryDate);
        const diffDays = Math.ceil((targetDate.getTime() - REFERENCE_DATE.getTime()) / (1000 * 60 * 60 * 24));
        
        let status: 'valid' | 'expiring' | 'expired' = 'valid';
        if (diffDays < 0) {
          status = 'expired';
        } else if (diffDays <= settings.daysThreshold) {
          status = 'expiring';
        }

        const existingDoc = v.documents[docType];
        const updatedDocs = {
          ...v.documents,
          [docType]: {
            type: docType,
            expiryDate: data.expiryDate,
            number: data.number || existingDoc?.number,
            notes: data.notes || existingDoc?.notes,
            fileUrl: data.fileUrl || existingDoc?.fileUrl,
            fileName: data.fileName || existingDoc?.fileName,
            fileType: data.fileType || existingDoc?.fileType,
            fileSize: data.fileSize || existingDoc?.fileSize,
            uploadedAt: data.fileUrl ? new Date().toLocaleDateString('pt-BR') : existingDoc?.uploadedAt,
            status,
          }
        };

        // Also create/update an attachment entry if file was uploaded
        let updatedAttachments = v.attachments ? [...v.attachments] : [];
        if (data.fileUrl && data.fileName) {
          const newAttachment: VehicleAttachment = {
            id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            name: data.fileName,
            dataUrl: data.fileUrl,
            fileType: data.fileType || 'application/pdf',
            fileSize: data.fileSize || 0,
            category: docType,
            number: data.number,
            expiryDate: data.expiryDate,
            notes: data.notes,
            uploadedAt: new Date().toLocaleDateString('pt-BR'),
            uploadedBy: currentUser ? `${currentUser.name} (${currentUser.role})` : 'Administrador',
          };
          updatedAttachments = [newAttachment, ...updatedAttachments];
        }

        return { ...v, documents: updatedDocs, attachments: updatedAttachments };
      });
      syncVehicleToSupabase(vehicleId, updated);
      return updated;
    });
  };

  const addVehicleAttachment = (vehicleId: string, attachment: Omit<VehicleAttachment, 'id' | 'uploadedAt'>) => {
    setVehicles(prev => {
      const updated = prev.map(v => {
        if (v.id !== vehicleId) return v;
        const newAtt: VehicleAttachment = {
          ...attachment,
          id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          uploadedAt: new Date().toLocaleDateString('pt-BR'),
          uploadedBy: attachment.uploadedBy || (currentUser ? `${currentUser.name} (${currentUser.role})` : 'Administrador'),
        };
        const existing = v.attachments || [];
        return {
          ...v,
          attachments: [newAtt, ...existing],
        };
      });
      syncVehicleToSupabase(vehicleId, updated);
      return updated;
    });
  };

  const removeVehicleAttachment = (vehicleId: string, attachmentId: string) => {
    setVehicles(prev => {
      const updated = prev.map(v => {
        if (v.id !== vehicleId) return v;
        return {
          ...v,
          attachments: (v.attachments || []).filter(a => a.id !== attachmentId),
        };
      });
      syncVehicleToSupabase(vehicleId, updated);
      return updated;
    });
  };

  const deleteVehicleDocument = (vehicleId: string, docType: DocumentType) => {
    setVehicles(prev => {
      const updated = prev.map(v => {
        if (v.id !== vehicleId) return v;
        const updatedDocs = {
          ...v.documents,
          [docType]: null,
        };
        // Also remove any attachments matching this docType
        const updatedAttachments = (v.attachments || []).filter(a => a.category !== docType);
        return {
          ...v,
          documents: updatedDocs,
          attachments: updatedAttachments,
        };
      });
      syncVehicleToSupabase(vehicleId, updated);
      return updated;
    });
  };

  const calculateEquipmentStatus = (nextCalibrationDate?: string): 'valid' | 'expiring' | 'expired' => {
    if (!nextCalibrationDate) return 'valid';
    const diffDays = getDaysDifference(nextCalibrationDate);
    if (diffDays < 0) return 'expired';
    if (diffDays <= settings.daysThreshold) return 'expiring';
    return 'valid';
  };

  const addVehicleEquipment = (vehicleId: string, equipment: Omit<VehicleEquipment, 'id'>) => {
    setVehicles(prev => {
      const updated = prev.map(v => {
        if (v.id !== vehicleId) return v;
        const effectiveDate = equipment.nextCalibrationDate || equipment.calibrationDate;
        const status = calculateEquipmentStatus(effectiveDate);
        const newEq: VehicleEquipment = {
          ...equipment,
          id: `eq-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          status: equipment.status || status,
          uploadedAt: equipment.fileUrl ? (equipment.uploadedAt || new Date().toLocaleDateString('pt-BR')) : undefined,
          uploadedBy: equipment.uploadedBy || (currentUser ? `${currentUser.name} (${currentUser.role})` : 'Administrador'),
        };

        if (status === 'expired' || status === 'expiring') {
          const diffDays = Math.abs(getDaysDifference(effectiveDate));
          setActiveBanner({
            id: `alert-eq-${Date.now()}`,
            type: 'doc_warning',
            title: status === 'expired' ? `🚨 Calibração Vencida!` : `⚠️ Calibração Vencendo em ${diffDays}d!`,
            message: `Equipamento "${equipment.description}" (${equipment.tag || 'S/TAG'}) na Frota ${v.fleetNumber} está ${status === 'expired' ? 'com calibração vencida' : `vencendo em ${diffDays} dia(s)`}. Alerta registrado no sistema.`,
            code: equipment.tag || 'EQUIPAMENTO',
            vehicleFleet: v.fleetNumber,
          });
        }

        const existing = v.equipments || [];
        return {
          ...v,
          equipments: [newEq, ...existing],
        };
      });
      syncVehicleToSupabase(vehicleId, updated);
      return updated;
    });
  };

  const updateVehicleEquipment = (vehicleId: string, equipmentId: string, updates: Partial<VehicleEquipment>) => {
    setVehicles(prev => {
      const updated = prev.map(v => {
        if (v.id !== vehicleId) return v;
        const existing = v.equipments || [];
        const updatedEquipments = existing.map(eq => {
          if (eq.id !== equipmentId) return eq;
          const merged = { ...eq, ...updates };
          const effectiveDate = updates.nextCalibrationDate || merged.nextCalibrationDate || updates.calibrationDate || merged.calibrationDate;
          if (effectiveDate) {
            merged.status = calculateEquipmentStatus(effectiveDate);
          }
          return merged;
        });
        return {
          ...v,
          equipments: updatedEquipments,
        };
      });
      syncVehicleToSupabase(vehicleId, updated);
      return updated;
    });
  };

  const deleteVehicleEquipment = (vehicleId: string, equipmentId: string) => {
    setVehicles(prev => {
      const updated = prev.map(v => {
        if (v.id !== vehicleId) return v;
        return {
          ...v,
          equipments: (v.equipments || []).filter(e => e.id !== equipmentId),
        };
      });
      syncVehicleToSupabase(vehicleId, updated);
      return updated;
    });
  };

  const CAN_CLOSE_OS_ROLES: UserRole[] = [
    'Motorista',
    'Administrador',
    'Gerente',
    'Encarregado',
    'Monitor'
  ];

  const canUserCloseOS = (user?: User | null): boolean => {
    if (!user) return true;
    return CAN_CLOSE_OS_ROLES.includes(user.role);
  };

  const canCloseOS = canUserCloseOS(currentUser);

  // Auto assignment helper: finds users registered for this specific category (via atribuições)
  const getRecommendedAssigneesForCategory = (category: OSCategory): User[] => {
    // 1. Direct match: users registered specifically with this category in their atribuições
    const registered = users.filter(u => {
      if (!u.atribuicoes) return false;
      if (u.atribuicoes.includes(category as UserAtribuicao)) return true;
      if ((category === 'Seva/Sacar' || (category as string) === 'Seva/Sascar') &&
          (u.atribuicoes.includes('Seva/Sacar') || (u.atribuicoes as string[]).includes('Seva/Sascar'))) {
        return true;
      }
      return false;
    });
    if (registered.length > 0) {
      return registered;
    }
    // 2. Fallback: if no user has been registered yet with this category, suggest technical staff
    return users.filter(u => 
      u.role === 'Mecânico' || 
      u.role === 'Borracheiro' || 
      u.role === 'Téc. Eletrica' || 
      u.role === 'Téc. Driox' || 
      u.role === 'Monitor' || 
      u.role === 'Encarregado' || 
      u.role === 'Administrador'
    );
  };

  // Auto-direction helper: automatically routes OS to the registered responsible technical function and to leadership
  const getAutoDirectedUsersForCategory = (category: OSCategory): AutoDirectedResult => {
    return getAutoDirectedUsers(category, users);
  };

  // Open a new service order with automatic alert dispatch
  const openServiceOrder = (data: {
    vehicleId: string;
    title: string;
    description: string;
    category: OSCategory;
    priority: OSPriority;
    assignedToUserId?: string;
    images?: string[];
    attachments?: OSAttachment[];
  }): ServiceOrder => {
    const vehicle = vehicles.find(v => v.id === data.vehicleId);
    if (!vehicle) throw new Error('Veículo não encontrado');

    const existingNumbers = serviceOrders
      .map(os => {
        const match = os.code.match(/\d+/);
        return match ? parseInt(match[0], 10) : 0;
      })
      .filter(n => !isNaN(n));
    const maxNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    const nextNumber = Math.max(maxNum + 1, 1);
    const formattedCode = `OS-${String(nextNumber).padStart(5, '0')}`;

    // Compute automatic routing based on category
    const autoRouting = getAutoDirectedUsers(data.category, users);

    let assignedUser: User | undefined;
    if (data.assignedToUserId) {
      assignedUser = users.find(u => u.id === data.assignedToUserId);
    } 
    
    // Auto-direct to the user registered for this category if not explicitly chosen
    if (!assignedUser) {
      assignedUser = autoRouting.primaryAssignee;
    }

    const directedUserIds = Array.from(new Set(autoRouting.allDirectedUsers.map(u => u.id)));
    const directedRoles = Array.from(new Set(autoRouting.allDirectedUsers.map(u => u.role)));

    const newOS: ServiceOrder = {
      id: `os-${Date.now()}`,
      code: formattedCode,
      title: data.title,
      description: data.description,
      vehicleId: vehicle.id,
      fleetNumber: vehicle.fleetNumber,
      plate: vehicle.plate,
      uf: vehicle.uf,
      category: data.category,
      priority: data.priority,
      status: 'Aberta',
      openedByUserId: currentUser?.id || 'admin',
      openedByName: currentUser?.name || 'Administrador',
      openedByRole: currentUser?.role || 'Administrador',
      assignedToUserId: assignedUser?.id,
      assignedToName: assignedUser?.name,
      assignedRole: assignedUser ? `${assignedUser.role} ${assignedUser.atribuicoes?.[0] || ''}`.trim() : undefined,
      directedUsers: autoRouting.directedTargets,
      directedUserIds,
      directedRoles,
      createdAt: new Date().toLocaleDateString('pt-BR'),
      images: data.images || [],
      attachments: data.attachments || [],
    };

    setServiceOrders(prev => [newOS, ...prev]);

    // Format human-readable directed summary
    const respNames = autoRouting.responsibleUsers.length > 0 
      ? autoRouting.responsibleUsers.map(u => `${u.name} (${u.role})`).join(', ')
      : `${autoRouting.responsibleRoleLabel}`;

    const leadRoles = Array.from(new Set(autoRouting.leadershipUsers.map(u => u.role))).join(', ');
    const directedSummary = `Direcionada automaticamente para a função responsável (${respNames}) e para as lideranças (${leadRoles || 'Gerente, Encarregado, Monitor, Administrador'}).`;

    // Create system notification for OS opening
    const hasPhotos = (data.images && data.images.length > 0);
    const newNotif: SystemNotification = {
      id: `notif-${Date.now()}`,
      type: 'os_opened',
      title: `Nova OS Aberta: ${newOS.code} - ${newOS.title}`,
      message: `Frota ${newOS.fleetNumber} (${newOS.plate}/${newOS.uf}) · Categoria: ${newOS.category} · Prioridade: ${newOS.priority}.${hasPhotos ? ` (${data.images?.length} foto(s) anexada(s))` : ''} ${directedSummary}`,
      fleetNumber: newOS.fleetNumber,
      plate: `${newOS.plate}/${newOS.uf}`,
      osCode: newOS.code,
      timestamp: 'Agora mesmo',
      read: false,
    };

    setNotifications(prev => [newNotif, ...prev]);

    // Trigger visual pop-up alert banner
    setActiveBanner({
      id: `alert-${Date.now()}`,
      type: 'os_opened',
      title: `🚨 ALERTA: ${newOS.code} Aberta!`,
      message: `Veículo ${newOS.fleetNumber} (${newOS.plate}/${newOS.uf}) · Categoria: ${newOS.category}.${hasPhotos ? ` Com fotos anexadas.` : ''} ${directedSummary}`,
      code: newOS.code,
      vehicleFleet: newOS.fleetNumber,
      category: newOS.category,
    });

    SupabaseService.upsertServiceOrder(newOS, vehicle).catch(err => {
      console.debug('Supabase open OS notice:', err?.message);
    });

    return newOS;
  };

  const updateServiceOrderStatus = (
    id: string, 
    status: ServiceOrder['status'], 
    notes?: string,
    additionalImages?: string[],
    audit?: {
      executedByName?: string;
      executedByRole?: string;
      closedByName?: string;
      closedByRole?: string;
    }
  ) => {
    // If the service order is already closed, strictly disallow any modification (read-only)
    const targetOS = serviceOrders.find(os => os.id === id);
    if (targetOS && targetOS.status === 'Encerrada') {
      throw new Error('Esta ordem de serviço já foi encerrada e está bloqueada para qualquer atualização de informações (apenas visualização permitida).');
    }

    // Only motorista, administrador, gerente, encarregado, monitor can close ("encerrar")
    if (status === 'Encerrada' && currentUser && !canUserCloseOS(currentUser)) {
      throw new Error('Apenas motorista, administrador, gerente, encarregado e monitor podem encerrar ordens de serviço. Técnicos só podem colocar Em andamento ou marcar como Resolvida.');
    }

    setServiceOrders(prev => {
      const todayStr = new Date().toLocaleDateString('pt-BR');
      const isResolved = status === 'Resolvida' || status === 'Encerrada';

      const updatedList = prev.map(os => {
        if (os.id !== id) return os;

        // Executor de fato: preenchido quando status vai para Resolvida (ou quando diretamente Encerrada)
        let executedByUserId = os.executedByUserId;
        let executedByName = audit?.executedByName || os.executedByName;
        let executedByRole = audit?.executedByRole || os.executedByRole;
        let executedAt = os.executedAt;

        if (status === 'Resolvida') {
          executedByUserId = currentUser?.id || os.assignedToUserId;
          executedByName = audit?.executedByName || currentUser?.name || os.assignedToName;
          executedByRole = audit?.executedByRole || currentUser?.role || os.assignedRole;
          executedAt = todayStr;
        } else if (status === 'Encerrada' && !executedByName) {
          executedByUserId = os.assignedToUserId || currentUser?.id;
          executedByName = audit?.executedByName || os.assignedToName || currentUser?.name;
          executedByRole = audit?.executedByRole || os.assignedRole || currentUser?.role;
          executedAt = os.executedAt || todayStr;
        }

        // Encerrou a ordem após constatar: preenchido quando status vai para Encerrada
        let closedByUserId = os.closedByUserId;
        let closedByName = audit?.closedByName || os.closedByName;
        let closedByRole = audit?.closedByRole || os.closedByRole;
        let closedAt = os.closedAt;

        if (status === 'Encerrada') {
          closedByUserId = currentUser?.id;
          closedByName = audit?.closedByName || currentUser?.name;
          closedByRole = audit?.closedByRole || currentUser?.role;
          closedAt = todayStr;
        }

        const mergedImages = additionalImages && additionalImages.length > 0
          ? [...(os.images || []), ...additionalImages]
          : os.images;

        return {
          ...os,
          status,
          resolutionNotes: notes !== undefined ? notes : os.resolutionNotes,
          resolvedAt: isResolved ? (os.resolvedAt || todayStr) : undefined,
          executedByUserId,
          executedByName,
          executedByRole,
          executedAt,
          closedByUserId,
          closedByName,
          closedByRole,
          closedAt,
          images: mergedImages,
        };
      });

      // Sincronizar imediatamente com o Supabase sem closure desatualizada
      const target = updatedList.find(o => o.id === id);
      if (target) {
        SupabaseService.upsertServiceOrder(target).catch(err => {
          console.debug('Supabase update status notice:', err?.message);
        });
      }

      return updatedList;
    });
  };

  const deleteServiceOrder = (id: string) => {
    setServiceOrders(prev => prev.filter(os => os.id !== id));
    SupabaseService.deleteServiceOrder(id).catch(err => {
      console.debug('Supabase delete OS background notice:', err?.message);
    });
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllNotificationsAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const updateSettings = (newSettings: Partial<NotificationSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const dismissBanner = () => {
    setActiveBanner(null);
  };

  const verifyExpirationsNow = () => {
    const { 
      autoNotifs, 
      expiringCount, 
      expiredCount,
      docAlertsCount,
      equipmentAlertsCount 
    } = checkAndGenerateExpirations(vehicles, settings.daysThreshold);
    let newCount = 0;

    setNotifications(prev => {
      const nonAutoNotifs = prev.filter(n => !n.id.startsWith('notif-auto-'));
      const prevAutoMap = new Map(prev.filter(n => n.id.startsWith('notif-auto-')).map(n => [n.id, n]));

      autoNotifs.forEach(an => {
        if (!prevAutoMap.has(an.id)) {
          newCount++;
        }
      });

      const mergedAuto = autoNotifs.map(an => {
        const existing = prevAutoMap.get(an.id);
        return existing ? { ...an, read: existing.read } : an;
      });

      return [...mergedAuto, ...nonAutoNotifs];
    });

    return {
      totalAlerts: expiringCount + expiredCount,
      totalExpiring: expiringCount,
      totalExpired: expiredCount,
      docAlerts: docAlertsCount,
      equipmentAlerts: equipmentAlertsCount,
      newAlertsCount: newCount,
    };
  };

  // Compute stats and alert lists dynamically
  const docTypes: DocumentType[] = ['CRLV', 'CIV', 'CIPP', 'Tacógrafo'];

  const expiredDocumentsList: Array<{
    vehicle: Vehicle;
    docType: DocumentType | string;
    expiryDate: string;
    daysDiff: number;
    isEquipment?: boolean;
    equipmentId?: string;
    equipmentTag?: string;
    equipmentDescription?: string;
    certificateNumber?: string;
    company?: string;
  }> = [];

  const expiringDocumentsList: Array<{
    vehicle: Vehicle;
    docType: DocumentType | string;
    expiryDate: string;
    daysRemaining: number;
    isEquipment?: boolean;
    equipmentId?: string;
    equipmentTag?: string;
    equipmentDescription?: string;
    certificateNumber?: string;
    company?: string;
  }> = [];

  let totalRegisteredDocs = 0;
  let totalActiveDocs = 0;
  const activeDocsByType: Record<DocumentType, number> = {
    CRLV: 0,
    CIV: 0,
    CIPP: 0,
    Tacógrafo: 0,
  };

  vehicles.forEach(vehicle => {
    // 1. Check vehicle official documents (CRLV, CIV, CIPP, Tacógrafo)
    docTypes.forEach(dtype => {
      const doc = vehicle.documents[dtype];
      if (doc && doc.expiryDate) {
        totalRegisteredDocs++;
        const diffDays = getDaysDifference(doc.expiryDate);
        if (diffDays < 0) {
          expiredDocumentsList.push({
            vehicle,
            docType: dtype,
            expiryDate: doc.expiryDate,
            daysDiff: Math.abs(diffDays),
            isEquipment: false,
          });
        } else {
          totalActiveDocs++;
          activeDocsByType[dtype]++;
          if (diffDays <= settings.daysThreshold) {
            expiringDocumentsList.push({
              vehicle,
              docType: dtype,
              expiryDate: doc.expiryDate,
              daysRemaining: diffDays,
              isEquipment: false,
            });
          }
        }
      }
    });

    // 2. Check all equipments added to fleet with dates
    (vehicle.equipments || []).forEach(eq => {
      const eqDate = eq.nextCalibrationDate || eq.calibrationDate;
      if (eqDate) {
        totalRegisteredDocs++;
        const diffDays = getDaysDifference(eqDate);
        if (diffDays < 0) {
          expiredDocumentsList.push({
            vehicle,
            docType: eq.tag || eq.description,
            expiryDate: eqDate,
            daysDiff: Math.abs(diffDays),
            isEquipment: true,
            equipmentId: eq.id,
            equipmentTag: eq.tag,
            equipmentDescription: eq.description,
            certificateNumber: eq.certificateNumber,
            company: eq.company,
          });
        } else {
          totalActiveDocs++;
          if (diffDays <= settings.daysThreshold) {
            expiringDocumentsList.push({
              vehicle,
              docType: eq.tag || eq.description,
              expiryDate: eqDate,
              daysRemaining: diffDays,
              isEquipment: true,
              equipmentId: eq.id,
              equipmentTag: eq.tag,
              equipmentDescription: eq.description,
              certificateNumber: eq.certificateNumber,
              company: eq.company,
            });
          }
        }
      }
    });

    // 3. Check attachments with explicit expiryDate (e.g. Laudos)
    (vehicle.attachments || []).forEach(att => {
      if (att.expiryDate) {
        // If attachment is a file upload of standard doc (CRLV, CIV, CIPP, Tacógrafo) with same expiry date, skip duplicate
        const stdDoc = att.category && (['CRLV', 'CIV', 'CIPP', 'Tacógrafo'] as DocumentType[]).includes(att.category as DocumentType)
          ? vehicle.documents[att.category as DocumentType]
          : null;
        if (stdDoc && stdDoc.expiryDate === att.expiryDate) {
          return;
        }

        totalRegisteredDocs++;
        const diffDays = getDaysDifference(att.expiryDate);
        if (diffDays < 0) {
          expiredDocumentsList.push({
            vehicle,
            docType: att.category || att.name || 'Laudo',
            expiryDate: att.expiryDate,
            daysDiff: Math.abs(diffDays),
            isEquipment: false,
          });
        } else {
          totalActiveDocs++;
          if (diffDays <= settings.daysThreshold) {
            expiringDocumentsList.push({
              vehicle,
              docType: att.category || att.name || 'Laudo',
              expiryDate: att.expiryDate,
              daysRemaining: diffDays,
              isEquipment: false,
            });
          }
        }
      }
    });
  });

  const caminhaoCount = vehicles.filter(v => v.type === 'Caminhão').length;
  const carretaCount = vehicles.filter(v => v.type === 'Carreta').length;
  const cavaloCount = vehicles.filter(v => v.type === 'Cavalo Mecânico').length;

  // Real dynamic counts reflecting registered vehicles in state/database
  const totalVehiclesCount = vehicles.length;
  const computedCaminhoes = caminhaoCount;
  const computedCarretas = carretaCount;
  const computedCavalos = cavaloCount;

  const openOsCount = serviceOrders.filter(os => os.status === 'Aberta' || os.status === 'Em andamento').length;
  const totalOsCount = serviceOrders.length;

  const osByCategory: Record<OSCategory, number> = {
    Mecânica: serviceOrders.filter(os => os.category === 'Mecânica').length,
    Elétrica: serviceOrders.filter(os => os.category === 'Elétrica').length,
    Borracharia: serviceOrders.filter(os => os.category === 'Borracharia').length,
    'Seva/Sacar': serviceOrders.filter(os => os.category === 'Seva/Sacar' || (os.category as string) === 'Seva/Sascar').length,
    'Seva/Sascar': serviceOrders.filter(os => os.category === 'Seva/Sacar' || (os.category as string) === 'Seva/Sascar').length,
    Motora: serviceOrders.filter(os => os.category === 'Motora').length,
    Driox: serviceOrders.filter(os => os.category === 'Driox').length,
  };

  const criticalThreshold = settings.criticalDaysThreshold || 7;

  // Documents & Equipments expiring in <= criticalThreshold days (or already expired)
  const criticalExpiringList = useMemo(() => {
    const list: Array<{
      vehicle: Vehicle;
      docType: DocumentType | string;
      expiryDate: string;
      daysRemaining: number;
      isEquipment?: boolean;
      equipmentTag?: string;
      equipmentDescription?: string;
      isExpired?: boolean;
    }> = [];

    expiredDocumentsList.forEach(item => {
      list.push({
        vehicle: item.vehicle,
        docType: item.docType,
        expiryDate: item.expiryDate,
        daysRemaining: -item.daysDiff,
        isEquipment: item.isEquipment,
        equipmentTag: item.equipmentTag,
        equipmentDescription: item.equipmentDescription,
        isExpired: true,
      });
    });

    expiringDocumentsList.forEach(item => {
      if (item.daysRemaining <= criticalThreshold) {
        list.push({
          vehicle: item.vehicle,
          docType: item.docType,
          expiryDate: item.expiryDate,
          daysRemaining: item.daysRemaining,
          isEquipment: item.isEquipment,
          equipmentTag: item.equipmentTag,
          equipmentDescription: item.equipmentDescription,
          isExpired: false,
        });
      }
    });

    return list;
  }, [expiredDocumentsList, expiringDocumentsList, criticalThreshold]);

  // When manager/user is logged in, trigger audible alert and popup if critical items exist
  useEffect(() => {
    if (!isAuthenticated || !currentUser) return;
    if (criticalExpiringList.length === 0) return;

    const sessionKey = `${currentUser.id}-${criticalExpiringList.length}-${criticalThreshold}`;
    if (hasTriggeredAlertForSessionRef.current === sessionKey) return;
    hasTriggeredAlertForSessionRef.current = sessionKey;

    // 1. Play audio chime if enabled
    let audioTimeout: ReturnType<typeof setTimeout> | undefined;
    if (settings.soundAlertEnabled) {
      audioTimeout = setTimeout(() => {
        playCriticalAlertSound();
      }, 1000);
    }

    // 2. Open popup if enabled
    let popupTimeout: ReturnType<typeof setTimeout> | undefined;
    if (settings.popupAlertEnabled) {
      popupTimeout = setTimeout(() => {
        setIsCriticalPopupOpen(true);
      }, 800);
    }

    // 3. Browser Push Notification
    if (settings.browserPushEnabled) {
      sendBrowserPushNotification(
        `🚨 Alerta Crítico: Validades a menos de ${criticalThreshold}d`,
        `Atenção ${currentUser.name}: ${criticalExpiringList.length} item(ns) estão vencidos ou vencendo nos próximos ${criticalThreshold} dias na frota.`
      );
    }

    return () => {
      if (audioTimeout) clearTimeout(audioTimeout);
      if (popupTimeout) clearTimeout(popupTimeout);
    };
  }, [isAuthenticated, currentUser, criticalExpiringList.length, criticalThreshold, settings.soundAlertEnabled, settings.popupAlertEnabled, settings.browserPushEnabled]);

  const openCriticalPopup = () => setIsCriticalPopupOpen(true);
  const closeCriticalPopup = () => setIsCriticalPopupOpen(false);

  const testCriticalAlert = () => {
    if (settings.soundAlertEnabled) {
      playCriticalAlertSound();
    } else {
      playTestChime();
    }
    setIsCriticalPopupOpen(true);
    if (settings.browserPushEnabled) {
      sendBrowserPushNotification(
        `🚨 Teste de Alerta do Gestor (< ${criticalThreshold}d)`,
        `Teste de notificação crítica no sistema de gestão de frotas.`
      );
    }
  };

  const stats = {
    totalVehicles: totalVehiclesCount,
    caminhaoCount: computedCaminhoes,
    carretaCount: computedCarretas,
    cavaloCount: computedCavalos,
    openOsCount,
    totalOsCount,
    osByCategory,
    expiredDocsCount: expiredDocumentsList.length,
    expiringDocsCount: expiringDocumentsList.length,
    activeDocsCount: totalActiveDocs,
    totalDocsCount: totalRegisteredDocs,
    activeDocsByType,
  };

  return (
    <FleetContext.Provider value={{
      currentUser,
      isAuthenticated,
      login,
      logout,
      switchUser,
      users,
      setUsers,
      addUser,
      updateUser,
      deleteUser,
      vehicles,
      setVehicles,
      addVehicle,
      updateVehicle,
      deleteVehicle,
      deleteVehicleDocument,
      updateVehicleDocument,
      updateVehicleDocumentWithFile,
      addVehicleAttachment,
      removeVehicleAttachment,
      addVehicleEquipment,
      updateVehicleEquipment,
      deleteVehicleEquipment,
      serviceOrders,
      setServiceOrders,
      openServiceOrder,
      updateServiceOrderStatus,
      deleteServiceOrder,
      notifications,
      markNotificationAsRead,
      markAllNotificationsAsRead,
      clearNotification,
      settings,
      updateSettings,
      activeBanner,
      dismissBanner,
      stats,
      expiredDocumentsList,
      expiringDocumentsList,
      criticalExpiringList,
      isCriticalPopupOpen,
      openCriticalPopup,
      closeCriticalPopup,
      testCriticalAlert,
      verifyExpirationsNow,
      getRecommendedAssigneesForCategory,
      getAutoDirectedUsersForCategory,
      canCloseOS,
      canUserCloseOS,
      syncSupabaseNow,
    }}>
      {children}
    </FleetContext.Provider>
  );
};

export const useFleet = () => {
  const context = useContext(FleetContext);
  if (!context) throw new Error('useFleet must be used within a FleetProvider');
  return context;
};
