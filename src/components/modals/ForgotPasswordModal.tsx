import React, { useState, useEffect } from 'react';
import { 
  X, 
  Mail, 
  KeyRound, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  ShieldCheck,
  Send,
  RefreshCw,
  Smartphone
} from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { User } from '../../types';
import { INITIAL_USERS } from '../../data/initialData';
import { emailService } from '../../services/emailService';
import { getSupabaseClient } from '../../services/supabaseClient';
import { toFrontendUser } from '../../services/supabaseService';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialIdentifier?: string;
  onPasswordResetSuccess?: (email: string) => void;
}

type Step = 'identify' | 'verify' | 'new_password' | 'success';
type Channel = 'email' | 'phone';

export const ForgotPasswordModal: React.FC<ForgotPasswordModalProps> = ({
  isOpen,
  onClose,
  initialIdentifier = '',
  onPasswordResetSuccess,
}) => {
  const { users, updateUser, login } = useFleet();

  const [step, setStep] = useState<Step>('identify');
  const [identifier, setIdentifier] = useState(initialIdentifier);
  const [channel, setChannel] = useState<Channel>('email');
  const [targetUser, setTargetUser] = useState<User | null>(null);

  // Verification code state
  const [generatedCode, setGeneratedCode] = useState('');
  const [enteredCode, setEnteredCode] = useState('');
  const [countdownCooldown, setCountdownCooldown] = useState(0);

  // New password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState('');
  const [infoMessage, setInfoMessage] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [deliveryStatusInfo, setDeliveryStatusInfo] = useState<{ simulated: boolean; realSent: boolean }>({ simulated: true, realSent: false });

  // Helper function to find a user by email, phone digits, or name
  const findUser = (input: string, userList: User[]): User | undefined => {
    const clean = input.trim().toLowerCase();
    if (!clean) return undefined;
    const cleanDigits = input.replace(/\D/g, '');

    return userList.find(u => {
      // 1. Email exact match
      if (u.email && u.email.trim().toLowerCase() === clean) return true;
      // 2. Name exact match
      if (u.name && u.name.trim().toLowerCase() === clean) return true;
      // 3. Phone match
      if (u.phone && cleanDigits.length >= 8) {
        const uDigits = u.phone.replace(/\D/g, '');
        if (uDigits.length >= 8) {
          if (uDigits === cleanDigits) return true;
          if (uDigits.includes(cleanDigits) || cleanDigits.includes(uDigits)) return true;
          if (uDigits.slice(-8) === cleanDigits.slice(-8)) return true;
        }
      }
      return false;
    });
  };

  // Only reset state when modal actually opens (never when external state updates)
  useEffect(() => {
    if (isOpen) {
      setStep('identify');
      setIdentifier(initialIdentifier || '');
      setError('');
      setInfoMessage('');
      setEnteredCode('');
      setNewPassword('');
      setConfirmPassword('');
      setGeneratedCode('');
      setCountdownCooldown(0);

      // Check if initial identifier matches any user
      if (initialIdentifier) {
        const allCandidates = [...users, ...INITIAL_USERS];
        const match = findUser(initialIdentifier, allCandidates);
        if (match) {
          setTargetUser(match);
          setChannel(initialIdentifier.includes('@') ? 'email' : (match.phone ? 'phone' : 'email'));
        } else {
          setTargetUser(null);
        }
      } else {
        setTargetUser(null);
      }
    }
  }, [isOpen]);

  // Handle countdown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdownCooldown > 0) {
      timer = setTimeout(() => setCountdownCooldown(prev => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdownCooldown]);

  if (!isOpen) return null;

  // Mask email: d***s@linde.com
  const maskEmail = (emailStr: string) => {
    const parts = emailStr.split('@');
    if (parts.length !== 2) return emailStr;
    const name = parts[0];
    const domain = parts[1];
    if (name.length <= 2) return `${name}***@${domain}`;
    return `${name[0]}***${name[name.length - 1]}@${domain}`;
  };

  // Mask phone: (11) 9****-4321
  const maskPhone = (phoneStr: string) => {
    if (!phoneStr) return 'Celular não cadastrado';
    const clean = phoneStr.trim();
    if (clean.length < 8) return clean;
    const digits = clean.replace(/\D/g, '');
    if (digits.length >= 10) {
      const ddd = digits.slice(0, 2);
      const last4 = digits.slice(-4);
      return `(${ddd}) 9****-${last4}`;
    }
    return clean;
  };

  // Handler when user types or changes identifier in input
  const handleIdentifierChange = (value: string) => {
    setIdentifier(value);
    setError('');
    const clean = value.trim();
    if (!clean) {
      setTargetUser(null);
      return;
    }

    const allCandidates = [...users, ...INITIAL_USERS];
    const match = findUser(clean, allCandidates);
    if (match) {
      setTargetUser(match);
      if (clean.includes('@')) {
        setChannel('email');
      } else if (clean.replace(/\D/g, '').length >= 8 && match.phone) {
        setChannel('phone');
      }
    } else {
      setTargetUser(null);
    }
  };

  const handleSendCode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    const cleanIdentifier = identifier.trim();
    if (!cleanIdentifier) {
      setError('Por favor, informe seu e-mail ou celular cadastrado.');
      return;
    }

    setIsSendingCode(true);

    let found = targetUser || findUser(cleanIdentifier, [...users, ...INITIAL_USERS]);

    // If still not found, check directly on Supabase database in real-time
    if (!found) {
      const client = getSupabaseClient();
      if (client) {
        try {
          const { data: dbUsers } = await client.from('users').select('*');
          if (Array.isArray(dbUsers) && dbUsers.length > 0) {
            const mapped = dbUsers.map(toFrontendUser);
            found = findUser(cleanIdentifier, mapped);
          }
        } catch (dbErr) {
          console.debug('Aviso ao consultar Supabase para recuperação:', dbErr);
        }
      }
    }

    if (!found) {
      setIsSendingCode(false);
      setError('Nenhum usuário cadastrado foi encontrado com esse e-mail ou celular. Verifique os dados digitados.');
      return;
    }

    setTargetUser(found);

    // If phone chosen but user has no phone, switch to email
    let effectiveChannel = channel;
    if (channel === 'phone' && !found.phone) {
      effectiveChannel = 'email';
      setChannel('email');
    }

    // Generate random 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);
    setCountdownCooldown(30);
    setEnteredCode('');

    if (effectiveChannel === 'email') {
      try {
        const sendResult = await emailService.sendRecoveryCode(found.email, code, found.name);
        if (sendResult.success && !sendResult.simulated) {
          setDeliveryStatusInfo({ simulated: false, realSent: true });
          setInfoMessage(`E-mail com código enviado com sucesso para ${found.email}!`);
        } else {
          setDeliveryStatusInfo({ simulated: true, realSent: false });
          setInfoMessage(`Código gerado com sucesso para ${found.email}.`);
        }
      } catch {
        setDeliveryStatusInfo({ simulated: true, realSent: false });
      } finally {
        setIsSendingCode(false);
      }
    } else {
      setIsSendingCode(false);
      setDeliveryStatusInfo({ simulated: true, realSent: false });
      setInfoMessage(`Código de verificação enviado para o celular ${found.phone}!`);
    }

    setStep('verify');
  };

  const handleReenviarCodigo = async () => {
    if (countdownCooldown > 0) return;
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);
    setCountdownCooldown(30);
    setError('');

    if (channel === 'email' && targetUser) {
      setIsSendingCode(true);
      try {
        const result = await emailService.sendRecoveryCode(targetUser.email, code, targetUser.name);
        if (result.success && !result.simulated) {
          setDeliveryStatusInfo({ simulated: false, realSent: true });
          setInfoMessage(`Novo código enviado para ${targetUser.email}!`);
        } else {
          setDeliveryStatusInfo({ simulated: true, realSent: false });
          setInfoMessage(`Novo código gerado para ${targetUser.email}!`);
        }
      } finally {
        setIsSendingCode(false);
      }
    } else {
      setInfoMessage(`Novo código gerado para ${channel === 'email' ? targetUser?.email : targetUser?.phone}!`);
    }
  };

  const handleValidateCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!enteredCode.trim()) {
      setError('Por favor, digite o código de 6 dígitos.');
      return;
    }

    if (enteredCode.trim() !== generatedCode.trim()) {
      setError('Código incorreto. Verifique os dígitos informados e tente novamente.');
      return;
    }

    setStep('new_password');
    setError('');
    setInfoMessage('');
  };

  const handleSaveNewPassword = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem. Digite a mesma senha em ambos os campos.');
      return;
    }

    if (targetUser) {
      updateUser(targetUser.id, { password: newPassword });
      setStep('success');
      if (onPasswordResetSuccess) {
        onPasswordResetSuccess(targetUser.email);
      }
    }
  };

  const handleFinishAndLogin = () => {
    if (targetUser) {
      login(targetUser.email, newPassword || targetUser.password, true);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 text-[#ff5500] flex items-center justify-center shadow-xs">
              <KeyRound className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                Recuperação de Senha
              </h3>
              <p className="text-[11px] font-medium text-slate-500">
                Acesso seguro ao Gestão Frotas
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

        {/* Content Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-start gap-2 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: IDENTIFY & CHOOSE CHANNEL */}
          {step === 'identify' && (
            <form onSubmit={handleSendCode} className="space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Informe o seu <strong>e-mail corporativo</strong> ou o <strong>celular cadastrado</strong> para receber o código de segurança.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  E-mail ou Celular
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => handleIdentifierChange(e.target.value)}
                    placeholder="Ex: danjs23@gmail.com ou (11) 98765-4321"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#ff5500] focus:bg-white transition"
                    autoFocus
                    required
                  />
                </div>
              </div>

              {/* Canal de envio selecionável */}
              <div className="space-y-2 pt-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Onde deseja receber o código?
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setChannel('email');
                      setError('');
                    }}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition cursor-pointer ${
                      channel === 'email'
                        ? 'border-[#ff5500] bg-orange-50/50 ring-2 ring-orange-500/20 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Mail className={`w-4 h-4 ${channel === 'email' ? 'text-[#ff5500]' : 'text-slate-500'}`} />
                      <span className="text-xs font-bold text-slate-900">Por E-mail</span>
                    </div>
                    <span className="text-[10px] text-slate-500 truncate">
                      {targetUser?.email ? maskEmail(targetUser.email) : 'E-mail cadastrado'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setChannel('phone');
                      setError('');
                    }}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition cursor-pointer ${
                      channel === 'phone'
                        ? 'border-[#ff5500] bg-orange-50/50 ring-2 ring-orange-500/20 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Smartphone className={`w-4 h-4 ${channel === 'phone' ? 'text-[#ff5500]' : 'text-slate-500'}`} />
                      <span className="text-xs font-bold text-slate-900">Por Celular</span>
                    </div>
                    <span className="text-[10px] text-slate-500 truncate">
                      {targetUser?.phone ? maskPhone(targetUser.phone) : 'SMS Celular'}
                    </span>
                  </button>
                </div>
              </div>

              {targetUser && (
                <div className="p-3 bg-emerald-50 border border-emerald-200/90 rounded-xl flex items-center gap-2.5 text-xs text-emerald-900 animate-in fade-in duration-150">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="truncate">
                    <span className="font-bold">{targetUser.name}</span>
                    <span className="text-emerald-700 block text-[11px]">{targetUser.role} · Usuário Localizado</span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSendingCode}
                className="w-full mt-2 bg-[#ff5500] hover:bg-[#e64d00] disabled:bg-slate-300 text-white font-bold py-3 px-4 rounded-xl text-xs sm:text-sm shadow-md shadow-orange-500/20 transition active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSendingCode ? (
                  <span>Enviando código...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Enviar Código de Recuperação</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 2: ENTER CODE */}
          {step === 'verify' && (
            <form onSubmit={handleValidateCode} className="space-y-4">
              {channel === 'email' && deliveryStatusInfo.realSent ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>E-mail com código enviado!</span>
                  </div>
                  <p className="text-[11px] text-emerald-800 leading-relaxed">
                    O código foi despachado para: <strong>{targetUser?.email}</strong>. Verifique sua caixa de entrada ou spam.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    {channel === 'email' ? <Mail className="w-4 h-4 text-blue-600" /> : <Smartphone className="w-4 h-4 text-blue-600" />}
                    <span>Código gerado para envio!</span>
                  </div>
                  <p className="text-[11px] text-blue-800 leading-relaxed">
                    Destino: <strong>{channel === 'email' ? targetUser?.email : (targetUser?.phone || identifier)}</strong>.
                  </p>
                </div>
              )}

              {/* Simulation Banner with Quick Fill Button */}
              {generatedCode && (
                <div className="p-3 bg-amber-50 border border-amber-200/90 rounded-xl flex items-center justify-between gap-2">
                  <div className="text-[11px] text-amber-900">
                    <span className="block font-bold">Código de verificação ({channel === 'email' ? 'E-mail' : 'SMS'}):</span>
                    <span className="font-mono text-sm font-black text-amber-800 tracking-wider">Código: {generatedCode}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEnteredCode(generatedCode);
                      setError('');
                    }}
                    className="px-3 py-1.5 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition shrink-0 cursor-pointer shadow-xs active:scale-95"
                  >
                    Preencher código
                  </button>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider text-center">
                  Digite o código de 6 dígitos
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={enteredCode}
                  onChange={(e) => {
                    setEnteredCode(e.target.value.replace(/\D/g, ''));
                    setError('');
                  }}
                  placeholder="000000"
                  className="w-full text-center tracking-[0.5em] font-mono font-black text-2xl py-3 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#ff5500] focus:bg-white transition"
                  autoFocus
                  required
                />
              </div>

              <div className="flex items-center justify-between text-xs pt-1">
                <button
                  type="button"
                  onClick={() => setStep('identify')}
                  className="text-slate-500 hover:text-slate-800 flex items-center gap-1 font-semibold cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Trocar e-mail ou celular</span>
                </button>

                <button
                  type="button"
                  disabled={countdownCooldown > 0}
                  onClick={handleReenviarCodigo}
                  className={`flex items-center gap-1 font-bold ${
                    countdownCooldown > 0 ? 'text-slate-400 cursor-not-allowed' : 'text-[#ff5500] hover:underline cursor-pointer'
                  }`}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${countdownCooldown > 0 ? 'animate-spin' : ''}`} />
                  <span>{countdownCooldown > 0 ? `Reenviar em ${countdownCooldown}s` : 'Reenviar código'}</span>
                </button>
              </div>

              <button
                type="submit"
                className="w-full mt-2 bg-[#ff5500] hover:bg-[#e64d00] text-white font-bold py-3 px-4 rounded-xl text-xs sm:text-sm shadow-md shadow-orange-500/20 transition active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Validar Código</span>
              </button>
            </form>
          )}

          {/* STEP 3: NEW PASSWORD */}
          {step === 'new_password' && (
            <form onSubmit={handleSaveNewPassword} className="space-y-4">
              <div className="p-3 bg-emerald-50 border border-emerald-200/90 rounded-xl flex items-center gap-2 text-xs text-emerald-900">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Identidade confirmada para <strong>{targetUser?.name}</strong>. Crie sua nova senha abaixo.</span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Nova Senha
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#ff5500] focus:bg-white transition pr-10"
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  Confirmar Nova Senha
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repita a nova senha"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#ff5500] focus:bg-white transition"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full mt-2 bg-[#ff5500] hover:bg-[#e64d00] text-white font-bold py-3 px-4 rounded-xl text-xs sm:text-sm shadow-md shadow-orange-500/20 transition active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
              >
                <KeyRound className="w-4 h-4" />
                <span>Salvar Nova Senha</span>
              </button>
            </form>
          )}

          {/* STEP 4: SUCCESS */}
          {step === 'success' && (
            <div className="space-y-5 text-center py-2">
              <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner">
                <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
              </div>

              <div className="space-y-1">
                <h4 className="text-base font-black text-slate-900 tracking-tight">
                  Senha Redefinida com Sucesso!
                </h4>
                <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                  Sua nova senha de acesso foi registrada e sincronizada. Você já pode se autenticar na plataforma.
                </p>
              </div>

              <button
                type="button"
                onClick={handleFinishAndLogin}
                className="w-full bg-[#ff5500] hover:bg-[#e64d00] text-white font-bold py-3 px-4 rounded-xl text-xs sm:text-sm shadow-md shadow-orange-500/20 transition active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Entrar no Sistema Agora</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
