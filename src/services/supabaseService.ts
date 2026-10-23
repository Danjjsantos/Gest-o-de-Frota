import { getSupabaseClient, getSupabaseConfig } from './supabaseClient';
import { Vehicle, ServiceOrder, User, SystemNotification } from '../types';

export interface TableStatusInfo {
  name: string;
  label: string;
  description: string;
  exists: boolean;
  count: number;
  error?: string;
}

export interface SupabaseHealthResult {
  connected: boolean;
  url: string;
  message: string;
  pingMs?: number;
  tables: TableStatusInfo[];
}

export const REQUIRED_TABLES: Array<{ name: string; label: string; description: string }> = [
  { name: 'vehicles', label: 'Veículos da Frota', description: 'Armazena caminhões, carretas, vácuo e dados principais' },
  { name: 'service_orders', label: 'Ordens de Serviço (OS)', description: 'Ordens abertas, em andamento, atribuídas e finalizadas' },
  { name: 'users', label: 'Usuários & Colaboradores', description: 'Gestores, encarregados, mecânicos, motoristas e técnicos' },
  { name: 'notifications', label: 'Notificações & Alertas', description: 'Alertas de vencimento de documentos e ordens de serviço' },
  { name: 'vehicle_documents', label: 'Documentos da Frota', description: 'CRLV, CIV, CIPP e Tacógrafo com datas de vencimento' },
  { name: 'vehicle_attachments', label: 'Anexos de Veículos', description: 'Laudos, fotos, manuais e notas fiscais de cada veículo' },
  { name: 'vehicle_equipments', label: 'Equipamentos Calibráveis', description: 'Manômetros, válvulas e certificados de calibração' },
  { name: 'service_order_attachments', label: 'Anexos de OS', description: 'Fotos e comprovantes de execução das ordens de serviço' },
  { name: 'notification_settings', label: 'Configurações de Alertas', description: 'Parâmetros de envio de e-mail e antecedência de alertas' },
  { name: 'audit_logs', label: 'Logs de Auditoria', description: 'Rastreabilidade de alterações e ações dos operadores' },
];

// =========================================================================
// SUPABASE QUOTA & RESTRICTION CIRCUIT BREAKER
// =========================================================================

export function isQuotaOrRestrictionError(err: any): boolean {
  if (!err) return false;
  const msg = typeof err === 'string' ? err : (err.message || err.error_description || JSON.stringify(err));
  return (
    msg.includes('exceed_egress_quota') ||
    msg.includes('spend caps') ||
    msg.includes('upgrade their plan') ||
    msg.includes('restricted due to the following violations') ||
    msg.includes('Quota exceeded') ||
    msg.includes('quota') ||
    msg.includes('bandwidth limit')
  );
}

let projectRestrictedReason: string | null = null;
let lastRestrictionCheck = 0;

export function setProjectRestricted(reason: string) {
  projectRestrictedReason = reason;
  lastRestrictionCheck = Date.now();
  try {
    sessionStorage.setItem('supabase_project_restricted', reason);
  } catch {}
}

export function isProjectRestricted(): boolean {
  if (projectRestrictedReason) {
    // Tenta reavaliar após 5 minutos para o caso de o proprietário ter feito upgrade ou renovado o plano
    if (Date.now() - lastRestrictionCheck > 5 * 60 * 1000) {
      projectRestrictedReason = null;
      try { sessionStorage.removeItem('supabase_project_restricted'); } catch {}
      return false;
    }
    return true;
  }
  try {
    const saved = sessionStorage.getItem('supabase_project_restricted');
    if (saved) {
      projectRestrictedReason = saved;
      return true;
    }
  } catch {}
  return false;
}

export function clearProjectRestricted() {
  projectRestrictedReason = null;
  lastRestrictionCheck = 0;
  try {
    sessionStorage.removeItem('supabase_project_restricted');
  } catch {}
}

export function getProjectRestrictedMessage(): string | null {
  return projectRestrictedReason;
}

// =========================================================================
// HELPER CONVERTERS & SANITIZERS (Crucial for PostgreSQL type safety)
// =========================================================================

export function parseDateToIso(val: any): string | null {
  if (!val) return null;
  const str = String(val).trim();
  if (!str) return null;

  // DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [d, m, y] = str.split('/');
    return `${y}-${m}-${d}`;
  }

  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.split('T')[0];
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
}

export function parseTimestampToIso(val: any): string | null {
  if (!val) return null;
  const str = String(val).trim();
  if (!str || str.includes('Hoje') || str.includes('Agora')) return null;

  // DD/MM/YYYY
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
    const [d, m, y] = str.split('/');
    return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d), 12, 0, 0)).toISOString();
  }

  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export function formatIsoToBrDate(val: any, fallback = '14/07/2026'): string {
  if (!val) return fallback;
  const str = String(val).trim();
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) return str;

  try {
    const d = new Date(str);
    if (isNaN(d.getTime())) return fallback;
    return d.toLocaleDateString('pt-BR');
  } catch {
    return fallback;
  }
}

export function parseNumber(val: any, defaultVal: number | null = null): number | null {
  if (val === undefined || val === null || val === '') return defaultVal;
  if (typeof val === 'number') return isNaN(val) ? defaultVal : val;
  const num = parseFloat(String(val).replace(',', '.'));
  return isNaN(num) ? defaultVal : num;
}

// Convert Frontend Vehicle to Database Row (with payload egress optimization)
export function toDatabaseVehicle(v: Vehicle): Record<string, any> {
  const vacNum = parseNumber(v.vacuumValue);
  const vacDate = parseDateToIso(v.vacuumDate);

  // Preserve vacuumReadings inside documents JSON if available
  const docs: Record<string, any> = {};
  if (v.documents) {
    Object.entries(v.documents).forEach(([k, d]: [string, any]) => {
      if (!d) return;
      // Strip massive base64 dataUrl from JSON columns to prevent egress quota exhaustion
      if (d.fileUrl && d.fileUrl.length > 500 && d.fileUrl.startsWith('data:')) {
        const { fileUrl, ...rest } = d;
        docs[k] = { ...rest, hasFile: true };
      } else {
        docs[k] = d;
      }
    });
  }
  if (v.vacuumReadings && v.vacuumReadings.length > 0) {
    docs._vacuumReadings = v.vacuumReadings;
  }

  // Sanitize attachments in JSON column (files are safely persisted in IndexedDB and vehicle_attachments)
  const sanitizedAttachments = (Array.isArray(v.attachments) ? v.attachments : []).map(att => {
    if (att.dataUrl && att.dataUrl.length > 500 && att.dataUrl.startsWith('data:')) {
      const { dataUrl, ...rest } = att;
      return { ...rest, hasFile: true };
    }
    return att;
  });

  const sanitizedEquipments = (Array.isArray(v.equipments) ? v.equipments : []).map(eq => {
    let cleanEq = { ...eq };
    if (cleanEq.dataUrl && cleanEq.dataUrl.length > 500 && cleanEq.dataUrl.startsWith('data:')) {
      cleanEq.dataUrl = undefined;
    }
    if (cleanEq.fileUrl && cleanEq.fileUrl.length > 500 && cleanEq.fileUrl.startsWith('data:')) {
      cleanEq.fileUrl = undefined;
    }
    return cleanEq;
  });

  return {
    id: v.id,
    fleet_number: v.fleetNumber || '0000',
    type: v.type || 'Carreta',
    plate: v.plate || 'SEM-PLACA',
    uf: v.uf || 'SP',
    brand: v.brand || 'SR/RANDON',
    model: v.model || 'Padrão',
    year: Number(v.year) || new Date().getFullYear(),
    renavam: v.renavam || null,
    chassis: v.chassis || null,
    color: v.color || 'Branco',
    image_url: v.imageUrl || null,
    status: v.status || 'Ativo',
    cargo_products: Array.isArray(v.cargoProducts) ? v.cargoProducts : [],
    cargo_product: v.cargoProduct || (v.cargoProducts?.[0] ?? null),
    vacuum_value: vacNum,
    vacuum_date: vacDate,
    vacuum_unit: v.vacuumUnit || 'mtorr',
    characteristics: v.characteristics || null,
    additional_info: v.additionalInfo || null,
    notes: v.notes || null,
    documents: docs,
    attachments: sanitizedAttachments,
    equipments: sanitizedEquipments,
    updated_at: new Date().toISOString()
  };
}

