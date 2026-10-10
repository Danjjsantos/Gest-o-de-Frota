import React, { useState, useRef } from 'react';
import { X, Truck, Calendar, FileText, UploadCloud, Trash2, Fuel, Gauge } from 'lucide-react';
import { VehicleType, DocumentType, CargoProductType } from '../../types';
import { useFleet } from '../../context/FleetContext';

interface NewVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewVehicleModal: React.FC<NewVehicleModalProps> = ({ isOpen, onClose }) => {
  const { addVehicle } = useFleet();

  const [fleetNumber, setFleetNumber] = useState('');
  const [type, setType] = useState<VehicleType>('Caminhão');
  const [cargoProducts, setCargoProducts] = useState<CargoProductType[]>(['Gases do Ar (LO2, LN2, LAR)']);
  const [vacuumValue, setVacuumValue] = useState('');
  const [vacuumDate, setVacuumDate] = useState('');
  const [plate, setPlate] = useState('');
  const [uf, setUf] = useState('RJ');
  const [renavam, setRenavam] = useState('');
  const [brand, setBrand] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState<number>(2022);
  const [color, setColor] = useState('Branco');
  const [chassis, setChassis] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imgUploadError, setImgUploadError] = useState('');
  const [isImgDragging, setIsImgDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImageFile = (file: File) => {
    setImgUploadError('');
    const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name);
    if (!isImage) {
      setImgUploadError('Formato inválido. Selecione uma imagem (JPG, PNG, WebP).');
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setImgUploadError('A imagem excede 15 MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setImageUrl(event.target.result as string);
      }
    };
    reader.onerror = () => {
      setImgUploadError('Falha ao processar arquivo.');
    };
    reader.readAsDataURL(file);
  };

  // Documents validity dates
  const [crlvDate, setCrlvDate] = useState('');
  const [civDate, setCivDate] = useState('');
  const [cippDate, setCippDate] = useState('');
  const [tacografoDate, setTacografoDate] = useState('');

  const [error, setError] = useState('');

  const toggleCargoProduct = (product: CargoProductType) => {
    setCargoProducts(prev => {
      if (prev.includes(product)) {
        if (prev.length === 1) return prev;
        return prev.filter(p => p !== product);
      } else {
        return [...prev, product];
      }
    });
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fleetNumber.trim() || !plate.trim()) {
      setError('Por favor preencha o número da frota e a placa');
      return;
    }

    const isCarretaOrTruck = type === 'Caminhão' || type === 'Carreta';
    const carriesGasesDoAr = isCarretaOrTruck && cargoProducts.includes('Gases do Ar (LO2, LN2, LAR)');

    addVehicle({
      fleetNumber: fleetNumber.trim(),
      type,
      cargoProducts: isCarretaOrTruck && cargoProducts.length > 0 ? cargoProducts : undefined,
      cargoProduct: isCarretaOrTruck && cargoProducts.length > 0 ? cargoProducts.join(', ') : undefined,
      vacuumValue: carriesGasesDoAr && vacuumValue.trim() ? vacuumValue.trim() : undefined,
      vacuumDate: carriesGasesDoAr && vacuumDate ? vacuumDate : undefined,
      vacuumUnit: carriesGasesDoAr && vacuumValue.trim() ? 'mtorr' : undefined,
      plate: plate.toUpperCase().trim(),
      uf: uf.toUpperCase().trim(),
      brand: brand || (type === 'Carreta' ? 'SR/RANDON' : 'Mercedes-Benz'),
      model: model || (type === 'Carreta' ? 'Tanque Criogênico' : 'Actros'),
      year: Number(year) || 2022,
      renavam,
      color,
      chassis,
      imageUrl: imageUrl.trim() || undefined,
      status: 'Ativo',
      documents: {
        CRLV: crlvDate ? { type: 'CRLV', expiryDate: crlvDate, status: 'valid' } : null,
        CIV: civDate ? { type: 'CIV', expiryDate: civDate, status: 'valid' } : null,
        CIPP: cippDate ? { type: 'CIPP', expiryDate: cippDate, status: 'valid' } : null,
        Tacógrafo: type !== 'Carreta' && tacografoDate ? { type: 'Tacógrafo', expiryDate: tacografoDate, status: 'valid' } : null,
      }
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-100 max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Fixed Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-100 text-[#ff5500] flex items-center justify-center shrink-0">
              <Truck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 tracking-tight uppercase">
                Cadastro de Novo Veículo
              </h3>
              <p className="text-xs text-slate-500">
                Preencha os dados e documentos obrigatórios da frota
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
        <form id="new-vehicle-form" onSubmit={handleSubmit} className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-5">
          {/* Identificação */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff5500]"></span>
              <span>Identificação Principal</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Número da Frota *
                </label>
                <input
                  type="text"
                  placeholder="Ex: F001 ou 0197"
                  value={fleetNumber}
                  onChange={e => setFleetNumber(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#ff5500] focus:bg-white transition"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tipo de Veículo *
                </label>
                <select
                  value={type}
                  onChange={e => setType(e.target.value as VehicleType)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#ff5500] focus:bg-white transition"
                >
                  <option value="Caminhão">Caminhão</option>
                  <option value="Carreta">Carreta</option>
                  <option value="Cavalo Mecânico">Cavalo Mecânico</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Placa & UF *
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="ABC-1234"
                    value={plate}
                    onChange={e => setPlate(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase font-mono focus:outline-none focus:ring-2 focus:ring-[#ff5500] focus:bg-white transition"
                    required
                  />
                  <input
                    type="text"
                    placeholder="UF"
                    value={uf}
                    onChange={e => setUf(e.target.value)}
                    className="w-16 px-2 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs uppercase font-mono text-center focus:outline-none focus:ring-2 focus:ring-[#ff5500] focus:bg-white transition"
                    maxLength={2}
                  />
                </div>
              </div>

              {/* Seleção de Produtos Carregados para Caminhão e Carreta */}
              {(type === 'Caminhão' || type === 'Carreta') && (
                <div className="sm:col-span-2 p-3.5 bg-orange-50/70 border border-orange-200/90 rounded-xl space-y-2.5 animate-in fade-in duration-150">
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
                    Selecione os tipos de produtos que este {type.toLowerCase()} transporta:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                    {/* Gases do Ar */}
                    <button
                      type="button"
                      onClick={() => toggleCargoProduct('Gases do Ar (LO2, LN2, LAR)')}
                      className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition cursor-pointer ${
                        cargoProducts.includes('Gases do Ar (LO2, LN2, LAR)')
                          ? 'bg-cyan-50/90 border-cyan-400 text-cyan-950 ring-1 ring-cyan-400 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center border text-[10px] shrink-0 font-bold ${
                        cargoProducts.includes('Gases do Ar (LO2, LN2, LAR)')
                          ? 'bg-cyan-600 border-cyan-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}>
                        {cargoProducts.includes('Gases do Ar (LO2, LN2, LAR)') ? '✓' : ''}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold leading-tight text-slate-900">Gases do Ar (LO2, LN2, LAR)</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Oxigênio, Nitrogênio e Argônio Criogênico</p>
                      </div>
                    </button>

                    {/* CO2 */}
                    <button
                      type="button"
                      onClick={() => toggleCargoProduct('CO2')}
                      className={`p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition cursor-pointer ${
                        cargoProducts.includes('CO2')
                          ? 'bg-teal-50/90 border-teal-400 text-teal-950 ring-1 ring-teal-400 shadow-2xs'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded mt-0.5 flex items-center justify-center border text-[10px] shrink-0 font-bold ${
                        cargoProducts.includes('CO2')
                          ? 'bg-teal-600 border-teal-600 text-white'
                          : 'border-slate-300 bg-white'
                      }`}>
                        {cargoProducts.includes('CO2') ? '✓' : ''}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold leading-tight text-slate-900">CO2</p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Dióxido de Carbono Líquido</p>
                      </div>
                    </button>
                  </div>

                  {/* Medição do Vácuo (mtorr) e Data para frotas de Gases do Ar */}
                  {cargoProducts.includes('Gases do Ar (LO2, LN2, LAR)') && (
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
                              value={vacuumValue}
                              onChange={e => setVacuumValue(e.target.value)}
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
                            value={vacuumDate}
                            onChange={e => setVacuumDate(e.target.value)}
                            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#ff5500]"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Dados Técnicos */}
          <div>
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff5500]"></span>
              <span>Especificações do Veículo</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Marca
                </label>
                <input
                  type="text"
                  placeholder="Ex: Mercedes-Benz / Scania / Randon"
                  value={brand}
                  onChange={e => setBrand(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#ff5500] focus:bg-white transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Modelo
                </label>
                <input
                  type="text"
                  placeholder="Ex: Actros 2651 / Tanque Criogênico"
                  value={model}
                  onChange={e => setModel(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#ff5500] focus:bg-white transition"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ano de Fabricação
                </label>
                <input
                  type="number"
                  placeholder="Ex: 2022"
                  value={year}
                  onChange={e => setYear(Number(e.target.value))}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-[#ff5500] focus:bg-white transition"
                />
              </div>

              {/* Upload de Imagem do Veículo */}
              <div className="sm:col-span-2 space-y-1.5 pt-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Foto do Veículo (Upload do Armazenamento ou Link)
                </label>

                {imageUrl ? (
                  <div className="flex items-center gap-3 p-2 bg-slate-50 border border-slate-200 rounded-xl">
                    <img
                      src={imageUrl}
                      alt="Preview"
                      className="w-12 h-12 rounded-lg object-cover border border-slate-300 shadow-2xs shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-slate-800 block truncate">
                        Foto Carregada
                      </span>
                      <span className="text-[10px] text-emerald-600 font-semibold block">
                        ✓ Pronta para vincular à frota
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-2.5 py-1 text-[11px] font-bold text-slate-700 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition cursor-pointer"
                      >
                        Trocar
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageUrl('')}
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
                        processImageFile(e.dataTransfer.files[0]);
                      }
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-xl p-3 text-center cursor-pointer transition flex flex-col items-center justify-center gap-1 ${
                      isImgDragging ? 'border-[#ff5500] bg-orange-50/50' : 'border-slate-200 hover:border-[#ff5500] bg-slate-50/50'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-orange-100 text-[#ff5500] flex items-center justify-center">
                      <UploadCloud className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 block">
                      Selecionar foto do armazenamento do dispositivo
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      ou arraste o arquivo aqui (JPG, PNG, WebP)
                    </span>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      processImageFile(e.target.files[0]);
                    }
                  }}
                />

                {imgUploadError && (
                  <p className="text-[10px] text-red-600 font-medium">{imgUploadError}</p>
                )}

                <input
                  type="url"
                  placeholder="Ou cole a URL da imagem aqui: https://..."
                  value={imageUrl}
                  onChange={e => setImageUrl(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#ff5500]"
                />
              </div>
            </div>
          </div>

          {/* Validade dos Documentos Obrigatórios */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff5500]"></span>
                <span>Validade dos Documentos Obrigatórios</span>
              </h4>
              <span className="text-[10px] text-slate-400">Datas de expiração</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  CRLV (Licenciamento)
                </label>
                <input
                  type="date"
                  value={crlvDate}
                  onChange={e => setCrlvDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  CIV (Inspeção Veicular)
                </label>
                <input
                  type="date"
                  value={civDate}
                  onChange={e => setCivDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  CIPP (Produtos Perigosos)
                </label>
                <input
                  type="date"
                  value={cippDate}
                  onChange={e => setCippDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                />
              </div>

              {type !== 'Carreta' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tacógrafo INMETRO
                  </label>
                  <input
                    type="date"
                    value={tacografoDate}
                    onChange={e => setTacografoDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs"
                  />
                </div>
              )}
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
            form="new-vehicle-form"
            className="px-5 py-2 text-xs font-bold text-white bg-[#ff5500] hover:bg-[#e64d00] rounded-xl shadow-md shadow-orange-500/20 transition"
          >
            Salvar Veículo
          </button>
        </div>
      </div>
    </div>
  );
};
