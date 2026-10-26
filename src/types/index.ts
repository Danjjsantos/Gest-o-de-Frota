export type VehicleType = 'Caminhão' | 'Carreta' | 'Cavalo Mecânico';

export type CargoProductType = 'Gases do Ar (LO2, LN2, LAR)' | 'CO2';

export interface VacuumReading {
  id: string;
  value: number | string;
  date: string; // YYYY-MM-DD
  unit?: string; // 'mtorr'
  notes?: string;
}

export type VacuumClassification = 'normal' | 'warning' | 'critical';

export const getVacuumClassification = (val: number | string | undefined): {
  type: VacuumClassification;
  label: 'Especificado' | 'Fora do Especificado' | 'ATM' | 'Sem medição';
  color: string;
  badgeClass: string;
} => {
  const num = typeof val === 'number' ? val : parseFloat(String(val || '').replace(',', '.'));
  if (isNaN(num)) {
    return {
      type: 'normal',
      label: 'Sem medição',
      color: '#94a3b8',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-200'
    };
  }
  if (num <= 80) {
    return {
      type: 'normal',
      label: 'Especificado',
      color: '#10b981', // Verde
      badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200'
    };
  }
  if (num <= 998) {
    return {
      type: 'warning',
      label: 'Fora do Especificado',
      color: '#f59e0b', // Amarela
      badgeClass: 'bg-amber-50 text-amber-800 border-amber-200'
    };
  }
  return {
    type: 'critical',
    label: 'ATM',
    color: '#ef4444', // Vermelha
    badgeClass: 'bg-rose-50 text-rose-800 border-rose-200'
  };
};

export type DocumentType = 'CRLV' | 'CIV' | 'CIPP' | 'Tacógrafo';

export type DocumentStatus = 'valid' | 'expiring' | 'expired' | 'not_applicable';

export interface VehicleDocument {
  type: DocumentType;
  number?: string;
  issueDate?: string;
  expiryDate: string; // YYYY-MM-DD
  status: DocumentStatus;
  notes?: string;
  fileUrl?: string; // base64 representation of PDF or image
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  uploadedAt?: string;
}

export interface VehicleAttachment {
  id: string;
  name: string;
  dataUrl: string; // base64 representation of PDF or JPG/PNG image
  fileType: string; // 'application/pdf' | 'image/jpeg' | 'image/png' etc.
  fileSize: number;
  category: DocumentType | 'Nota Fiscal' | 'Manual' | 'Laudo' | 'Outro';
  number?: string;
  issueDate?: string;
  expiryDate?: string;
  notes?: string;
  uploadedAt: string;
  uploadedBy?: string;
}

export interface VehicleEquipment {
  id: string;
  description: string; // Descrição do equipamento (ex: Manômetro de Pressão, Válvula de Segurança)
  company: string; // Empresa / Laboratório de calibração / Fabricante
  tag: string; // TAG de identificação (ex: TAG-MN-0197)
  certificateNumber: string; // Número do Certificado de Calibração (ex: CAL-2026/8912)
  calibrationDate: string; // Data de Calibração (YYYY-MM-DD)
  nextCalibrationDate: string; // Próxima Calibração (YYYY-MM-DD)
  status?: 'valid' | 'expiring' | 'expired';
  notes?: string;
  // Anexo do certificado em JPG ou PDF:
  fileUrl?: string; // base64 representation of PDF or JPG/PNG image
  dataUrl?: string;
  fileName?: string;
  fileType?: string; // 'application/pdf' | 'image/jpeg' | 'image/png'
  fileSize?: number;
  uploadedAt?: string;
  uploadedBy?: string;
}

export interface Vehicle {
  id: string;
  fleetNumber: string; // e.g. "0197", "1537"
  type: VehicleType;
  plate: string; // e.g. "KZB-1H12"
  uf: string; // e.g. "RJ", "SP", "GO"
  brand: string; // e.g. "SR/RANDON", "Mercedes-Benz", "Scania", "Volvo"
  model: string; // e.g. "TWM-19C", "Actros 2651", "FH 540"
  year: number;
  renavam?: string;
  chassis?: string;
  color?: string;
  imageUrl?: string;
  status: 'Ativo' | 'Em Manutenção' | 'Inativo';
  cargoProducts?: CargoProductType[]; // Tipos de produtos transportados: Gases do Ar (LO2, LN2, LAR) ou CO2
  cargoProduct?: string;
  vacuumValue?: number | string; // Medição do vácuo (ex: 8.5 ou 12)
  vacuumDate?: string; // Data da medição do vácuo (YYYY-MM-DD)
  vacuumUnit?: 'mtorr' | string; // Unidade de medida (mtorr)
  vacuumReadings?: VacuumReading[]; // Histórico de medições de vácuo
  characteristics?: string; // Características técnicas (capacidade, eixos, tara, PBT, engate, dimensões)
  additionalInfo?: string; // Informações adicionais (rastreador, telemetria, seguradora, contrato, restrições)
  documents: Record<DocumentType, VehicleDocument | null>;
  excludedDocuments?: string[]; // Documentos dispensados ou excluídos pelo Administrador (ex: documentos não aplicáveis ao tipo de veículo)
  attachments?: VehicleAttachment[];
  equipments?: VehicleEquipment[];
  notes?: string;
  createdAt: string;
}

