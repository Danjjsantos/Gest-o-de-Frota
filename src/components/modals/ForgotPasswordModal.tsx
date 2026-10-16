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
  ExternalLink
} from 'lucide-react';
import { useFleet } from '../../context/FleetContext';
import { User } from '../../types';
import { INITIAL_USERS } from '../../data/initialData';
import { emailService } from '../../services/emailService';
import { whatsappService } from '../../services/whatsappService';
import { getSupabaseClient } from '../../services/supabaseClient';
import { toFrontendUser } from '../../services/supabaseService';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialIdentifier?: string;
  onPasswordResetSuccess?: (email: string) => void;
}

type Step = 'identify' | 'verify' | 'new_password' | 'success';
type Channel = 'email' | 'whatsapp';

// Official WhatsApp icon component
const WhatsAppIcon: React.FC<{ className?: string }> = ({ className = 'w-4 h-4' }) => (
  <svg 
    className={className} 
    viewBox="0 0 24 24" 
    fill="currentColor"
    aria-hidden="true"
  >
    <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2M12.05 3.67C14.25 3.67 16.31 4.53 17.87 6.09C19.42 7.65 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15C10.56 20.15 9.11 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.8 13.47 3.8 11.91C3.81 7.37 7.5 3.67 12.05 3.67M9.05 7.42C8.86 7.42 8.54 7.49 8.27 7.78C8.01 8.08 7.27 8.77 7.27 10.18C7.27 11.59 8.3 12.95 8.44 13.14C8.59 13.33 10.43 16.16 13.27 17.38C15.63 18.4 16.11 18.2 16.63 18.15C17.15 18.1 18.3 17.47 18.54 16.79C18.78 16.11 18.78 15.53 18.71 15.41C18.64 15.29 18.44 15.22 18.15 15.08C17.85 14.93 16.42 14.23 16.15 14.13C15.89 14.03 15.7 13.98 15.5 14.28C15.31 14.57 14.77 15.22 14.6 15.41C14.44 15.61 14.27 15.63 13.98 15.49C13.69 15.34 12.75 15.03 11.63 14.04C10.76 13.26 10.17 12.3 10.02 12.05C9.88 11.81 10.01 11.67 10.15 11.53C10.28 11.4 10.45 11.18 10.6 11.01C10.74 10.84 10.79 10.72 10.89 10.52C10.99 10.33 10.94 10.16 10.87 10.01C10.79 9.87 10.21 8.43 9.97 7.84C9.73 7.28 9.49 7.35 9.32 7.35C9.15 7.34 8.95 7.34 8.76 7.34L9.05 7.42Z" />
  </svg>
);

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

  // Verification code state (held in memory for validation, NEVER exposed on the screen)
  const [generatedCode, setGeneratedCode] = useState('');
  const [enteredCode, setEnteredCode] = useState('');
  const [countdownCooldown, setCountdownCooldown] = useState(0);
  const [whatsappUrl, setWhatsappUrl] = useState('');

  // New password state
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);

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

  // Only reset state when modal actually opens
  useEffect(() => {
    if (isOpen) {
      setStep('identify');
      setIdentifier(initialIdentifier || '');
      setError('');
      setEnteredCode('');
      setNewPassword('');
      setConfirmPassword('');
      setGeneratedCode('');
      setWhatsappUrl('');
      setCountdownCooldown(0);

      // Check if initial identifier matches any user
      if (initialIdentifier) {
        const allCandidates = [...users, ...INITIAL_USERS];
        const match = findUser(initialIdentifier, allCandidates);
        if (match) {
          setTargetUser(match);
          setChannel(initialIdentifier.includes('@') ? 'email' : (match.phone ? 'whatsapp' : 'email'));
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
  const maskEmail = (emailStr?: string) => {
    if (!emailStr) return 'E-mail cadastrado';
    const parts = emailStr.split('@');
    if (parts.length !== 2) return emailStr;
    const name = parts[0];
    const domain = parts[1];
    if (name.length <= 2) return `${name}***@${domain}`;
    return `${name[0]}***${name[name.length - 1]}@${domain}`;
  };

  // Mask phone: (11) 9****-4321
  const maskPhone = (phoneStr?: string) => {
    if (!phoneStr) return 'WhatsApp cadastrado';
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
        setChannel('whatsapp');
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
      setError('Por favor, informe seu e-mail ou WhatsApp/celular cadastrado.');
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
      setError('Nenhum usuário cadastrado foi encontrado com esse e-mail ou WhatsApp. Verifique os dados digitados.');
      return;
    }

    setTargetUser(found);

    // If whatsapp chosen but user has no phone registered, fallback to email
    let effectiveChannel = channel;
    if (channel === 'whatsapp' && !found.phone) {
      effectiveChannel = 'email';
      setChannel('email');
    }

    // Generate secure 6-digit random code (never shown on screen)
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);
    setCountdownCooldown(30);
    setEnteredCode('');

    try {
      if (effectiveChannel === 'email') {
        await emailService.sendRecoveryCode(found.email, code, found.name);
      } else {
        const waResult = await whatsappService.sendRecoveryCode(
          found.phone || cleanIdentifier, 
          code, 
          found.name
        );
        if (waResult.whatsappUrl) {
          setWhatsappUrl(waResult.whatsappUrl);
        }
      }
      setStep('verify');
    } catch (err: any) {
      setError(err?.message || 'Falha ao despachar o código. Tente novamente.');
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleReenviarCodigo = async () => {
    if (countdownCooldown > 0 || !targetUser) return;
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);
    setCountdownCooldown(30);
    setError('');

    setIsSendingCode(true);
    try {
      if (channel === 'email') {
        await emailService.sendRecoveryCode(targetUser.email, code, targetUser.name);
      } else {
        const waResult = await whatsappService.sendRecoveryCode(
          targetUser.phone || identifier, 
          code, 
          targetUser.name
        );
        if (waResult.whatsappUrl) {
          setWhatsappUrl(waResult.whatsappUrl);
        }
      }
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleValidateCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!enteredCode.trim()) {
      setError('Por favor, digite o código de 6 dígitos recebido.');
      return;
    }

    if (enteredCode.trim() !== generatedCode.trim()) {
      setError('Código incorreto. Verifique a mensagem recebida no WhatsApp ou no E-mail e digite novamente.');
      return;
    }

    setStep('new_password');
    setError('');
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
                Informe o seu <strong>e-mail</strong> ou <strong>WhatsApp cadastrado</strong> para receber o código seguro de recuperação.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                  E-mail ou WhatsApp
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => handleIdentifierChange(e.target.value)}
                    placeholder="Ex: danjs23@gmail.com ou (11) 98765-4321"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-black placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ff5500] focus:bg-white transition"
                    autoFocus
                    required
                  />
                </div>
              </div>

              {/* Canal de envio selecionável: WhatsApp ou E-mail */}
              <div className="space-y-2 pt-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Como deseja receber o código?
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setChannel('whatsapp');
                      setError('');
                    }}
                    className={`p-3 rounded-xl border text-left flex flex-col gap-1 transition cursor-pointer ${
                      channel === 'whatsapp'
                        ? 'border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-500/20 shadow-xs'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${channel === 'whatsapp' ? 'bg-[#25D366] text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <WhatsAppIcon className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-slate-900">Por WhatsApp</span>
                    </div>
                    <span className="text-[10px] text-slate-500 truncate">
                      {targetUser?.phone ? maskPhone(targetUser.phone) : 'WhatsApp cadastrado'}
                    </span>
                  </button>

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
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center ${channel === 'email' ? 'bg-[#ff5500] text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <Mail className="w-3.5 h-3.5" />
                      </div>
                      <span className="text-xs font-bold text-slate-900">Por E-mail</span>
                    </div>
                    <span className="text-[10px] text-slate-500 truncate">
                      {targetUser?.email ? maskEmail(targetUser.email) : 'E-mail cadastrado'}
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

          {/* STEP 2: ENTER CODE (CODE IS NEVER SHOWN ON SCREEN) */}
          {step === 'verify' && (
            <form onSubmit={handleValidateCode} className="space-y-4">
              {channel === 'whatsapp' ? (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-950 space-y-2.5 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 font-bold text-emerald-900">
                    <div className="w-6 h-6 rounded-full bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <WhatsAppIcon className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-sm">Código enviado para o WhatsApp!</span>
                  </div>
                  
                  <p className="text-xs text-emerald-800 leading-relaxed">
                    O código de segurança foi enviado para o WhatsApp <strong>{maskPhone(targetUser?.phone || identifier)}</strong>.
                  </p>

                  {whatsappUrl && (
                    <div className="pt-1">
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-3 bg-[#25D366] hover:bg-[#20bd5a] text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-98"
                      >
                        <WhatsAppIcon className="w-4 h-4" />
                        <span>Abrir mensagem no WhatsApp</span>
                        <ExternalLink className="w-3.5 h-3.5 ml-auto opacity-70" />
                      </a>
                    </div>
                  )}
                  
                  <p className="text-[11px] text-emerald-700 italic">
                    Consulte a mensagem recebida e insira os 6 dígitos abaixo para prosseguir.
                  </p>
                </div>
              ) : (
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-950 space-y-2 animate-in fade-in duration-200">
                  <div className="flex items-center gap-2 font-bold text-blue-900">
                    <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-sm">Código enviado para o seu E-mail!</span>
                  </div>
                  <p className="text-xs text-blue-800 leading-relaxed">
                    O código de segurança foi enviado para <strong>{maskEmail(targetUser?.email || identifier)}</strong>.
                  </p>
                  <p className="text-[11px] text-blue-700 italic">
                    Verifique sua caixa de entrada ou spam e insira os 6 dígitos abaixo.
                  </p>
                </div>
              )}

              {/* Input for the user to type the received 6 digits */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider text-center">
                  Digite o código de 6 dígitos recebido
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
                  className="w-full text-center tracking-[0.5em] font-mono font-black text-2xl py-3 bg-slate-50 border border-slate-300 rounded-xl text-black placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#ff5500] focus:bg-white transition"
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
                  <span>Trocar e-mail ou WhatsApp</span>
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
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-black placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ff5500] focus:bg-white transition pr-10"
                    autoFocus
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer p-1"
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
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-black placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ff5500] focus:bg-white transition"
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