// Convert Database Row to Frontend Vehicle
export function toFrontendVehicle(row: any): Vehicle {
  const docs = row.documents || {};
  const readings = Array.isArray(docs._vacuumReadings) ? docs._vacuumReadings : (Array.isArray(row.vacuum_readings) ? row.vacuum_readings : []);

  return {
    id: row.id,
    fleetNumber: row.fleet_number,
    type: row.type,
    plate: row.plate,
    uf: row.uf,
    brand: row.brand,
    model: row.model,
    year: Number(row.year) || 2024,
    renavam: row.renavam || undefined,
    chassis: row.chassis || undefined,
    color: row.color || 'Branco',
    imageUrl: row.image_url || undefined,
    status: row.status || 'Ativo',
    cargoProducts: Array.isArray(row.cargo_products) ? row.cargo_products : undefined,
    cargoProduct: row.cargo_product || undefined,
    vacuumValue: row.vacuum_value !== null && row.vacuum_value !== undefined ? Number(row.vacuum_value) : undefined,
    vacuumDate: row.vacuum_date || undefined,
    vacuumUnit: row.vacuum_unit || 'mtorr',
    vacuumReadings: readings,
    characteristics: row.characteristics || undefined,
    additionalInfo: row.additional_info || undefined,
    notes: row.notes || undefined,
    documents: docs,
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
    equipments: Array.isArray(row.equipments) ? row.equipments : [],
    createdAt: row.created_at || new Date().toISOString()
  };
}

// Convert Frontend Service Order to Database Row
export function toDatabaseServiceOrder(so: ServiceOrder): Record<string, any> {
  return {
    id: so.id,
    code: so.code,
    vehicle_id: so.vehicleId,
    fleet_number: so.fleetNumber || '',
    plate: so.plate || '',
    uf: so.uf || '',
    category: so.category || 'Mecânica',
    priority: so.priority || 'Média',
    status: so.status || 'Aberta',
    title: so.title || 'Manutenção',
    description: so.description || '',
    opened_by_user_id: so.openedByUserId || 'admin',
    opened_by_name: so.openedByName || 'Administrador',
    opened_by_role: so.openedByRole || 'Administrador',
    assigned_to_user_id: so.assignedToUserId || null,
    assigned_to_name: so.assignedToName || null,
    assigned_role: so.assignedRole || null,
    directed_users: Array.isArray(so.directedUsers) ? so.directedUsers : [],
    directed_user_ids: Array.isArray(so.directedUserIds) ? so.directedUserIds : [],
    directed_roles: Array.isArray(so.directedRoles) ? so.directedRoles : [],
    resolution_notes: so.resolutionNotes || null,
    executed_by_user_id: so.executedByUserId || null,
    executed_by_name: so.executedByName || null,
    executed_by_role: so.executedByRole || null,
    executed_at: parseTimestampToIso(so.executedAt),
    closed_by_user_id: so.closedByUserId || null,
    closed_by_name: so.closedByName || null,
    closed_by_role: so.closedByRole || null,
    closed_at: parseTimestampToIso(so.closedAt),
    cost: parseNumber(so.cost, 0),
    images: Array.isArray(so.images) ? so.images : [],
    attachments: Array.isArray(so.attachments) ? so.attachments : [],
    updated_at: new Date().toISOString()
  };
}

// Convert Database Row to Frontend Service Order
export function toFrontendServiceOrder(row: any): ServiceOrder {
  return {
    id: row.id,
    code: row.code,
    title: row.title,
    description: row.description,
    vehicleId: row.vehicle_id,
    fleetNumber: row.fleet_number,
    plate: row.plate,
    uf: row.uf,
    category: row.category,
    priority: row.priority,
    status: row.status,
    openedByUserId: row.opened_by_user_id,
    openedByName: row.opened_by_name,
    openedByRole: row.opened_by_role,
    assignedToUserId: row.assigned_to_user_id || undefined,
    assignedToName: row.assigned_to_name || undefined,
    assignedRole: row.assigned_role || undefined,
    directedUsers: Array.isArray(row.directed_users) ? row.directed_users : [],
    directedUserIds: Array.isArray(row.directed_user_ids) ? row.directed_user_ids : [],
    directedRoles: Array.isArray(row.directed_roles) ? row.directed_roles : [],
    resolutionNotes: row.resolution_notes || undefined,
    executedByUserId: row.executed_by_user_id || undefined,
    executedByName: row.executed_by_name || undefined,
    executedByRole: row.executed_by_role || undefined,
    executedAt: row.executed_at ? formatIsoToBrDate(row.executed_at) : undefined,
    closedByUserId: row.closed_by_user_id || undefined,
    closedByName: row.closed_by_name || undefined,
    closedByRole: row.closed_by_role || undefined,
    closedAt: row.closed_at ? formatIsoToBrDate(row.closed_at) : undefined,
    cost: parseNumber(row.cost, 0) || 0,
    images: Array.isArray(row.images) ? row.images : [],
    attachments: Array.isArray(row.attachments) ? row.attachments : [],
    createdAt: row.created_at ? formatIsoToBrDate(row.created_at) : new Date().toLocaleDateString('pt-BR')
  };
}