export type OSCategory = 'Mecânica' | 'Elétrica' | 'Borracharia' | 'Driox' | 'Seva/Sacar' | 'Seva/Sascar' | 'Motora';

export type OSPriority = 'Baixa' | 'Média' | 'Alta' | 'Urgente';

export type OSStatus = 'Aberta' | 'Em andamento' | 'Resolvida' | 'Encerrada';

export interface OSAttachment {
  id: string;
  name: string;
  dataUrl: string;
  size?: number;
  type?: string;
  uploadedAt?: string;
}

export interface DirectedUserTarget {
  userId: string;
  name: string;
  role: UserRole;
  email?: string;
  targetType: 'responsavel' | 'lideranca';
}

export interface ServiceOrder {
  id: string;
  code: string; // e.g. "OS-00009"
  title: string; // e.g. "Bomba", "Bolsa de ar", "MOTORA"
  description: string;
  vehicleId: string;
  fleetNumber: string;
  plate: string;
  uf: string;
  category: OSCategory;
  priority: OSPriority;
  status: OSStatus;
  openedByUserId: string;
  openedByName: string;
  openedByRole: string;
  assignedToUserId?: string;
  assignedToName?: string;
  assignedRole?: string;
  directedUsers?: DirectedUserTarget[];
  directedUserIds?: string[];
  directedRoles?: string[];
  createdAt: string; // ISO date or DD/MM/YYYY
  resolvedAt?: string;
  resolutionNotes?: string;
  executedByUserId?: string;
  executedByName?: string;
  executedByRole?: string;
  executedAt?: string;
  closedByUserId?: string;
  closedByName?: string;
  closedByRole?: string;
  closedAt?: string;
  cost?: number;
  images?: string[]; // Base64 data URLs for quick image preview
  attachments?: OSAttachment[];
}

export type UserRole = 
  | 'Administrador' 
  | 'Gerente' 
  | 'Encarregado' 
  | 'Mecânico' 
  | 'Borracheiro'
  | 'Téc. Eletrica'
  | 'Téc. Driox'
  | 'Monitor' 
  | 'Motorista';

export type UserAtribuicao = 
  | 'Mecânica' 
  | 'Elétrica' 
  | 'Borracharia' 
  | 'Driox' 
  | 'Seva/Sacar' 
  | 'Seva/Sascar' 
  | 'Motora' 
  | 'Gestão Geral';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: UserRole;
  atribuicoes: UserAtribuicao[];
  phone?: string;
  cnhNumber?: string;
  cnhCategory?: string;
  createdAt: string;
  avatarColor?: string;
}

export interface SystemNotification {
  id: string;
  type: 'os_opened' | 'os_updated' | 'doc_expired' | 'doc_expiring' | 'equipment_expiring' | 'equipment_expired';
  title: string;
  message: string;
  vehicleId?: string;
  fleetNumber?: string;
  plate?: string;
  osCode?: string;
  docType?: DocumentType | string;
  equipmentDescription?: string;
  equipmentTag?: string;
  daysRemaining?: number;
  daysDiff?: number;
  timestamp: string;
  read: boolean;
}

export interface NotificationSettings {
  senderEmail: string;
  daysThreshold: number; // e.g. 10 or 30
  autoEmailOnNewOS: boolean;
  autoEmailOnExpiringDoc: boolean;
  recipientsList: string[];
  // Alertas sonoros, pop-up e push configuráveis no navegador:
  criticalDaysThreshold: number; // Padrão: 7 dias
  soundAlertEnabled: boolean; // Aviso sonoro ativo
  popupAlertEnabled: boolean; // Pop-up em tela ativo
  browserPushEnabled: boolean; // Notificações push do navegador
}
