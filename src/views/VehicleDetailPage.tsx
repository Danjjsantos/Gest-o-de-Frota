import React, { useState, useRef, useMemo } from 'react';
import { 
  ArrowLeft,
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
  Lock,
  Truck,
  FileCheck,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Settings2,
  Building2,
  Tag,
  Award,
  Layers,
  Edit2,
  X,
  Search,
  Filter,
  Fuel,
  Gauge
} from 'lucide-react';
import { Vehicle, VehicleType, CargoProductType, DocumentType, VehicleAttachment, VehicleEquipment, ServiceOrder } from '../types';
import { useFleet, getDaysDifference, formatDisplayDate } from '../context/FleetContext';
import { PriorityBadge } from '../components/PriorityBadge';
import { generateVehicleDossierPDF } from '../utils/pdfGenerator';
import { ServiceOrderDetailModal } from '../components/modals/ServiceOrderDetailModal';
import { ConfirmDeleteModal } from '../components/modals/ConfirmDeleteModal';

interface VehicleDetailPageProps {
  vehicle: Vehicle;
  onBack: () => void;
  onOpenNewOS: (vehicleId: string) => void;
}

type TabType = 'equipamentos' | 'geral' | 'documentos' | 'os';

export const VehicleDetailPage: React.FC<VehicleDetailPageProps> = ({
  vehicle: propVehicle,
  onBack,
  onOpenNewOS,
}) => {
  const { 
    vehicles,
    currentUser, 
    updateVehicle,
    deleteVehicle,
    deleteVehicleDocument,
    updateVehicleDocument, 
    updateVehicleDocumentWithFile,
    addVehicleAttachment,
    removeVehicleAttachment,
    addVehicleEquipment,
    updateVehicleEquipment,
    deleteVehicleEquipment,
    serviceOrders, 
    deleteServiceOrder,
    users,
    settings 
  } = useFleet();

  // Dynamically resolve vehicle from FleetContext state so any updates to equipments, documents, or attachments reflect instantly without needing a page refresh
  const vehicle = useMemo(() => {
    return vehicles.find(v => v.id === propVehicle.id) || propVehicle;
  }, [vehicles, propVehicle]);

  const isAdministrator = currentUser?.role === 'Administrador';

  const [activeTab, setActiveTab] = useState<TabType>('geral');
  const [editingDoc, setEditingDoc] = useState<DocumentType | null>(null);
  const [newDate, setNewDate] = useState('');
  const [pdfSuccess, setPdfSuccess] = useState(false);
  const [selectedOS, setSelectedOS] = useState<ServiceOrder | null>(null);

  // Delete Modals State (for Administrator)
  const [deleteFleetModalOpen, setDeleteFleetModalOpen] = useState(false);
  const [docToDelete, setDocToDelete] = useState<{ docType: DocumentType; name: string } | null>(null);
  const [attachmentToDelete, setAttachmentToDelete] = useState<VehicleAttachment | null>(null);
  const [osToDelete, setOsToDelete] = useState<ServiceOrder | null>(null);

  // General Info Edit Modal State (for Administrator)
  const [showEditGeneralModal, setShowEditGeneralModal] = useState(false);
  const [genFleetNumber, setGenFleetNumber] = useState('');
  const [genPlate, setGenPlate] = useState('');
  const [genUf, setGenUf] = useState('');
  const [genType, setGenType] = useState<VehicleType>('Carreta');
  const [genCargoProducts, setGenCargoProducts] = useState<CargoProductType[]>([]);
  const [genVacuumValue, setGenVacuumValue] = useState('');
  const [genVacuumDate, setGenVacuumDate] = useState('');
  const [showVacuumModal, setShowVacuumModal] = useState(false);
  const [quickVacuumVal, setQuickVacuumVal] = useState('');
  const [quickVacuumDt, setQuickVacuumDt] = useState('');
  const [genBrand, setGenBrand] = useState('');
  const [genModel, setGenModel] = useState('');
  const [genYear, setGenYear] = useState<number>(2026);
  const [genRenavam, setGenRenavam] = useState('');
  const [genChassis, setGenChassis] = useState('');
  const [genColor, setGenColor] = useState('');
  const [genStatus, setGenStatus] = useState<'Ativo' | 'Em Manutenção' | 'Inativo'>('Ativo');
  const [genCharacteristics, setGenCharacteristics] = useState('');
  const [genAdditionalInfo, setGenAdditionalInfo] = useState('');
  const [genNotes, setGenNotes] = useState('');
  const [genImageUrl, setGenImageUrl] = useState('');
  const [genError, setGenError] = useState('');
  const [genSuccess, setGenSuccess] = useState('');
  const vehicleImageInputRef = useRef<HTMLInputElement>(null);
  const [isImgDragging, setIsImgDragging] = useState(false);
  const [imgUploadError, setImgUploadError] = useState('');

  const processVehicleImageFile = (file: File) => {
    setImgUploadError('');
    const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name);
    if (!isImage) {
      setImgUploadError('Formato inválido. Por favor, selecione uma imagem (JPG, PNG, WebP).');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setImgUploadError('A imagem excede o tamanho limite de 15 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setGenImageUrl(event.target.result as string);
      }
    };
    reader.onerror = () => {
      setImgUploadError('Falha ao processar arquivo de imagem do dispositivo.');
    };
    reader.readAsDataURL(file);
  };

  // Search in equipment
  const [equipmentSearch, setEquipmentSearch] = useState('');

  // Equipment Form Modal State (for Administrator)
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [editingEquipmentId, setEditingEquipmentId] = useState<string | null>(null);
  const [eqDescription, setEqDescription] = useState('');
  const [eqCompany, setEqCompany] = useState('');
  const [eqTag, setEqTag] = useState('');
  const [eqCertificate, setEqCertificate] = useState('');
  const [eqCalibrationDate, setEqCalibrationDate] = useState('');
  const [eqNextCalibrationDate, setEqNextCalibrationDate] = useState('');
  const [eqNotes, setEqNotes] = useState('');
  const [eqSelectedFile, setEqSelectedFile] = useState<{
    name: string;
    size: number;
    type: string;
    dataUrl: string;
  } | null>(null);
  const [equipmentError, setEquipmentError] = useState('');
  const [equipmentSuccess, setEquipmentSuccess] = useState('');
  const [isEqDragging, setIsEqDragging] = useState(false);
  const eqFileInputRef = useRef<HTMLInputElement>(null);

  // Document Upload Form State (for general documents)
  const [showDocUploadForm, setShowDocUploadForm] = useState(false);
  const [uploadCategory, setUploadCategory] = useState<DocumentType | 'Nota Fiscal' | 'Manual' | 'Laudo' | 'Outro'>('CRLV');
  const [uploadDocNumber, setUploadDocNumber] = useState('');
  const [uploadExpiryDate, setUploadExpiryDate] = useState('');
  const [uploadNotes, setUploadNotes] = useState('');
  const [docSelectedFile, setDocSelectedFile] = useState<{
    name: string;
    size: number;
    type: string;
    dataUrl: string;
  } | null>(null);
  const [docUploadError, setDocUploadError] = useState('');
  const [docUploadSuccess, setDocUploadSuccess] = useState('');
  const [isDocDragging, setIsDocDragging] = useState(false);
  const docFileInputRef = useRef<HTMLInputElement>(null);

  // File Preview Modal State
  const [previewFile, setPreviewFile] = useState<{
    name: string;
    dataUrl: string;
    type: string;
    title?: string;
  } | null>(null);

  const isAdmin = currentUser?.role === 'Administrador' || currentUser?.role === 'Gerente' || currentUser?.role === 'Encarregado';

  const handleExportPDF = () => {
    generateVehicleDossierPDF(vehicle, serviceOrders, users);
    setPdfSuccess(true);
    setTimeout(() => setPdfSuccess(false), 3000);
  };

  const vehicleOrders = serviceOrders.filter(os => os.vehicleId === vehicle.id || os.fleetNumber === vehicle.fleetNumber);
  const activeVehicleOrders = useMemo(() => {
    return vehicleOrders.filter(
      (os: ServiceOrder) => os.status === 'Aberta' || os.status === 'Em andamento' || os.status === 'Resolvida'
    );
  }, [vehicleOrders]);

  const docTypes: DocumentType[] = ['CRLV', 'CIPP', 'CIV', 'Tacógrafo'];
  const allAttachments = vehicle.attachments || [];
  const allEquipments = vehicle.equipments || [];
  const registeredDocsCount = useMemo(() => {
    return Object.values(vehicle.documents || {}).filter(d => d && (d.fileUrl || d.expiryDate)).length;
  }, [vehicle.documents]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Process Equipment File (PDF or JPG/PNG)
  const processEqFile = (file: File) => {
    setEquipmentError('');
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(file.name);

    if (!isPdf && !isImage) {
      setEquipmentError('Formato inválido. Por favor, selecione um arquivo PDF ou imagem JPG/PNG.');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      setEquipmentError('O arquivo selecionado excede o limite máximo de 20 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setEqSelectedFile({
        name: file.name,
        size: file.size,
        type: isPdf ? 'application/pdf' : file.type || 'image/jpeg',
        dataUrl: event.target?.result as string,
      });
    };
    reader.onerror = () => {
      setEquipmentError('Erro ao carregar arquivo do dispositivo.');
    };
    reader.readAsDataURL(file);
  };

  const openNewEquipmentModal = () => {
    setEditingEquipmentId(null);
    setEqDescription('');
    setEqCompany('');
    setEqTag('');
    setEqCertificate('');
    setEqCalibrationDate(new Date().toISOString().split('T')[0]);
    // Default next calibration date: 1 year from now
    const nextYear = new Date();
    nextYear.setFullYear(nextYear.getFullYear() + 1);
    setEqNextCalibrationDate(nextYear.toISOString().split('T')[0]);
    setEqNotes('');
    setEqSelectedFile(null);
    setEquipmentError('');
    setShowEquipmentModal(true);
  };

  const openEditEquipmentModal = (eq: VehicleEquipment) => {
    setEditingEquipmentId(eq.id);
    setEqDescription(eq.description);
    setEqCompany(eq.company);
    setEqTag(eq.tag);
    setEqCertificate(eq.certificateNumber);
    setEqCalibrationDate(eq.calibrationDate);
    setEqNextCalibrationDate(eq.nextCalibrationDate);
    setEqNotes(eq.notes || '');
    if (eq.fileUrl && eq.fileName) {
      setEqSelectedFile({
        name: eq.fileName,
        size: eq.fileSize || 0,
        type: eq.fileType || 'application/pdf',
        dataUrl: eq.fileUrl,
      });
    } else {
      setEqSelectedFile(null);
    }
    setEquipmentError('');
    setShowEquipmentModal(true);
  };

  const handleSaveEquipment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setEquipmentError('Apenas administradores podem cadastrar ou editar equipamentos.');
      return;
    }

    if (!eqDescription.trim()) {
      setEquipmentError('Informe a descrição do equipamento.');
      return;
    }
    if (!eqCompany.trim()) {
      setEquipmentError('Informe o nome da empresa ou laboratório de calibração.');
      return;
    }
    if (!eqTag.trim()) {
      setEquipmentError('Informe a TAG do equipamento.');
      return;
    }
    if (!eqCertificate.trim()) {
      setEquipmentError('Informe o número do certificado de calibração.');
      return;
    }
    if (!eqCalibrationDate) {
      setEquipmentError('Informe a data de calibração.');
      return;
    }
    if (!eqNextCalibrationDate) {
      setEquipmentError('Informe a data da próxima calibração.');
      return;
    }

    if (editingEquipmentId) {
      // Update existing
      updateVehicleEquipment(vehicle.id, editingEquipmentId, {
        description: eqDescription.trim(),
        company: eqCompany.trim(),
        tag: eqTag.trim(),
        certificateNumber: eqCertificate.trim(),
        calibrationDate: eqCalibrationDate,
        nextCalibrationDate: eqNextCalibrationDate,
        notes: eqNotes.trim() || undefined,
        ...(eqSelectedFile ? {
          fileName: eqSelectedFile.name,
          fileType: eqSelectedFile.type,
          fileSize: eqSelectedFile.size,
          fileUrl: eqSelectedFile.dataUrl,
          dataUrl: eqSelectedFile.dataUrl,
        } : {}),
      });
      setEquipmentSuccess(`Equipamento "${eqDescription}" atualizado com sucesso!`);
    } else {
      // Add new
      addVehicleEquipment(vehicle.id, {
        description: eqDescription.trim(),
        company: eqCompany.trim(),
        tag: eqTag.trim(),
        certificateNumber: eqCertificate.trim(),
        calibrationDate: eqCalibrationDate,
        nextCalibrationDate: eqNextCalibrationDate,
        notes: eqNotes.trim() || undefined,
        fileName: eqSelectedFile?.name,
        fileType: eqSelectedFile?.type,
        fileSize: eqSelectedFile?.size,
        fileUrl: eqSelectedFile?.dataUrl,
        dataUrl: eqSelectedFile?.dataUrl,
        uploadedAt: eqSelectedFile ? new Date().toLocaleDateString('pt-BR') : undefined,
        uploadedBy: currentUser ? `${currentUser.name} (${currentUser.role})` : 'Administrador',
      });
      setEquipmentSuccess(`Equipamento "${eqDescription}" cadastrado com sucesso na Frota ${vehicle.fleetNumber}!`);
    }

    setTimeout(() => setEquipmentSuccess(''), 4000);
    setShowEquipmentModal(false);
  };

  const handleDeleteEquipment = (eqId: string, eqDesc: string) => {
    if (!isAdmin) return;
    deleteVehicleEquipment(vehicle.id, eqId);
    setEquipmentSuccess(`Equipamento "${eqDesc}" removido com sucesso.`);
    setTimeout(() => setEquipmentSuccess(''), 3000);
  };

  const toggleGenCargoProduct = (product: CargoProductType) => {
    setGenCargoProducts(prev => {
      if (prev.includes(product)) {
        if (prev.length === 1) return prev;
        return prev.filter(p => p !== product);
      } else {
        return [...prev, product];
      }
    });
  };

  const openEditGeneralModal = () => {
    setGenFleetNumber(vehicle.fleetNumber);
    setGenPlate(vehicle.plate);
    setGenUf(vehicle.uf);
    setGenType(vehicle.type);
    const initialCargo: CargoProductType[] = (vehicle.cargoProducts && vehicle.cargoProducts.length > 0)
      ? (vehicle.cargoProducts as CargoProductType[])
      : (vehicle.cargoProduct ? [vehicle.cargoProduct as CargoProductType] : ['Gases do Ar (LO2, LN2, LAR)']);
    setGenCargoProducts(initialCargo);
    setGenVacuumValue(vehicle.vacuumValue != null ? String(vehicle.vacuumValue) : '');
    setGenVacuumDate(vehicle.vacuumDate || '');
    setGenBrand(vehicle.brand);
    setGenModel(vehicle.model);
    setGenYear(vehicle.year);
    setGenRenavam(vehicle.renavam || '');
    setGenChassis(vehicle.chassis || '');
    setGenColor(vehicle.color || 'Branco');
    setGenStatus(vehicle.status);
    setGenCharacteristics(vehicle.characteristics || '');
    setGenAdditionalInfo(vehicle.additionalInfo || '');
    setGenNotes(vehicle.notes || '');
    setGenImageUrl(vehicle.imageUrl || '');
    setGenError('');
    setShowEditGeneralModal(true);
  };

  const openQuickVacuumModal = () => {
    setQuickVacuumVal(vehicle.vacuumValue != null ? String(vehicle.vacuumValue) : '');
    setQuickVacuumDt(vehicle.vacuumDate || new Date().toISOString().split('T')[0]);
    setShowVacuumModal(true);
  };

  const handleSaveQuickVacuum = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanVal = quickVacuumVal.trim();
    updateVehicle(vehicle.id, {
      vacuumValue: cleanVal || undefined,
      vacuumDate: cleanVal && quickVacuumDt ? quickVacuumDt : undefined,
      vacuumUnit: cleanVal ? 'mtorr' : undefined,
    });
    setShowVacuumModal(false);
    setGenSuccess(`Medição de vácuo da Frota ${vehicle.fleetNumber} atualizada para ${cleanVal}mtorr!`);
    setTimeout(() => setGenSuccess(''), 4000);
  };

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setGenError('Apenas administradores têm permissão para editar informações gerais.');
      return;
    }
    if (!genFleetNumber.trim()) {
      setGenError('Informe o número da frota.');
      return;
    }
    if (!genPlate.trim()) {
      setGenError('Informe a placa do veículo.');
      return;
    }
    if (!genBrand.trim() || !genModel.trim()) {
      setGenError('Informe a marca e o modelo do veículo.');
      return;
    }

    const isCarretaOrTruck = genType === 'Caminhão' || genType === 'Carreta';
    const carriesGasesDoAr = isCarretaOrTruck && genCargoProducts.includes('Gases do Ar (LO2, LN2, LAR)');

    updateVehicle(vehicle.id, {
      fleetNumber: genFleetNumber.trim(),
      plate: genPlate.trim().toUpperCase(),
      uf: genUf.trim().toUpperCase() || 'RJ',
      type: genType,
      cargoProducts: isCarretaOrTruck && genCargoProducts.length > 0 ? genCargoProducts : undefined,
      cargoProduct: isCarretaOrTruck && genCargoProducts.length > 0 ? genCargoProducts.join(', ') : undefined,
      vacuumValue: carriesGasesDoAr && genVacuumValue.trim() ? genVacuumValue.trim() : undefined,
      vacuumDate: carriesGasesDoAr && genVacuumDate ? genVacuumDate : undefined,
      vacuumUnit: carriesGasesDoAr && genVacuumValue.trim() ? 'mtorr' : undefined,
      brand: genBrand.trim(),
      model: genModel.trim(),
      year: Number(genYear) || vehicle.year,
      renavam: genRenavam.trim() || undefined,
      chassis: genChassis.trim() || undefined,
      color: genColor.trim() || 'Branco',
      status: genStatus,
      characteristics: genCharacteristics.trim() || undefined,
      additionalInfo: genAdditionalInfo.trim() || undefined,
      notes: genNotes.trim() || undefined,
      imageUrl: genImageUrl.trim() || undefined,
    });

    setGenSuccess(`Informações gerais da Frota ${genFleetNumber.trim()} atualizadas com sucesso!`);
    setTimeout(() => setGenSuccess(''), 4000);
    setShowEditGeneralModal(false);
  };

  // Status calculation for display
  const getEquipmentStatusBadge = (nextCalDate: string) => {
    const targetDate = new Date(nextCalDate);
    const refDate = new Date('2026-09-25T12:00:00Z');
    const diffDays = Math.ceil((targetDate.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Vencido há {Math.abs(diffDays)}d ({nextCalDate})</span>
        </span>
      );
    } else if (diffDays <= 30) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
          <Clock className="w-3.5 h-3.5" />
          <span>Vence em {diffDays}d ({nextCalDate})</span>
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Calibrado ({nextCalDate})</span>
        </span>
      );
    }
  };

  // General Document Upload Handler
  const handleSaveDocUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!docSelectedFile) {
      setDocUploadError('Selecione um arquivo PDF ou imagem JPG do dispositivo.');
      return;
    }

    const isMandatoryDoc = ['CRLV', 'CIPP', 'CIV', 'Tacógrafo'].includes(uploadCategory);

    if (isMandatoryDoc) {
      const existingDoc = vehicle.documents[uploadCategory as DocumentType];
      const effectiveExpiryDate = uploadExpiryDate || existingDoc?.expiryDate || '';
      updateVehicleDocumentWithFile(vehicle.id, uploadCategory as DocumentType, {
        expiryDate: effectiveExpiryDate,
        number: uploadDocNumber.trim() || existingDoc?.number || undefined,
        notes: uploadNotes.trim() || undefined,
        fileName: docSelectedFile.name,
        fileType: docSelectedFile.type,
        fileSize: docSelectedFile.size,
        fileUrl: docSelectedFile.dataUrl,
      });
    } else {
      addVehicleAttachment(vehicle.id, {
        name: docSelectedFile.name,
        dataUrl: docSelectedFile.dataUrl,
        fileType: docSelectedFile.type,
        fileSize: docSelectedFile.size,
        category: uploadCategory,
        number: uploadDocNumber.trim() || undefined,
        expiryDate: uploadExpiryDate || undefined,
        notes: uploadNotes.trim() || undefined,
        uploadedBy: currentUser ? `${currentUser.name} (${currentUser.role})` : 'Administrador',
      });
    }

    setDocUploadSuccess(`Documento "${docSelectedFile.name}" anexado com sucesso!`);
    setTimeout(() => setDocUploadSuccess(''), 4000);
    setDocSelectedFile(null);
    setUploadDocNumber('');
    setUploadExpiryDate('');
    setUploadNotes('');
    setShowDocUploadForm(false);
  };

  const filteredEquipments = allEquipments.filter(eq => {
    if (!equipmentSearch.trim()) return true;
    const query = equipmentSearch.toLowerCase();
    return (
      (eq.description || '').toLowerCase().includes(query) ||
      (eq.company || '').toLowerCase().includes(query) ||
      (eq.tag || '').toLowerCase().includes(query) ||
      (eq.certificateNumber || '').toLowerCase().includes(query)
    );
  });

  return (
    <div className="min-h-full bg-slate-50/60 pb-16">
      
      {/* Top Breadcrumb & Actions Bar */}
      <div className="bg-white border-b border-slate-200/90 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 transition cursor-pointer shrink-0"
              title="Voltar para a listagem de frotas"
            >
              <ArrowLeft className="w-4 h-4 text-slate-600" />
              <span>Voltar para Frotas</span>
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && (
              <button
                onClick={handleExportPDF}
                className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                  pdfSuccess
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
                title="Baixar Relatório Completo da Frota em PDF"
              >
                <Download className={`w-3.5 h-3.5 ${pdfSuccess ? 'text-white' : 'text-[#ff5500]'}`} />
                <span>{pdfSuccess ? 'Relatório Baixado!' : 'Exportar Relatório'}</span>
              </button>
            )}

            {isAdministrator && (
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
              onClick={() => onOpenNewOS(vehicle.id)}
              className="flex items-center gap-2 bg-[#ff5500] hover:bg-[#e64d00] text-white px-4 py-1.5 rounded-xl text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer whitespace-nowrap"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Abrir OS</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Container */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 pt-6 space-y-6">

        {/* Vehicle Hero Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-start sm:items-center gap-4">
              {vehicle.imageUrl ? (
                <img 
                  src={vehicle.imageUrl} 
                  alt={vehicle.fleetNumber}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border border-slate-200 shadow-xs shrink-0" 
                />
              ) : (
                <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex items-center justify-center font-mono font-black text-xl shrink-0 border ${
                  vehicle.type === 'Carreta' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                  vehicle.type === 'Cavalo Mecânico' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                  'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {vehicle.fleetNumber}
                </div>
              )}

              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-sans">
                    Frota {vehicle.fleetNumber}
                  </h1>
                  <span className={`text-xs px-3 py-1 rounded-full font-bold ${
                    vehicle.type === 'Carreta' ? 'bg-purple-100 text-purple-700' :
                    vehicle.type === 'Cavalo Mecânico' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    {vehicle.type}
                  </span>
                  <span className={`text-[11px] px-2.5 py-0.5 rounded-md font-bold uppercase ${
                    vehicle.status === 'Ativo' ? 'bg-emerald-100 text-emerald-800' :
                    vehicle.status === 'Em Manutenção' ? 'bg-amber-100 text-amber-800' :
                    'bg-slate-100 text-slate-700'
                  }`}>
                    ● {vehicle.status}
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
                            className={`inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-bold shadow-2xs border ${
                              isCO2
                                ? 'bg-teal-50 text-teal-800 border-teal-200'
                                : 'bg-cyan-50 text-cyan-800 border-cyan-200'
                            }`}
                            title={`Produto transportado pela frota: ${product}`}
                          >
                            <span className={`w-2 h-2 rounded-full ${isCO2 ? 'bg-teal-500' : 'bg-cyan-500 animate-pulse'}`} />
                            <span className="font-sans">{product}</span>
                          </span>
                        );
                      })}
                    </div>
                  )}

                  {/* Medição do Vácuo no Cabeçalho da Frota (Gases do Ar): Vácuo: "Valor"mtorr. E a data. */}
                  {((vehicle.cargoProducts?.includes('Gases do Ar (LO2, LN2, LAR)') || vehicle.cargoProduct?.includes('Gases do Ar')) && vehicle.vacuumValue != null && vehicle.vacuumValue !== '') && (
                    <button
                      type="button"
                      onClick={openQuickVacuumModal}
                      className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-bold shadow-2xs border bg-indigo-50 text-indigo-900 border-indigo-200/90 hover:bg-indigo-100 hover:border-indigo-300 transition cursor-pointer group"
                      title="Clique para atualizar a medição do vácuo criogênico"
                    >
                      <Gauge className="w-3.5 h-3.5 text-indigo-600 shrink-0 group-hover:scale-110 transition-transform" />
                      <span>Vácuo: {vehicle.vacuumValue}mtorr</span>
                      {vehicle.vacuumDate && (
                        <>
                          <span className="text-indigo-300 font-bold select-none">·</span>
                          <span className="text-indigo-700 font-medium">{formatDisplayDate(vehicle.vacuumDate)}</span>
                        </>
                      )}
                    </button>
                  )}

                  {/* Botão rápido para adicionar vácuo caso ainda não tenha sido registrado */}
                  {((vehicle.cargoProducts?.includes('Gases do Ar (LO2, LN2, LAR)') || vehicle.cargoProduct?.includes('Gases do Ar')) && (vehicle.vacuumValue == null || vehicle.vacuumValue === '')) && (
                    <button
                      type="button"
                      onClick={openQuickVacuumModal}
                      className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full font-bold border border-dashed border-indigo-300 bg-indigo-50/60 text-indigo-700 hover:bg-indigo-100/80 transition cursor-pointer"
                      title="Adicionar medição de vácuo (mtorr) e data para esta carreta/caminhão"
                    >
                      <Gauge className="w-3 h-3 text-indigo-600" />
                      <span>+ Medir Vácuo</span>
                    </button>
                  )}

                  {/* Sinalização sucinta de OS ativa (Aberta, Em andamento ou Resolvida) */}
                  {activeVehicleOrders.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {activeVehicleOrders.some((o: ServiceOrder) => o.status === 'Aberta') && (
                        <button 
                          type="button"
                          onClick={() => {
                            const os = activeVehicleOrders.find((o: ServiceOrder) => o.status === 'Aberta');
                            if (os) setSelectedOS(os);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs hover:bg-blue-100 hover:border-blue-300 transition cursor-pointer active:scale-95"
                          title="Clique para abrir, dar baixa ou encerrar a OS aberta"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
                          <span>OS Aberta</span>
                        </button>
                      )}
                      {activeVehicleOrders.some((o: ServiceOrder) => o.status === 'Em andamento') && (
                        <button 
                          type="button"
                          onClick={() => {
                            const os = activeVehicleOrders.find((o: ServiceOrder) => o.status === 'Em andamento');
                            if (os) setSelectedOS(os);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs hover:bg-amber-100 hover:border-amber-300 transition cursor-pointer active:scale-95"
                          title="Clique para abrir, dar baixa ou encerrar a OS em andamento"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
                          <span>OS em Andamento</span>
                        </button>
                      )}
                      {activeVehicleOrders.some((o: ServiceOrder) => o.status === 'Resolvida') && (
                        <button 
                          type="button"
                          onClick={() => {
                            const os = activeVehicleOrders.find((o: ServiceOrder) => o.status === 'Resolvida');
                            if (os) setSelectedOS(os);
                          }}
                          className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs hover:bg-emerald-100 hover:border-emerald-300 transition cursor-pointer active:scale-95"
                          title="Clique para abrir, visualizar ou encerrar a OS resolvida"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                          <span>OS Resolvida</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap pt-1 text-sm sm:text-base">
                  <span className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    {vehicle.model}
                  </span>
                  <span className="text-slate-300 font-bold select-none">•</span>
                  <span className="font-mono font-bold text-slate-800">
                    {vehicle.plate} / {vehicle.uf}
                  </span>
                  {vehicle.brand && (
                    <>
                      <span className="text-slate-300 font-bold select-none">•</span>
                      <span className="font-bold text-slate-600 uppercase text-xs sm:text-sm">
                        {vehicle.brand}
                      </span>
                    </>
                  )}
                  {vehicle.year && (
                    <>
                      <span className="text-slate-300 font-bold select-none">•</span>
                      <span className="font-semibold text-slate-500 uppercase text-xs sm:text-sm">
                        ANO {vehicle.year}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-100">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Equipamentos</span>
                <span className="text-lg font-black text-slate-900 block mt-0.5">{allEquipments.length}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Documentos</span>
                <span className="text-lg font-black text-slate-900 block mt-0.5">{registeredDocsCount}</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total de OS</span>
                <span className="text-lg font-black text-slate-900 block mt-0.5">{vehicleOrders.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Notifications */}
        {genSuccess && (
          <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{genSuccess}</span>
            </div>
            <button onClick={() => setGenSuccess('')} className="text-white/80 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {equipmentSuccess && (
          <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{equipmentSuccess}</span>
            </div>
            <button onClick={() => setEquipmentSuccess('')} className="text-white/80 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {docUploadSuccess && (
          <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl text-xs font-bold flex items-center justify-between shadow-xs animate-in fade-in duration-150">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{docUploadSuccess}</span>
            </div>
            <button onClick={() => setDocUploadSuccess('')} className="text-white/80 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Main Tabs Navigation */}
        <div className="flex items-center border-b border-slate-200 gap-2 sm:gap-4 overflow-x-auto pb-px">
          {/* 1. Visão Geral */}
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

          {/* 2. Documentos */}
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
            {registeredDocsCount > 0 && (
              <span className="bg-slate-200 text-slate-700 text-[10px] font-black px-2 py-0.5 rounded-full">
                {registeredDocsCount}
              </span>
            )}
          </button>

          {/* 3. Equipamentos */}
          <button
            onClick={() => setActiveTab('equipamentos')}
            className={`py-3 px-3 text-xs sm:text-sm font-bold border-b-2 transition flex items-center gap-2 cursor-pointer whitespace-nowrap ${
              activeTab === 'equipamentos'
                ? 'border-[#ff5500] text-[#ff5500]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings2 className="w-4 h-4" />
            <span>Equipamentos</span>
            <span className="bg-orange-100 text-[#ff5500] text-[10px] font-black px-2 py-0.5 rounded-full">
              {allEquipments.length}
            </span>
          </button>

          {/* 4. Ordens de Serviço */}
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
            <span className="bg-slate-200 text-slate-700 text-[10px] font-black px-2 py-0.5 rounded-full">
              {vehicleOrders.length}
            </span>
          </button>
        </div>

        {/* TAB 1: EQUIPAMENTOS (Novo Tópico Solicitado) */}
        {activeTab === 'equipamentos' && (
          <div className="space-y-5 animate-in fade-in duration-150">
            {/* Header & Action Bar for Equipments */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
              <div className="space-y-0.5">
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Settings2 className="w-5 h-5 text-[#ff5500]" />
                  <span>Controle de Equipamentos & Calibração</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Gerenciamento de instrumentos (manômetros, válvulas, sensores), TAGs, certificados e laudos de calibração
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {isAdmin ? (
                  <button
                    onClick={openNewEquipmentModal}
                    className="flex items-center gap-2 bg-[#ff5500] hover:bg-[#e64d00] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>Cadastrar Equipamento</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 shrink-0">
                    <Lock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Cadastro restrito ao Administrador</span>
                  </div>
                )}
              </div>
            </div>

            {/* Filter / Search input */}
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar equipamento por descrição, empresa, TAG ou certificado..."
                value={equipmentSearch}
                onChange={e => setEquipmentSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ff5500]"
              />
            </div>

            {/* Equipment Cards / List */}
            {filteredEquipments.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-2xl border-2 border-dashed border-slate-200 space-y-3">
                <div className="w-12 h-12 rounded-full bg-orange-50 text-[#ff5500] flex items-center justify-center mx-auto">
                  <Settings2 className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    {equipmentSearch ? 'Nenhum equipamento coincide com a busca' : 'Nenhum equipamento cadastrado nesta frota'}
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                    {isAdmin
                      ? 'Adicione os instrumentos calibráveis da frota com TAG, empresa responsável, número de certificado e o arquivo em PDF ou JPG.'
                      : 'Nenhum instrumento registrado pelo administrador até o momento.'}
                  </p>
                </div>
                {isAdmin && !equipmentSearch && (
                  <button
                    onClick={openNewEquipmentModal}
                    className="inline-flex items-center gap-2 bg-[#ff5500] hover:bg-[#e64d00] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Cadastrar Primeiro Equipamento</span>
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredEquipments.map(eq => {
                  const isPdf = eq.fileType === 'application/pdf' || eq.fileName?.toLowerCase().endsWith('.pdf');
                  return (
                    <div 
                      key={eq.id}
                      className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md transition p-4 sm:p-5 flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-3">
                        {/* Line 1: TAG + Status Badge */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-black px-2.5 py-1 rounded-lg bg-slate-900 text-white flex items-center gap-1.5 shadow-2xs">
                              <Tag className="w-3.5 h-3.5 text-orange-400" />
                              <span>{eq.tag}</span>
                            </span>
                          </div>

                          {getEquipmentStatusBadge(eq.nextCalibrationDate)}
                        </div>

                        {/* Line 2: Description */}
                        <div>
                          <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                            {eq.description}
                          </h3>
                        </div>

                        {/* Detailed Specs Grid */}
                        <div className="grid grid-cols-2 gap-2.5 p-3 bg-slate-50/80 rounded-xl border border-slate-100 text-xs">
                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                              <Building2 className="w-3 h-3" />
                              <span>Empresa / Laboratório</span>
                            </span>
                            <span className="font-semibold text-slate-800 block mt-0.5 truncate" title={eq.company}>
                              {eq.company}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                              <Award className="w-3 h-3" />
                              <span>Nº do Certificado</span>
                            </span>
                            <span className="font-mono font-bold text-slate-800 block mt-0.5 truncate" title={eq.certificateNumber}>
                              {eq.certificateNumber}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                              <Calendar className="w-3 h-3" />
                              <span>Data de Calibração</span>
                            </span>
                            <span className="font-medium text-slate-700 block mt-0.5">
                              {eq.calibrationDate}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                              <Clock className="w-3 h-3 text-[#ff5500]" />
                              <span>Próxima Calibração</span>
                            </span>
                            <span className="font-bold text-slate-900 block mt-0.5">
                              {eq.nextCalibrationDate}
                            </span>
                          </div>
                        </div>

                        {/* Notes if any */}
                        {eq.notes && (
                          <p className="text-xs text-slate-500 italic bg-amber-50/50 p-2 rounded-lg border border-amber-100/60">
                            "{eq.notes}"
                          </p>
                        )}
                      </div>

                      {/* Attached Certificate Section & Actions */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
                        {(eq.dataUrl || eq.fileUrl) ? (
                          <div className="flex items-center gap-2 min-w-0">
                            {isPdf ? (
                              <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
                                <FileText className="w-4 h-4" />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 border border-orange-100 flex items-center justify-center shrink-0 overflow-hidden">
                                <img src={eq.dataUrl || eq.fileUrl} alt="preview" className="w-full h-full object-cover" />
                              </div>
                            )}

                            <div className="min-w-0">
                              <span className="text-xs font-bold text-slate-800 truncate block max-w-[170px]" title={eq.fileName}>
                                {eq.fileName || 'Certificado Anexo'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {isPdf ? 'PDF' : 'JPG'} · {eq.fileSize ? formatFileSize(eq.fileSize) : 'Anexo'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1 ml-1">
                              <button
                                onClick={() => setPreviewFile({
                                  name: eq.fileName || `Certificado_${eq.tag}`,
                                  dataUrl: (eq.dataUrl || eq.fileUrl)!,
                                  type: eq.fileType || 'application/pdf',
                                  title: `Certificado de Calibração: ${eq.description} (${eq.tag})`
                                })}
                                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                                title="Visualizar Certificado em Tela Cheia"
                              >
                                <Eye className="w-4 h-4 text-[#ff5500]" />
                              </button>

                              <a
                                href={eq.dataUrl || eq.fileUrl}
                                download={eq.fileName || `Certificado_${eq.tag}.pdf`}
                                className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
                                title="Baixar Arquivo"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-slate-400 flex items-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-slate-300" />
                            <span>Sem arquivo anexado</span>
                          </div>
                        )}

                        {/* Admin Action Buttons */}
                        {isAdmin && (
                          <div className="flex items-center gap-1 ml-auto">
                            <button
                              onClick={() => openEditEquipmentModal(eq)}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
                              title="Editar Equipamento"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleDeleteEquipment(eq.id, eq.description)}
                              className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                              title="Remover Equipamento"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: VISÃO GERAL & CADASTRO */}
        {activeTab === 'geral' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Header & Edit Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
              <div className="space-y-0.5">
                <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Truck className="w-5 h-5 text-[#ff5500]" />
                  <span>Informações Gerais & Cadastro da Frota</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Dados cadastrais oficiais, características técnicas, informações adicionais e histórico da frota
                </p>
              </div>

              {isAdmin ? (
                <button
                  onClick={openEditGeneralModal}
                  className="flex items-center gap-2 bg-[#ff5500] hover:bg-[#e64d00] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Edit2 className="w-4 h-4" />
                  <span>Editar Informações Gerais</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 shrink-0">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Edição restrita ao Administrador</span>
                </div>
              )}
            </div>

            {/* Highlights Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
                <span className="text-[11px] text-slate-400 font-medium block">Placa / UF</span>
                <span className="text-lg font-black text-slate-900 font-mono tracking-tight mt-0.5 block">
                  {vehicle.plate}/{vehicle.uf}
                </span>
              </div>

              <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
                <span className="text-[11px] text-slate-400 font-medium block">Frota Nº</span>
                <span className="text-lg font-black text-slate-900 font-mono tracking-tight mt-0.5 block">
                  {vehicle.fleetNumber}
                </span>
              </div>

              <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
                <span className="text-[11px] text-slate-400 font-medium block">Tipo & Ano</span>
                <span className="text-sm font-bold text-slate-800 mt-0.5 block truncate">
                  {vehicle.type} · {vehicle.year}
                </span>
              </div>

              <div className="p-4 bg-white rounded-xl border border-slate-200/90 shadow-2xs">
                <span className="text-[11px] text-slate-400 font-medium block">Status Operacional</span>
                <span className={`text-sm font-bold mt-0.5 block ${
                  vehicle.status === 'Ativo' ? 'text-emerald-700' :
                  vehicle.status === 'Em Manutenção' ? 'text-amber-700' : 'text-slate-600'
                }`}>
                  ● {vehicle.status}
                </span>
              </div>
            </div>

            {/* Complete Vehicle Data Grid */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 space-y-4 shadow-2xs">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Truck className="w-4 h-4 text-[#ff5500]" />
                <span>Dados Cadastrais Oficiais do Veículo</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Marca / Fabricante</span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 block">{vehicle.brand}</span>
                </div>

                <div>
                  <span className="text-slate-400 block font-medium">Modelo</span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 block">{vehicle.model}</span>
                </div>

                <div>
                  <span className="text-slate-400 block font-medium">Ano de Fabricação</span>
                  <span className="font-bold text-slate-900 text-sm mt-0.5 block">{vehicle.year}</span>
                </div>

                <div>
                  <span className="text-slate-400 block font-medium">Placa / UF</span>
                  <span className="font-mono font-bold text-slate-800 text-sm mt-0.5 block">
                    {vehicle.plate} / {vehicle.uf}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block font-medium">Total de OS Registradas</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">{vehicleOrders.length} ordens</span>
                </div>

                <div>
                  <span className="text-slate-400 block font-medium">Equipamentos Cadastrados</span>
                  <span className="font-bold text-slate-900 mt-0.5 block">{allEquipments.length} instrumentos</span>
                </div>
              </div>
            </div>

            {/* TÓPICO: CARACTERÍSTICAS TÉCNICAS E OPERACIONAIS */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#ff5500] flex items-center justify-center shrink-0">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 tracking-tight">
                      Características Técnicas do Veículo / Implemento
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Capacidade volumétrica e de carga, eixos, tara, PBT, dimensões e tipo de engate
                    </p>
                  </div>
                </div>

                {isAdmin && (
                  <button
                    onClick={openEditGeneralModal}
                    className="text-xs font-bold text-[#ff5500] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Editar Características</span>
                  </button>
                )}
              </div>

              {vehicle.characteristics && vehicle.characteristics.trim() ? (
                <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/70 text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                  {vehicle.characteristics}
                </div>
              ) : (
                <div className="p-6 bg-slate-50/50 rounded-xl border-2 border-dashed border-slate-200 text-center space-y-1.5">
                  <p className="text-xs font-bold text-slate-700">
                    Nenhuma característica técnica detalhada informada
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                    {isAdmin 
                      ? 'Clique no botão de edição para cadastrar a capacidade de carga, eixos, tara, PBT e tipo de implemento.'
                      : 'O administrador ainda não cadastrou os detalhes de capacidade e eixos desta frota.'}
                  </p>
                  {isAdmin && (
                    <button
                      onClick={openEditGeneralModal}
                      className="mt-1 px-3 py-1.5 bg-orange-100 hover:bg-orange-200 text-[#ff5500] text-xs font-bold rounded-lg transition"
                    >
                      + Adicionar Características
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* TÓPICO: INFORMAÇÕES ADICIONAIS & RASTREAMENTO */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 sm:p-6 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-orange-50 text-[#ff5500] flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 tracking-tight">
                      Informações Adicionais (Telemetria, Seguros & Operação)
                    </h3>
                    <p className="text-[11px] text-slate-500">
                      Rastreador, apólice de seguro de cargas, contratos de locação e normas operacionais
                    </p>
                  </div>
                </div>

                {isAdmin && (
                  <button
                    onClick={openEditGeneralModal}
                    className="text-xs font-bold text-[#ff5500] hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Editar Informações</span>
                  </button>
                )}
              </div>

              {vehicle.additionalInfo && vehicle.additionalInfo.trim() ? (
                <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/70 text-xs sm:text-sm text-slate-800 leading-relaxed font-medium">
                  {vehicle.additionalInfo}
                </div>
              ) : (
                <div className="p-6 bg-slate-50/50 rounded-xl border-2 border-dashed border-slate-200 text-center space-y-1.5">
                  <p className="text-xs font-bold text-slate-700">
                    Nenhuma informação adicional ou de rastreamento informada
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                    {isAdmin 
                      ? 'Cadastre dados do rastreador (Sascar/Omnilink), apólice da seguradora ou autorizações de transporte de produtos.'
                      : 'Nenhuma nota operacional adicional foi cadastrada para esta frota.'}
                  </p>
                  {isAdmin && (
                    <button
                      onClick={openEditGeneralModal}
                      className="mt-1 px-3 py-1.5 bg-orange-100 hover:bg-orange-200 text-[#ff5500] text-xs font-bold rounded-lg transition"
                    >
                      + Adicionar Informações Adicionais
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Observações Internas */}
            {vehicle.notes && (
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-2 shadow-2xs">
                <span className="text-slate-400 text-xs block font-bold uppercase tracking-wider">Observações Internas</span>
                <p className="text-xs sm:text-sm text-slate-700 font-medium">{vehicle.notes}</p>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DOCUMENTAÇÃO & ARQUIVOS */}
        {activeTab === 'documentos' && (
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <FileCheck className="w-5 h-5 text-[#ff5500]" />
                  <span>Documentos Oficiais & Arquivos (PDF e JPG)</span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Armazenamento de certificados veiculares, vistorias e laudos
                </p>
              </div>

              {isAdmin ? (
                <button
                  onClick={() => setShowDocUploadForm(!showDocUploadForm)}
                  className="flex items-center gap-2 bg-[#ff5500] hover:bg-[#e64d00] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer whitespace-nowrap shrink-0"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>{showDocUploadForm ? 'Fechar Envio' : 'Adicionar Documento (PDF/JPG)'}</span>
                </button>
              ) : (
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 shrink-0">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Upload restrito ao Administrador</span>
                </div>
              )}
            </div>

            {/* ADMIN DOCUMENT UPLOAD FORM */}
            {isAdmin && showDocUploadForm && (
              <form 
                onSubmit={handleSaveDocUpload}
                className="p-5 bg-white rounded-2xl border-2 border-orange-200 shadow-md space-y-4 animate-in slide-in-from-top-2 duration-200"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <UploadCloud className="w-5 h-5 text-[#ff5500]" />
                    <h4 className="text-xs font-black uppercase text-slate-900 tracking-tight">
                      Adicionar Novo Documento a Partir do Armazenamento
                    </h4>
                  </div>
                  <button type="button" onClick={() => setShowDocUploadForm(false)} className="text-slate-400 hover:text-slate-600">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {docUploadError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{docUploadError}</span>
                  </div>
                )}

                {/* File picker */}
                <div
                  onClick={() => docFileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 hover:border-[#ff5500] rounded-xl p-6 text-center cursor-pointer transition bg-slate-50/50 hover:bg-orange-50/20 flex flex-col items-center justify-center gap-2"
                >
                  <input
                    ref={docFileInputRef}
                    type="file"
                    accept="application/pdf,image/jpeg,image/jpg,image/png,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
                        const reader = new FileReader();
                        reader.onload = (evt) => {
                          setDocSelectedFile({
                            name: file.name,
                            size: file.size,
                            type: isPdf ? 'application/pdf' : file.type || 'image/jpeg',
                            dataUrl: evt.target?.result as string,
                          });
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                    className="hidden"
                  />

                  {docSelectedFile ? (
                    <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs max-w-md w-full text-left">
                      {docSelectedFile.type === 'application/pdf' ? (
                        <FileText className="w-6 h-6 text-rose-600 shrink-0" />
                      ) : (
                        <ImageIcon className="w-6 h-6 text-orange-600 shrink-0" />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 truncate">{docSelectedFile.name}</p>
                        <span className="text-[10px] text-slate-400 font-mono">{formatFileSize(docSelectedFile.size)}</span>
                      </div>
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Carregado
                      </span>
                    </div>
                  ) : (
                    <>
                      <UploadCloud className="w-8 h-8 text-[#ff5500]" />
                      <p className="text-xs font-bold text-slate-800">
                        Clique para selecionar arquivo em PDF ou JPG do dispositivo
                      </p>
                    </>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Tipo de Documento *</label>
                    <select
                      value={uploadCategory}
                      onChange={e => setUploadCategory(e.target.value as any)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800"
                    >
                      <option value="CRLV">CRLV (Certificado de Licenciamento)</option>
                      <option value="CIPP">CIPP (Produtos Perigosos)</option>
                      <option value="CIV">CIV (Inspeção Veicular)</option>
                      <option value="Tacógrafo">Tacógrafo (Laudo INMETRO)</option>
                      <option value="Nota Fiscal">Nota Fiscal</option>
                      <option value="Laudo">Laudo Técnico</option>
                      <option value="Manual">Manual</option>
                      <option value="Outro">Outro Documento</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Nº do Documento</label>
                    <input
                      type="text"
                      placeholder="Ex: 2026/09918"
                      value={uploadDocNumber}
                      onChange={e => setUploadDocNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Data de Vencimento</label>
                    <input
                      type="date"
                      value={uploadExpiryDate}
                      onChange={e => setUploadExpiryDate(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setShowDocUploadForm(false)}
                    className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold text-white bg-[#ff5500] hover:bg-[#e64d00] rounded-xl shadow-xs"
                  >
                    Salvar e Anexar
                  </button>
                </div>
              </form>
            )}

            {/* Mandatory Docs List */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Certificados de Registro Obrigatórios
                </h4>
                <span className="text-[11px] text-slate-400">
                  Visualização e download de arquivos anexados
                </span>
              </div>

              <div className="space-y-2.5">
                {docTypes.map(dtype => {
                  const doc = vehicle.documents[dtype];
                  const hasFile = !!(doc?.fileUrl);

                  return (
                    <div 
                      key={dtype}
                      className={`p-3.5 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        hasFile 
                          ? 'bg-emerald-50/40 border-emerald-200 shadow-2xs' 
                          : 'bg-slate-50 border-slate-200/80'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          hasFile ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-slate-200 text-slate-700'
                        }`}>
                          {hasFile ? <FileCheck className="w-4 h-4 stroke-[2.5]" /> : <FileText className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-xs text-slate-900">{dtype}</span>
                            {hasFile && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100/90 text-emerald-800 border border-emerald-300">
                                <FileCheck className="w-3 h-3 text-emerald-700 shrink-0" />
                                <span className="truncate max-w-[200px]" title={doc.fileName || 'Arquivo Anexado'}>
                                  {doc.fileName || 'Arquivo Anexado'}
                                </span>
                              </span>
                            )}
                            {doc?.number && (
                              <span className="text-[10px] font-mono text-slate-600 bg-slate-200/70 px-1.5 py-0.5 rounded">
                                Nº {doc.number}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 block mt-0.5">
                            {doc?.expiryDate 
                              ? `Vencimento: ${formatDisplayDate(doc.expiryDate)}` 
                              : hasFile 
                              ? 'Documento digitalizado anexado à frota' 
                              : 'Não cadastrado'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                        {hasFile && (
                          <>
                            <button
                              onClick={() => setPreviewFile({
                                name: doc.fileName || `${dtype}_Frota_${vehicle.fleetNumber}`,
                                dataUrl: doc.fileUrl!,
                                type: doc.fileType || 'application/pdf',
                                title: `Documento Veicular: ${dtype}`
                              })}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-[#ff5500] bg-orange-50 hover:bg-orange-100 transition cursor-pointer"
                              title="Visualizar documento em tela cheia"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Visualizar</span>
                            </button>

                            <a
                              href={doc.fileUrl}
                              download={doc.fileName || `${dtype}_Frota_${vehicle.fleetNumber}.pdf`}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 transition cursor-pointer"
                              title="Baixar arquivo do documento"
                            >
                              <Download className="w-3.5 h-3.5 text-slate-600" />
                              <span>Baixar</span>
                            </a>
                          </>
                        )}

                        <span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                          doc?.status === 'valid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          doc?.status === 'expiring' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          doc?.status === 'expired' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                          hasFile ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                          'bg-white text-slate-500 border-slate-200'
                        }`}>
                          {doc?.status === 'valid' ? 'Válido' : 
                           doc?.status === 'expiring' ? 'A Vencer' : 
                           doc?.status === 'expired' ? 'Vencido' : 
                           hasFile ? 'Anexado' : 'Pendente'}
                        </span>

                        {isAdministrator && (
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setUploadCategory(dtype);
                                setShowDocUploadForm(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-[#ff5500] hover:bg-orange-50 rounded-lg transition cursor-pointer"
                              title={`Anexar / Atualizar arquivo do documento ${dtype}`}
                            >
                              <UploadCloud className="w-4 h-4" />
                            </button>

                            {doc && (doc.expiryDate || doc.fileUrl) && (
                              <button
                                type="button"
                                onClick={() => setDocToDelete({ docType: dtype, name: dtype })}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                title={`Excluir registro do documento ${dtype}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: ORDENS DE SERVIÇO */}
        {activeTab === 'os' && (
          <div className="space-y-4 animate-in fade-in duration-150">
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200/90 shadow-2xs">
              <div>
                <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-[#ff5500]" />
                  <span>Histórico de Manutenções da Frota</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Total de {vehicleOrders.length} ordens de serviço registradas para este veículo
                </p>
              </div>

              <button
                onClick={() => onOpenNewOS(vehicle.id)}
                className="flex items-center gap-2 bg-[#ff5500] hover:bg-[#e64d00] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Abrir Nova OS</span>
              </button>
            </div>

            {vehicleOrders.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 space-y-2">
                <Wrench className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-sm font-bold text-slate-700">Nenhuma Ordem de Serviço aberta para esta frota</p>
                <p className="text-xs text-slate-400">Quando houver defeitos mecânicos ou elétricos, abra uma nova OS.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {vehicleOrders.map(order => (
                  <div 
                    key={order.id} 
                    onClick={() => setSelectedOS(order)}
                    className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs hover:shadow-md hover:border-orange-300 transition-all cursor-pointer flex items-center justify-between gap-3 group"
                    title="Clique para visualizar, dar baixa ou encerrar a OS"
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs font-bold text-slate-500">#{order.code}</span>
                        <span className="text-xs font-bold text-slate-900 group-hover:text-[#ff5500] transition">
                          {order.title}
                        </span>
                        <PriorityBadge priority={order.priority} />
                        <span className="text-[11px] text-slate-400 font-medium">Categoria: {order.category}</span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2">{order.description}</p>
                      {order.executedByName && (
                        <p className="text-[11px] text-slate-600 font-medium">
                          <span className="text-slate-400">Executor:</span> {order.executedByName} ({order.executedByRole})
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full inline-block ${
                          order.status === 'Resolvida'
                            ? 'bg-emerald-100 text-emerald-800'
                            : order.status === 'Encerrada'
                            ? 'bg-slate-100 text-slate-700'
                            : order.status === 'Em andamento'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {order.status}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-1">{order.createdAt}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {isAdministrator && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOsToDelete(order);
                            }}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title={`Excluir OS #${order.code}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#ff5500] group-hover:translate-x-1 transition-all" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>

      {/* MODAL: EDITAR INFORMAÇÕES GERAIS DA FROTA (Administrador) */}
      {showEditGeneralModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-100 max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-100 text-[#ff5500] flex items-center justify-center shrink-0">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                    Editar Informações Gerais
                  </h3>
                  <span className="text-xs text-slate-500">
                    Frota {vehicle.fleetNumber} ({vehicle.plate})
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setShowEditGeneralModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveGeneral} className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
              {genError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{genError}</span>
                </div>
              )}

              {/* Grid 1: Identificação Básica */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Número da Frota *
                  </label>
                  <input
                    type="text"
                    value={genFleetNumber}
                    onChange={e => setGenFleetNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ff5500]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Placa do Veículo *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: ABC-1D23"
                    value={genPlate}
                    onChange={e => setGenPlate(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ff5500]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Estado (UF) *
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    placeholder="Ex: RJ, SP, GO"
                    value={genUf}
                    onChange={e => setGenUf(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ff5500]"
                    required
                  />
                </div>
              </div>

              {/* Grid 2: Tipo, Fabricante e Modelo */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tipo de Veículo *
                  </label>
                  <select
                    value={genType}
                    onChange={e => setGenType(e.target.value as VehicleType)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ff5500]"
                  >
                    <option value="Carreta">Carreta (Semirreboque / Tanque)</option>
                    <option value="Cavalo Mecânico">Cavalo Mecânico (Unidade Tratora)</option>
                    <option value="Caminhão">Caminhão (Toco / Trucado)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Marca / Fabricante *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: SR/RANDON, Scania, Mercedes-Benz"
                    value={genBrand}
                    onChange={e => setGenBrand(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ff5500]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Modelo Comercial *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: TWM-19C, R420 A8X2"
                    value={genModel}
                    onChange={e => setGenModel(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ff5500]"
                    required
                  />
                </div>
              </div>

              {/* Seleção de Produtos Carregados para Caminhão e Carreta */}
              {(genType === 'Caminhão' || genType === 'Carreta') && (
                <div className="p-3.5 bg-orange-50/70 border border-orange-200/90 rounded-xl space-y-2.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Fuel className="w-3.5 h-3.5 text-[#ff5500]" />
                      <span>Produtos que a Frota Carrega *</span>
                    </label>
                    <span className="text-[10px] text-orange-800 font-bold bg-orange-100 px-2 py-0.5 rounded-full border border-orange-200/80">
                      Exibido no Cabeçalho
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Selecione os produtos transportados por este veículo ({genType.toLowerCase()}):
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                    {/* Gases do Ar */}
                    <button
                      type="button"
                      onClick={() => toggleGenCargoProduct('Gases do Ar (LO2, LN2, LAR)')}
                      className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition cursor-pointer ${
                        genCargoProducts.includes('Gases do Ar (LO2, LN2, LAR)')
                          ? 'bg-cyan-50/90 border-cyan-400 text-cyan-950 ring-1 ring-cyan-400 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center border text-[10px] shrink-0 font-bold ${
                        genCargoProducts.includes('Gases do Ar (LO2, LN2, LAR)')
                          ? 'bg-cyan-600 border-cyan-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}>
                        {genCargoProducts.includes('Gases do Ar (LO2, LN2, LAR)') ? '✓' : ''}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold leading-tight text-slate-900">Gases do Ar (LO2, LN2, LAR)</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Oxigênio Líquido, Nitrogênio e Argônio</p>
                      </div>
                    </button>

                    {/* CO2 */}
                    <button
                      type="button"
                      onClick={() => toggleGenCargoProduct('CO2')}
                      className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition cursor-pointer ${
                        genCargoProducts.includes('CO2')
                          ? 'bg-teal-50/90 border-teal-400 text-teal-950 ring-1 ring-teal-400 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center border text-[10px] shrink-0 font-bold ${
                        genCargoProducts.includes('CO2')
                          ? 'bg-teal-600 border-teal-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}>
                        {genCargoProducts.includes('CO2') ? '✓' : ''}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold leading-tight text-slate-900">CO2</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Dióxido de Carbono Líquido</p>
                      </div>
                    </button>
                  </div>

                  {/* Medição do Vácuo (mtorr) e Data para frotas de Gases do Ar */}
                  {genCargoProducts.includes('Gases do Ar (LO2, LN2, LAR)') && (
                    <div className="pt-2.5 border-t border-orange-200/60 mt-1 space-y-2 animate-in fade-in duration-150">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Gauge className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Medição do Vácuo (Isolamento Criogênico)</span>
                        </label>
                        <span className="text-[10px] text-indigo-700 bg-indigo-50 font-bold px-2 py-0.5 rounded-full border border-indigo-200/80">
                          Unidade: mtorr
                        </span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Valor Medido do Vácuo
                          </label>
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Ex: 8.5 ou 12"
                              value={genVacuumValue}
                              onChange={e => setGenVacuumValue(e.target.value)}
                              className="w-full pl-3 pr-14 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ff5500]"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-indigo-600 font-mono select-none">
                              mtorr
                            </span>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                            Data da Medição
                          </label>
                          <input
                            type="date"
                            value={genVacuumDate}
                            onChange={e => setGenVacuumDate(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ff5500]"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Grid 3: Ano, Renavam, Chassi e Cor */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ano de Fabricação
                  </label>
                  <input
                    type="number"
                    min={1970}
                    max={2035}
                    value={genYear}
                    onChange={e => setGenYear(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ff5500]"
                  />
                </div>
              </div>

              {/* Grid 4: Status Operacional & URL da Imagem */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status Operacional
                  </label>
                  <select
                    value={genStatus}
                    onChange={e => setGenStatus(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ff5500]"
                  >
                    <option value="Ativo">Ativo (Em Operação)</option>
                    <option value="Em Manutenção">Em Manutenção (Oficina / Parada)</option>
                    <option value="Inativo">Inativo (Reserva / Desativado)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Foto do Veículo (Upload do Armazenamento ou Link)
                  </label>
                  
                  {genImageUrl ? (
                    <div className="flex items-center gap-3 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                      <img
                        src={genImageUrl}
                        alt="Foto do Veículo"
                        className="w-12 h-12 rounded-lg object-cover border border-slate-300 shadow-2xs shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-slate-800 block truncate">
                          Imagem Selecionada
                        </span>
                        <span className="text-[10px] text-emerald-600 font-semibold block">
                          ✓ Armazenada e pronta para salvar
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => vehicleImageInputRef.current?.click()}
                          className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition cursor-pointer"
                        >
                          Trocar
                        </button>
                        <button
                          type="button"
                          onClick={() => setGenImageUrl('')}
                          className="p-1 text-slate-400 hover:text-red-500 rounded-lg transition cursor-pointer"
                          title="Remover foto"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsImgDragging(true); }}
                      onDragLeave={() => setIsImgDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsImgDragging(false);
                        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                          processVehicleImageFile(e.dataTransfer.files[0]);
                        }
                      }}
                      onClick={() => vehicleImageInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition flex flex-col items-center justify-center gap-1 ${
                        isImgDragging ? 'border-[#ff5500] bg-orange-50/50' : 'border-slate-200 hover:border-[#ff5500] bg-slate-50/50'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-orange-100 text-[#ff5500] flex items-center justify-center">
                        <UploadCloud className="w-4 h-4" />
                      </div>
                      <span className="text-xs font-bold text-slate-800 block">
                        Selecionar foto do armazenamento
                      </span>
                      <span className="text-[10px] text-slate-400 block">
                        ou arraste a imagem aqui (JPG, PNG, WebP)
                      </span>
                    </div>
                  )}

                  <input
                    ref={vehicleImageInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        processVehicleImageFile(e.target.files[0]);
                      }
                    }}
                  />

                  {imgUploadError && (
                    <p className="text-[10px] text-red-600 font-medium">{imgUploadError}</p>
                  )}

                  <input
                    type="url"
                    placeholder="Ou cole o link direto: https://..."
                    value={genImageUrl}
                    onChange={e => setGenImageUrl(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ff5500]"
                  />
                </div>
              </div>

              {/* CAMPO DE CARACTERÍSTICAS (Solicitado) */}
              <div className="p-3.5 bg-orange-50/40 rounded-xl border border-orange-200/80 space-y-1.5">
                <label className="block text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#ff5500]" />
                  <span>Características Técnicas do Veículo / Implemento</span>
                </label>
                <p className="text-[11px] text-slate-500">
                  Descreva capacidade de carga, eixos, tara, PBT, tipo de engate, dimensões e especificações técnicas.
                </p>
                <textarea
                  rows={3}
                  placeholder="Ex: Semirreboque Tanque Criogênico | 3 Eixos Tandem com suspensão pneumática | Capacidade: 19.500 m³ / 22.000 L | PBT: 41.500 kg | Tara: 9.850 kg | Engate pino-rei 2 polegadas padrão ISO."
                  value={genCharacteristics}
                  onChange={e => setGenCharacteristics(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ff5500] leading-relaxed"
                />
              </div>

              {/* CAMPO DE INFORMAÇÕES ADICIONAIS (Solicitado) */}
              <div className="p-3.5 bg-orange-50/40 rounded-xl border border-orange-200/80 space-y-1.5">
                <label className="block text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#ff5500]" />
                  <span>Informações Adicionais (Telemetria, Seguros & Operação)</span>
                </label>
                <p className="text-[11px] text-slate-500">
                  Rastreador, sensor de telemetria, seguradora e apólice, contratos de locação ou autorizações de transporte.
                </p>
                <textarea
                  rows={3}
                  placeholder="Ex: Sistema de telemetria Sascar integrado com sensor de pressão e nível | Apólice Porto Seguro Cargas Perigosas nº 882910/2026 vigência 12/2026 | Operação autorizada para Oxigênio Líquido (UN 1073)..."
                  value={genAdditionalInfo}
                  onChange={e => setGenAdditionalInfo(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ff5500] leading-relaxed"
                />
              </div>

              {/* Observações Gerais */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observações Gerais / Notas Internas
                </label>
                <textarea
                  rows={2}
                  placeholder="Observações complementares internas sobre a frota..."
                  value={genNotes}
                  onChange={e => setGenNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ff5500]"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditGeneralModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-[#ff5500] hover:bg-[#e64d00] rounded-xl shadow-xs transition"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CADASTRO / EDIÇÃO DE EQUIPAMENTO (Com Anexo PDF / JPG) */}
      {showEquipmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-100 max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-100 text-[#ff5500] flex items-center justify-center shrink-0">
                  <Settings2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                    {editingEquipmentId ? 'Editar Equipamento' : 'Cadastrar Novo Equipamento'}
                  </h3>
                  <span className="text-xs text-slate-500">
                    Frota {vehicle.fleetNumber} ({vehicle.plate})
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setShowEquipmentModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveEquipment} className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
              {equipmentError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{equipmentError}</span>
                </div>
              )}

              {/* Descrição */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Descrição do Equipamento *
                </label>
                <input
                  type="text"
                  placeholder="Ex: Manômetro de Pressão do Tanque, Válvula de Segurança, etc."
                  value={eqDescription}
                  onChange={e => setEqDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ff5500]"
                  required
                />
              </div>

              {/* Grid: Empresa + TAG */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Empresa / Laboratório de Calibração *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Metrologia RJ Ltda, Inmetro Lab"
                    value={eqCompany}
                    onChange={e => setEqCompany(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ff5500]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    TAG de Identificação *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: TAG-MN-0197, VALV-042"
                    value={eqTag}
                    onChange={e => setEqTag(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ff5500]"
                    required
                  />
                </div>
              </div>

              {/* Grid: Certificado + Datas */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nº do Certificado *
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: CAL-2026/8912"
                    value={eqCertificate}
                    onChange={e => setEqCertificate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ff5500]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data da Calibração *
                  </label>
                  <input
                    type="date"
                    value={eqCalibrationDate}
                    onChange={e => setEqCalibrationDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ff5500]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Próxima Calibração *
                  </label>
                  <input
                    type="date"
                    value={eqNextCalibrationDate}
                    onChange={e => setEqNextCalibrationDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ff5500]"
                    required
                  />
                  {eqNextCalibrationDate && (() => {
                    const diff = getDaysDifference(eqNextCalibrationDate);
                    if (diff < 0) {
                      return (
                        <span className="text-[10px] text-red-600 font-bold mt-1.5 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          <span>Vencido há {Math.abs(diff)}d (Alerta ativo nas Notificações)</span>
                        </span>
                      );
                    }
                    if (diff <= (settings?.daysThreshold || 30)) {
                      return (
                        <span className="text-[10px] text-amber-600 font-bold mt-1.5 flex items-center gap-1">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span>Vence em {diff}d (Dispara notificação automática)</span>
                        </span>
                      );
                    }
                    return (
                      <span className="text-[10px] text-emerald-600 font-semibold mt-1.5 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                        <span>Calibração vigente ({diff}d restantes)</span>
                      </span>
                    );
                  })()}
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observações Adicionais (opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Faixa de medição 0-25 bar, calibração acreditada RBC."
                  value={eqNotes}
                  onChange={e => setEqNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ff5500]"
                />
              </div>

              {/* Upload de Arquivo do Certificado (PDF ou JPG) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Anexar Certificado ou Laudo (PDF ou Imagem JPG/PNG)</span>
                  <span className="text-[10px] text-slate-400 font-normal">Armazenamento local</span>
                </label>

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsEqDragging(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    setIsEqDragging(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsEqDragging(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) processEqFile(file);
                  }}
                  onClick={() => eqFileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2 ${
                    isEqDragging 
                      ? 'border-[#ff5500] bg-orange-50/60' 
                      : eqSelectedFile
                      ? 'border-emerald-300 bg-emerald-50/30'
                      : 'border-slate-300 hover:border-[#ff5500] bg-slate-50/50 hover:bg-orange-50/20'
                  }`}
                >
                  <input
                    ref={eqFileInputRef}
                    type="file"
                    accept="application/pdf,image/jpeg,image/jpg,image/png,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) processEqFile(file);
                    }}
                    className="hidden"
                  />

                  {eqSelectedFile ? (
                    <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs max-w-md w-full text-left">
                      {eqSelectedFile.type === 'application/pdf' ? (
                        <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                      ) : (
                        <div className="w-9 h-9 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 overflow-hidden">
                          <img src={eqSelectedFile.dataUrl} alt="preview" className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 truncate">{eqSelectedFile.name}</p>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatFileSize(eqSelectedFile.size)} · {eqSelectedFile.type.includes('pdf') ? 'PDF' : 'JPG/PNG'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEqSelectedFile(null);
                        }}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="w-10 h-10 rounded-full bg-orange-100 text-[#ff5500] flex items-center justify-center">
                        <UploadCloud className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          Clique para escolher o arquivo em PDF ou foto em JPG
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Arraste o certificado ou selecione do seu dispositivo
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEquipmentModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-[#ff5500] hover:bg-[#e64d00] rounded-xl shadow-xs transition"
                >
                  {editingEquipmentId ? 'Salvar Alterações' : 'Cadastrar Equipamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* INTEGRATED FILE PREVIEW MODAL (PDF and JPG) */}
      {previewFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200">
            {/* Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                {previewFile.type === 'application/pdf' ? (
                  <FileText className="w-5 h-5 text-rose-600 shrink-0" />
                ) : (
                  <ImageIcon className="w-5 h-5 text-orange-600 shrink-0" />
                )}
                <div className="min-w-0">
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                    {previewFile.title || previewFile.name}
                  </h4>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {previewFile.name}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={previewFile.dataUrl}
                  download={previewFile.name}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#ff5500] text-white hover:bg-[#e64d00] transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Arquivo</span>
                </a>
                <button
                  onClick={() => setPreviewFile(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Viewer Content */}
            <div className="flex-1 overflow-auto bg-slate-100 p-4 flex items-center justify-center min-h-[400px]">
              {previewFile.type === 'application/pdf' ? (
                <iframe
                  src={previewFile.dataUrl}
                  title={previewFile.name}
                  className="w-full h-full min-h-[550px] rounded-xl border border-slate-200 bg-white"
                />
              ) : (
                <img
                  src={previewFile.dataUrl}
                  alt={previewFile.name}
                  className="max-w-full max-h-[75vh] object-contain rounded-xl shadow-md border border-slate-200 bg-white"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Rápido de Atualização da Medição de Vácuo */}
      {showVacuumModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <Gauge className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                    Medição de Vácuo Criogênico
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Frota {vehicle.fleetNumber} ({vehicle.model})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowVacuumModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickVacuum} className="p-5 space-y-4">
              <p className="text-xs text-slate-600 leading-relaxed">
                Registre a aferição do isolamento a vácuo (interespacial) do tanque criogênico de Gases do Ar. A informação será exibida no cabeçalho da frota.
              </p>

              <div className="space-y-3 bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Valor Medido do Vácuo (mtorr) *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Ex: 8.5 ou 12"
                      value={quickVacuumVal}
                      onChange={e => setQuickVacuumVal(e.target.value)}
                      className="w-full pl-3 pr-16 py-2 bg-white border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-indigo-600 font-mono select-none">
                      mtorr
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Unidade técnica: militorr (mtorr)</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Data da Medição *
                  </label>
                  <input
                    type="date"
                    value={quickVacuumDt}
                    onChange={e => setQuickVacuumDt(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowVacuumModal(false)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs transition cursor-pointer active:scale-95"
                >
                  Salvar Medição
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Detalhe da Ordem de Serviço (Visualização, Dar Baixa ou Encerrar) */}
      <ServiceOrderDetailModal
        isOpen={!!selectedOS}
        onClose={() => setSelectedOS(null)}
        os={selectedOS}
      />

      {/* Modal: Excluir Frota (Administrador) */}
      <ConfirmDeleteModal
        isOpen={deleteFleetModalOpen}
        onClose={() => setDeleteFleetModalOpen(false)}
        onConfirm={() => {
          deleteVehicle(vehicle.id);
          setDeleteFleetModalOpen(false);
          onBack();
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

    </div>
  );
};
