import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  ShieldCheck, 
  Wrench, 
  Search, 
  Check, 
  Phone, 
  Calendar, 
  Mail, 
  Table as TableIcon, 
  LayoutGrid, 
  UserCheck,
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
  X,
  Settings,
  KeyRound,
  Lock,
  Eye,
  EyeOff,
  Smartphone
} from 'lucide-react';
import { useFleet } from '../context/FleetContext';
import { User, UserRole, UserAtribuicao } from '../types';

interface UsersViewProps {
  onOpenNewUserModal: () => void;
}

type ViewMode = 'tabela' | 'cards';

export const UsersView: React.FC<UsersViewProps> = ({ onOpenNewUserModal }) => {
  const { users, deleteUser, updateUser, currentUser, serviceOrders } = useFleet();
  const isAdmin = currentUser?.role === 'Administrador';
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'Todos' | UserRole>('Todos');
  const [viewMode, setViewMode] = useState<ViewMode>('tabela');

  // Edit Modal State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editRole, setEditRole] = useState<UserRole>('Mecânico');
  const [editAtribuicoes, setEditAtribuicoes] = useState<UserAtribuicao[]>([]);
  const [editPhone, setEditPhone] = useState('');
  const [editPassword, setEditPassword] = useState('');

  // Configuration Modal State (Alterar Senha e Telefone Cadastrado)
  const [configUser, setConfigUser] = useState<User | null>(null);
  const [configPhone, setConfigPhone] = useState('');
  const [configPassword, setConfigPassword] = useState('');
  const [configConfirmPassword, setConfigConfirmPassword] = useState('');
  const [showConfigPassword, setShowConfigPassword] = useState(false);
  const [configError, setConfigError] = useState('');

  // Delete Confirmation State & Toast
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleConfirmDelete = () => {
    if (!isAdmin || !userToDelete) return;
    const name = userToDelete.name;
    deleteUser(userToDelete.id);
    setUserToDelete(null);
    showToast(`Usuário "${name}" excluído com sucesso!`);
  };

  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const matchesRole = roleFilter === 'Todos' || u.role === roleFilter;
      const searchLower = search.toLowerCase();
      const matchesSearch = 
        u.name.toLowerCase().includes(searchLower) ||
        u.email.toLowerCase().includes(searchLower) ||
        u.role.toLowerCase().includes(searchLower) ||
        (u.phone && u.phone.toLowerCase().includes(searchLower)) ||
        (u.atribuicoes && u.atribuicoes.some(a => a.toLowerCase().includes(searchLower)));
      return matchesRole && matchesSearch;
    });
  }, [users, roleFilter, search]);

  const handleStartEdit = (user: User) => {
    if (!isAdmin) return;
    setEditingUser(user);
    setEditRole(user.role);
    setEditAtribuicoes(user.atribuicoes || []);
    setEditPhone(user.phone || '');
    setEditPassword('');
  };

  const handleSaveEdit = () => {
    if (!isAdmin || !editingUser) return;
    const updates: Partial<User> = {
      role: editRole,
      atribuicoes: editAtribuicoes,
      phone: editPhone.trim() || undefined,
    };
    if (editPassword.trim()) {
      updates.password = editPassword.trim();
    }
    updateUser(editingUser.id, updates);
    showToast(`Usuário "${editingUser.name}" atualizado com sucesso!`);
    setEditingUser(null);
  };

  const handleOpenConfig = (user: User) => {
    if (!isAdmin) return;
    setConfigUser(user);
    setConfigPhone(user.phone || '');
    setConfigPassword('');
    setConfigConfirmPassword('');
    setShowConfigPassword(false);
    setConfigError('');
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !configUser) return;
    setConfigError('');

    if (configPassword.trim()) {
      if (configPassword.length < 6) {
        setConfigError('A nova senha deve ter no mínimo 6 caracteres.');
        return;
      }
      if (configPassword !== configConfirmPassword) {
        setConfigError('A confirmação da senha não coincide com a nova senha digitada.');
        return;
      }
    }

    const updates: Partial<User> = {
      phone: configPhone.trim() || undefined,
    };
    if (configPassword.trim()) {
      updates.password = configPassword.trim();
    }

    updateUser(configUser.id, updates);
    showToast(`Configurações de ${configUser.name} salvas com sucesso!`);
    setConfigUser(null);
  };

  const toggleAtribuicao = (atrib: UserAtribuicao) => {
    if (editAtribuicoes.includes(atrib)) {
      setEditAtribuicoes(editAtribuicoes.filter(a => a !== atrib));
    } else {
      setEditAtribuicoes([...editAtribuicoes, atrib]);
    }
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'Administrador':
        return <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800 border border-orange-200">Administrador</span>;
      case 'Gerente':
        return <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">Gerente</span>;
      case 'Encarregado':
        return <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">Encarregado</span>;
      case 'Mecânico':
        return <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">Mecânico</span>;
      case 'Borracheiro':
        return <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">Borracheiro</span>;
      case 'Téc. Eletrica':
        return <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-yellow-100 text-yellow-800 border border-yellow-200">Téc. Elétrica</span>;
      case 'Téc. Driox':
        return <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-800 border border-violet-200">Téc. Driox</span>;
      case 'Monitor':
        return <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-200">Monitor</span>;
      case 'Motorista':
        return <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">Motorista</span>;
    }
  };

  const getAtribuicaoBadge = (atrib: string) => {
    switch (atrib) {
      case 'Mecânica':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Elétrica':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'Borracharia':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'Driox':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Seva/Sacar':
      case 'Seva/Sascar':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Motora':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Gestão Geral':
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const availableAtribuicoes: UserAtribuicao[] = [
    'Mecânica',
    'Elétrica',
    'Borracharia',
    'Driox',
    'Seva/Sacar',
    'Motora',
    'Gestão Geral'
  ];

  const getUserActiveOSCount = (userId: string) => {
    return serviceOrders.filter(
      os => os.assignedToUserId === userId && (os.status === 'Aberta' || os.status === 'Em andamento')
    ).length;
  };

  return (
    <div className="p-4 sm:p-8 space-y-6 max-w-[1650px] mx-auto">
      {/* Header & Actions Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight uppercase font-sans">
              Cadastro de Usuários e Atribuições
            </h2>
            <span className="bg-orange-100 text-orange-800 font-mono text-xs font-bold px-2.5 py-0.5 rounded-full border border-orange-200">
              {filteredUsers.length} de {users.length} usuários
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
            Gestão completa de técnicos, motoristas, operadores e suas respectivas atribuições de direcionamento
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* View Mode Switcher */}
          <div className="bg-white p-1 rounded-xl border border-slate-200 shadow-2xs flex items-center gap-1">
            <button
              onClick={() => setViewMode('tabela')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === 'tabela'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
              title="Visualização em tabela completa com barra de rolagem horizontal"
            >
              <TableIcon className="w-3.5 h-3.5" />
              <span>Tabela Completa</span>
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                viewMode === 'cards'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
              title="Visualização em cards detalhados"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards Detalhados</span>
            </button>
          </div>

          {isAdmin ? (
            <button
              onClick={onOpenNewUserModal}
              className="flex items-center gap-2 bg-[#ff5500] hover:bg-[#e64d00] text-white px-4 sm:px-5 py-2 rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-orange-500/20 transition active:scale-95 whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Novo Usuário</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-500 rounded-xl text-xs font-medium border border-slate-200" title="Apenas o Administrador pode cadastrar e editar usuários">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span>Somente Leitura</span>
            </div>
          )}
        </div>
      </div>

      {/* Search & Role Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1 max-w-lg">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nome, email, perfil, telefone ou atribuição..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#ff5500] transition"
            />
          </div>

          {/* Role Filter Buttons */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0">
            {(['Todos', 'Mecânico', 'Borracheiro', 'Téc. Eletrica', 'Téc. Driox', 'Monitor', 'Motorista', 'Encarregado', 'Gerente', 'Administrador'] as const).map(role => {
              const isActive = roleFilter === role;
              return (
                <button
                  key={role}
                  onClick={() => setRoleFilter(role)}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition whitespace-nowrap ${
                    isActive
                      ? 'bg-[#ff5500] text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {role}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* VIEW MODE: TABELA COMPLETA COM BARRA DE ROLAGEM HORIZONTAL */}
      {viewMode === 'tabela' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[1250px]">
              <thead>
                <tr className="bg-slate-900 text-white text-[11px] font-bold uppercase tracking-wider select-none">
                  <th className="py-3.5 px-4 sticky left-0 z-20 bg-slate-900 border-r border-slate-800">Usuário</th>
                  <th className="py-3.5 px-3">Perfil / Cargo</th>
                  <th className="py-3.5 px-3">E-mail</th>
                  <th className="py-3.5 px-3">Telefone de Contato</th>
                  <th className="py-3.5 px-3">Atribuições Cadastradas (Especialidades)</th>
                  <th className="py-3.5 px-3 text-center">OSs Atribuídas</th>
                  <th className="py-3.5 px-3">Data de Cadastro</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-sans">
                {filteredUsers.map(user => {
                  const initial = user.name.trim().charAt(0).toUpperCase();
                  const isCurrentUser = currentUser?.id === user.id;
                  const activeOSCount = getUserActiveOSCount(user.id);

                  return (
                    <tr
                      key={user.id}
                      className="hover:bg-orange-50/40 transition group"
                    >
                      {/* Usuário (Sticky Column) */}
                      <td className="py-3.5 px-4 sticky left-0 z-10 bg-white group-hover:bg-[#fff9f5] border-r border-slate-100">
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-xs shrink-0"
                            style={{ backgroundColor: user.avatarColor || '#f97316' }}
                          >
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 text-sm">{user.name}</span>
                              {isCurrentUser && (
                                <span className="text-[10px] text-[#ff5500] font-bold bg-orange-50 px-1.5 py-0.2 rounded border border-orange-200">
                                  Você
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Cargo / Perfil */}
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        {getRoleBadge(user.role)}
                      </td>

                      {/* E-mail */}
                      <td className="py-3.5 px-3 whitespace-nowrap font-mono text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{user.email}</span>
                        </div>
                      </td>

                      {/* Telefone de Contato */}
                      <td className="py-3.5 px-3 whitespace-nowrap text-slate-600">
                        {user.phone ? (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>{user.phone}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">—</span>
                        )}
                      </td>

                      {/* Atribuições Cadastradas */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap max-w-md">
                          {user.atribuicoes && user.atribuicoes.length > 0 ? (
                            user.atribuicoes.map(atrib => (
                              <span
                                key={atrib}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border whitespace-nowrap ${getAtribuicaoBadge(atrib)}`}
                              >
                                {atrib}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">Sem atribuições vinculadas</span>
                          )}
                        </div>
                      </td>

                      {/* OSs Atribuídas */}
                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        {activeOSCount > 0 ? (
                          <span className="font-mono text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-0.5 rounded-full">
                            {activeOSCount} ativa{activeOSCount > 1 ? 's' : ''}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">0</span>
                        )}
                      </td>

                      {/* Data de Cadastro */}
                      <td className="py-3.5 px-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {user.createdAt}
                      </td>

                      {/* Ações */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {isAdmin ? (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenConfig(user)}
                              className="p-1.5 text-slate-600 hover:text-[#ff5500] hover:bg-orange-50 rounded-lg transition border border-slate-200/80 cursor-pointer shadow-2xs"
                              title="Configurações (Alterar Senha e Telefone)"
                            >
                              <Settings className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleStartEdit(user)}
                              className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition border border-slate-200/80 cursor-pointer shadow-2xs"
                              title="Editar usuário e atribuições"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            {!isCurrentUser && (
                              <button
                                onClick={() => setUserToDelete(user)}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition border border-slate-200/80 cursor-pointer shadow-2xs"
                                title="Excluir usuário"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400">
                            <Lock className="w-3 h-3 text-slate-300" />
                            Bloqueado
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 && (
            <div className="text-center py-12 bg-white p-6 text-slate-400 text-xs">
              Nenhum usuário encontrado com os filtros selecionados.
            </div>
          )}
        </div>
      )}

      {/* VIEW MODE: CARDS DETALHADOS */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredUsers.map(user => {
            const initial = user.name.trim().charAt(0).toUpperCase();
            const isCurrentUser = currentUser?.id === user.id;
            const activeOSCount = getUserActiveOSCount(user.id);

            return (
              <div
                key={user.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 hover:border-orange-300 shadow-2xs hover:shadow-md transition flex flex-col justify-between gap-4"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div 
                        className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-white text-base shadow-xs shrink-0"
                        style={{ backgroundColor: user.avatarColor || '#f97316' }}
                      >
                        {initial}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-slate-900">
                            {user.name}
                          </h3>
                          {isCurrentUser && (
                            <span className="text-[10px] text-[#ff5500] font-bold bg-orange-50 px-1.5 py-0.2 rounded border border-orange-200">
                              Você
                            </span>
                          )}
                        </div>
                        <div className="mt-1">
                          {getRoleBadge(user.role)}
                        </div>
                      </div>
                    </div>

                    {isAdmin ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenConfig(user)}
                          className="p-1.5 text-slate-500 hover:text-[#ff5500] hover:bg-orange-50 rounded-lg transition cursor-pointer"
                          title="Configurações (Alterar Senha e Telefone)"
                        >
                          <Settings className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleStartEdit(user)}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition cursor-pointer"
                          title="Editar perfil e atribuições"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        {!isCurrentUser && (
                          <button
                            onClick={() => setUserToDelete(user)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Excluir usuário"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-slate-400" title="Apenas Administrador pode editar">
                        <Lock className="w-3.5 h-3.5 text-slate-300" />
                      </div>
                    )}
                  </div>

                  {/* Information Details */}
                  <div className="space-y-2 text-xs py-3 border-b border-slate-100 text-slate-600">
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-mono text-[11px] truncate">{user.email}</span>
                    </div>

                    {user.phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>{user.phone}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span>Cadastrado em {user.createdAt}</span>
                    </div>
                  </div>

                  {/* Atribuições Cadastradas */}
                  <div className="pt-3">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
                      Atribuições Técnicas Cadastradas:
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {user.atribuicoes && user.atribuicoes.length > 0 ? (
                        user.atribuicoes.map(atrib => (
                          <span
                            key={atrib}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getAtribuicaoBadge(atrib)}`}
                          >
                            {atrib}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 italic text-xs">Sem atribuição específica</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400">Chamados em aberto:</span>
                  {activeOSCount > 0 ? (
                    <span className="font-mono font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                      {activeOSCount} ordem{activeOSCount > 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="text-slate-400">Nenhuma pendente</span>
                  )}
                </div>
              </div>
            );
          })}

          {filteredUsers.length === 0 && (
            <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 p-6 text-slate-400 text-xs">
              Nenhum usuário encontrado com os filtros selecionados.
            </div>
          )}
        </div>
      )}

      {/* Edit User Modal with Custom Scrollbar */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-100 max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Editar Usuário: {editingUser.name}
                </h3>
                <p className="text-xs text-slate-500">{editingUser.email}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 overflow-y-auto custom-scrollbar space-y-4 flex-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Perfil de Acesso
                </label>
                <select
                  value={editRole}
                  onChange={e => setEditRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#ff5500]"
                >
                  <option value="Administrador">Administrador</option>
                  <option value="Gerente">Gerente</option>
                  <option value="Encarregado">Encarregado</option>
                  <option value="Mecânico">Mecânico</option>
                  <option value="Borracheiro">Borracheiro</option>
                  <option value="Téc. Eletrica">Téc. Elétrica</option>
                  <option value="Téc. Driox">Téc. Driox</option>
                  <option value="Monitor">Monitor</option>
                  <option value="Motorista">Motorista</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Telefone de Contato
                </label>
                <input
                  type="text"
                  placeholder="(00) 00000-0000"
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#ff5500]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Atribuições Cadastradas (Direcionamento Automático de OS)
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {editAtribuicoes.length} selecionada{editAtribuicoes.length > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                  {availableAtribuicoes.map(atrib => {
                    const isChecked = editAtribuicoes.includes(atrib);
                    return (
                      <button
                        key={atrib}
                        type="button"
                        onClick={() => toggleAtribuicao(atrib)}
                        className={`flex items-center gap-2 p-2 rounded-lg text-xs transition border text-left ${
                          isChecked ? 'bg-orange-50 border-orange-300 font-bold text-orange-950 shadow-2xs' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
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
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="px-4 py-2 text-xs font-bold text-white bg-[#ff5500] hover:bg-[#e64d00] rounded-xl shadow-md"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIGURAÇÕES DE ACESSO (Alterar Senha & Telefone Cadastrado) */}
      {configUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-orange-100 text-[#ff5500] flex items-center justify-center shadow-xs shrink-0">
                  <Settings className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">
                    Configurações de Acesso
                  </h3>
                  <p className="text-xs text-slate-500">
                    Alteração de senha e telefone cadastrado
                  </p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setConfigUser(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveConfig} className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-4">
              
              {/* User Summary Card */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm shadow-xs shrink-0"
                  style={{ backgroundColor: configUser.avatarColor || '#f97316' }}
                >
                  {configUser.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-900 truncate">{configUser.name}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                      {configUser.role}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 font-mono block truncate">{configUser.email}</span>
                </div>
              </div>

              {configError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{configError}</span>
                </div>
              )}

              {/* Telefone Cadastrado */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#ff5500]" />
                  <span>Telefone / Celular Cadastrado</span>
                </label>
                <input
                  type="text"
                  value={configPhone}
                  onChange={e => setConfigPhone(e.target.value)}
                  placeholder="Ex: (11) 98765-4321"
                  className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#ff5500]"
                />
                <p className="text-[11px] text-slate-400 leading-tight">
                  Utilizado para envio de código de segurança na recuperação de senha via SMS e notificações.
                </p>
              </div>

              {/* Divider */}
              <div className="pt-2 border-t border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-2">
                  <KeyRound className="w-3.5 h-3.5 text-[#ff5500]" />
                  <span>Alteração de Senha</span>
                </span>
                <p className="text-[11px] text-slate-500 mb-3">
                  Preencha os campos abaixo apenas se desejar redefinir a senha deste usuário. Caso contrário, deixe em branco.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nova Senha de Acesso
                    </label>
                    <div className="relative">
                      <input
                        type={showConfigPassword ? 'text' : 'password'}
                        value={configPassword}
                        onChange={e => setConfigPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#ff5500] pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfigPassword(!showConfigPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showConfigPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Confirmar Nova Senha
                    </label>
                    <input
                      type={showConfigPassword ? 'text' : 'password'}
                      value={configConfirmPassword}
                      onChange={e => setConfigConfirmPassword(e.target.value)}
                      placeholder="Repita a nova senha"
                      className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#ff5500]"
                    />
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfigUser(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-[#ff5500] hover:bg-[#e64d00] rounded-xl shadow-md shadow-orange-500/20 transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Salvar Configurações</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase font-sans">
                  Excluir Usuário
                </h3>
                <p className="text-xs text-slate-500">
                  Esta ação removerá o acesso do usuário
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/70 space-y-1.5">
              <div className="flex items-center gap-2">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center font-bold text-white text-[11px] shrink-0"
                  style={{ backgroundColor: userToDelete.avatarColor || '#f97316' }}
                >
                  {userToDelete.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-bold text-slate-900 text-sm">{userToDelete.name}</span>
              </div>
              <p className="text-xs text-slate-600 font-mono">{userToDelete.email}</p>
              <div className="flex items-center gap-1.5 pt-1">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                  {userToDelete.role}
                </span>
                {userToDelete.atribuicoes && userToDelete.atribuicoes.length > 0 && (
                  <span className="text-[10px] text-slate-500">
                    &bull; {userToDelete.atribuicoes.join(', ')}
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Tem certeza que deseja remover o usuário <strong>{userToDelete.name}</strong> da plataforma? O acesso e direcionamentos vinculados serão excluídos.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md shadow-rose-600/20 transition flex items-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Sim, Excluir Usuário</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
