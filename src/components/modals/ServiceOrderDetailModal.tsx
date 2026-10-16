import React, { useState, useRef, useMemo } from 'react';
import { 
  X, 
  Wrench, 
  CheckCircle2, 
  Clock, 
  User, 
  Calendar, 
  AlertCircle,
  Image as ImageIcon,
  Eye,
  Camera,
  Plus,
  Download,
  Lock,
  ShieldAlert,
  Users,
  UserCheck,
  Trash2
} from 'lucide-react';
import { ServiceOrder, OSStatus } from '../../types';
import { useFleet } from '../../context/FleetContext';
import { PriorityBadge } from '../PriorityBadge';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface ServiceOrderDetailModalProps {
  os: ServiceOrder | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ServiceOrderDetailModal: React.FC<ServiceOrderDetailModalProps> = ({
  os,
  isOpen,
  onClose,
}) => {
  const { updateServiceOrderStatus, deleteServiceOrder, currentUser, canCloseOS, settings } = useFleet();
  const isAdministrator = currentUser?.role === 'Administrador';
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [status, setStatus] = useState<OSStatus>(os?.status || 'Aberta');
  const [resolutionNotes, setResolutionNotes] = useState(os?.resolutionNotes || '');
  const [executorName, setExecutorName] = useState(os?.executedByName || os?.assignedToName || '');
  const [additionalImages, setAdditionalImages] = useState<string[]>([]);
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isExecutingTechnicalRole = !canCloseOS;
  const isTechnician = isExecutingTechnicalRole;
  const isAlreadyClosed = os?.status === 'Encerrada';

  React.useEffect(() => {
    if (os) {
      setStatus(os.status);
      setResolutionNotes(os.resolutionNotes || '');
      setExecutorName(os.executedByName || os.assignedToName || '');
      setAdditionalImages([]);
      setActiveLightboxImage(null);
      setError('');
    }
  }, [os]);

  if (!isOpen || !os) return null;

  const allImages = [...(os.images || []), ...additionalImages];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      Array.from(e.target.files).forEach(file => {
        if (!file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          const result = ev.target?.result as string;
          if (result) {
            setAdditionalImages(prev => [...prev, result]);
          }
        };
        reader.readAsDataURL(file);
      });
      e.target.value = '';
    }
  };

  const handleSave = () => {
    if (isAlreadyClosed && status !== 'Encerrada') {
      setError('Esta ordem de serviço já foi encerrada e não é possível alterar mais o status.');
      return;
    }
    if (status === 'Encerrada' && isExecutingTechnicalRole) {
      setError('Perfis executores da oficina (Mecânico, Borracheiro, Téc. Elétrica, Téc. Driox) não têm permissão para encerrar ordens de serviço. Você pode marcar como "Resolvida" ou manter "Em andamento". O encerramento definitivo deve ser feito por Motorista, Administrador, Gerente, Encarregado ou Monitor.');
      return;
    }
    try {
      updateServiceOrderStatus(
        os.id, 
        status, 
        resolutionNotes, 
        additionalImages,
        {
          executedByName: executorName.trim() || os.executedByName || currentUser?.name || os.assignedToName,
          executedByRole: os.executedByRole || currentUser?.role || 'Executor',
          closedByName: currentUser?.name,
          closedByRole: currentUser?.role,
        }
      );
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar OS');
    }
  };

  const statusOptions: OSStatus[] = ['Aberta', 'Em andamento', 'Resolvida', 'Encerrada'];

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
        <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-100 max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Fixed Header */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-sm font-black text-white bg-slate-900 px-2.5 py-1 rounded-lg">
                {os.code}
              </span>
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight truncate">
                {os.title}
              </h3>
              {isAlreadyClosed && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-white shadow-2xs whitespace-nowrap">
                  <Lock className="w-3 h-3 text-slate-300" />
                  Somente Leitura
                </span>
              )}
            </div>
            <button 
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-5">
            {/* Metadata banner */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Veículo</span>
                <span className="font-bold text-slate-800">Frota {os.fleetNumber}</span>
                <span className="text-slate-500 font-mono block text-[11px]">{os.plate}/{os.uf}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Categoria</span>
                <span className="font-bold text-slate-800">{os.category}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium mb-1">Prioridade / Severidade</span>
                <PriorityBadge priority={os.priority} size="sm" showSeverityLabel={true} />
              </div>
              <div>
                <span className="text-slate-400 block font-medium">
                  {isAlreadyClosed ? 'Encerrado em' : 'Aberto em'}
                </span>
                <span className="font-semibold text-slate-800">
                  {isAlreadyClosed && os.resolvedAt ? os.resolvedAt : os.createdAt}
                </span>
              </div>
            </div>

            {/* Issue description */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Descrição do Problema / Serviço
              </h4>
              <p className="text-xs text-slate-700 bg-white p-3 rounded-xl border border-slate-200 leading-relaxed">
                {os.description}
              </p>
            </div>

            {/* Attached Images / Photographic Evidence Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-[#ff5500]" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Evidências Fotográficas ({allImages.length})
                  </h4>
                </div>

                {!isAlreadyClosed && (
                  <>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs font-semibold text-[#ff5500] hover:text-[#e64d00] flex items-center gap-1 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Anexar mais fotos</span>
                    </button>

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </>
                )}
              </div>

              {allImages.length > 0 ? (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5">
                  {allImages.map((imgUrl, index) => (
                    <div
                      key={index}
                      onClick={() => setActiveLightboxImage(imgUrl)}
                      className="group relative aspect-video rounded-xl overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer shadow-2xs hover:shadow-md transition"
                    >
                      <img 
                        src={imgUrl} 
                        alt={`Evidência OS ${os.code} foto ${index + 1}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-200"
                      />
                      <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <Eye className="w-4 h-4 text-white" />
                      </div>
                      <span className="absolute bottom-1 right-1 bg-black/60 backdrop-blur-xs text-white text-[9px] font-mono font-bold px-1.5 py-0.5 rounded">
                        #{index + 1}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center">
                  <ImageIcon className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                  <p className="text-xs text-slate-500 font-medium">
                    Nenhuma evidência fotográfica anexada.
                  </p>
                  {!isAlreadyClosed && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-2 text-xs font-bold text-[#ff5500] hover:underline"
                    >
                      + Anexar foto agora a partir do armazenamento
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Workflow & Responsibilities (Direcionamento da OS) */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/90 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <Users className="w-4 h-4 text-[#ff5500]" />
                  <span>Direcionamento e Responsáveis da OS</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-orange-100 text-orange-900 border border-orange-200">
                  Categoria: {os.category}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Aberto Por */}
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/70">
                  <span className="text-slate-400 block font-medium text-[11px]">Aberto por:</span>
                  <p className="font-bold text-slate-800 mt-0.5">
                    {os.openedByName} <span className="text-slate-500 font-normal">({os.openedByRole})</span>
                  </p>
                  <span className="text-[10px] text-slate-400">Em {os.createdAt}</span>
                </div>

                {/* Função Responsável */}
                <div className="bg-white p-2.5 rounded-xl border border-slate-200/70">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 block font-medium text-[11px]">Direcionamento Técnico:</span>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-100">
                      Oficina
                    </span>
                  </div>
                  <p className="font-bold text-slate-800 mt-0.5 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-blue-600" />
                    <span>{os.assignedToName || 'Equipe técnica'}</span>
                    <span className="text-slate-500 font-normal">({os.assignedRole || os.category})</span>
                  </p>
                </div>
              </div>

              {/* Informações de Quem Executou de Fato e Quem Encerrou a Ordem após Constatar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 border-t border-slate-200/70">
                {/* 1. Executor de Fato */}
                <div className={`p-2.5 rounded-xl border transition ${
                  os.executedByName || os.status === 'Resolvida' || os.status === 'Encerrada'
                    ? 'bg-emerald-50/70 border-emerald-200'
                    : 'bg-white border-dashed border-slate-200/90'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Executor de Fato:</span>
                    </span>
                    {(os.executedByName || os.status === 'Resolvida' || os.status === 'Encerrada') ? (
                      <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-600 text-white shadow-2xs">
                        Serviço Executado
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                        Pendente
                      </span>
                    )}
                  </div>
                  {(os.executedByName || os.status === 'Resolvida' || os.status === 'Encerrada') ? (
                    <div>
                      <p className="font-bold text-slate-900 text-xs">
                        {os.executedByName || os.assignedToName || 'Equipe Técnica'}
                      </p>
                      <p className="text-[11px] text-emerald-800 font-medium flex items-center justify-between mt-0.5">
                        <span>{os.executedByRole || os.assignedRole || 'Técnico Executor'}</span>
                        {(os.executedAt || os.resolvedAt) && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            {os.executedAt || os.resolvedAt}
                          </span>
                        )}
                      </p>
                    </div>
                  ) : (
                    <p className="text-slate-400 text-[11px] italic mt-0.5">
                      Aguardando execução pela oficina técnica.
                    </p>
                  )}
                </div>

                {/* 2. Quem encerrou a ordem após constatar */}
                <div className={`p-2.5 rounded-xl border transition ${
                  os.status === 'Encerrada'
                    ? 'bg-blue-50/70 border-blue-200/90 text-slate-800 shadow-2xs'
                    : 'bg-white border-dashed border-slate-200/90'
                }`}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold flex items-center gap-1.5 text-slate-700">
                      <CheckCircle2 className={`w-3.5 h-3.5 ${os.status === 'Encerrada' ? 'text-blue-600' : 'text-slate-400'}`} />
                      <span>Encerrou após constatar:</span>
                    </span>
                    {os.status === 'Encerrada' ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-600 text-white shadow-2xs">
                        Encerrado
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                        Aguardando constatação
                      </span>
                    )}
                  </div>
                  {os.status === 'Encerrada' ? (
                    <div>
                      <p className="font-bold text-slate-900 text-xs">
                        {os.closedByName || os.openedByName || 'Daniel Santos'}
                      </p>
                      <p className="text-[11px] text-slate-600 font-medium flex items-center justify-between mt-0.5">
                        <span>{os.closedByRole || os.openedByRole || 'Gestão / Motorista'}</span>
                        {(os.closedAt || os.resolvedAt) && (
                          <span className="text-[10px] text-slate-500 font-mono">
                            {os.closedAt || os.resolvedAt}
                          </span>
                        )}
                      </p>
                    </div>
                  ) : (
                    <p className="text-slate-400 text-[11px] italic mt-0.5">
                      Encerramento liberado após inspeção da liderança ou motorista.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Status Change Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  {isAlreadyClosed ? 'Status da OS (Encerrada)' : 'Atualizar Status da OS'}
                </label>
                {isAlreadyClosed ? (
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-800 border border-slate-300 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-600" />
                    Status Bloqueado
                  </span>
                ) : isTechnician ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    Apenas Em andamento / Resolvida
                  </span>
                ) : null}
              </div>

              {isAlreadyClosed ? (
                <div className="p-3.5 bg-slate-100 rounded-xl border border-slate-200/90 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold text-xs shrink-0">
                      <Lock className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-900 block">Ordem de Serviço Encerrada</span>
                      <span className="text-[11px] text-slate-600">
                        Após encerrar a ordem de serviço, não é possível alterar mais o status.
                      </span>
                    </div>
                  </div>
                  <span className="px-3 py-1 rounded-lg bg-slate-800 text-white text-xs font-bold font-mono shrink-0 shadow-xs">
                    Encerrada
                  </span>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {statusOptions.map(st => {
                    const isSelected = status === st;
                    const isCloseOption = st === 'Encerrada';
                    const isBlockedForUser = isCloseOption && isTechnician;

                    return (
                      <button
                        key={st}
                        type="button"
                        disabled={isBlockedForUser}
                        onClick={() => {
                          if (isBlockedForUser) return;
                          setStatus(st);
                          setError('');
                        }}
                        title={
                          isBlockedForUser
                            ? 'Técnicos não podem encerrar ordem de serviço. Apenas motorista, encarregado, monitor ou gestão.'
                            : `Definir como ${st}`
                        }
                        className={`py-2 text-center rounded-xl text-xs font-semibold transition border flex items-center justify-center gap-1.5 ${
                          isBlockedForUser
                            ? 'bg-slate-100/90 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                            : isSelected
                            ? st === 'Resolvida'
                              ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                              : st === 'Encerrada'
                              ? 'bg-slate-700 text-white border-slate-700 shadow-xs'
                              : st === 'Em andamento'
                              ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                              : 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {isBlockedForUser && <Lock className="w-3 h-3 text-slate-400 shrink-0" />}
                        <span>{st}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Role explanation banner */}
              {!isAlreadyClosed && (isTechnician ? (
                <div className="mt-2.5 p-2.5 bg-amber-50/90 border border-amber-200/90 rounded-xl flex items-start gap-2 text-[11px] text-amber-900 leading-relaxed">
                  <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-amber-800">Restrição de Perfil Executor ({currentUser?.name}):</span>
                    <span>Perfis executores da manutenção (Mecânico, Borracheiro, Téc. Elétrica, Téc. Driox) não encerram a OS, apenas <strong>resolvem</strong> ou mantêm <strong>em andamento</strong>. O encerramento definitivo é validado por Motorista, Encarregado, Monitor ou Gerente/Administrador.</span>
                  </div>
                </div>
              ) : (
                <div className="mt-2 flex items-center justify-between px-1 text-[11px] text-slate-500">
                  <span>Perfil ativo: <strong className="text-slate-700">{currentUser?.name || 'Usuário'}</strong> ({currentUser?.role || 'Admin'})</span>
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Autorizado a encerrar OS
                  </span>
                </div>
              ))}
            </div>

            {/* Resolution notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
                Parecer Técnico / Solução Aplicada
              </label>
              {isAlreadyClosed ? (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 leading-relaxed font-sans">
                  {resolutionNotes ? (
                    <p className="whitespace-pre-wrap">{resolutionNotes}</p>
                  ) : (
                    <p className="text-slate-400 italic">Nenhum parecer técnico registrado no encerramento.</p>
                  )}
                </div>
              ) : (
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={e => setResolutionNotes(e.target.value)}
                  placeholder="Descreva as peças substituídas, testes realizados ou motivos de encerramento..."
                  className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#ff5500]"
                />
              )}
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </div>

          {/* Fixed Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              {isAdministrator && (
                <button
                  type="button"
                  onClick={() => setShowDeleteModal(true)}
                  className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition cursor-pointer"
                  title="Excluir esta Ordem de Serviço permanentemente"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Excluir OS</span>
                </button>
              )}
              {isAlreadyClosed && (
                <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  Encerrada (somente leitura)
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className={`px-5 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                  isAlreadyClosed
                    ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-xs active:scale-95'
                    : 'text-slate-600 bg-white border border-slate-200 hover:bg-slate-100'
                }`}
              >
                Fechar
              </button>
              {!isAlreadyClosed && (
                <button
                  type="button"
                  onClick={handleSave}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#ff5500] hover:bg-[#e64d00] rounded-xl shadow-md shadow-orange-500/20 transition active:scale-95 cursor-pointer"
                >
                  Salvar Alterações
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Confirmar Exclusão de OS */}
      <ConfirmDeleteModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={() => {
          deleteServiceOrder(os.id);
          setShowDeleteModal(false);
          onClose();
        }}
        title="Excluir Ordem de Serviço"
        itemCategory="Manutenção / OS"
        itemName={`OS #${os.code} - ${os.title}`}
        description={`Tem certeza que deseja excluir permanentemente a Ordem de Serviço #${os.code}? Todos os registros, fotos anexadas e notas serão removidos.`}
        warningNote="Esta ação é irreversível e excluirá a OS da base de dados."
        confirmButtonText="Excluir OS"
      />

      {/* Lightbox Modal */}
      {activeLightboxImage && (
        <div 
          onClick={() => setActiveLightboxImage(null)}
          className="fixed inset-0 z-60 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="relative max-w-4xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800"
          >
            <div className="flex items-center justify-between p-3.5 bg-slate-900/90 border-b border-slate-800 text-white">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold bg-[#ff5500] text-white px-2 py-0.5 rounded">
                  {os.code}
                </span>
                <span className="text-xs font-medium text-slate-300">Evidência Fotográfica do Veículo {os.fleetNumber}</span>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={activeLightboxImage}
                  download={`evidencia-${os.code}.jpg`}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                  title="Baixar imagem"
                >
                  <Download className="w-5 h-5" />
                </a>
                <button
                  onClick={() => setActiveLightboxImage(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                  title="Fechar"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="max-h-[80vh] flex items-center justify-center p-4 bg-slate-950">
              <img 
                src={activeLightboxImage} 
                alt="Evidência ampliada" 
                className="max-h-[75vh] max-w-full object-contain rounded-lg shadow-lg"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};
