-- =====================================================================
-- SCHEMA COMPLETO DO BANCO DE DADOS SUPABASE - SISTEMA GESTÃO DE FROTAS
-- Execute este script no SQL Editor do seu projeto Supabase
-- URL do Projeto: https://rqtwicocyyylqghqluks.supabase.co
-- =====================================================================

-- Extensão para geração de UUID se necessário
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------
-- 1. TABELA: users (Usuários, Gestores, Mecânicos e Motoristas)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.users (
  id TEXT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password TEXT,
  role VARCHAR(100) NOT NULL,
  atribuicoes JSONB DEFAULT '[]'::jsonb,
  phone VARCHAR(50),
  cnh_number VARCHAR(50),
  cnh_category VARCHAR(10),
  avatar_color VARCHAR(20) DEFAULT '#3b82f6',
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para users
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- ---------------------------------------------------------------------
-- 2. TABELA: vehicles (Veículos da Frota)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vehicles (
  id TEXT PRIMARY KEY,
  fleet_number VARCHAR(50) NOT NULL,
  type VARCHAR(100) NOT NULL,
  plate VARCHAR(20) NOT NULL UNIQUE,
  uf VARCHAR(5) NOT NULL,
  brand VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  year INTEGER NOT NULL,
  renavam VARCHAR(50),
  chassis VARCHAR(100),
  color VARCHAR(50) DEFAULT 'Branco',
  image_url TEXT,
  status VARCHAR(50) DEFAULT 'Ativo',
  cargo_products JSONB DEFAULT '[]'::jsonb,
  cargo_product VARCHAR(100),
  vacuum_value VARCHAR(50),
  vacuum_date DATE,
  vacuum_unit VARCHAR(20) DEFAULT 'mtorr',
  vacuum_readings JSONB DEFAULT '[]'::jsonb,
  characteristics TEXT,
  additional_info TEXT,
  notes TEXT,
  documents JSONB DEFAULT '{}'::jsonb,
  attachments JSONB DEFAULT '[]'::jsonb,
  equipments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para vehicles
CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON public.vehicles(plate);
CREATE INDEX IF NOT EXISTS idx_vehicles_fleet_number ON public.vehicles(fleet_number);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON public.vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_type ON public.vehicles(type);

-- ---------------------------------------------------------------------
-- 3. TABELA: service_orders (Ordens de Serviço / OS)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_orders (
  id TEXT PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL,
  vehicle_id TEXT REFERENCES public.vehicles(id) ON DELETE CASCADE,
  fleet_number VARCHAR(50) NOT NULL,
  plate VARCHAR(20) NOT NULL,
  uf VARCHAR(5) NOT NULL,
  category VARCHAR(100) NOT NULL,
  priority VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'Aberta',
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  opened_by_user_id TEXT NOT NULL,
  opened_by_name VARCHAR(255) NOT NULL,
  opened_by_role VARCHAR(100) NOT NULL,
  assigned_to_user_id TEXT,
  assigned_to_name VARCHAR(255),
  assigned_role VARCHAR(100),
  directed_users JSONB DEFAULT '[]'::jsonb,
  directed_user_ids JSONB DEFAULT '[]'::jsonb,
  directed_roles JSONB DEFAULT '[]'::jsonb,
  resolution_notes TEXT,
  executed_by_user_id TEXT,
  executed_by_name VARCHAR(255),
  executed_by_role VARCHAR(100),
  executed_at TIMESTAMPTZ,
  closed_by_user_id TEXT,
  closed_by_name VARCHAR(255),
  closed_by_role VARCHAR(100),
  closed_at TIMESTAMPTZ,
  cost NUMERIC(12, 2) DEFAULT 0.00,
  images JSONB DEFAULT '[]'::jsonb,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para service_orders
CREATE INDEX IF NOT EXISTS idx_service_orders_code ON public.service_orders(code);
CREATE INDEX IF NOT EXISTS idx_service_orders_vehicle_id ON public.service_orders(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_status ON public.service_orders(status);
CREATE INDEX IF NOT EXISTS idx_service_orders_priority ON public.service_orders(priority);
CREATE INDEX IF NOT EXISTS idx_service_orders_category ON public.service_orders(category);
CREATE INDEX IF NOT EXISTS idx_service_orders_plate ON public.service_orders(plate);

-- ---------------------------------------------------------------------
-- 4. TABELA: notifications (Notificações e Alertas do Sistema)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
  id TEXT PRIMARY KEY,
  type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  vehicle_id TEXT,
  fleet_number VARCHAR(50),
  plate VARCHAR(20),
  os_code VARCHAR(50),
  doc_type VARCHAR(100),
  equipment_description VARCHAR(255),
  equipment_tag VARCHAR(100),
  days_remaining INTEGER,
  days_diff INTEGER,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para notifications
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);

-- ---------------------------------------------------------------------
-- 5. TABELA: vehicle_documents (Documentos Individuais da Frota)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vehicle_documents (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  doc_type VARCHAR(50) NOT NULL, -- CRLV, CIV, CIPP, Tacógrafo
  number VARCHAR(100),
  issue_date DATE,
  expiry_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'valid',
  file_url TEXT,
  file_name VARCHAR(255),
  file_type VARCHAR(100),
  file_size BIGINT,
  notes TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para vehicle_documents
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_vehicle_id ON public.vehicle_documents(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_expiry_date ON public.vehicle_documents(expiry_date);
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_doc_type ON public.vehicle_documents(doc_type);

-- ---------------------------------------------------------------------
-- 6. TABELA: vehicle_attachments (Anexos e Documentos Gerais do Veículo)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vehicle_attachments (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  data_url TEXT NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  file_size BIGINT DEFAULT 0,
  category VARCHAR(100) NOT NULL,
  number VARCHAR(100),
  issue_date DATE,
  expiry_date DATE,
  notes TEXT,
  uploaded_by VARCHAR(255),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_attachments_vehicle ON public.vehicle_attachments(vehicle_id);

-- ---------------------------------------------------------------------
-- 7. TABELA: vehicle_equipments (Equipamentos Calibráveis: Manômetros, Válvulas)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vehicle_equipments (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  description VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  tag VARCHAR(100),
  certificate_number VARCHAR(100),
  calibration_date DATE,
  next_calibration_date DATE NOT NULL,
  status VARCHAR(50) DEFAULT 'valid',
  notes TEXT,
  file_url TEXT,
  file_name VARCHAR(255),
  file_type VARCHAR(100),
  file_size BIGINT,
  uploaded_by VARCHAR(255),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_equipments_vehicle ON public.vehicle_equipments(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_equipments_calib ON public.vehicle_equipments(next_calibration_date);

-- ---------------------------------------------------------------------
-- 8. TABELA: service_order_attachments (Anexos e Fotos de OS)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.service_order_attachments (
  id TEXT PRIMARY KEY,
  service_order_id TEXT NOT NULL REFERENCES public.service_orders(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  data_url TEXT NOT NULL,
  size BIGINT DEFAULT 0,
  type VARCHAR(100),
  uploaded_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_so_attachments_so_id ON public.service_order_attachments(service_order_id);

-- ---------------------------------------------------------------------
-- 9. TABELA: notification_settings (Configurações do Sistema)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'default',
  sender_email VARCHAR(255) DEFAULT 'notificacoes@gestaofrotas.com.br',
  days_threshold INTEGER DEFAULT 30,
  auto_email_on_new_os BOOLEAN DEFAULT TRUE,
  auto_email_on_expiring_doc BOOLEAN DEFAULT TRUE,
  recipients_list JSONB DEFAULT '[]'::jsonb,
  critical_days_threshold INTEGER DEFAULT 7,
  sound_alert_enabled BOOLEAN DEFAULT TRUE,
  popup_alert_enabled BOOLEAN DEFAULT TRUE,
  browser_push_enabled BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Inserir configuração padrão inicial
INSERT INTO public.notification_settings (id, sender_email, days_threshold, auto_email_on_new_os, auto_email_on_expiring_doc, recipients_list, critical_days_threshold, sound_alert_enabled, popup_alert_enabled, browser_push_enabled)
VALUES ('default', 'notificacoes@gestaofrotas.com.br', 30, TRUE, TRUE, '["danjs23@gmail.com", "helio.knapp@agblogistica.com"]'::jsonb, 7, TRUE, TRUE, FALSE)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------
-- 10. TABELA: audit_logs (Logs de Auditoria e Rastreabilidade)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  user_name VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id TEXT,
  details JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);

-- =====================================================================
-- HABILITAR ROW LEVEL SECURITY (RLS) E POLÍTICAS DE ACESSO
-- Permite leitura e escrita completa para a chave anon do Supabase
-- =====================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_equipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_order_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso público/anon para a aplicação
DROP POLICY IF EXISTS "Permitir tudo em users" ON public.users;
CREATE POLICY "Permitir tudo em users" ON public.users FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo em vehicles" ON public.vehicles;
CREATE POLICY "Permitir tudo em vehicles" ON public.vehicles FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo em service_orders" ON public.service_orders;
CREATE POLICY "Permitir tudo em service_orders" ON public.service_orders FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo em notifications" ON public.notifications;
CREATE POLICY "Permitir tudo em notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo em vehicle_documents" ON public.vehicle_documents;
CREATE POLICY "Permitir tudo em vehicle_documents" ON public.vehicle_documents FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo em vehicle_attachments" ON public.vehicle_attachments;
CREATE POLICY "Permitir tudo em vehicle_attachments" ON public.vehicle_attachments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo em vehicle_equipments" ON public.vehicle_equipments;
CREATE POLICY "Permitir tudo em vehicle_equipments" ON public.vehicle_equipments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo em service_order_attachments" ON public.service_order_attachments;
CREATE POLICY "Permitir tudo em service_order_attachments" ON public.service_order_attachments FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo em notification_settings" ON public.notification_settings;
CREATE POLICY "Permitir tudo em notification_settings" ON public.notification_settings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Permitir tudo em audit_logs" ON public.audit_logs;
CREATE POLICY "Permitir tudo em audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

-- Notificar PostgREST para recarregar o schema cache
NOTIFY pgrst, 'reload schema';
