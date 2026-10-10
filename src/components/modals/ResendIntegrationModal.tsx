import React, { useState, useEffect } from 'react';
import { 
  X, 
  Mail, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  ExternalLink, 
  RefreshCw, 
  Key, 
  ShieldCheck,
  Check,
  Copy,
  Terminal,
  Zap,
  HelpCircle
} from 'lucide-react';
import { emailService, ResendStatus, EmailSendResult } from '../../services/emailService';
import { useFleet } from '../../context/FleetContext';

interface ResendIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ResendIntegrationModal: React.FC<ResendIntegrationModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { currentUser, settings } = useFleet();
  const [status, setStatus] = useState<ResendStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);
  const [testResult, setTestResult] = useState<EmailSendResult | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const fetchStatus = async () => {
    setLoadingStatus(true);
    try {
      const data = await emailService.checkStatus();
      setStatus(data);
      if (data.ownerEmail) {
        setTestEmail(data.ownerEmail);
      }
    } catch {
      // ignore
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      setTestResult(null);
      if (currentUser?.email) {
        setTestEmail(currentUser.email);
      }
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleSendTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testEmail) return;
    setSendingTest(true);
    setTestResult(null);
    try {
      const result = await emailService.sendTestEmail(testEmail);
      setTestResult(result);
    } catch (err: any) {
      setTestResult({ success: false, error: err.message || 'Falha no envio.' });
    } finally {
      setSendingTest(false);
    }
  };

  const copyEnvSnippet = () => {
    navigator.clipboard.writeText('RESEND_API_KEY="re_..."\nRESEND_FROM_EMAIL="Gestão Frotas <onboarding@resend.dev>"');
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center shadow-md shrink-0">
              <Mail className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-slate-900 tracking-tight">
                  Integração Resend
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-900 text-white">
                  Email API
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Envio transacional de e-mails para recuperação de senha e notificações
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
          
          {/* Status Card */}
          <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
            status?.configured 
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950' 
              : 'bg-amber-50/70 border-amber-200 text-amber-950'
          }`}>
            <div className="flex items-center gap-3 min-w-0">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                status?.configured ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'
              }`}>
                {status?.configured ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-xs sm:text-sm">
                  {status?.configured 
                    ? (status.isSandbox ? 'Resend Conectado (Modo Sandbox Ativo)' : 'Resend Conectado e Operacional')
                    : 'Modo Demonstração (Simulação Ativa)'}
                </p>
                <p className="text-[11px] opacity-80 truncate">
                  {status?.configured 
                    ? `Chave ${status.maskedKey || 'detectada'} · Remetente: ${status.fromEmail}${status.isSandbox && status.ownerEmail ? ` · Destinatário: ${status.ownerEmail}` : ''}`
                    : 'Aguardando chave RESEND_API_KEY no ambiente para disparo de e-mails reais.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={fetchStatus}
              disabled={loadingStatus}
              className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-slate-900 transition shrink-0 cursor-pointer shadow-2xs"
              title="Atualizar status"
            >
              <RefreshCw className={`w-4 h-4 ${loadingStatus ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Test Dispatch Form */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Zap className="w-4 h-4 text-[#ff5500]" />
                <span>Testar Envio em Tempo Real</span>
              </h4>
              <span className="text-[10px] text-slate-400">Verifique a entrega imediata</span>
            </div>

            <form onSubmit={handleSendTest} className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                value={testEmail}
                onChange={e => setTestEmail(e.target.value)}
                placeholder="Digite seu e-mail para receber o teste"
                className="flex-1 px-4 py-2.5 bg-white border border-slate-300 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#ff5500]"
                required
              />
              <button
                type="submit"
                disabled={sendingTest}
                className="px-5 py-2.5 bg-[#ff5500] hover:bg-[#e64d00] text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 shrink-0 cursor-pointer"
              >
                {sendingTest ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Disparando...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Disparar E-mail</span>
                  </>
                )}
              </button>
            </form>

            {settings?.recipientsList && settings.recipientsList.length > 0 && (
              <div className="pt-1">
                <span className="text-[10px] text-slate-400 font-semibold block mb-1">
                  E-mails configurados para receber notificações:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {settings.recipientsList.map((rec, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setTestEmail(rec)}
                      className={`text-[11px] font-mono px-2 py-0.5 rounded-lg border transition cursor-pointer ${
                        testEmail.toLowerCase() === rec.toLowerCase()
                          ? 'bg-orange-100 border-[#ff5500] text-orange-950 font-bold'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                      title={`Clique para selecionar ${rec}`}
                    >
                      {rec}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {testResult && (
              <div className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}>
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-bold">
                    {testResult.success 
                      ? (testResult.simulated ? 'Disparo Simulado com Sucesso!' : 'E-mail Real Enviado com Sucesso via Resend!')
                      : 'Falha no Envio do Teste'}
                  </p>
                  <p className="text-[11px] mt-0.5 opacity-90">
                    {testResult.error || testResult.message || (testResult.id ? `ID de rastreio Resend: ${testResult.id}` : 'Verifique sua caixa de entrada ou spam.')}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Integration Guide */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Key className="w-4 h-4 text-[#ff5500]" />
              <span>Como Configurar o Resend Passo a Passo</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center">1</span>
                <p className="font-bold text-slate-900">Criar Conta no Resend</p>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Acesse <a href="https://resend.com" target="_blank" rel="noreferrer" className="text-[#ff5500] font-bold hover:underline inline-flex items-center gap-0.5">resend.com <ExternalLink className="w-2.5 h-2.5" /></a> e crie uma conta gratuita (inclui 3.000 e-mails/mês).
                </p>
              </div>

              <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center">2</span>
                <p className="font-bold text-slate-900">Gerar Chave de API</p>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  No menu lateral do Resend, clique em <strong>API Keys</strong> e crie uma nova chave com permissão de envio. A chave inicia com <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[10px]">re_...</code>.
                </p>
              </div>

              <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center">3</span>
                <p className="font-bold text-slate-900">Configurar as Variáveis</p>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Defina a variável <strong>RESEND_API_KEY</strong> no seu ambiente ou Secrets da plataforma.
                </p>
              </div>

              <div className="p-3.5 bg-white border border-slate-200 rounded-xl space-y-1">
                <span className="w-5 h-5 rounded-full bg-slate-900 text-white font-bold text-[10px] flex items-center justify-center">4</span>
                <p className="font-bold text-slate-900">Domínio ou Modo Teste</p>
                <p className="text-slate-500 text-[11px] leading-relaxed">
                  Para testar de imediato, use o remetente oficial de testes <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-[10px]">onboarding@resend.dev</code> (envia para o e-mail da sua conta Resend).
                </p>
              </div>
            </div>

            {/* Code Snippet */}
            <div className="bg-slate-900 text-slate-200 p-3.5 rounded-xl border border-slate-800 text-xs font-mono relative">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Variáveis de Ambiente (.env)</span>
                <button
                  type="button"
                  onClick={copyEnvSnippet}
                  className="flex items-center gap-1 text-[11px] text-[#ff5500] hover:text-orange-400 cursor-pointer"
                >
                  {copiedKey ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedKey ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
              <p className="text-emerald-400">RESEND_API_KEY="re_1234567890abcdef"</p>
              <p className="text-slate-400 mt-1">RESEND_FROM_EMAIL="Gestão Frotas &lt;onboarding@resend.dev&gt;"</p>
            </div>
          </div>

          {/* Active Features Supported */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#ff5500]" />
              <span>Onde o Resend atua na plataforma:</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-orange-50/50 border border-orange-200/60 text-slate-800">
                <p className="font-bold text-[#ff5500]">🔑 Recuperação de Senha</p>
                <p className="text-[11px] text-slate-600 mt-0.5">Envio de código numérico de 6 dígitos seguro para o e-mail do usuário.</p>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-50/50 border border-blue-200/60 text-slate-800">
                <p className="font-bold text-blue-700">📋 Ordens de Serviço</p>
                <p className="text-[11px] text-slate-600 mt-0.5">Notificação em tempo real de abertura, resolução e encerramento de OS.</p>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-50/50 border border-purple-200/60 text-slate-800">
                <p className="font-bold text-purple-700">📑 Validade de Documentos</p>
                <p className="text-[11px] text-slate-600 mt-0.5">Alertas automáticos de vencimento de CRLV, CIV, CIPP e Tacógrafo.</p>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
          <a
            href="https://resend.com/docs"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-semibold text-slate-500 hover:text-slate-900 inline-flex items-center gap-1.5"
          >
            <HelpCircle className="w-4 h-4" />
            <span>Documentação Oficial Resend</span>
          </a>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
