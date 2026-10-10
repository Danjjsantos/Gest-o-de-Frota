import React, { useState } from 'react';
import { X, Check, UserPlus, Phone, CreditCard } from 'lucide-react';
import { UserRole, UserAtribuicao } from '../../types';
import { useFleet } from '../../context/FleetContext';

interface NewUserModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewUserModal: React.FC<NewUserModalProps> = ({ isOpen, onClose }) => {
  const { addUser } = useFleet();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('Mecânico');
  const [atribuicoes, setAtribuicoes] = useState<UserAtribuicao[]>(['Mecânica']);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const roles: UserRole[] = [
    'Motorista',
    'Mecânico',
    'Borracheiro',
    'Téc. Eletrica',
    'Téc. Driox',
    'Encarregado',
    'Monitor',
    'Gerente',
    'Administrador'
  ];

  const availableAtribuicoes: UserAtribuicao[] = [
    'Mecânica',
    'Elétrica',
    'Borracharia',
    'Driox',
    'Seva/Sacar',
    'Motora',
    'Gestão Geral'
  ];

  const handleToggleAtribuicao = (atrib: UserAtribuicao) => {
    if (atribuicoes.includes(atrib)) {
      setAtribuicoes(atribuicoes.filter(a => a !== atrib));
    } else {
      setAtribuicoes([...atribuicoes, atrib]);
    }
  };

  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    // Auto-prefill intelligent default atribuições based on role
    if (newRole === 'Mecânico') {
      setAtribuicoes(['Mecânica']);
    } else if (newRole === 'Borracheiro') {
      setAtribuicoes(['Borracharia']);
    } else if (newRole === 'Téc. Eletrica') {
      setAtribuicoes(['Elétrica']);
    } else if (newRole === 'Téc. Driox') {
      setAtribuicoes(['Driox']);
    } else if (newRole === 'Monitor') {
      setAtribuicoes(['Seva/Sacar', 'Motora']);
    } else if (newRole === 'Motorista') {
      setAtribuicoes(['Motora']);
    } else if (newRole === 'Encarregado') {
      setAtribuicoes(['Gestão Geral', 'Mecânica']);
    } else if (newRole === 'Gerente' || newRole === 'Administrador') {
      setAtribuicoes(['Gestão Geral']);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      setError('Preencha o nome e e-mail do usuário');
      return;
    }
    if (atribuicoes.length === 0) {
      setError('Selecione ao menos uma atribuição técnica para direcionamento de OS');
      return;
    }

    addUser({
      name: name.trim(),
      email: email.trim(),
      password: password || '123456',
      role,
      atribuicoes,
      phone,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Fixed Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-[#ff5500] flex items-center justify-center shrink-0">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight uppercase font-sans">
                Cadastro de Novo Usuário
              </h3>
              <p className="text-xs text-slate-500">
                Cadastre profissionais e vincule suas atribuições técnicas
              </p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="m-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-100 shrink-0">
            {error}
          </div>
        )}

        {/* Scrollable Form Body with Custom Scrollbar */}
        <form id="new-user-form" onSubmit={handleSubmit} className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nome Completo *
            </label>
            <input
              type="text"
              placeholder="Ex: João da Silva"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#ff5500] focus:bg-white transition"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                E-mail de Acesso *
              </label>
              <input
                type="email"
                placeholder="usuario@empresa.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#ff5500] focus:bg-white transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Senha Provisória *
              </label>
              <input
                type="password"
                placeholder="••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#ff5500] focus:bg-white transition"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Telefone de Contato (Notificações)
            </label>
            <input
              type="text"
              placeholder="(00) 00000-0000"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#ff5500] focus:bg-white transition"
            />
          </div>

          {/* Perfil */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Perfil / Cargo do Usuário
            </label>
            <div className="grid grid-cols-3 gap-2">
              {roles.map(r => {
                const isSelected = role === r;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => handleRoleChange(r)}
                    className={`py-2 px-2 text-center rounded-xl text-xs font-semibold transition border ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Atribuições Cadastradas */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Atribuições Cadastradas (Direcionamento Automático de OS) *
              </label>
              <span className="text-[10px] text-slate-400">
                {atribuicoes.length} selecionada{atribuicoes.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              {availableAtribuicoes.map(atrib => {
                const isChecked = atribuicoes.includes(atrib);
                return (
                  <button
                    key={atrib}
                    type="button"
                    onClick={() => handleToggleAtribuicao(atrib)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs transition border text-left ${
                      isChecked
                        ? 'bg-orange-50 border-orange-300 text-orange-950 font-bold shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <div className={`w-3.5 h-3.5 rounded flex items-center justify-center text-white ${isChecked ? 'bg-[#ff5500]' : 'border border-slate-300'}`}>
                      {isChecked && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                    </div>
                    <span className="truncate">{atrib}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </form>

        {/* Fixed Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="new-user-form"
            className="px-5 py-2 text-xs font-bold text-white bg-[#ff5500] hover:bg-[#e64d00] rounded-xl shadow-md shadow-orange-500/20 transition"
          >
            Salvar Usuário
          </button>
        </div>
      </div>
    </div>
  );
};
