import { Vehicle, ServiceOrder, User, NotificationSettings, SystemNotification } from '../types';

export const INITIAL_USERS: User[] = [];

export const INITIAL_VEHICLES: Vehicle[] = [];

export const INITIAL_SERVICE_ORDERS: ServiceOrder[] = [];

export const INITIAL_NOTIFICATIONS: SystemNotification[] = [];

export const INITIAL_SETTINGS: NotificationSettings = {
  senderEmail: 'Gestão Frotas <notificacoes@gestaofrotas.com.br>',
  daysThreshold: 30,
  autoEmailOnNewOS: true,
  autoEmailOnExpiringDoc: true,
  recipientsList: [],
  criticalDaysThreshold: 7,
  soundAlertEnabled: true,
  popupAlertEnabled: true,
  browserPushEnabled: true,
};
