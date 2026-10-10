import React, { useState } from 'react';
import { Truck, Eye, EyeOff, KeyRound } from 'lucide-react';
import { useFleet } from '../context/FleetContext';
import { ForgotPasswordModal } from './modals/ForgotPasswordModal';

export const LoginScreen: React.FC = () => {
  const { login } = useFleet();
  const [email, setEmail] = useState('daniel.jesus@linde.com');
  const [password, setPassword] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Por favor informe o seu e-mail');
      return;
    }
    const success = login(email);
    if (!success) {
      setError('Credenciais inválidas');
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0a1529] text-white relative flex items-center justify-center p-6 overflow-hidden">
      {/* Background Decorative Rings */}
      <div className="absolute inset-0 pointer-events-none opacity-20 flex items-center justify-center">
        <div className="w-[600px] h-[600px] rounded-full border border-slate-600/40 absolute -left-20"></div>
        <div className="w-[900px] h-[900px] rounded-full border border-slate-600/30 absolute -left-60"></div>
        <div className="w-[1200px] h-[1200px] rounded-full border border-slate-600/20 absolute -left-96"></div>
      </div>

      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 gap-12 items-center z-10">
        {/* Left Brand Area */}
        <div className="lg:col-span-7 space-y-8">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#ea580c] to-[#ff5500] flex items-center justify-center text-white shadow-xl shadow-orange-950/40">
              <Truck className="w-8 h-8 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-3xl lg:text-4xl font-black text-white tracking-wider leading-none uppercase font-sans">
                Gestão Frotas
              </h1>
              <p className="text-sm font-bold tracking-widest text-[#ff6600] uppercase mt-1">
                Sistema de Controle
              </p>
            </div>
          </div>

          <div className="space-y-4 pt-2">
            {[
              'Gestão completa de veículos e documentos',
              'Ordens de serviço com rastreabilidade',
              'Controle de validades de documentos',
              'Caminhões, Carretas e Cavalos Mecânicos',
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff5500] shrink-0 shadow-sm shadow-orange-500"></span>
                <span className="text-slate-200 text-sm md:text-base font-normal">
                  {item}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right Form Card */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-3xl p-8 shadow-2xl text-slate-900 border border-slate-100">
            <div className="mb-6">
              <h2 className="text-xl font-black text-slate-900 tracking-tight uppercase">
                Acesso ao Sistema
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Entre com suas credenciais para continuar
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  E-mail
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#ff5500] focus:border-transparent transition"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Senha
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-xs font-bold text-[#ff5500] hover:text-[#e64d00] hover:underline cursor-pointer"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#ff5500] focus:border-transparent transition pr-10"
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

              <button
                type="submit"
                className="w-full mt-2 bg-[#ff5500] hover:bg-[#e64d00] text-white font-bold py-3 px-4 rounded-xl text-sm shadow-lg shadow-orange-500/25 transition active:scale-[0.98] cursor-pointer"
              >
                Entrar
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Modal de Recuperação de Senha por E-mail ou Celular Cadastrado */}
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        initialIdentifier={email}
        onPasswordResetSuccess={(resetEmail) => {
          setEmail(resetEmail);
          setPassword('');
        }}
      />
    </div>
  );
};
