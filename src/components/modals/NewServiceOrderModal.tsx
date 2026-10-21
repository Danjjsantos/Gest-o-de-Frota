import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  X, 
  Search, 
  Wrench, 
  Zap, 
  Radio, 
  Settings2, 
  CircleDot, 
  UploadCloud, 
  Image as ImageIcon, 
  Trash2, 
  Eye, 
  Camera,
  AlertCircle,
  Lock,
  Truck
} from 'lucide-react';
import { OSCategory, OSPriority } from '../../types';
import { useFleet } from '../../context/FleetContext';

interface NewServiceOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedVehicleId?: string;
  lockVehicleSelection?: boolean;
}

interface AttachedImage {
  id: string;
  name: string;
  dataUrl: string;
  size: number;
}

export const NewServiceOrderModal: React.FC<NewServiceOrderModalProps> = ({ 
  isOpen, 
  onClose, 
  preselectedVehicleId,
  lockVehicleSelection = false
}) => {
  const { vehicles, openServiceOrder, currentUser } = useFleet();
  const isAdmin = currentUser?.role === 'Administrador';

  const [vehicleSearch, setVehicleSearch] = useState('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(preselectedVehicleId || '');
  const [category, setCategory] = useState<OSCategory>('Mecânica');
  const [priority, setPriority] = useState<OSPriority>('Média');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  // Synchronize selectedVehicleId when preselectedVehicleId changes or modal opens
  useEffect(() => {
    if (preselectedVehicleId) {
      setSelectedVehicleId(preselectedVehicleId);
    }
  }, [preselectedVehicleId, isOpen]);

  // Locked vehicle info if preselected
  const lockedVehicle = useMemo(() => {
    if (!selectedVehicleId) return null;
    return vehicles.find(v => v.id === selectedVehicleId) || null;
  }, [vehicles, selectedVehicleId]);

  // Attachments state
  const [attachedImages, setAttachedImages] = useState<AttachedImage[]>([]);
  const [previewImage, setPreviewImage] = useState<AttachedImage | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter vehicles
  const filteredVehicles = useMemo(() => {
    return vehicles.filter(v => 
      v.fleetNumber.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
      v.plate.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
      v.model.toLowerCase().includes(vehicleSearch.toLowerCase())
    );
  }, [vehicles, vehicleSearch]);

  if (!isOpen || !isAdmin) return null;

  // File Processing (Images from local storage)
  const processFiles = (files: FileList | File[]) => {
    const validImageTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];
    const fileArray = Array.from(files);

    fileArray.forEach(file => {
      if (!file.type.startsWith('image/') && !validImageTypes.includes(file.type)) {
        setError(`O arquivo "${file.name}" não é uma imagem válida.`);
        return;
      }

      // Max 10MB per file
      if (file.size > 10 * 1024 * 1024) {
        setError(`A imagem "${file.name}" excede o limite máximo de 10MB.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        if (dataUrl) {
          setAttachedImages(prev => [
            ...prev,
            {
              id: `img-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              name: file.name,
              dataUrl,
              size: file.size,
            }
          ]);
          setError('');
        }
      };
      reader.onerror = () => {
        setError(`Não foi possível carregar a imagem "${file.name}". Tente novamente.`);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
      // Reset input value so the same file can be chosen again if needed
      e.target.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  // Clipboard paste support (useful for screenshot paste)
  const handlePaste = (e: React.ClipboardEvent) => {
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      processFiles(e.clipboardData.files);
    }
  };

  const handleRemoveImage = (idToRemove: string) => {
    setAttachedImages(prev => prev.filter(img => img.id !== idToRemove));
    if (previewImage?.id === idToRemove) {
      setPreviewImage(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setError('Apenas o Administrador pode abrir ordens de serviço.');
      return;
    }
    if (!selectedVehicleId) {
      setError('Selecione o veículo da frota');
      return;
    }
    if (!title.trim()) {
      setError('Informe o título ou defeito do serviço corretivo');
      return;
    }

    try {
      openServiceOrder({
        vehicleId: selectedVehicleId,
        title: title.trim(),
        description: description.trim() || `Intervenção corretiva de ${category} solicitada.`,
        category,
        priority,
        images: attachedImages.map(img => img.dataUrl),
        attachments: attachedImages.map(img => ({
          id: img.id,
          name: img.name,
          dataUrl: img.dataUrl,
          size: img.size,
          uploadedAt: new Date().toLocaleDateString('pt-BR'),
        })),
      });

      // Reset
      setTitle('');
      setDescription('');
      setAttachedImages([]);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao abrir OS');
    }
  };

  const categories: Array<{ id: OSCategory; label: string; icon: React.ElementType }> = [
    { id: 'Mecânica', label: 'Mecânica', icon: Wrench },
    { id: 'Elétrica', label: 'Elétrica', icon: Zap },
    { id: 'Borracharia', label: 'Borracharia', icon: CircleDot },
    { id: 'Driox', label: 'Driox', icon: Settings2 },
    { id: 'Seva/Sacar', label: 'Seva/Sacar', icon: Radio },
    { id: 'Motora', label: 'Motora', icon: Eye },
  ];

  const priorities: OSPriority[] = ['Baixa', 'Média', 'Alta', 'Urgente'];

  return (
    <>
      <div 
        onPaste={handlePaste}
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs"
      >
        <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-100 max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          {/* Fixed Header */}
          <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
            <div>
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight uppercase font-sans">
                Nova Ordem de Serviço
              </h3>
              <p className="text-xs text-slate-500">
                Abertura de chamado corretivo com anexação de evidências fotográficas
              </p>
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
            <div className="m-4 p-3 bg-red-50 text-red-700 text-xs rounded-xl border border-red-100 flex items-center gap-2 shrink-0">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Scrollable Form Body with Custom Scrollbar */}
          <form id="new-os-form" onSubmit={handleSubmit} className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-5">
            {/* Veículo Selector */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Veículo Selecionado *
                </label>
                {lockVehicleSelection && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-700 bg-orange-100/80 px-2 py-0.5 rounded-full border border-orange-200">
                    <Lock className="w-3 h-3 text-[#ff5500]" />
                    <span>Frota Fixada pela Página</span>
                  </span>
                )}
              </div>

              {lockVehicleSelection && lockedVehicle ? (
                /* Card visual bloqueado para a frota da página atual */
                <div className="p-3.5 bg-orange-50/60 border border-orange-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#ff5500] text-white flex items-center justify-center font-mono font-black text-sm shrink-0 shadow-xs">
                      {lockedVehicle.fleetNumber}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-black text-slate-900 font-sans tracking-tight">
                          Frota {lockedVehicle.fleetNumber}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          lockedVehicle.type === 'Carreta' ? 'bg-purple-100 text-purple-700' :
                          lockedVehicle.type === 'Cavalo Mecânico' ? 'bg-emerald-100 text-emerald-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {lockedVehicle.type}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 font-medium mt-0.5">
                        <strong className="text-slate-800 font-mono">{lockedVehicle.plate}/{lockedVehicle.uf}</strong>
                        <span className="mx-1.5 text-slate-300">·</span>
                        <span>{lockedVehicle.brand} {lockedVehicle.model}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 text-slate-400 bg-white/80 border border-orange-200/60 px-2.5 py-1.5 rounded-lg text-[11px] font-medium shrink-0">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Bloqueado</span>
                  </div>
                </div>
              ) : (
                /* Seletor normal com campo de busca e lista de frotas */
                <>
                  <div className="relative mb-2">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Buscar frota ou placa..."
                      value={vehicleSearch}
                      onChange={e => setVehicleSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#ff5500]"
                    />
                  </div>

                  <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-white shadow-xs">
                    {filteredVehicles.map(v => {
                      const isSelected = selectedVehicleId === v.id;
                      return (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => {
                            setSelectedVehicleId(v.id);
                            setError('');
                          }}
                          className={`w-full px-3.5 py-2 text-left flex items-center justify-between text-xs transition ${
                            isSelected ? 'bg-orange-50/80 font-bold text-orange-950' : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-[#ff5500]' : 'bg-slate-300'}`} />
                            <span className="font-semibold">Frota {v.fleetNumber}</span>
                            <span className="text-slate-400 font-normal">({v.type})</span>
                          </div>
                          <span className="font-mono text-[11px] text-slate-500">
                            {v.plate}/{v.uf}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>

            {/* Categoria da OS */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Categoria da OS *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {categories.map(cat => {
                  const Icon = cat.icon;
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition border ${
                        isSelected
                          ? 'bg-[#1e293b] text-white border-[#1e293b] shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      <span>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Prioridade */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Prioridade
              </label>
              <div className="grid grid-cols-4 gap-2">
                {priorities.map(p => {
                  const isSelected = priority === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`py-2 px-1 text-center rounded-xl text-xs font-semibold transition border ${
                        isSelected
                          ? 'bg-[#ff5500] text-white border-[#ff5500] shadow-xs font-bold'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Título / Defeito */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Título / Defeito Principal *
              </label>
              <input
                type="text"
                placeholder="Ex: Bomba, Bolsa de ar, MOTORA, Sensor de freio..."
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#ff5500]"
                required
              />
            </div>

            {/* Descrição Detalhada */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Descrição do Serviço Corretivo
              </label>
              <textarea
                rows={2}
                placeholder="Descreva o problema relatado pelo motorista ou detectado na vistoria..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#ff5500]"
              />
            </div>

            {/* Anexar Imagens do Armazenamento */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-[#ff5500]" />
                  <span>Anexar Imagens do Armazenamento</span>
                </label>
                {attachedImages.length > 0 && (
                  <span className="text-[11px] font-semibold text-[#ff5500] bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
                    {attachedImages.length} {attachedImages.length === 1 ? 'imagem anexada' : 'imagens anexadas'}
                  </span>
                )}
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileInputChange}
                className="hidden"
              />

              {/* Drop / Upload Zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                  isDragging 
                    ? 'border-[#ff5500] bg-orange-50/70 scale-[1.01]' 
                    : 'border-slate-200 hover:border-[#ff5500]/60 bg-slate-50/50 hover:bg-orange-50/20'
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-orange-100/70 text-[#ff5500] flex items-center justify-center">
                  <UploadCloud className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-700">
                    Clique para selecionar imagens do seu dispositivo ou arraste fotos aqui
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Formatos suportados: PNG, JPG, JPEG, WEBP (Até 10MB cada)
                  </p>
                </div>
                <button
                  type="button"
                  className="mt-1 px-3 py-1 bg-white border border-slate-200 text-slate-700 hover:text-[#ff5500] hover:border-orange-300 rounded-lg text-xs font-semibold shadow-2xs transition"
                >
                  Buscar no armazenamento
                </button>
              </div>

              {/* Gallery of Attached Images */}
              {attachedImages.length > 0 && (
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {attachedImages.map((img) => (
                    <div 
                      key={img.id}
                      className="group relative bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-xs transition"
                    >
                      <div className="aspect-video w-full bg-slate-100 relative overflow-hidden">
                        <img 
                          src={img.dataUrl} 
                          alt={img.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewImage(img);
                            }}
                            className="p-1.5 bg-white/90 hover:bg-white text-slate-800 rounded-lg transition"
                            title="Visualizar ampliado"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveImage(img.id);
                            }}
                            className="p-1.5 bg-rose-600/90 hover:bg-rose-600 text-white rounded-lg transition"
                            title="Remover foto"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <div className="p-2 flex items-center justify-between gap-1">
                        <p className="text-[11px] font-medium text-slate-700 truncate" title={img.name}>
                          {img.name}
                        </p>
                        <span className="text-[10px] text-slate-400 font-mono shrink-0">
                          {formatFileSize(img.size)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
              form="new-os-form"
              className="px-5 py-2 text-xs font-bold text-white bg-[#ff5500] hover:bg-[#e64d00] rounded-xl shadow-md shadow-orange-500/20 transition active:scale-95 flex items-center gap-2"
            >
              {attachedImages.length > 0 && <ImageIcon className="w-4 h-4" />}
              <span>Abrir OS {attachedImages.length > 0 ? `(${attachedImages.length} fotos)` : ''}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox Modal for full size view */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-60 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
        >
          <div 
            onClick={e => e.stopPropagation()}
            className="relative max-w-4xl w-full bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-800"
          >
            <div className="flex items-center justify-between p-3.5 bg-slate-900/90 border-b border-slate-800 text-white">
              <div className="min-w-0 pr-4">
                <p className="text-xs font-bold truncate">{previewImage.name}</p>
                <p className="text-[11px] text-slate-400">{formatFileSize(previewImage.size)}</p>
              </div>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[75vh] flex items-center justify-center p-4 bg-slate-950/60">
              <img 
                src={previewImage.dataUrl} 
                alt={previewImage.name} 
                className="max-h-[70vh] max-w-full object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