// Convert Frontend User to Database Row
export function toDatabaseUser(u: User): Record<string, any> {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    password: u.password || null,
    role: u.role,
    atribuicoes: Array.isArray(u.atribuicoes) ? u.atribuicoes : [],
    phone: u.phone || null,
    cnh_number: u.cnhNumber || null,
    cnh_category: u.cnhCategory || null,
    avatar_color: u.avatarColor || '#3b82f6',
    active: true,
    created_at: parseTimestampToIso(u.createdAt) || new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

// Convert Database Row to Frontend User
export function toFrontendUser(row: any): User {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    password: row.password || undefined,
    role: row.role,
    atribuicoes: Array.isArray(row.atribuicoes) ? row.atribuicoes : [],
    phone: row.phone || undefined,
    cnhNumber: row.cnh_number || undefined,
    cnhCategory: row.cnh_category || undefined,
    avatarColor: row.avatar_color || '#3b82f6',
    createdAt: formatIsoToBrDate(row.created_at, '14/07/2026')
  };
}

// Convert Document to vehicle_documents row
export function toDatabaseVehicleDocument(vehicleId: string, docType: string, doc: any): Record<string, any> | null {
  if (!doc || (!doc.expiryDate && !doc.fileUrl)) return null;
  return {
    id: `doc-${vehicleId}-${docType}`.toLowerCase().replace(/[^a-z0-9_-]/g, '-'),
    vehicle_id: vehicleId,
    doc_type: docType,
    number: doc.number || null,
    issue_date: parseDateToIso(doc.issueDate),
    expiry_date: parseDateToIso(doc.expiryDate) || doc.expiryDate || null,
    status: doc.status || 'valid',
    file_url: doc.fileUrl || null,
    file_name: doc.fileName || null,
    file_type: doc.fileType || null,
    file_size: parseNumber(doc.fileSize),
    notes: doc.notes || null,
    uploaded_at: parseTimestampToIso(doc.uploadedAt) || new Date().toISOString()
  };
}

// Convert Attachment to vehicle_attachments row
export function toDatabaseVehicleAttachment(vehicleId: string, att: any): Record<string, any> {
  return {
    id: att.id || `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    vehicle_id: vehicleId,
    name: att.name || 'Anexo',
    data_url: att.dataUrl || att.fileUrl || '',
    file_type: att.fileType || 'application/pdf',
    file_size: parseNumber(att.fileSize, 0) || 0,
    category: att.category || 'Outro',
    number: att.number || null,
    issue_date: parseDateToIso(att.issueDate),
    expiry_date: parseDateToIso(att.expiryDate),
    notes: att.notes || null,
    uploaded_by: att.uploadedBy || null,
    uploaded_at: parseTimestampToIso(att.uploadedAt) || new Date().toISOString()
  };
}

// Convert Equipment to vehicle_equipments row
export function toDatabaseVehicleEquipment(vehicleId: string, eq: any): Record<string, any> {
  const calibDate = parseDateToIso(eq.calibrationDate);
  const nextCalib = parseDateToIso(eq.nextCalibrationDate || eq.calibrationDate) || new Date().toISOString().split('T')[0];
  return {
    id: eq.id || `eq-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    vehicle_id: vehicleId,
    description: eq.description || 'Equipamento',
    company: eq.company || null,
    tag: eq.tag || null,
    certificate_number: eq.certificateNumber || null,
    calibration_date: calibDate,
    next_calibration_date: nextCalib,
    status: eq.status || 'valid',
    notes: eq.notes || null,
    file_url: eq.fileUrl || eq.dataUrl || null,
    file_name: eq.fileName || null,
    file_type: eq.fileType || null,
    file_size: parseNumber(eq.fileSize),
    uploaded_by: eq.uploadedBy || null,
    uploaded_at: parseTimestampToIso(eq.uploadedAt) || new Date().toISOString()
  };
}

