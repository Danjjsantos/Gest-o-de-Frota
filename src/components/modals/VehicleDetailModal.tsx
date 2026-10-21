import React, { useState, useRef, useMemo } from 'react';
import { 
  X, 
  Calendar, 
  Wrench, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  Clock, 
  Download,
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Trash2,
  Eye,
  ShieldCheck,
  Lock,
  Truck,
  FileCheck,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Gauge
} from 'lucide-react';
import { Vehicle, DocumentType, VehicleAttachment, ServiceOrder } from '../../types';
import { useFleet, formatDisplayDate } from '../../context/FleetContext';
import { PriorityBadge } from '../PriorityBadge';
import { generateVehicleDossierPDF } from '../../utils/pdfGenerator';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface VehicleDetailModalProps {
  vehicle: Vehicle | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenNewOSForVehicle: (vehicleId: string) => void;
}

type TabType = 'geral' | 'documentos' | 'os';

export const VehicleDetailModal: React.FC<VehicleDetailModalProps> = ({
  vehicle: propVehicle,
  isOpen,
  onClose,
  onOpenNewOSForVehicle,
}) => {
  const { 
    vehicles,
    currentUser, 
    deleteVehicle,
    deleteVehicleDocument,
    updateVehicleDocument, 
    updateVehicleDocumentWithFile,
    addVehicleAttachment,
    removeVehicleAttachment,
    serviceOrders, 
    deleteServiceOrder,
    users,
    settings
  } = useFleet();

  // Dynamically resolve vehicle from FleetContext state so any updates to documents, attachments reflect immediately without reloading
  const vehicle = useMemo(() => {
    if (!propVehicle) return null;
    return vehicles.find(v => v.id === propVehicle.id) || propVehicle;
  }, [vehicles, propVehicle]);

  const [activeTab, setActiveTab] = useState<TabType>('geral');
  const [editingDoc, setEditingDoc] = useState<DocumentType | null>(null);
  const [newDate, setNewDate] = useState('');
  const [pdfSuccess, setPdfSuccess] = useState(false);

  // Deletion state for Administrator
  const [deleteFleetModalOpen, setDeleteFleetModalOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<{ docType: DocumentType; name: string } | null>(null);
  const [attachmentToDelete, setAttachmentToDelete] = useState<VehicleAttachment | null>(null);
  const [osToDelete, setOsToDelete] = useState<ServiceOrder | null>(null);

  // Upload Form State (for Administrator)
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<DocumentType | 'Nota Fiscal' | 'Manual' | 'Laudo' | 'Outro'>('CRLV');
  const [uploadDocNumber, setUploadDocNumber] = useState('');
  const [uploadExpiryDate, setUploadExpiryDate] = useState('');
  const [uploadIssueDate, setUploadIssueDate] = useState('');
  const [uploadNotes, setUploadNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<{
    name: string;
    size: number;
    type: string;
    dataUrl: string;
  } | null>(null);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File Preview Modal State
  const [previewFile, setPreviewFile] = useState<{
    name: string;
    dataUrl: string;
    type: string;
    category?: string;
  } | null>(null);

  if (!isOpen || !vehicle) return null;

  const isAdmin = currentUser?.role === 'Administrador';

  const handleExportPDF = () => {
    generateVehicleDossierPDF(vehicle, serviceOrders, users);
    setPdfSuccess(true);
    setTimeout(() => setPdfSuccess(false), 3000);
  };

  const vehicleOrders = serviceOrders.filter(os => os.vehicleId === vehicle.id);
  const docTypes: DocumentType[] = ['CRLV', 'CIPP', 'CIV', 'Tacógrafo'];

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const processSelectedFile = (file: File) => {
    setUploadError('');
    const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(file.name);

    if (!isPdf && !isImage) {
      setUploadError('Formato inválido. Por favor, envie documentos em formato PDF ou imagem JPG/PNG.');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setUploadError('O arquivo selecionado excede o limite máximo de 20 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setSelectedFile({
        name: file.name,
        size: file.size,
        type: isPdf ? 'application/pdf' : file.type || 'image/jpeg',
        dataUrl: event.target?.result as string,
      });
    };
    reader.onerror = () => {
      setUploadError('Erro ao ler arquivo do dispositivo.');
    };
    reader.readAsDataURL(file);
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
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  const handleSaveUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setUploadError('Apenas administradores têm permissão para anexar documentos.');
      return;
    }

    if (!selectedFile) {
      setUploadError('Selecione um arquivo PDF ou imagem JPG do seu dispositivo.');
      return;
    }

    const isMandatoryDoc = ['CRLV', 'CIPP', 'CIV', 'Tacógrafo'].includes(uploadCategory);

    // If it's a mandatory document, update the main document slot
    if (isMandatoryDoc) {
      const existingDoc = vehicle.documents[uploadCategory as DocumentType];
      const effectiveExpiryDate = uploadExpiryDate || existingDoc?.expiryDate || '';
      updateVehicleDocumentWithFile(vehicle.id, uploadCategory as DocumentType, {
        expiryDate: effectiveExpiryDate,
        number: uploadDocNumber.trim() || existingDoc?.number || undefined,
        notes: uploadNotes.trim() || undefined,
        fileName: selectedFile.name,
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
        fileUrl: selectedFile.dataUrl,
      });
    } else {
      // Add to attachments
      addVehicleAttachment(vehicle.id, {
        name: selectedFile.name,
        dataUrl: selectedFile.dataUrl,
        fileType: selectedFile.type,
        fileSize: selectedFile.size,
        category: uploadCategory,
        number: uploadDocNumber.trim() || undefined,
        issueDate: uploadIssueDate || undefined,
        expiryDate: uploadExpiryDate || undefined,
        notes: uploadNotes.trim() || undefined,
        uploadedBy: currentUser ? `${currentUser.name} (${currentUser.role})` : 'Administrador',
      });
    }

    setUploadSuccess(`Documento "${selectedFile.name}" anexado com sucesso à Frota ${vehicle.fleetNumber}!`);
    setTimeout(() => setUploadSuccess(''), 4000);

    // Reset form
    setSelectedFile(null);
    setUploadDocNumber('');
    setUploadExpiryDate('');
    setUploadIssueDate('');
    setUploadNotes('');
    setShowUploadForm(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteAttachment = (attachmentId: string) => {
    if (!isAdmin) return;
    removeVehicleAttachment(vehicle.id, attachmentId);
  };

  const handleSaveDocDate = (docType: DocumentType) => {
    if (!isAdmin || !newDate) return;
    updateVehicleDocument(vehicle.id, docType, newDate);
    setEditingDoc(null);
    setNewDate('');
  };

  const getDocStatusBadge = (type: DocumentType) => {
    const doc = vehicle.documents[type];
    if (type === 'Tacógrafo' && vehicle.type === 'Carreta') {
      return (
        <span className="text-[11px] text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
          Não aplicável (Carreta)
        </span>
      );
    }
    if (!doc) {
      return (
        <span className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-medium border border-slate-200">
          Pendente cadastro
        </span>
      );
    }

    const expDate = new Date(doc.expiryDate);
    const refDate = new Date('2026-09-02T12:00:00Z');
    const diffDays = Math.ceil((expDate.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Vencido há {Math.abs(diffDays)}d ({doc.expiryDate})</span>
        </div>
      );
    } else if (diffDays <= 30) {
      return (
        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
          <Clock className="w-3.5 h-3.5" />
          <span>Vence em {diffDays}d ({doc.expiryDate})</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Válido até {doc.expiryDate}</span>
        </div>
      );
    }
  };

  const allAttachments = vehicle.attachments || [];

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
        <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-100 max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
            <div className="flex items-center gap-3.5">
              {vehicle.imageUrl ? (
                <img 
                  src={vehicle.imageUrl} 
                  alt={vehicle.fleetNumber}
                  className="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-2xs shrink-0" 
                />
              ) : (
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-mono font-black text-base shrink-0 border ${
                  vehicle.type === 'Carreta' ? 'bg-purple-50 text-purple-700 border-purple-200/60' :
                  vehicle.type === 'Cavalo Mecânico' ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' :
                  'bg-blue-50 text-blue-700 border-blue-200/60'
                }`}>
                  {vehicle.fleetNumber}
                </div>
              )}
              
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight font-sans">
                    Frota {vehicle.fleetNumber}
                  </h3>
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-full font-bold ${
                    vehicle.type === 'Carreta' ? 'bg-purple-100 text-purple-700' :
                    vehicle.type === 'Cavalo Mecânico' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {vehicle.type}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-md font-bold uppercase ${
                    vehicle.status === 'Ativo' ? 'bg-emerald-100 text-emerald-800' :
                    vehicle.status === 'Em Manutenção' ? 'bg-amber-100 text-amber-800' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    {vehicle.status}
                  </span>

                  {/* Informação dos Produtos Carregados (Gases do Ar / CO2) no Cabeçalho da Frota */}
                  {((vehicle.type === 'Caminhão' || vehicle.type === 'Carreta') && ((vehicle.cargoProducts && vehicle.cargoProducts.length > 0) || vehicle.cargoProduct)) && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {(vehicle.cargoProducts && vehicle.cargoProducts.length > 0
                        ? vehicle.cargoProducts
                        : (vehicle.cargoProduct ? [vehicle.cargoProduct as any] : [])
                      ).map((product: string) => {
                        const isCO2 = product.includes('CO2');
                        return (
                          <span
                            key={product}
                            className={`inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-bold shadow-2xs border ${
                              isCO2
                                ? 'bg-teal-50 text-teal-800 border-teal-200'
                                : 'bg-cyan-50 text-cyan-800 border-cyan-200'
                            }`}
                            title={`Produto transportado pela frota: ${product}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${isCO2 ? 'bg-teal-500' : 'bg-cyan-500 animate-pulse'}`} />
                            <span className="font-sans">{product}</span>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Medição do Vácuo no Cabeçalho da Frota (Gases do Ar): Vácuo: "Valor"mtorr. E a data. */}
                  {((vehicle.cargoProducts?.includes('Gases do Ar (LO2, LN2, LAR)') || vehicle.cargoProduct?.includes('Gases do Ar')) && vehicle.vacuumValue != null && vehicle.vacuumValue !== '') && (
                    <div
                      className="inline-flex items-center gap-1.5 text-[11px] px-2.5 py-0.5 rounded-full font-bold shadow-2xs border bg-indigo-50 text-indigo-900 border-indigo-200/90"
                      title="Medição do Vácuo (Isolamento Térmico Criogênico)"
                    >
                      <Gauge className="w-3 h-3 text-indigo-600 shrink-0" />
                      <span>Vácuo: {vehicle.vacuumValue}mtorr</span>
                      {vehicle.vacuumDate && (
                        <>
                          <span className="text-indigo-300 font-bold select-none">·</span>
                          <span className="text-indigo-700 font-medium">{formatDisplayDate(vehicle.vacuumDate)}</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-wrap mt-1 text-xs sm:text-sm">
                  <span className="text-sm sm:text-base font-black text-slate-900 tracking-tight">
                    {vehicle.model}
                  </span>
                  <span className="text-slate-300 font-bold select-none">•</span>
                  <span className="font-mono font-bold text-slate-800">
                    {vehicle.plate} / {vehicle.uf}
                  </span>
                  {vehicle.brand && (
                    <>
                      <span className="text-slate-300 font-bold select-none">•</span>
                      <span className="font-bold text-slate-600 uppercase text-xs">
                        {vehicle.brand}
                      </span>
                    </>
                  )}
                  {vehicle.year && (
                    <>
                      <span className="text-slate-300 font-bold select-none">•</span>
                      <span className="font-semibold text-slate-500 uppercase text-xs">
                        ANO {vehicle.year}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setDeleteFleetModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
                  title="Excluir cadastro desta frota permanentemente"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span className="hidden sm:inline">Excluir Frota</span>
                </button>
              )}

              <button
                onClick={handleExportPDF}
                className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                  pdfSuccess
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
                title={`Baixar Relatório Completo da Frota ${vehicle.fleetNumber} em PDF`}
              >
                <Download className={`w-3.5 h-3.5 ${pdfSuccess ? 'text-white' : 'text-[#ff5500]'}`} />
                <span>{pdfSuccess ? 'Relatório Baixado!' : 'Exportar PDF'}</span>
              </button>

              <button 
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Tabs Header */}
          <div className="flex items-center px-4 sm:px-6 border-b border-slate-200 bg-slate-50/80 gap-2 shrink-0 overflow-x-auto">
            <button
              onClick={() => setActiveTab('geral')}
              className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'geral'
                  ? 'border-[#ff5500] text-[#ff5500]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Visão Geral</span>
            </button>

            <button
              onClick={() => setActiveTab('documentos')}
              className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'documentos'
                  ? 'border-[#ff5500] text-[#ff5500]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <FileCheck className="w-4 h-4" />
              <span>Documentos</span>
              {allAttachments.length > 0 && (
                <span className="bg-orange-100 text-[#ff5500] text-[10px] font-black px-1.5 py-0.2 rounded-full">
                  {allAttachments.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('os')}
              className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
                activeTab === 'os'
                  ? 'border-[#ff5500] text-[#ff5500]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span>Ordens de Serviço</span>
              <span className="bg-slate-200 text-slate-700 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                {vehicleOrders.length}
              </span>
            </button>
          </div>

          {/* Success Notification Banner */}
          {uploadSuccess && (
            <div className="bg-emerald-500 text-white px-4 py-2.5 text-xs font-bold flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>{uploadSuccess}</span>
              </div>
              <button onClick={() => setUploadSuccess('')} className="text-white/80 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Scrollable Content Body */}
          <div className="p-4 sm:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">

            {/* TAB 1: VISÃO GERAL & CADASTRO */}
            {activeTab === 'geral' && (
              <div className="space-y-5 animate-in fade-in duration-150">
                {/* Highlights Summary */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="text-[11px] text-slate-400 font-medium block">Placa / UF</span>
                    <span className="text-base font-black text-slate-900 font-mono tracking-tight mt-0.5 block">
                      {vehicle.plate}/{vehicle.uf}
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="text-[11px] text-slate-400 font-medium block">Frota Nº</span>
                    <span className="text-base font-black text-slate-900 font-mono tracking-tight mt-0.5 block">
                      {vehicle.fleetNumber}
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="text-[11px] text-slate-400 font-medium block">Tipo & Ano</span>
                    <span className="text-xs font-bold text-slate-800 mt-0.5 block truncate">
                      {vehicle.type} · {vehicle.year}
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
                    <span className="text-[11px] text-slate-400 font-medium block">Status Operacional</span>
                    <span className={`text-xs font-bold mt-0.5 block ${
                      vehicle.status === 'Ativo' ? 'text-emerald-700' :
                      vehicle.status === 'Em Manutenção' ? 'text-amber-700' : 'text-slate-600'
                    }`}>
                      ● {vehicle.status}
                    </span>
                  </div>
                </div>

                {/* Complete Vehicle Data Grid */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-[#ff5500]" />
                    <span>Dados Cadastrais do Veículo</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                    <div>
                      <span className="text-slate-400 block font-medium">Marca / Fabricante</span>
                      <span className="font-bold text-slate-900 text-sm">{vehicle.brand}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block font-medium">Modelo</span>
                      <span className="font-bold text-slate-900 text-sm">{vehicle.model}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block font-medium">Ano de Fabricação</span>
                      <span className="font-bold text-slate-900 text-sm">{vehicle.year}</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block font-medium">Placa / UF</span>
                      <span className="font-mono font-bold text-slate-800 text-sm">
                        {vehicle.plate}/{vehicle.uf}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 block font-medium">Total de OS Registradas</span>
                      <span className="font-bold text-slate-900">{vehicleOrders.length} ordens</span>
                    </div>

                    <div>
                      <span className="text-slate-400 block font-medium">Documentos Anexados</span>
                      <span className="font-bold text-slate-900">{allAttachments.length} arquivos</span>
                    </div>
                  </div>

                  {vehicle.notes && (
                    <div className="pt-2 border-t border-slate-100">
                      <span className="text-slate-400 text-xs block font-medium">Observações</span>
                      <p className="text-xs text-slate-700 mt-1">{vehicle.notes}</p>
                    </div>
                  )}
                </div>

                {/* Quick Action Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <button
                    onClick={() => setActiveTab('documentos')}
                    className="p-3.5 bg-orange-50/50 hover:bg-orange-50 rounded-xl border border-orange-200/80 text-left transition flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#ff5500] flex items-center justify-center shrink-0">
                        <FileCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-slate-900">Gerenciar Documentação</h5>
                        <p className="text-[11px] text-slate-500">
                          {isAdmin ? 'Adicionar novos PDFs ou fotos JPG' : 'Visualizar e baixar certificados'}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-orange-400 group-hover:translate-x-1 transition" />
                  </button>

                  <button
                    onClick={() => {
                      onClose();
                      onOpenNewOSForVehicle(vehicle.id);
                    }}
                    className="p-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-left transition flex items-center justify-between group cursor-pointer shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/10 text-white flex items-center justify-center shrink-0">
                        <Wrench className="w-5 h-5" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-white">Abrir Ordem de Serviço</h5>
                        <p className="text-[11px] text-slate-300">
                          Registrar defeito ou manutenção corretiva
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-white/50 group-hover:translate-x-1 transition" />
                  </button>
                </div>
              </div>
            )}

            {/* TAB 2: DOCUMENTAÇÃO & ANEXOS EM PDF / JPG */}
            {activeTab === 'documentos' && (
              <div className="space-y-6 animate-in fade-in duration-150">
                {/* Header of documents section */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gradient-to-r from-slate-50 to-orange-50/40 p-4 rounded-xl border border-orange-100">
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                      <FileCheck className="w-4 h-4 text-[#ff5500]" />
                      <span>Documentos & Certificados Oficiais</span>
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Controle de vencimento e armazenamento de arquivos originais (PDF e JPG)
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {isAdmin ? (
                      <button
                        onClick={() => setShowUploadForm(!showUploadForm)}
                        className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#ff5500] hover:bg-[#e64d00] text-white shadow-xs transition active:scale-95 cursor-pointer shrink-0"
                      >
                        <UploadCloud className="w-4 h-4" />
                        <span>{showUploadForm ? 'Fechar Envio' : 'Adicionar Documento'}</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shrink-0">
                        <Lock className="w-3.5 h-3.5 text-slate-400" />
                        <span>Upload restrito</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* ADMIN UPLOAD PANEL */}
                {isAdmin && showUploadForm && (
                  <form 
                    onSubmit={handleSaveUpload}
                    className="p-5 bg-white rounded-2xl border-2 border-orange-200 shadow-md space-y-4 animate-in slide-in-from-top-2 duration-200"
                  >
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-orange-100 text-[#ff5500] flex items-center justify-center shrink-0">
                          <UploadCloud className="w-4 h-4" />
                        </div>
                        <div>
                          <h5 className="text-xs font-black uppercase text-slate-900 tracking-tight">
                            Adicionar Novo Documento a Partir do Armazenamento
                          </h5>
                          <span className="text-[11px] text-slate-500">
                            Envie o arquivo oficial em PDF ou foto em JPG/PNG
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowUploadForm(false)}
                        className="text-slate-400 hover:text-slate-600 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {uploadError && (
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{uploadError}</span>
                      </div>
                    )}

                    {/* Drag and Drop Zone */}
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2.5 ${
                        isDragging 
                          ? 'border-[#ff5500] bg-orange-50/60 scale-[0.99]' 
                          : selectedFile
                          ? 'border-emerald-300 bg-emerald-50/30'
                          : 'border-slate-300 hover:border-[#ff5500] bg-slate-50/50 hover:bg-orange-50/20'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf,image/jpeg,image/jpg,image/png,image/webp"
                        onChange={handleFileChange}
                        className="hidden"
                      />

                      {selectedFile ? (
                        <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs max-w-md w-full">
                          {selectedFile.type === 'application/pdf' ? (
                            <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                              <FileText className="w-5 h-5" />
                            </div>
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-orange-100 text-[#ff5500] flex items-center justify-center shrink-0 overflow-hidden">
                              <img 
                                src={selectedFile.dataUrl} 
                                alt="preview" 
                                className="w-full h-full object-cover" 
                              />
                            </div>
                          )}
                          <div className="min-w-0 flex-1 text-left">
                            <p className="text-xs font-bold text-slate-800 truncate" title={selectedFile.name}>
                              {selectedFile.name}
                            </p>
                            <span className="text-[11px] text-slate-500 font-mono">
                              {formatFileSize(selectedFile.size)} · {selectedFile.type.includes('pdf') ? 'Documento PDF' : 'Imagem JPG'}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                            Carregado
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="w-12 h-12 rounded-full bg-orange-100 text-[#ff5500] flex items-center justify-center">
                            <UploadCloud className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">
                              Clique para escolher arquivo do dispositivo ou arraste até aqui
                            </p>
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              Formatos aceitos: <strong>PDF</strong> ou imagens <strong>JPG / PNG</strong> (máx. 20 MB)
                            </p>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Metadata fields */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Tipo de Documento *
                        </label>
                        <select
                          value={uploadCategory}
                          onChange={e => setUploadCategory(e.target.value as any)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ff5500]"
                        >
                          <option value="CRLV">CRLV (Certificado de Registro e Licenciamento)</option>
                          <option value="CIPP">CIPP (Produtos Perigosos)</option>
                          <option value="CIV">CIV (Inspeção Veicular)</option>
                          <option value="Tacógrafo">Tacógrafo (Laudo INMETRO)</option>
                          <option value="Nota Fiscal">Nota Fiscal / Aquisição</option>
                          <option value="Laudo">Laudo Técnico / Vistoria</option>
                          <option value="Manual">Manual do Fabricante</option>
                          <option value="Outro">Outro Documento</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Nº do Documento / Registro
                        </label>
                        <input
                          type="text"
                          placeholder="Ex: 2026/0991823"
                          value={uploadDocNumber}
                          onChange={e => setUploadDocNumber(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ff5500]"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Data de Vencimento / Validade
                        </label>
                        <input
                          type="date"
                          value={uploadExpiryDate}
                          onChange={e => setUploadExpiryDate(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ff5500]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Observações ou Notas (opcional)
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Certificado emitido pelo INMETRO, laudo de conformidade 2026."
                        value={uploadNotes}
                        onChange={e => setUploadNotes(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ff5500]"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setShowUploadForm(false);
                          setSelectedFile(null);
                        }}
                        className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-2 text-xs font-bold text-white bg-[#ff5500] hover:bg-[#e64d00] rounded-xl shadow-xs transition flex items-center gap-1.5"
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>Salvar e Anexar Documento</span>
                      </button>
                    </div>
                  </form>
                )}

                {/* Mandatory Documents Status Table */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                      Status dos Documentos Obrigatórios
                    </h5>
                    <span className="text-[11px] text-slate-400">
                      Vencimentos vigentes da frota
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {docTypes.map(dtype => {
                      const isApplicable = !(dtype === 'Tacógrafo' && vehicle.type === 'Carreta');
                      const doc = vehicle.documents[dtype];

                      return (
                        <div 
                          key={dtype} 
                          className="p-3.5 bg-white border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs hover:border-slate-300 transition"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center shrink-0">
                              <FileText className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-xs text-slate-900">
                                  {dtype}
                                </span>
                                {doc?.fileUrl && (
                                  <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold px-1.5 py-0.2 rounded flex items-center gap-1">
                                    <FileCheck className="w-3 h-3" />
                                    <span>Arquivo PDF/JPG Anexado</span>
                                  </span>
                                )}
                              </div>
                              <span className="text-[11px] text-slate-500 block mt-0.5">
                                {dtype === 'CRLV' ? 'Certificado de Registro e Licenciamento de Veículo' :
                                 dtype === 'CIPP' ? 'Certificado de Inspeção para Produtos Perigosos' :
                                 dtype === 'CIV' ? 'Certificado de Inspeção Veicular' : 'Cronotacógrafo INMETRO'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap sm:justify-end">
                            {editingDoc === dtype ? (
                              <div className="flex items-center gap-1.5">
                                <input 
                                  type="date"
                                  value={newDate}
                                  onChange={e => setNewDate(e.target.value)}
                                  className="text-xs px-2 py-1 border border-slate-300 rounded-md focus:ring-1 focus:ring-[#ff5500]"
                                />
                                <button
                                  onClick={() => handleSaveDocDate(dtype)}
                                  className="text-xs px-2.5 py-1 bg-[#ff5500] text-white rounded-md font-bold cursor-pointer"
                                >
                                  Salvar
                                </button>
                                <button
                                  onClick={() => setEditingDoc(null)}
                                  className="text-xs px-2 py-1 text-slate-500 hover:text-slate-800 cursor-pointer"
                                >
                                  X
                                </button>
                              </div>
                            ) : (
                              <>
                                {getDocStatusBadge(dtype)}

                                {doc?.fileUrl && (
                                  <>
                                    <button
                                      onClick={() => setPreviewFile({
                                        name: doc.fileName || `${dtype}_Frota_${vehicle.fleetNumber}`,
                                        dataUrl: doc.fileUrl!,
                                        type: doc.fileType || 'application/pdf',
                                        category: dtype
                                      })}
                                      className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                                      title="Visualizar documento anexado"
                                    >
                                      <Eye className="w-4 h-4 text-[#ff5500]" />
                                    </button>

                                    <a
                                      href={doc.fileUrl}
                                      download={doc.fileName || `${dtype}_Frota_${vehicle.fleetNumber}.pdf`}
                                      className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                                      title="Baixar documento anexado"
                                    >
                                      <Download className="w-4 h-4 text-slate-600" />
                                    </a>
                                  </>
                                )}

                                {isApplicable && isAdmin && (
                                  <div className="flex items-center gap-1.5 ml-1">
                                    <button
                                      onClick={() => {
                                        setEditingDoc(dtype);
                                        setNewDate(vehicle.documents[dtype]?.expiryDate || '');
                                      }}
                                      className="text-[11px] font-bold text-[#ff5500] hover:underline cursor-pointer"
                                    >
                                      Editar data
                                    </button>
                                    {doc && (doc.expiryDate || doc.fileUrl) && (
                                      <button
                                        type="button"
                                        onClick={() => setDocToDelete({ docType: dtype, name: dtype })}
                                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                                        title={`Excluir registro do documento ${dtype}`}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Storage Attachments Section (PDFs and JPGs) */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-600" />
                      <h5 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Arquivos em PDF e Imagens JPG ({allAttachments.length})
                      </h5>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => {
                          setShowUploadForm(true);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="text-xs font-bold text-[#ff5500] hover:text-[#e64d00] flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Anexar Novo Arquivo</span>
                      </button>
                    )}
                  </div>

                  {allAttachments.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50/80 rounded-2xl border-2 border-dashed border-slate-200 space-y-2">
                      <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                        <FileText className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-slate-700">
                        Nenhum arquivo em PDF ou JPG anexado a esta frota
                      </p>
                      <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                        {isAdmin 
                          ? 'Clique no botão acima para adicionar documentos digitalizados a partir do armazenamento do dispositivo.' 
                          : 'Apenas administradores podem enviar novos arquivos. Quando adicionados, eles aparecerão aqui para consulta.'}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {allAttachments.map((att: any) => {
                        const isPdf = att.fileType === 'application/pdf' || att.name.toLowerCase().endsWith('.pdf');
                        return (
                          <div 
                            key={att.id}
                            className="p-3.5 bg-white rounded-xl border border-slate-200/90 shadow-2xs hover:shadow-xs transition space-y-2.5 flex flex-col justify-between"
                          >
                            <div className="flex items-start gap-3">
                              {isPdf ? (
                                <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
                                  <FileText className="w-5 h-5" />
                                </div>
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 border border-orange-100 flex items-center justify-center shrink-0 overflow-hidden">
                                  {att.dataUrl ? (
                                    <img 
                                      src={att.dataUrl} 
                                      alt={att.name}
                                      className="w-full h-full object-cover" 
                                    />
                                  ) : (
                                    <ImageIcon className="w-5 h-5" />
                                  )}
                                </div>
                              )}

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                                    {att.category}
                                  </span>
                                  {isPdf ? (
                                    <span className="text-[9px] font-black uppercase text-rose-700 bg-rose-50 px-1.5 py-0.2 rounded">
                                      PDF
                                    </span>
                                  ) : (
                                    <span className="text-[9px] font-black uppercase text-orange-700 bg-orange-50 px-1.5 py-0.2 rounded">
                                      JPG
                                    </span>
                                  )}
                                </div>

                                <p className="text-xs font-bold text-slate-900 truncate mt-1" title={att.name}>
                                  {att.name}
                                </p>

                                <div className="text-[10px] text-slate-400 font-medium flex items-center gap-2 mt-0.5">
                                  <span>{formatFileSize(att.fileSize)}</span>
                                  <span>·</span>
                                  <span>{att.uploadedAt}</span>
                                </div>
                              </div>
                            </div>

                            {/* Attachment details & action buttons */}
                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                              <span className="text-[10px] text-slate-500 truncate" title={att.uploadedBy}>
                                Por: {att.uploadedBy || 'Administrador'}
                              </span>

                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => setPreviewFile({
                                    name: att.name,
                                    dataUrl: att.dataUrl,
                                    type: att.fileType,
                                    category: att.category
                                  })}
                                  className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                                  title="Visualizar documento"
                                >
                                  <Eye className="w-4 h-4 text-[#ff5500]" />
                                </button>

                                <a
                                  href={att.dataUrl}
                                  download={att.name}
                                  className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                                  title="Baixar arquivo original"
                                >
                                  <Download className="w-4 h-4 text-slate-600" />
                                </a>

                                {isAdmin && (
                                  <button
                                    onClick={() => setAttachmentToDelete(att)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                                    title="Excluir anexo"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 3: ORDENS DE SERVIÇO */}
            {activeTab === 'os' && (
              <div className="space-y-4 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-tight">
                      Histórico de Manutenções da Frota ({vehicleOrders.length})
                    </h4>
                    <p className="text-xs text-slate-500">
                      Todas as ordens de serviço corretivas associadas a este veículo
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      onClose();
                      onOpenNewOSForVehicle(vehicle.id);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-white bg-[#ff5500] hover:bg-[#e64d00] transition active:scale-95 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    <span>Abrir Nova OS</span>
                  </button>
                </div>

                {vehicleOrders.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-2">
                    <Wrench className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-bold text-slate-600">
                      Nenhuma ordem de serviço registrada para a Frota {vehicle.fleetNumber}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      O veículo está operando em conformidade técnica sem manutenções pendentes.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {vehicleOrders.map(os => (
                      <div 
                        key={os.id} 
                        className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-2xs hover:border-orange-200 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-start sm:items-center gap-3">
                          <span className="font-mono font-black text-xs px-2.5 py-1 bg-slate-100 rounded text-slate-900">
                            {os.code}
                          </span>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-xs text-slate-900">{os.title}</span>
                              <span className="text-[10px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                                {os.category}
                              </span>
                              <PriorityBadge priority={os.priority} size="sm" showSeverityLabel={true} />
                            </div>
                            <span className="text-[11px] text-slate-500 block mt-0.5">
                              Aberto em {os.createdAt} por {os.openedByName}
                              {os.assignedToName && ` · Responsável: ${os.assignedToName}`}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                            os.status === 'Aberta' ? 'bg-blue-100 text-blue-800' :
                            os.status === 'Em andamento' ? 'bg-amber-100 text-amber-800' :
                            os.status === 'Resolvida' ? 'bg-emerald-100 text-emerald-800' :
                            'bg-slate-200 text-slate-700'
                          }`}>
                            {os.status}
                          </span>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => setOsToDelete(os)}
                              className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                              title={`Excluir OS #${os.code}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>

          {/* Fixed Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Fechar
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportPDF}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-[#ff5500]" />
                <span>Exportar Relatório (PDF)</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenNewOSForVehicle(vehicle.id);
                }}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-[#ff5500] hover:bg-[#e64d00] rounded-xl shadow-md shadow-orange-500/20 transition active:scale-95 cursor-pointer"
              >
                <Wrench className="w-4 h-4" />
                <span>Abrir OS para este veículo</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* DOCUMENT VIEWER MODAL (Full Preview for PDF / JPG) */}
      {previewFile && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-slate-800">
            {/* Viewer Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                {previewFile.type === 'application/pdf' ? (
                  <FileText className="w-5 h-5 text-rose-400 shrink-0" />
                ) : (
                  <ImageIcon className="w-5 h-5 text-orange-400 shrink-0" />
                )}
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold truncate">
                    {previewFile.name}
                  </h4>
                  <span className="text-[10px] text-slate-400">
                    Frota {vehicle.fleetNumber} {previewFile.category && `· Categoria: ${previewFile.category}`}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={previewFile.dataUrl}
                  download={previewFile.name}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar</span>
                </a>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Viewer Body */}
            <div className="flex-1 overflow-auto bg-slate-100 flex items-center justify-center p-4 min-h-[450px]">
              {previewFile.type === 'application/pdf' ? (
                <iframe
                  src={previewFile.dataUrl}
                  title={previewFile.name}
                  className="w-full h-full min-h-[500px] border-0 rounded-lg shadow-sm bg-white"
                />
              ) : (
                <div className="max-w-full max-h-full flex items-center justify-center">
                  <img
                    src={previewFile.dataUrl}
                    alt={previewFile.name}
                    className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-lg border border-slate-200"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Excluir Frota (Administrador) */}
      <ConfirmDeleteModal
        isOpen={deleteFleetModalOpen}
        onClose={() => setDeleteFleetModalOpen(false)}
        onConfirm={() => {
          deleteVehicle(vehicle.id);
          setDeleteFleetModalOpen(false);
          onClose();
        }}
        title="Excluir Cadastro da Frota"
        itemCategory="Veículo / Frota"
        itemName={`Frota ${vehicle.fleetNumber} (${vehicle.plate}/${vehicle.uf})`}
        description={`Tem certeza que deseja excluir permanentemente o cadastro da Frota ${vehicle.fleetNumber}? Todos os documentos, históricos, fotos e informações vinculadas a este veículo serão removidos.`}
        warningNote="Esta ação é definitiva e removerá o veículo da base de dados."
        confirmButtonText="Sim, Excluir Frota"
      />

      {/* Modal: Excluir Documento Obrigatório (Administrador) */}
      <ConfirmDeleteModal
        isOpen={!!docToDelete}
        onClose={() => setDocToDelete(null)}
        onConfirm={() => {
          if (docToDelete) {
            deleteVehicleDocument(vehicle.id, docToDelete.docType);
            setDocToDelete(null);
          }
        }}
        title="Excluir Documento da Frota"
        itemCategory="Documentação Veicular"
        itemName={docToDelete ? `${docToDelete.name} - Frota ${vehicle.fleetNumber}` : ''}
        description={`Tem certeza que deseja remover o cadastro do documento ${docToDelete?.name} da Frota ${vehicle.fleetNumber}? Os dados de vencimento e arquivo associados serão excluídos.`}
        warningNote="O documento voltará a constar como não cadastrado/pendente."
        confirmButtonText="Excluir Documento"
      />

      {/* Modal: Excluir Anexo / Arquivo Digitalizado (Administrador) */}
      <ConfirmDeleteModal
        isOpen={!!attachmentToDelete}
        onClose={() => setAttachmentToDelete(null)}
        onConfirm={() => {
          if (attachmentToDelete) {
            removeVehicleAttachment(vehicle.id, attachmentToDelete.id);
            setAttachmentToDelete(null);
          }
        }}
        title="Excluir Arquivo Anexado"
        itemCategory="Arquivo / Anexo"
        itemName={attachmentToDelete?.name}
        description={`Deseja excluir permanentemente o arquivo "${attachmentToDelete?.name}" da Frota ${vehicle.fleetNumber}?`}
        warningNote="O arquivo digitalizado será apagado do armazenamento da frota."
        confirmButtonText="Excluir Arquivo"
      />

      {/* Modal: Excluir Ordem de Serviço (Administrador) */}
      <ConfirmDeleteModal
        isOpen={!!osToDelete}
        onClose={() => setOsToDelete(null)}
        onConfirm={() => {
          if (osToDelete) {
            deleteServiceOrder(osToDelete.id);
            setOsToDelete(null);
          }
        }}
        title="Excluir Ordem de Serviço"
        itemCategory="Manutenção / OS"
        itemName={osToDelete ? `OS #${osToDelete.code} - ${osToDelete.title}` : ''}
        description={`Tem certeza que deseja excluir permanentemente a Ordem de Serviço #${osToDelete?.code}? Todos os registros, fotos e notas de resolução serão removidos.`}
        warningNote="Esta ação é irreversível e excluirá a OS do histórico desta frota."
        confirmButtonText="Excluir OS"
      />
    </>
  );
};
