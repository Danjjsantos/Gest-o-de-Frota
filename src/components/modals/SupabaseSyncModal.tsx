import React, { useState, useEffect } from 'react';
import { 
  X, 
  Database, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Copy, 
  Download, 
  ExternalLink, 
  UploadCloud, 
  DownloadCloud, 
  Server, 
  Table, 
  ShieldCheck, 
  Info,
  Check
} from 'lucide-react';
import { SupabaseService, TableStatusInfo, SupabaseHealthResult } from '../../services/supabaseService';
import { getSupabaseConfig, saveSupabaseConfig } from '../../services/supabaseClient';
import { SUPABASE_SCHEMA_SQL } from '../../data/supabaseSchemaSql';
import { useFleet } from '../../context/FleetContext';

interface SupabaseSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'status' | 'sql' | 'sync' | 'config';

export const SupabaseSyncModal: React.FC<SupabaseSyncModalProps> = ({ isOpen, onClose }) => {
  const { vehicles, serviceOrders, users, notifications, setVehicles, setServiceOrders, setUsers } = useFleet();

  const [activeTab, setActiveTab] = useState<TabType>('status');
  const [loading, setLoading] = useState(false);
  const [health, setHealth] = useState<SupabaseHealthResult | null>(null);
  const [copied, setCopied] = useState(false);

  // Sync action state
  const [syncLoading, setSyncLoading] = useState(false);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);

  // Configuration state
  const [urlInput, setUrlInput] = useState('');
  const [keyInput, setKeyInput] = useState('');
  const [configSuccess, setConfigSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      const config = getSupabaseConfig();
      setUrlInput(config.url);
      setKeyInput(config.anonKey);
      loadHealthStatus();
    }
  }, [isOpen]);

  const loadHealthStatus = async () => {
    setLoading(true);
    try {
      const result = await SupabaseService.checkTablesStatus();
      setHealth(result);
    } catch (err: any) {
      console.error('Erro ao verificar saúde do Supabase:', err);
    } finally {
      setLoading(false);
    }
  };

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setSyncLogs(prev => [`[${time}] ${msg}`, ...prev.slice(0, 19)]);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SCHEMA_SQL);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownloadSql = () => {
    const element = document.createElement('a');
    const file = new Blob([SUPABASE_SCHEMA_SQL], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = 'gestao_frotas_supabase_schema.sql';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  // Push local data to Supabase
  const handlePushData = async () => {
    setSyncLoading(true);
    setSyncSuccessMessage(null);
    addLog(`Iniciando sincronização local para Supabase...`);
    addLog(`Registros preparados: ${vehicles.length} veículos, ${serviceOrders.length} ordens de serviço, ${users.length} usuários.`);

    try {
      const res = await SupabaseService.pushAll(vehicles, serviceOrders, users, notifications);

      if (res.errors.length > 0) {
        res.errors.forEach(err => addLog(`Aviso: ${err}`));
      }

      addLog(`Sincronização concluída! Gravados com sucesso: ${res.vehiclesCount} veículos, ${res.ordersCount} OSs, ${res.usersCount} usuários.`);
      setSyncSuccessMessage(`Dados enviados com sucesso para o Supabase! (${res.vehiclesCount} veículos, ${res.ordersCount} OSs, ${res.usersCount} usuários)`);
      
      // Refresh table count
      await loadHealthStatus();
    } catch (err: any) {
      addLog(`Falha na sincronização: ${err.message}`);
    } finally {
      setSyncLoading(false);
    }
  };

  // Pull data from Supabase
  const handlePullData = async () => {
    setSyncLoading(true);
    setSyncSuccessMessage(null);
    addLog(`Buscando dados remotos do Supabase...`);

    try {
      const data = await SupabaseService.fetchAll();

      if (data.vehicles.length === 0 && data.serviceOrders.length === 0 && data.users.length === 0) {
        addLog(`Nenhum dado encontrado no Supabase para carregar.`);
        setSyncSuccessMessage('O banco de dados Supabase ainda está vazio. Utilize o botão "Enviar Dados Locais" para popular.');
      } else {
        if (data.vehicles.length > 0) {
          setVehicles(data.vehicles);
          addLog(`Importados ${data.vehicles.length} veículos.`);
        }
        if (data.serviceOrders.length > 0) {
          setServiceOrders(data.serviceOrders);
          addLog(`Importadas ${data.serviceOrders.length} ordens de serviço.`);
        }
        if (data.users.length > 0) {
          setUsers(data.users);
          addLog(`Importados ${data.users.length} usuários.`);
        }
        setSyncSuccessMessage(`Dados atualizados do Supabase com sucesso! (${data.vehicles.length} veículos, ${data.serviceOrders.length} OSs)`);
      }
      await loadHealthStatus();
    } catch (err: any) {
      addLog(`Erro ao carregar dados: ${err.message}`);
    } finally {
      setSyncLoading(false);
    }
  };

  // Save manual config
  const handleSaveConfig = () => {
    saveSupabaseConfig(urlInput, keyInput);
    setConfigSuccess('Configurações salvas com sucesso!');
    setTimeout(() => setConfigSuccess(null), 3000);
    loadHealthStatus();
  };

  if (!isOpen) return null;

  const totalCreated = health?.tables.filter(t => t.exists).length || 0;
  const totalTables = health?.tables.length || 10;
  const projectRef = health?.url.match(/https?:\/\/([^.]+)\.supabase/)?.[1] || '';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 backdrop-blur flex items-center justify-center border border-white/20">
              <Database className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-tight">Integração Supabase</h2>
                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-emerald-500/40 text-emerald-100 border border-emerald-400/30">
                  PostgreSQL
                </span>
              </div>
              <p className="text-xs text-emerald-100/90">
                Tabelas e persistência na nuvem para o Sistema de Gestão de Frotas
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {health?.connected ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/25 text-white border border-emerald-400/40">
                <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse"></span>
                Conectado {health.pingMs ? `(${health.pingMs}ms)` : ''}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/30 text-amber-100 border border-amber-400/40">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-200" />
                Aguardando Conexão
              </span>
            )}

            <button 
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 px-6">
          <button
            onClick={() => setActiveTab('status')}
            className={`py-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'status'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Table className="w-4 h-4" />
            Tabelas do Sistema ({totalCreated}/{totalTables})
          </button>
          <button
            onClick={() => setActiveTab('sql')}
            className={`py-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'sql'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Server className="w-4 h-4" />
            Script SQL (Schema DDL)
          </button>
          <button
            onClick={() => setActiveTab('sync')}
            className={`py-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'sync'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <UploadCloud className="w-4 h-4" />
            Sincronização de Dados
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`py-3 px-4 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
              activeTab === 'config'
                ? 'border-emerald-600 text-emerald-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Configurações de Acesso
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: TABELAS DO SISTEMA */}
          {activeTab === 'status' && (
            <div className="space-y-6">
              {/* Quick Status Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="text-xs text-slate-500 font-medium">Instância Supabase</div>
                  <div className="text-sm font-bold text-slate-800 mt-1 truncate" title={health?.url}>
                    {projectRef ? `${projectRef}.supabase.co` : health?.url || 'Configurado'}
                  </div>
                  <div className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Autenticação Anon Key Ativa
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <div className="text-xs text-slate-500 font-medium">Status das Tabelas</div>
                  <div className="text-lg font-bold text-slate-800 mt-1 flex items-center gap-2">
                    <span>{totalCreated} de {totalTables} criadas</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full mt-2 overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${(totalCreated / totalTables) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">Ação Rápida</span>
                    <button
                      onClick={loadHealthStatus}
                      disabled={loading}
                      className="text-xs text-emerald-700 hover:text-emerald-800 font-medium flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                      Atualizar
                    </button>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={() => setActiveTab('sql')}
                      className="w-full py-1.5 px-3 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"
                    >
                      Copiar SQL Completo
                    </button>
                  </div>
                </div>
              </div>

              {/* Table List */}
              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="bg-slate-100/80 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-800">
                    Tabelas Necessárias para o Sistema de Frotas
                  </h3>
                  <span className="text-xs text-slate-500">
                    Todas compatíveis com PostgreSQL & Supabase REST API
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {health?.tables.map((tbl: TableStatusInfo) => (
                    <div key={tbl.name} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <code className="text-xs font-mono font-semibold px-2 py-0.5 bg-slate-100 text-slate-800 rounded border border-slate-200">
                            public.{tbl.name}
                          </code>
                          <span className="text-sm font-semibold text-slate-900">{tbl.label}</span>
                        </div>
                        <p className="text-xs text-slate-500">{tbl.description}</p>
                      </div>

                      <div className="flex items-center gap-3">
                        {tbl.exists ? (
                          <div className="text-right">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Criada ({tbl.count} {tbl.count === 1 ? 'registro' : 'registros'})
                            </span>
                          </div>
                        ) : (
                          <div className="text-right">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Pendente (Executar SQL)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Helper Banner */}
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3">
                <Info className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-semibold">Como disponibilizar todas as tabelas no Supabase?</p>
                  <p className="text-emerald-800 leading-relaxed">
                    Acesse a aba <strong>Script SQL (Schema DDL)</strong>, copie o script completo com 1 clique e cole no <strong>SQL Editor</strong> do seu painel Supabase. 
                    O script cria todas as tabelas com integridade referencial, índices para alta performance e políticas de Row Level Security (RLS).
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SCRIPT SQL SCHEMA */}
          {activeTab === 'sql' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Script DDL PostgreSQL para Supabase</h3>
                  <p className="text-xs text-slate-500">
                    Inclui todas as 10 tabelas, índices de busca, relacionamentos e permissões RLS.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopySql}
                    className="py-1.5 px-3 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition flex items-center gap-1.5 shadow-sm"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? 'Copiado!' : 'Copiar Script SQL'}
                  </button>

                  <button
                    onClick={handleDownloadSql}
                    className="py-1.5 px-3 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 transition flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Baixar schema.sql
                  </button>

                  {projectRef && (
                    <a
                      href={`https://supabase.com/dashboard/project/${projectRef}/sql`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="py-1.5 px-3 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition flex items-center gap-1.5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Abrir SQL Editor
                    </a>
                  )}
                </div>
              </div>

              {/* Code Box */}
              <div className="relative rounded-xl border border-slate-700 bg-slate-950 p-4 font-mono text-xs text-slate-200 max-h-[420px] overflow-y-auto leading-relaxed shadow-inner">
                <pre>{SUPABASE_SCHEMA_SQL}</pre>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600 flex items-center justify-between">
                <span>
                  O script também está disponível publicamente na rota <code>/supabase/schema.sql</code>.
                </span>
                <span className="text-emerald-700 font-semibold">
                  100% Compatível com Supabase REST API & JavaScript Client
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: SINCRONIZAÇÃO DE DADOS */}
          {activeTab === 'sync' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Push Card */}
                <div className="p-5 border border-slate-200 rounded-xl bg-slate-50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                      <UploadCloud className="w-4 h-4 text-emerald-600" />
                      Enviar Dados Locais para o Supabase
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Envia todos os veículos cadastrados ({vehicles.length}), ordens de serviço ({serviceOrders.length}), usuários ({users.length}) e alertas para o banco Supabase.
                    </p>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={handlePushData}
                      disabled={syncLoading}
                      className="w-full py-2.5 px-4 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition flex items-center justify-center gap-2 shadow"
                    >
                      {syncLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UploadCloud className="w-4 h-4" />}
                      Sincronizar Dados Locais para o Supabase
                    </button>
                  </div>
                </div>

                {/* Pull Card */}
                <div className="p-5 border border-slate-200 rounded-xl bg-slate-50 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                      <DownloadCloud className="w-4 h-4 text-teal-600" />
                      Carregar Dados do Supabase
                    </div>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Carrega os registros mais recentes armazenados nas tabelas do Supabase e sincroniza a aplicação local com o banco de dados.
                    </p>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={handlePullData}
                      disabled={syncLoading}
                      className="w-full py-2.5 px-4 text-xs font-bold rounded-lg bg-teal-600 text-white hover:bg-teal-700 disabled:opacity-50 transition flex items-center justify-center gap-2 shadow"
                    >
                      {syncLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <DownloadCloud className="w-4 h-4" />}
                      Carregar do Supabase para o Sistema
                    </button>
                  </div>
                </div>
              </div>

              {syncSuccessMessage && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  {syncSuccessMessage}
                </div>
              )}

              {/* Sync Terminal Logs */}
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                  <span className="text-xs font-mono text-slate-400">Terminal de Sincronização</span>
                  <span className="text-xs text-slate-500">Logs em Tempo Real</span>
                </div>
                <div className="font-mono text-xs text-emerald-400 space-y-1.5 max-h-48 overflow-y-auto">
                  {syncLogs.length === 0 ? (
                    <span className="text-slate-500">Pronto para sincronização. Selecione uma ação acima.</span>
                  ) : (
                    syncLogs.map((log, idx) => (
                      <div key={idx} className="leading-relaxed">{log}</div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CONFIGURAÇÕES */}
          {activeTab === 'config' && (
            <div className="space-y-4 max-w-2xl">
              <div className="border border-slate-200 rounded-xl p-5 bg-slate-50 space-y-4">
                <h3 className="text-sm font-bold text-slate-800">Credenciais do Projeto Supabase</h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  As credenciais padrão foram carregadas automaticamente das variáveis de ambiente do projeto. Você pode personalizar ou alterar o projeto aqui se desejar.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Supabase Project URL
                    </label>
                    <input
                      type="text"
                      value={urlInput}
                      onChange={(e) => setUrlInput(e.target.value)}
                      placeholder="https://seu-projeto.supabase.co"
                      className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Supabase Anon / Public Key
                    </label>
                    <input
                      type="password"
                      value={keyInput}
                      onChange={(e) => setKeyInput(e.target.value)}
                      placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                      className="w-full text-xs font-mono px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                    />
                  </div>

                  {configSuccess && (
                    <div className="p-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-xs font-medium">
                      {configSuccess}
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        const envUrl = (import.meta.env.VITE_SUPABASE_URL as string) || '';
                        const envKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || '';
                        setUrlInput(envUrl);
                        setKeyInput(envKey);
                        saveSupabaseConfig(envUrl, envKey);
                        setConfigSuccess('Restaurado para os valores de ambiente do sistema!');
                        setTimeout(() => setConfigSuccess(null), 3000);
                        loadHealthStatus();
                      }}
                      className="text-xs text-slate-600 hover:text-slate-900 underline"
                    >
                      Restaurar valores de ambiente
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveConfig}
                      className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition shadow"
                    >
                      Salvar Alterações
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Integração Supabase ativa para Gestão de Frotas</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-slate-200 text-slate-700 hover:bg-slate-300 transition"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