// Convert OS Attachment to service_order_attachments row
export function toDatabaseServiceOrderAttachment(serviceOrderId: string, att: any): Record<string, any> {
  return {
    id: att.id || `so-att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    service_order_id: serviceOrderId,
    name: att.name || 'Anexo OS',
    data_url: att.dataUrl || att.fileUrl || '',
    file_type: att.fileType || 'image/jpeg',
    file_size: parseNumber(att.fileSize, 0) || 0,
    uploaded_at: parseTimestampToIso(att.uploadedAt) || new Date().toISOString()
  };
}

// =========================================================================
// SUPABASE SERVICE CLASS
// =========================================================================

export class SupabaseService {
  static isRestricted(): boolean {
    return isProjectRestricted();
  }

  static getRestrictionMessage(): string | null {
    return getProjectRestrictedMessage();
  }

  static clearRestriction(): void {
    clearProjectRestricted();
  }

  /**
   * Testa a conexão com o Supabase e afere latência
   */
  static async testConnection(): Promise<{ success: boolean; message: string; pingMs?: number }> {
    const client = getSupabaseClient();
    const config = getSupabaseConfig();

    if (!client || !config.isConfigured) {
      return {
        success: false,
        message: 'Supabase não configurado. Verifique a URL e a Chave nas configurações.'
      };
    }

    if (isProjectRestricted()) {
      return {
        success: false,
        message: 'Cota de transferência mensal (egress quota) excedida no Supabase. O sistema está operando com persistência local segura (IndexedDB).'
      };
    }

    const start = performance.now();
    try {
      const { error } = await client.from('vehicles').select('id', { count: 'exact', head: true });
      const pingMs = Math.round(performance.now() - start);

      if (error && error.code !== 'PGRST116' && error.code !== 'PGRST205') {
        if (isQuotaOrRestrictionError(error)) {
          setProjectRestricted(error.message);
          return {
            success: false,
            message: 'Cota de transferência mensal (egress quota) excedida no Supabase. O sistema está operando com persistência local segura.',
            pingMs
          };
        }
        if (error.message.includes('fetch failed') || error.message.includes('Failed to fetch')) {
          return {
            success: false,
            message: `Falha de conexão com a URL: ${config.url}`,
            pingMs
          };
        }
      }

      clearProjectRestricted();
      return {
        success: true,
        message: `Conectado com sucesso ao Supabase (${config.url})`,
        pingMs
      };
    } catch (err: any) {
      if (isQuotaOrRestrictionError(err)) {
        setProjectRestricted(err.message);
        return {
          success: false,
          message: 'Cota de transferência mensal (egress quota) excedida no Supabase.',
          pingMs: Math.round(performance.now() - start)
        };
      }
      return {
        success: false,
        message: err.message || 'Erro inesperado ao conectar ao Supabase',
        pingMs: Math.round(performance.now() - start)
      };
    }
  }

  /**
   * Verifica a existência e quantidade de registros de cada tabela
   */
  static async checkTablesStatus(): Promise<SupabaseHealthResult> {
    const config = getSupabaseConfig();
    const client = getSupabaseClient();

    if (!client || !config.isConfigured) {
      return {
        connected: false,
        url: config.url || 'Não configurada',
        message: 'Supabase não configurado',
        tables: REQUIRED_TABLES.map(t => ({
          ...t,
          exists: false,
          count: 0,
          error: 'Credenciais ausentes'
        }))
      };
    }

    if (isProjectRestricted()) {
      return {
        connected: false,
        url: config.url,
        message: 'Cota de transferência mensal (egress quota) excedida no Supabase. Sistema em modo local seguro.',
        tables: REQUIRED_TABLES.map(t => ({
          ...t,
          exists: false,
          count: 0,
          error: 'Cota de transferência (egress quota) atingida'
        }))
      };
    }

    const start = performance.now();
    let isConnected = true;
    let message = 'Conexão ativa com Supabase';

    const tablesInfo: TableStatusInfo[] = [];

    for (const t of REQUIRED_TABLES) {
      try {
        const { count, error } = await client
          .from(t.name)
          .select('*', { count: 'exact', head: true });

        if (error) {
          if (isQuotaOrRestrictionError(error)) {
            setProjectRestricted(error.message);
            isConnected = false;
            message = 'Cota de transferência mensal (egress quota) excedida no Supabase.';
            tablesInfo.push({
              ...t,
              exists: false,
              count: 0,
              error: 'Cota de transferência (egress quota) atingida'
            });
            break;
          }
          if (error.code === 'PGRST205') {
            tablesInfo.push({
              ...t,
              exists: false,
              count: 0,
              error: 'Tabela não criada no banco (execute o script SQL)'
            });
          } else {
            tablesInfo.push({
              ...t,
              exists: false,
              count: 0,
              error: error.message
            });
          }
        } else {
          tablesInfo.push({
            ...t,
            exists: true,
            count: count || 0
          });
        }
      } catch (err: any) {
        if (isQuotaOrRestrictionError(err)) {
          setProjectRestricted(err.message);
          isConnected = false;
          message = 'Cota de transferência mensal (egress quota) excedida no Supabase.';
          tablesInfo.push({
            ...t,
            exists: false,
            count: 0,
            error: 'Cota de transferência (egress quota) atingida'
          });
          break;
        }
        isConnected = false;
        tablesInfo.push({
          ...t,
          exists: false,
          count: 0,
          error: err.message
        });
      }
    }

    const pingMs = Math.round(performance.now() - start);

    return {
      connected: isConnected,
      url: config.url,
      message,
      pingMs,
      tables: tablesInfo
    };
  }

  /**
   * Carrega todos os dados do Supabase (Vice-Versa: Banco -> Aplicação)
   * Carrega os dados mestres e todas as tabelas relacionais dedicadas
   */
  static async fetchAll(): Promise<{
    vehicles: Vehicle[];
    serviceOrders: ServiceOrder[];
    users: User[];
    notifications: SystemNotification[];
  }> {
    const client = getSupabaseClient();
    if (!client) throw new Error('Cliente Supabase não configurado');

    if (isProjectRestricted()) {
      throw new Error('Supabase temporariamente restrito (cota mensal excedida). Operando em modo local.');
    }

    // 1. Fetch Users
    const { data: usersData, error: usersErr } = await client.from('users').select('*');
    if (usersErr) {
      if (isQuotaOrRestrictionError(usersErr)) {
        setProjectRestricted(usersErr.message);
        throw new Error(`Cota do Supabase excedida: ${usersErr.message}`);
      }
      if (usersErr.code !== 'PGRST205') {
        throw new Error(`Erro ao buscar usuários: ${usersErr.message}`);
      }
    }

    // 2. Fetch Vehicles
    const { data: vehiclesData, error: vehErr } = await client.from('vehicles').select('*');
    if (vehErr) {
      if (isQuotaOrRestrictionError(vehErr)) {
        setProjectRestricted(vehErr.message);
        throw new Error(`Cota do Supabase excedida: ${vehErr.message}`);
      }
      if (vehErr.code !== 'PGRST205') {
        throw new Error(`Erro ao buscar veículos: ${vehErr.message}`);
      }
    }

    // 3. Fetch Service Orders
    const { data: soData, error: soErr } = await client.from('service_orders').select('*');
    if (soErr) {
      if (isQuotaOrRestrictionError(soErr)) {
        setProjectRestricted(soErr.message);
        throw new Error(`Cota do Supabase excedida: ${soErr.message}`);
      }
      if (soErr.code !== 'PGRST205') {
        throw new Error(`Erro ao buscar ordens de serviço: ${soErr.message}`);
      }
    }

    // 4. Fetch Notifications
    const { data: notifData, error: notifErr } = await client.from('notifications').select('*');
    if (notifErr && notifErr.code !== 'PGRST205') {
      if (isQuotaOrRestrictionError(notifErr)) {
        setProjectRestricted(notifErr.message);
        throw new Error(`Cota do Supabase excedida: ${notifErr.message}`);
      }
      console.warn('Aviso ao buscar notificações do Supabase:', notifErr.message);
    }

    // 5. Fetch Subtabelas Relacionais (Documentos, Anexos, Equipamentos)
    let allDocs: any[] = [];
    let allVehAtts: any[] = [];
    let allEqs: any[] = [];
    let allSoAtts: any[] = [];

    try {
      const res = await client.from('vehicle_documents').select('*');
      if (Array.isArray(res.data)) allDocs = res.data;
    } catch {}

    try {
      const res = await client.from('vehicle_attachments').select('*');
      if (Array.isArray(res.data)) allVehAtts = res.data;
    } catch {}

    try {
      const res = await client.from('vehicle_equipments').select('*');
      if (Array.isArray(res.data)) allEqs = res.data;
    } catch {}

    try {
      const res = await client.from('service_order_attachments').select('*');
      if (Array.isArray(res.data)) allSoAtts = res.data;
    } catch {}

    const mappedUsers: User[] = (usersData || []).map(toFrontendUser);

    // Mapear veículos e mesclar registros das tabelas filhas caso existam
    const mappedVehicles: Vehicle[] = (vehiclesData || []).map(row => {
      const v = toFrontendVehicle(row);

      // Mesclar documentos da tabela vehicle_documents
      const vehDocs = allDocs.filter((d: any) => d.vehicle_id === v.id);
      if (vehDocs.length > 0) {
        const docsObj: any = { ...(v.documents || {}) };
        vehDocs.forEach((d: any) => {
          if (d.doc_type) {
            const existing = docsObj[d.doc_type] || {};
            docsObj[d.doc_type] = {
              ...existing,
              type: d.doc_type,
              number: d.number || existing.number || undefined,
              issueDate: d.issue_date || existing.issueDate || undefined,
              expiryDate: d.expiry_date || existing.expiryDate || '',
              status: d.status || existing.status || 'valid',
              fileUrl: d.file_url || existing.fileUrl || undefined,
              fileName: d.file_name || existing.fileName || undefined,
              fileType: d.file_type || existing.fileType || undefined,
              fileSize: d.file_size || existing.fileSize || undefined,
              notes: d.notes || existing.notes || undefined,
              uploadedAt: d.uploaded_at ? formatIsoToBrDate(d.uploaded_at) : (existing.uploadedAt || undefined)
            };
          }
        });
        v.documents = docsObj;
      }

      // Mesclar anexos da tabela vehicle_attachments garantindo que dataUrl com conteúdo prevaleça
      const vehAtts = allVehAtts.filter((a: any) => a.vehicle_id === v.id);
      if (vehAtts.length > 0) {
        const tableAttMap = new Map<string, any>(
          vehAtts.map((a: any) => [
            a.id,
            {
              id: a.id,
              name: a.name,
              dataUrl: a.data_url || '',
              fileType: a.file_type || 'application/pdf',
              fileSize: a.file_size || 0,
              category: a.category || 'Outro',
              number: a.number || undefined,
              issueDate: a.issue_date || undefined,
              expiryDate: a.expiry_date || undefined,
              notes: a.notes || undefined,
              uploadedBy: a.uploaded_by || 'Sistema',
              uploadedAt: a.uploaded_at ? formatIsoToBrDate(a.uploaded_at) : '15/07/2026'
            }
          ])
        );

        const mergedAtts: any[] = [];
        const seenAttIds = new Set<string>();

        (v.attachments || []).forEach(existingAtt => {
          const tableAtt = tableAttMap.get(existingAtt.id);
          mergedAtts.push({
            ...existingAtt,
            ...(tableAtt || {}),
            dataUrl: (tableAtt?.dataUrl && tableAtt.dataUrl.length > 0) 
              ? tableAtt.dataUrl 
              : (existingAtt.dataUrl || ''),
          });
          seenAttIds.add(existingAtt.id);
        });

        tableAttMap.forEach((tableAtt, id) => {
          if (!seenAttIds.has(id)) {
            mergedAtts.push(tableAtt);
            seenAttIds.add(id);
          }
        });

        v.attachments = mergedAtts;
      }

      // Mesclar equipamentos da tabela vehicle_equipments
      const vehEqs = allEqs.filter((e: any) => e.vehicle_id === v.id);
      if (vehEqs.length > 0) {
        const tableEqMap = new Map<string, any>(
          vehEqs.map((e: any) => [
            e.id,
            {
              id: e.id,
              description: e.description,
              company: e.company || undefined,
              tag: e.tag || undefined,
              certificateNumber: e.certificate_number || undefined,
              calibrationDate: e.calibration_date || undefined,
              nextCalibrationDate: e.next_calibration_date,
              status: e.status || 'valid',
              notes: e.notes || undefined,
              fileUrl: e.file_url || undefined,
              fileName: e.file_name || undefined,
              fileType: e.file_type || undefined,
              fileSize: e.file_size || undefined,
              uploadedBy: e.uploaded_by || 'Sistema',
              uploadedAt: e.uploaded_at ? formatIsoToBrDate(e.uploaded_at) : undefined
            }
          ])
        );

        const mergedEqs: any[] = [];
        const seenEqIds = new Set<string>();

        (v.equipments || []).forEach(existingEq => {
          const tableEq = tableEqMap.get(existingEq.id);
          mergedEqs.push({
            ...existingEq,
            ...(tableEq || {}),
            fileUrl: tableEq?.fileUrl || existingEq.fileUrl || undefined,
            dataUrl: tableEq?.fileUrl || existingEq.dataUrl || undefined,
          });
          seenEqIds.add(existingEq.id);
        });

        tableEqMap.forEach((tableEq, id) => {
          if (!seenEqIds.has(id)) {
            mergedEqs.push(tableEq);
            seenEqIds.add(id);
          }
        });

        v.equipments = mergedEqs;
      }

      return v;
    });

    // Mapear ordens de serviço e mesclar anexos da tabela service_order_attachments
    const mappedServiceOrders: ServiceOrder[] = (soData || []).map(row => {
      const so = toFrontendServiceOrder(row);
      const osAtts = allSoAtts.filter((a: any) => a.service_order_id === so.id);
      if (osAtts.length > 0) {
        const tableSoAttMap = new Map<string, any>(
          osAtts.map((a: any) => [
            a.id,
            {
              id: a.id,
              name: a.name,
              dataUrl: a.data_url || '',
              fileType: a.file_type || 'image/jpeg',
              fileSize: a.file_size || 0,
              uploadedAt: a.uploaded_at ? formatIsoToBrDate(a.uploaded_at) : undefined
            }
          ])
        );

        const mergedSoAtts: any[] = [];
        const seenSoIds = new Set<string>();

        (so.attachments || []).forEach(existingAtt => {
          const tableAtt = tableSoAttMap.get(existingAtt.id);
          mergedSoAtts.push({
            ...existingAtt,
            ...(tableAtt || {}),
            dataUrl: (tableAtt?.dataUrl && tableAtt.dataUrl.length > 0) 
              ? tableAtt.dataUrl 
              : (existingAtt.dataUrl || ''),
          });
          seenSoIds.add(existingAtt.id);
        });

        tableSoAttMap.forEach((tableAtt, id) => {
          if (!seenSoIds.has(id)) {
            mergedSoAtts.push(tableAtt);
            seenSoIds.add(id);
          }
        });

        so.attachments = mergedSoAtts;
      }
      return so;
    });

    const mappedNotifications: SystemNotification[] = (notifData || []).map((row: any) => ({
      id: row.id,
      type: row.type,
      title: row.title,
      message: row.message,
      vehicleId: row.vehicle_id || undefined,
      fleetNumber: row.fleet_number || undefined,
      plate: row.plate || undefined,
      osCode: row.os_code || undefined,
      docType: row.doc_type || undefined,
      equipmentDescription: row.equipment_description || undefined,
      equipmentTag: row.equipment_tag || undefined,
      daysRemaining: row.days_remaining !== null ? row.days_remaining : undefined,
      daysDiff: row.days_diff !== null ? row.days_diff : undefined,
      read: Boolean(row.read),
      timestamp: row.created_at ? formatIsoToBrDate(row.created_at) : 'Agora mesmo'
    }));

    return {
      vehicles: mappedVehicles,
      serviceOrders: mappedServiceOrders,
      users: mappedUsers,
      notifications: mappedNotifications
    };
  }

  /**
   * Envia todos os dados locais para o Supabase (Upsert em lote limpo em todas as tabelas)
   */
  static async pushAll(
    vehicles: Vehicle[],
    serviceOrders: ServiceOrder[],
    users: User[],
    notifications: SystemNotification[]
  ): Promise<{
    usersCount: number;
    vehiclesCount: number;
    ordersCount: number;
    notifsCount: number;
    documentsCount: number;
    attachmentsCount: number;
    equipmentsCount: number;
    errors: string[];
  }> {
    const client = getSupabaseClient();
    if (!client) throw new Error('Cliente Supabase não configurado');

    if (isProjectRestricted()) {
      return {
        usersCount: 0,
        vehiclesCount: 0,
        ordersCount: 0,
        notifsCount: 0,
        documentsCount: 0,
        attachmentsCount: 0,
        equipmentsCount: 0,
        errors: ['Cota de transferência mensal do Supabase atingida. Os dados estão preservados com segurança na persistência local (IndexedDB/LocalStorage).']
      };
    }

    const errors: string[] = [];
    let usersCount = 0;
    let vehiclesCount = 0;
    let ordersCount = 0;
    let notifsCount = 0;
    let documentsCount = 0;
    let attachmentsCount = 0;
    let equipmentsCount = 0;

    // 1. Upsert Users (Garante que usuários responsáveis existam)
    try {
      const usersRows = users.map(toDatabaseUser);
      if (usersRows.length > 0) {
        const { error: userErr } = await client.from('users').upsert(usersRows, { onConflict: 'id' });
        if (userErr) {
          if (isQuotaOrRestrictionError(userErr)) {
            setProjectRestricted(userErr.message);
            console.warn('Aviso de cota do Supabase ao salvar usuários:', userErr.message);
          } else {
            console.warn('Aviso ao salvar usuários no Supabase:', userErr.message);
          }
          errors.push(`Usuários: ${userErr.message}`);
        } else {
          usersCount = usersRows.length;
        }
      }
    } catch (err: any) {
      if (isQuotaOrRestrictionError(err)) setProjectRestricted(err.message);
      errors.push(`Usuários erro: ${err.message}`);
    }

    // 2. Upsert Vehicles (Garante que veículos existam para as foreign keys das OSs e subtabelas)
    try {
      if (!isProjectRestricted()) {
        const vehicleRows = vehicles.map(toDatabaseVehicle);
        if (vehicleRows.length > 0) {
          const { error: vehErr } = await client.from('vehicles').upsert(vehicleRows, { onConflict: 'id' });
          if (vehErr) {
            if (isQuotaOrRestrictionError(vehErr)) {
              setProjectRestricted(vehErr.message);
              console.warn('Aviso de cota do Supabase ao salvar veículos:', vehErr.message);
            } else {
              console.warn('Aviso ao salvar veículos no Supabase:', vehErr.message);
            }
            errors.push(`Veículos: ${vehErr.message}`);
          } else {
            vehiclesCount = vehicleRows.length;
          }
        }
      }
    } catch (err: any) {
      if (isQuotaOrRestrictionError(err)) setProjectRestricted(err.message);
      errors.push(`Veículos erro: ${err.message}`);
    }

    // 3. Upsert Vehicle Documents
    try {
      if (!isProjectRestricted()) {
        const docRows: any[] = [];
        vehicles.forEach(v => {
          if (v.documents) {
            Object.entries(v.documents).forEach(([docType, doc]) => {
              if (doc && (doc as any).expiryDate) {
                const row = toDatabaseVehicleDocument(v.id, docType, doc);
                if (row) docRows.push(row);
              }
            });
          }
        });
        if (docRows.length > 0) {
          const { error: docErr } = await client.from('vehicle_documents').upsert(docRows, { onConflict: 'id' });
          if (docErr && docErr.code !== 'PGRST205') {
            if (isQuotaOrRestrictionError(docErr)) setProjectRestricted(docErr.message);
            errors.push(`Documentos: ${docErr.message}`);
          } else {
            documentsCount = docRows.length;
          }
        }
      }
    } catch (err: any) {
      if (isQuotaOrRestrictionError(err)) setProjectRestricted(err.message);
      errors.push(`Documentos erro: ${err.message}`);
    }

    // 4. Upsert Vehicle Attachments
    try {
      if (!isProjectRestricted()) {
        const attRows: any[] = [];
        vehicles.forEach(v => {
          if (Array.isArray(v.attachments)) {
            v.attachments.forEach(att => {
              attRows.push(toDatabaseVehicleAttachment(v.id, att));
            });
          }
        });
        if (attRows.length > 0) {
          const { error: attErr } = await client.from('vehicle_attachments').upsert(attRows, { onConflict: 'id' });
          if (attErr && attErr.code !== 'PGRST205') {
            if (isQuotaOrRestrictionError(attErr)) setProjectRestricted(attErr.message);
            errors.push(`Anexos de veículos: ${attErr.message}`);
          } else {
            attachmentsCount = attRows.length;
          }
        }
      }
    } catch (err: any) {
      if (isQuotaOrRestrictionError(err)) setProjectRestricted(err.message);
      errors.push(`Anexos veículos erro: ${err.message}`);
    }

    // 5. Upsert Vehicle Equipments
    try {
      if (!isProjectRestricted()) {
        const eqRows: any[] = [];
        vehicles.forEach(v => {
          if (Array.isArray(v.equipments)) {
            v.equipments.forEach(eq => {
              eqRows.push(toDatabaseVehicleEquipment(v.id, eq));
            });
          }
        });
        if (eqRows.length > 0) {
          const { error: eqErr } = await client.from('vehicle_equipments').upsert(eqRows, { onConflict: 'id' });
          if (eqErr && eqErr.code !== 'PGRST205') {
            if (isQuotaOrRestrictionError(eqErr)) setProjectRestricted(eqErr.message);
            errors.push(`Equipamentos: ${eqErr.message}`);
          } else {
            equipmentsCount = eqRows.length;
          }
        }
      }
    } catch (err: any) {
      if (isQuotaOrRestrictionError(err)) setProjectRestricted(err.message);
      errors.push(`Equipamentos erro: ${err.message}`);
    }

    // 6. Upsert Service Orders (Após veículos estarem salvos)
    try {
      if (!isProjectRestricted()) {
        const orderRows = serviceOrders.map(toDatabaseServiceOrder);
        if (orderRows.length > 0) {
          const { error: soErr } = await client.from('service_orders').upsert(orderRows, { onConflict: 'id' });
          if (soErr) {
            if (isQuotaOrRestrictionError(soErr)) {
              setProjectRestricted(soErr.message);
              console.warn('Aviso de cota do Supabase ao salvar OSs:', soErr.message);
            } else {
              console.warn('Aviso ao salvar OSs no Supabase:', soErr.message);
            }
            errors.push(`Ordens de Serviço: ${soErr.message}`);
          } else {
            ordersCount = orderRows.length;
          }
        }
      }
    } catch (err: any) {
      if (isQuotaOrRestrictionError(err)) setProjectRestricted(err.message);
      errors.push(`Ordens de Serviço erro: ${err.message}`);
    }

    // 7. Upsert Service Order Attachments
    try {
      if (!isProjectRestricted()) {
        const soAttRows: any[] = [];
        serviceOrders.forEach(so => {
          if (Array.isArray(so.attachments)) {
            so.attachments.forEach(att => {
              soAttRows.push(toDatabaseServiceOrderAttachment(so.id, att));
            });
          }
        });
        if (soAttRows.length > 0) {
          await client.from('service_order_attachments').upsert(soAttRows, { onConflict: 'id' });
        }
      }
    } catch (err: any) {
      console.debug('Service order attachments push notice:', err?.message);
    }

    // 8. Upsert Notifications
    try {
      if (!isProjectRestricted()) {
        const notifRows = notifications.map(n => ({
          id: n.id,
          type: n.type,
          title: n.title,
          message: n.message,
          vehicle_id: n.vehicleId || null,
          fleet_number: n.fleetNumber || null,
          plate: n.plate || null,
          os_code: n.osCode || null,
          doc_type: n.docType || null,
          equipment_description: n.equipmentDescription || null,
          equipment_tag: n.equipmentTag || null,
          days_remaining: parseNumber(n.daysRemaining),
          days_diff: parseNumber(n.daysDiff),
          read: Boolean(n.read),
          created_at: new Date().toISOString()
        }));

        if (notifRows.length > 0) {
          const { error: notifErr } = await client.from('notifications').upsert(notifRows, { onConflict: 'id' });
          if (notifErr) {
            if (isQuotaOrRestrictionError(notifErr)) setProjectRestricted(notifErr.message);
            errors.push(`Notificações: ${notifErr.message}`);
          } else {
            notifsCount = notifRows.length;
          }
        }
      }
    } catch (err: any) {
      if (isQuotaOrRestrictionError(err)) setProjectRestricted(err.message);
      errors.push(`Notificações erro: ${err.message}`);
    }

    return {
      usersCount,
      vehiclesCount,
      ordersCount,
      notifsCount,
      documentsCount,
      attachmentsCount,
      equipmentsCount,
      errors
    };
  }

  /**
   * Salvar ou atualizar veículo no Supabase (com todos os documentos, anexos e equipamentos)
   */
  static async upsertVehicle(v: Vehicle): Promise<boolean> {
    if (isProjectRestricted()) return false;
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      const row = toDatabaseVehicle(v);
      const { error } = await client.from('vehicles').upsert(row, { onConflict: 'id' });
      if (error) {
        if (isQuotaOrRestrictionError(error)) {
          setProjectRestricted(error.message);
          console.warn('Aviso de cota ao salvar veículo no Supabase:', error.message);
        } else {
          console.warn('Falha ao salvar veículo no Supabase:', error.message);
        }
        return false;
      }

      // Sincronizar também nas tabelas filhas dedicadas
      try {
        if (!isProjectRestricted()) {
          // Documentos
          if (v.documents) {
            const docRows: any[] = [];
            Object.entries(v.documents).forEach(([docType, doc]) => {
              if (doc && ((doc as any).expiryDate || (doc as any).fileUrl)) {
                const dRow = toDatabaseVehicleDocument(v.id, docType, doc);
                if (dRow) docRows.push(dRow);
              }
            });
            if (docRows.length > 0) {
              await client.from('vehicle_documents').upsert(docRows, { onConflict: 'id' });
            }
          }

          // Anexos
          if (Array.isArray(v.attachments) && v.attachments.length > 0) {
            const attRows = v.attachments.map(att => toDatabaseVehicleAttachment(v.id, att));
            await client.from('vehicle_attachments').upsert(attRows, { onConflict: 'id' });
          }

          // Equipamentos
          if (Array.isArray(v.equipments) && v.equipments.length > 0) {
            const eqRows = v.equipments.map(eq => toDatabaseVehicleEquipment(v.id, eq));
            await client.from('vehicle_equipments').upsert(eqRows, { onConflict: 'id' });
          }
        }
      } catch (subErr) {
        console.debug('Aviso subtabelas ao sincronizar veículo:', subErr);
      }

      return true;
    } catch (err: any) {
      if (isQuotaOrRestrictionError(err)) {
        setProjectRestricted(err.message);
        console.warn('Aviso de cota do Supabase ao salvar veículo:', err.message);
      } else {
        console.warn('Aviso ao salvar veículo no Supabase:', err.message);
      }
      return false;
    }
  }

  /**
   * Salvar anexo diretamente no Supabase na tabela vehicle_attachments e atualizar a frota
   */
  static async saveVehicleAttachment(vehicleId: string, att: any): Promise<boolean> {
    if (isProjectRestricted()) return false;
    const client = getSupabaseClient();
    if (!client) return false;
    try {
      const attRow = toDatabaseVehicleAttachment(vehicleId, att);
      const { error: attErr } = await client.from('vehicle_attachments').upsert(attRow, { onConflict: 'id' });
      if (attErr) {
        if (isQuotaOrRestrictionError(attErr)) setProjectRestricted(attErr.message);
        console.warn('Aviso ao salvar em vehicle_attachments:', attErr.message);
      }

      // Atualizar também o campo JSON attachments do veículo
      const { data: vRow } = await client.from('vehicles').select('attachments').eq('id', vehicleId).single();
      if (vRow) {
        const existing: any[] = Array.isArray(vRow.attachments) ? vRow.attachments : [];
        const filtered = existing.filter((a: any) => a.id !== att.id);
        const updated = [att, ...filtered];
        await client.from('vehicles').update({ attachments: updated, updated_at: new Date().toISOString() }).eq('id', vehicleId);
      }
      return true;
    } catch (err: any) {
      if (isQuotaOrRestrictionError(err)) setProjectRestricted(err.message);
      console.warn('Aviso ao salvar anexo de veículo no Supabase:', err.message);
      return false;
    }
  }

  /**
   * Excluir anexo de veículo no Supabase
   */
  static async deleteVehicleAttachment(vehicleId: string, attachmentId: string): Promise<boolean> {
    if (isProjectRestricted()) return false;
    const client = getSupabaseClient();
    if (!client) return false;
    try {
      await client.from('vehicle_attachments').delete().eq('id', attachmentId);
      const { data: vRow } = await client.from('vehicles').select('attachments').eq('id', vehicleId).single();
      if (vRow) {
        const existing: any[] = Array.isArray(vRow.attachments) ? vRow.attachments : [];
        const updated = existing.filter((a: any) => a.id !== attachmentId);
        await client.from('vehicles').update({ attachments: updated, updated_at: new Date().toISOString() }).eq('id', vehicleId);
      }
      return true;
    } catch (err: any) {
      if (isQuotaOrRestrictionError(err)) setProjectRestricted(err.message);
      console.warn('Aviso ao excluir anexo de veículo:', err.message);
      return false;
    }
  }

  /**
   * Salvar documento de veículo no Supabase imediatamente
   */
  static async saveVehicleDocument(vehicleId: string, docType: string, doc: any): Promise<boolean> {
    if (isProjectRestricted()) return false;
    const client = getSupabaseClient();
    if (!client) return false;
    try {
      const docRow = toDatabaseVehicleDocument(vehicleId, docType, doc);
      if (docRow) {
        await client.from('vehicle_documents').upsert(docRow, { onConflict: 'id' });
      }
      const { data: vRow } = await client.from('vehicles').select('documents').eq('id', vehicleId).single();
      if (vRow) {
        const existingDocs = vRow.documents || {};
        const updatedDocs = { ...existingDocs, [docType]: doc };
        await client.from('vehicles').update({ documents: updatedDocs, updated_at: new Date().toISOString() }).eq('id', vehicleId);
      }
      return true;
    } catch (err: any) {
      if (isQuotaOrRestrictionError(err)) setProjectRestricted(err.message);
      console.warn('Aviso ao salvar documento no Supabase:', err.message);
      return false;
    }
  }

  /**
   * Deletar veículo no Supabase
   */
  static async deleteVehicle(id: string): Promise<boolean> {
    if (isProjectRestricted()) return false;
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      // Limpar subtabelas caso ON DELETE CASCADE não esteja ativo
      await Promise.allSettled([
        client.from('vehicle_documents').delete().eq('vehicle_id', id),
        client.from('vehicle_attachments').delete().eq('vehicle_id', id),
        client.from('vehicle_equipments').delete().eq('vehicle_id', id)
      ]);

      const { error } = await client.from('vehicles').delete().eq('id', id);
      if (error) {
        if (isQuotaOrRestrictionError(error)) setProjectRestricted(error.message);
        console.warn('Aviso ao deletar veículo no Supabase:', error.message);
      }
      return !error;
    } catch (err: any) {
      if (isQuotaOrRestrictionError(err)) setProjectRestricted(err.message);
      console.warn('Aviso ao deletar veículo:', err.message);
      return false;
    }
  }

  /**
   * Salvar ou atualizar Ordem de Serviço (Garante que o veículo exista para evitar erro de FK)
   */
  static async upsertServiceOrder(so: ServiceOrder, vehicleFallback?: Vehicle): Promise<boolean> {
    if (isProjectRestricted()) return false;
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      // Se tiver dados do veículo, garante que o veículo está persistido antes de tentar salvar a OS
      if (vehicleFallback) {
        await SupabaseService.upsertVehicle(vehicleFallback);
      }

      const row = toDatabaseServiceOrder(so);
      const { error } = await client.from('service_orders').upsert(row, { onConflict: 'id' });
      if (error) {
        if (isQuotaOrRestrictionError(error)) {
          setProjectRestricted(error.message);
          console.warn('Aviso de cota ao salvar OS no Supabase:', error.message);
        } else {
          console.warn('Falha ao salvar OS no Supabase:', error.message);
        }
        return false;
      }

      // Sincronizar anexos da OS se existirem
      if (Array.isArray(so.attachments) && so.attachments.length > 0) {
        try {
          const attRows = so.attachments.map(att => toDatabaseServiceOrderAttachment(so.id, att));
          await client.from('service_order_attachments').upsert(attRows, { onConflict: 'id' });
        } catch (subErr) {
          console.debug('Aviso anexos de OS ao salvar:', subErr);
        }
      }

      return true;
    } catch (err: any) {
      if (isQuotaOrRestrictionError(err)) {
        setProjectRestricted(err.message);
        console.warn('Aviso de cota ao salvar OS no Supabase:', err.message);
      } else {
        console.warn('Aviso ao salvar OS no Supabase:', err.message);
      }
      return false;
    }
  }

  /**
   * Deletar Ordem de Serviço
   */
  static async deleteServiceOrder(id: string): Promise<boolean> {
    if (isProjectRestricted()) return false;
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      await client.from('service_order_attachments').delete().eq('service_order_id', id);
      const { error } = await client.from('service_orders').delete().eq('id', id);
      if (error) {
        if (isQuotaOrRestrictionError(error)) setProjectRestricted(error.message);
        console.warn('Aviso ao deletar OS no Supabase:', error.message);
      }
      return !error;
    } catch (err: any) {
      if (isQuotaOrRestrictionError(err)) setProjectRestricted(err.message);
      console.warn('Aviso ao deletar OS:', err.message);
      return false;
    }
  }

  /**
   * Salvar ou atualizar Usuário
   */
  static async upsertUser(u: User): Promise<boolean> {
    if (isProjectRestricted()) return false;
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      const row = toDatabaseUser(u);
      const { error } = await client.from('users').upsert(row, { onConflict: 'id' });
      if (error) {
        if (isQuotaOrRestrictionError(error)) {
          setProjectRestricted(error.message);
          console.warn('Aviso de cota ao salvar usuário no Supabase:', error.message);
        } else {
          console.warn('Falha ao salvar usuário no Supabase:', error.message);
        }
        return false;
      }
      return true;
    } catch (err: any) {
      if (isQuotaOrRestrictionError(err)) {
        setProjectRestricted(err.message);
        console.warn('Aviso de cota ao salvar usuário no Supabase:', err.message);
      } else {
        console.warn('Aviso ao salvar usuário no Supabase:', err.message);
      }
      return false;
    }
  }

  /**
   * Deletar Usuário
   */
  static async deleteUser(id: string): Promise<boolean> {
    if (isProjectRestricted()) return false;
    const client = getSupabaseClient();
    if (!client) return false;

    try {
      const { error } = await client.from('users').delete().eq('id', id);
      if (error) {
        if (isQuotaOrRestrictionError(error)) setProjectRestricted(error.message);
        console.warn('Aviso ao deletar usuário no Supabase:', error.message);
      }
      return !error;
    } catch (err: any) {
      if (isQuotaOrRestrictionError(err)) setProjectRestricted(err.message);
      console.warn('Aviso ao deletar usuário:', err.message);
      return false;
    }
  }

  /**
   * Assinar atualizações em tempo real (Supabase Realtime)
   * Permite que alterações feitas no banco ou por outros usuários atualizem a interface instantaneamente!
   */
  static subscribeToChanges(callbacks: {
    onVehicleChange?: (event: 'INSERT' | 'UPDATE' | 'DELETE', payload: any) => void;
    onServiceOrderChange?: (event: 'INSERT' | 'UPDATE' | 'DELETE', payload: any) => void;
    onUserChange?: (event: 'INSERT' | 'UPDATE' | 'DELETE', payload: any) => void;
  }): () => void {
    if (isProjectRestricted()) return () => {};
    const client = getSupabaseClient();
    if (!client) return () => {};

    try {
      const channel = client
        .channel('public_fleet_realtime')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'vehicles' },
          payload => {
            callbacks.onVehicleChange?.(payload.eventType as any, payload);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'service_orders' },
          payload => {
            callbacks.onServiceOrderChange?.(payload.eventType as any, payload);
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'users' },
          payload => {
            callbacks.onUserChange?.(payload.eventType as any, payload);
          }
        )
        .subscribe();

      return () => {
        client.removeChannel(channel);
      };
    } catch (err) {
      console.warn('Realtime subscription not available:', err);
      return () => {};
    }
  }
}
