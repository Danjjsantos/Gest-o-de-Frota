import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Vehicle, ServiceOrder, User, OSCategory, DocumentType, getVacuumClassification } from '../types';

interface FleetStatsShape {
  totalVehicles: number;
  caminhaoCount: number;
  carretaCount: number;
  cavaloCount: number;
  openOsCount: number;
  totalOsCount: number;
  expiringDocsCount: number;
  expiredDocsCount: number;
  osByCategory: Record<OSCategory, number>;
}

// Format date helpers
const formatDate = (dateStr?: string) => {
  if (!dateStr) return '—';
  if (dateStr.includes('/')) return dateStr;
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
};

const getNowFormatted = () => {
  const now = new Date();
  return now.toLocaleDateString('pt-BR') + ' às ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

/**
 * 1. RELATÓRIO DO DASHBOARD (Indicadores, Vencimentos, Categorias de Defeitos, Frotas)
 */
export const generateDashboardPDF = (
  stats: FleetStatsShape,
  vehicles: Vehicle[],
  serviceOrders: ServiceOrder[],
  expiredDocs: Array<{ vehicle: Vehicle; docType: DocumentType | string; expiryDate: string; daysDiff: number }>,
  expiringDocs: Array<{ vehicle: Vehicle; docType: DocumentType | string; expiryDate: string; daysRemaining: number }>
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 14;

  // Header Banner
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(10, currentY, pageWidth - 20, 24, 'F');

  // Orange accent bar
  doc.setFillColor(255, 85, 0); // #ff5500
  doc.rect(10, currentY, 4, 24, 'F');

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text('GESTÃO DE FROTAS — RELATÓRIO EXECUTIVO DO DASHBOARD', 18, currentY + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225); // slate-300
  doc.text(`Emissão: ${getNowFormatted()}  |  Base de Dados Operacional Linde/Praxair`, 18, currentY + 17);

  currentY += 30;

  // SECTION 1: Resumo Geral da Frota Cadastrada
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('1. QUANTITATIVO E COMPOSIÇÃO DA FROTA CADASTRADA', 10, currentY);
  currentY += 4;

  // Vehicle type & status counters
  const activeCount = vehicles.filter(v => v.status === 'Ativo').length;
  const maintenanceCount = vehicles.filter(v => v.status === 'Em Manutenção').length;
  const inactiveCount = vehicles.filter(v => v.status === 'Inativo').length;

  autoTable(doc, {
    startY: currentY,
    margin: { left: 10, right: 10 },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 3 },
    headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85], fontStyle: 'bold' },
    head: [['Indicador Operacional', 'Quantidade', 'Representatividade', 'Status da Operação']],
    body: [
      ['Total de Veículos Monitorados', `${stats.totalVehicles}`, '100%', 'Frota Total Registrada'],
      ['Caminhões (Tocos / Trucados)', `${stats.caminhaoCount}`, `${stats.totalVehicles > 0 ? Math.round((stats.caminhaoCount / stats.totalVehicles) * 100) : 0}%`, 'Veículos de Distribuição'],
      ['Carretas (Tanques / Criogênicos)', `${stats.carretaCount}`, `${stats.totalVehicles > 0 ? Math.round((stats.carretaCount / stats.totalVehicles) * 100) : 0}%`, 'Semirreboques'],
      ['Cavalos Mecânicos (Tração)', `${stats.cavaloCount}`, `${stats.totalVehicles > 0 ? Math.round((stats.cavaloCount / stats.totalVehicles) * 100) : 0}%`, 'Unidades Tratoras'],
      ['Veículos Ativos / Disponíveis', `${activeCount}`, `${vehicles.length > 0 ? Math.round((activeCount / vehicles.length) * 100) : 0}%`, 'Em Operação Regular'],
      ['Veículos em Manutenção', `${maintenanceCount}`, `${vehicles.length > 0 ? Math.round((maintenanceCount / vehicles.length) * 100) : 0}%`, maintenanceCount > 0 ? 'Indisponibilidade Técnica' : 'Nenhuma Parada'],
      ['Veículos Inativos / Reserva', `${inactiveCount}`, `${vehicles.length > 0 ? Math.round((inactiveCount / vehicles.length) * 100) : 0}%`, 'Imobilizados / Desativados'],
    ],
  });

  // @ts-ignore
  currentY = doc.lastAutoTable.finalY + 8;

  // SECTION 2: Ordens de Serviço por Categorias de Defeitos
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('2. ORDENS DE SERVIÇO POR CATEGORIAS DE DEFEITOS', 10, currentY);
  currentY += 4;

  const categories: OSCategory[] = ['Mecânica', 'Elétrica', 'Borracharia', 'Driox', 'Seva/Sacar', 'Motora'];
  const osCategoryRows = categories.map(cat => {
    const totalCat = serviceOrders.filter(os => os.category === cat || (cat === 'Seva/Sacar' && (os.category as string) === 'Seva/Sascar')).length;
    const openCat = serviceOrders.filter(os => (os.category === cat || (cat === 'Seva/Sacar' && (os.category as string) === 'Seva/Sascar')) && (os.status === 'Aberta' || os.status === 'Em andamento')).length;
    const resolvedCat = serviceOrders.filter(os => (os.category === cat || (cat === 'Seva/Sacar' && (os.category as string) === 'Seva/Sascar')) && (os.status === 'Resolvida' || os.status === 'Encerrada')).length;
    const pct = stats.totalOsCount > 0 ? Math.round((totalCat / stats.totalOsCount) * 100) : 0;
    return [cat, `${totalCat}`, `${openCat}`, `${resolvedCat}`, `${pct}%`];
  });

  autoTable(doc, {
    startY: currentY,
    margin: { left: 10, right: 10 },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.8 },
    headStyles: { fillColor: [255, 85, 0], textColor: [255, 255, 255], fontStyle: 'bold' },
    head: [['Categoria do Defeito / Sistema', 'Total de OS', 'Pendentes (Abertas/Andam.)', 'Concluídas (Resolv./Enc.)', '% do Total']],
    body: [
      ...osCategoryRows,
      [
        'TOTAL GERAL DE ORDENS',
        `${stats.totalOsCount}`,
        `${stats.openOsCount}`,
        `${stats.totalOsCount - stats.openOsCount}`,
        '100%'
      ]
    ],
    footStyles: { fillColor: [248, 250, 252], fontStyle: 'bold', textColor: [15, 23, 42] }
  });

  // @ts-ignore
  currentY = doc.lastAutoTable.finalY + 8;

  // Check if we need page break for Section 3
  if (currentY > 210) {
    doc.addPage();
    currentY = 16;
  }

  // SECTION 3: Vencimentos de Documentos
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('3. CONTROLE DE VENCIMENTOS DE DOCUMENTOS OBRIGATÓRIOS', 10, currentY);
  currentY += 4;

  const docAlertRows: string[][] = [];

  expiredDocs.forEach(item => {
    docAlertRows.push([
      item.vehicle.fleetNumber,
      `${item.vehicle.plate}/${item.vehicle.uf}`,
      item.vehicle.type,
      item.docType,
      formatDate(item.expiryDate),
      `VENCIDO há ${item.daysDiff} dia(s)`,
      'Crítico (Imediato)'
    ]);
  });

  expiringDocs.forEach(item => {
    docAlertRows.push([
      item.vehicle.fleetNumber,
      `${item.vehicle.plate}/${item.vehicle.uf}`,
      item.vehicle.type,
      item.docType,
      formatDate(item.expiryDate),
      `Vencendo em ${item.daysRemaining} dia(s)`,
      'Atenção (30 dias)'
    ]);
  });

  if (docAlertRows.length === 0) {
    docAlertRows.push(['—', '—', '—', 'Todos os documentos em dia', '—', 'Sem pendências', 'Normal']);
  }

  autoTable(doc, {
    startY: currentY,
    margin: { left: 10, right: 10 },
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255], fontStyle: 'bold' },
    head: [['Frota', 'Placa/UF', 'Tipo', 'Documento', 'Vencimento', 'Situação / Prazos', 'Classificação']],
    body: docAlertRows,
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 5) {
        const text = String(data.cell.raw);
        if (text.includes('VENCIDO')) {
          data.cell.styles.textColor = [185, 28, 28]; // red-700
          data.cell.styles.fontStyle = 'bold';
        } else if (text.includes('Vencendo')) {
          data.cell.styles.textColor = [180, 83, 9]; // amber-700
          data.cell.styles.fontStyle = 'bold';
        }
      }
    }
  });

  // @ts-ignore
  currentY = doc.lastAutoTable.finalY + 8;

  // SECTION 4: Indicadores de Saúde Operacional & Performance
  if (currentY > 215) {
    doc.addPage();
    currentY = 16;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('4. INDICADORES DE SAÚDE OPERACIONAL E DISPONIBILIDADE DA FROTA', 10, currentY);
  currentY += 4;

  const total = vehicles.length || 1;
  const activeCountVal = vehicles.filter(v => v.status === 'Ativo').length;
  const maintenanceCountVal = vehicles.filter(v => v.status === 'Em Manutenção').length;
  const vehiclesWithPendingOS = vehicles.filter(v =>
    serviceOrders.some(os => (os.vehicleId === v.id || os.fleetNumber === v.fleetNumber) && (os.status === 'Aberta' || os.status === 'Em andamento'))
  ).length;
  const expiredVehiclesCount = new Set(expiredDocs.map(item => item.vehicle.id)).size;
  const compliantVehicles = Math.max(0, total - expiredVehiclesCount);

  autoTable(doc, {
    startY: currentY,
    margin: { left: 10, right: 10 },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.8 },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
    head: [['Indicador de Performance', 'Índice Apurado', 'Frotas Atingidas', 'Meta / Parâmetro Operacional']],
    body: [
      ['Taxa de Disponibilidade Geral da Frota', `${Math.round((activeCountVal / total) * 100)}%`, `${activeCountVal} de ${total} frotas`, 'Meta: >= 90% operacional'],
      ['Índice de Conformidade Documental', `${Math.round((compliantVehicles / total) * 100)}%`, `${compliantVehicles} de ${total} regulares`, 'Meta: 100% sem vencimentos'],
      ['Frotas sem Ocorrências / OS Pendentes', `${Math.round(((total - vehiclesWithPendingOS) / total) * 100)}%`, `${total - vehiclesWithPendingOS} de ${total} frotas`, 'Sem chamados corretivos abertos'],
      ['Imobilização Técnica (Manutenção)', `${Math.round((maintenanceCountVal / total) * 100)}%`, `${maintenanceCountVal} frota(s)`, 'Manutenção Corretiva / Preventiva em curso'],
    ],
  });

  // @ts-ignore
  currentY = doc.lastAutoTable.finalY + 8;

  // SECTION 5: Monitoramento de Vácuo das Carretas Criogênicas (Gases do Ar)
  if (currentY > 215) {
    doc.addPage();
    currentY = 16;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('5. MONITORAMENTO DE VÁCUO DAS FROTAS CRIOGÊNICAS (GASES DO AR)', 10, currentY);
  currentY += 4;

  // Filtrar estritamente Carretas e Caminhões que transportam Gases do Ar (LO2, LN2, LAR)
  // O vácuo é exclusivo para frotas de Gases do Ar — não selecionar veículos de CO2 nem cavalos mecânicos
  const cryogenicVehicles = vehicles.filter(v => {
    // 1. Deve ser do tipo Carreta ou Caminhão
    if (v.type !== 'Carreta' && v.type !== 'Caminhão') return false;

    // 2. Não selecionar veículos do tipo CO2
    const isCO2 = (v.cargoProduct && v.cargoProduct.includes('CO2')) ||
                  (v.cargoProducts && v.cargoProducts.some(p => p.includes('CO2')));
    if (isCO2) return false;

    // 3. Deve transportar Gases do Ar (LO2, LN2, LAR)
    const isGasesDoAr = (v.cargoProduct && v.cargoProduct.includes('Gases do Ar')) ||
                        (v.cargoProducts && v.cargoProducts.some(p => p.includes('Gases do Ar')));
    return isGasesDoAr;
  });

  const vacuumRows = cryogenicVehicles.map(v => {
    const val = v.vacuumValue !== undefined && v.vacuumValue !== '' ? String(v.vacuumValue) : '';
    const classification = getVacuumClassification(val);
    const statusText = val ? classification.label : 'Sem medição';
    return [
      v.fleetNumber,
      `${v.plate}/${v.uf}`,
      `${v.brand} ${v.model}`,
      v.cargoProduct || (v.cargoProducts && v.cargoProducts.join(', ')) || 'Gases do Ar (LO2, LN2, LAR)',
      val ? `${val} ${v.vacuumUnit || 'mtorr'}` : 'Pendente',
      v.vacuumDate ? formatDate(v.vacuumDate) : '—',
      statusText
    ];
  });

  if (vacuumRows.length === 0) {
    vacuumRows.push(['—', '—', '—', 'Nenhuma carreta de Gases do Ar cadastrada', '—', '—', 'Sem medição']);
  }

  autoTable(doc, {
    startY: currentY,
    margin: { left: 10, right: 10 },
    theme: 'grid',
    styles: { 
      fontSize: 7.5, 
      cellPadding: 2, 
      overflow: 'linebreak',
      valign: 'middle'
    },
    headStyles: { 
      fillColor: [30, 41, 59], 
      textColor: [255, 255, 255], 
      fontStyle: 'bold',
      halign: 'left'
    },
    head: [['Frota', 'Placa/UF', 'Modelo', 'Carga / Produto', 'Nível de Vácuo', 'Data Medição', 'Status de Isolamento']],
    body: vacuumRows,
    columnStyles: {
      0: { cellWidth: 16, halign: 'center', fontStyle: 'bold' }, // Frota
      1: { cellWidth: 24, halign: 'center' },                   // Placa/UF
      2: { cellWidth: 32, halign: 'left' },                     // Modelo
      3: { cellWidth: 38, halign: 'left' },                     // Carga / Produto
      4: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },// Nível de Vácuo
      5: { cellWidth: 20, halign: 'center' },                   // Data Medição
      6: { cellWidth: 40, halign: 'left', overflow: 'linebreak' }, // Status de Isolamento: alinhado à esquerda dentro das linhas da tabela
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 6) {
        data.cell.styles.halign = 'left';
        const text = String(data.cell.raw || '');
        if (text === 'Especificado') {
          data.cell.styles.textColor = [5, 150, 105];
          data.cell.styles.fontStyle = 'bold';
        } else if (text === 'Fora do Especificado') {
          data.cell.styles.textColor = [217, 119, 6];
          data.cell.styles.fontStyle = 'bold';
        } else if (text === 'ATM') {
          data.cell.styles.textColor = [220, 38, 38];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    }
  });

  // @ts-ignore
  currentY = doc.lastAutoTable.finalY + 8;

  // SECTION 6: Controle e Status dos Equipamentos Cadastrados (Calibração Metrológica)
  if (currentY > 210) {
    doc.addPage();
    currentY = 16;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('6. CONTROLE E STATUS DOS EQUIPAMENTOS CADASTRADOS (CALIBRAÇÃO METROLÓGICA)', 10, currentY);
  currentY += 4;

  // Extrair todos os equipamentos cadastrados na frota
  const allEquipmentsList: Array<{
    fleetNumber: string;
    plateUf: string;
    type: string;
    description: string;
    tag: string;
    certificateNumber: string;
    company: string;
    calibrationDate: string;
    nextCalibrationDate: string;
    statusText: string;
    statusCode: 'valid' | 'expiring' | 'expired';
  }> = [];

  const REFERENCE_DATE = new Date('2026-09-02T12:00:00Z');

  vehicles.forEach(v => {
    (v.equipments || []).forEach(eq => {
      const targetDateStr = eq.nextCalibrationDate || eq.calibrationDate || '';
      let diffDays = 9999;
      if (targetDateStr) {
        const target = new Date(targetDateStr.includes('T') ? targetDateStr : `${targetDateStr}T12:00:00Z`);
        diffDays = Math.ceil((target.getTime() - REFERENCE_DATE.getTime()) / (1000 * 60 * 60 * 24));
      }

      let statusText = 'Válido / Em dia';
      let statusCode: 'valid' | 'expiring' | 'expired' = 'valid';

      if (diffDays < 0) {
        statusText = `VENCIDO há ${Math.abs(diffDays)}d`;
        statusCode = 'expired';
      } else if (diffDays <= 30) {
        statusText = `Vence em ${diffDays}d`;
        statusCode = 'expiring';
      } else {
        statusText = `Em dia (${diffDays}d)`;
        statusCode = 'valid';
      }

      allEquipmentsList.push({
        fleetNumber: v.fleetNumber,
        plateUf: `${v.plate}/${v.uf}`,
        type: v.type,
        description: eq.description,
        tag: eq.tag || 'S/TAG',
        certificateNumber: eq.certificateNumber || '—',
        company: eq.company || '—',
        calibrationDate: eq.calibrationDate ? formatDate(eq.calibrationDate) : '—',
        nextCalibrationDate: targetDateStr ? formatDate(targetDateStr) : '—',
        statusText,
        statusCode,
      });
    });
  });

  const eqRows = allEquipmentsList.map(item => [
    item.fleetNumber,
    item.plateUf,
    item.type,
    item.description,
    item.tag,
    item.certificateNumber,
    item.company,
    item.calibrationDate,
    item.nextCalibrationDate,
    item.statusText,
  ]);

  if (eqRows.length === 0) {
    eqRows.push(['—', '—', '—', 'Nenhum equipamento cadastrado na frota', '—', '—', '—', '—', '—', 'Sem registros']);
  }

  autoTable(doc, {
    startY: currentY,
    margin: { left: 10, right: 10 },
    theme: 'grid',
    styles: { fontSize: 7.2, cellPadding: 2.2, overflow: 'linebreak', valign: 'middle' },
    headStyles: { fillColor: [49, 46, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
    head: [['Frota', 'Placa/UF', 'Tipo', 'Equipamento / Instrumento', 'TAG', 'Certificado', 'Laboratório / Fabricante', 'Calibração', 'Próx. Calib.', 'Situação']],
    body: eqRows,
    columnStyles: {
      0: { cellWidth: 14, halign: 'center', fontStyle: 'bold' },
      1: { cellWidth: 20, halign: 'center' },
      2: { cellWidth: 18, halign: 'center' },
      3: { cellWidth: 38, halign: 'left' },
      4: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
      5: { cellWidth: 22, halign: 'left' },
      6: { cellWidth: 26, halign: 'left' },
      7: { cellWidth: 15, halign: 'center' },
      8: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
      9: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 9) {
        const text = String(data.cell.raw || '');
        if (text.includes('VENCIDO')) {
          data.cell.styles.textColor = [185, 28, 28]; // red-700
          data.cell.styles.fontStyle = 'bold';
        } else if (text.includes('Vence em')) {
          data.cell.styles.textColor = [180, 83, 9]; // amber-700
          data.cell.styles.fontStyle = 'bold';
        } else if (text.includes('Em dia') || text.includes('Válido')) {
          data.cell.styles.textColor = [5, 150, 105]; // emerald-600
          data.cell.styles.fontStyle = 'bold';
        }
      }
    }
  });

  // @ts-ignore
  currentY = doc.lastAutoTable.finalY + 8;

  // SECTION 7: Relação de Ordens de Serviço em Aberto / Em Andamento
  if (currentY > 215) {
    doc.addPage();
    currentY = 16;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('7. RELAÇÃO DE ORDENS DE SERVIÇO EM ABERTO E EM ANDAMENTO', 10, currentY);
  currentY += 4;

  const openOrders = serviceOrders.filter(os => os.status === 'Aberta' || os.status === 'Em andamento');
  const osRows = openOrders.map(os => [
    os.code,
    os.fleetNumber,
    os.title,
    os.category,
    os.priority,
    os.assignedToName || 'Equipe de Manutenção',
    os.createdAt ? formatDate(os.createdAt.slice(0, 10)) : '—',
    os.status
  ]);

  if (osRows.length === 0) {
    osRows.push(['—', '—', 'Nenhuma OS aberta no momento. Todas as frotas em dia!', '—', '—', '—', '—', 'Conforme']);
  }

  autoTable(doc, {
    startY: currentY,
    margin: { left: 10, right: 10 },
    theme: 'grid',
    styles: { fontSize: 7.8, cellPadding: 2.4 },
    headStyles: { fillColor: [255, 85, 0], textColor: [255, 255, 255], fontStyle: 'bold' },
    head: [['Código OS', 'Frota', 'Defeito / Ocorrência', 'Categoria', 'Prioridade', 'Responsável', 'Abertura', 'Status']],
    body: osRows,
  });

  // Page numbering on all pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text(
      `Sistema de Gestão de Frotas — Documento Oficial de Auditoria Interna  |  Página ${i} de ${pageCount}`,
      pageWidth / 2,
      290,
      { align: 'center' }
    );
  }

  // Trigger download
  const fileName = `Relatorio_Dashboard_Frotas_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
  return fileName;
};

/**
 * 2. RELATÓRIO INDIVIDUAL POR FROTA (Relatório Completo da Frota)
 */
export const generateVehicleDossierPDF = (
  vehicle: Vehicle,
  allServiceOrders: ServiceOrder[],
  users: User[]
) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 14;

  const vehicleOrders = allServiceOrders.filter(
    os => os.vehicleId === vehicle.id || os.fleetNumber === vehicle.fleetNumber
  );

  // Top header banner
  doc.setFillColor(30, 41, 59); // slate-800
  doc.rect(10, currentY, pageWidth - 20, 26, 'F');

  // Orange accent bar
  doc.setFillColor(255, 85, 0); // #ff5500
  doc.rect(10, currentY, 4, 26, 'F');

  // Title & vehicle badge
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text(`RELATÓRIO INDIVIDUAL DA FROTA ${vehicle.fleetNumber}`, 18, currentY + 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(203, 213, 225);
  doc.text(
    `Placa: ${vehicle.plate}/${vehicle.uf}  |  Tipo: ${vehicle.type}  |  Modelo: ${vehicle.brand} ${vehicle.model} (${vehicle.year})`,
    18,
    currentY + 18
  );

  // Status tag top right
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  if (vehicle.status === 'Ativo') {
    doc.setTextColor(52, 211, 153); // emerald-400
  } else if (vehicle.status === 'Em Manutenção') {
    doc.setTextColor(251, 191, 36); // amber-400
  } else {
    doc.setTextColor(248, 113, 113); // red-400
  }
  doc.text(`STATUS: ${vehicle.status.toUpperCase()}`, pageWidth - 16, currentY + 10, { align: 'right' });

  currentY += 32;

  // SECTION 1: Dados Cadastrais e Especificações do Veículo
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('1. DADOS CADASTRAIS E ESPECIFICAÇÕES DO VEÍCULO', 10, currentY);
  currentY += 4;

  autoTable(doc, {
    startY: currentY,
    margin: { left: 10, right: 10 },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 2.6 },
    headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85], fontStyle: 'bold' },
    head: [['Campo / Parâmetro', 'Informação Registrada', 'Campo / Parâmetro', 'Informação Registrada']],
    body: [
      ['Número da Frota', vehicle.fleetNumber, 'Placa / Estado (UF)', `${vehicle.plate} / ${vehicle.uf}`],
      ['Tipo de Veículo', vehicle.type, 'Marca / Fabricante', vehicle.brand || '—'],
      ['Modelo Comercial', vehicle.model || '—', 'Ano de Fabricação / Modelo', `${vehicle.year}`],
      ['Situação Operacional', vehicle.status, 'Data de Cadastro', formatDate(vehicle.createdAt)],
      ['Total de Ordens de Serviço', `${vehicleOrders.length} ocorrência(s)`, 'Observações', vehicle.notes || 'Nenhuma'],
    ],
  });

  // @ts-ignore
  currentY = doc.lastAutoTable.finalY + 6;

  // SECTION 2: Características Técnicas e Operacionais
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('2. CARACTERÍSTICAS TÉCNICAS E OPERACIONAIS', 10, currentY);
  currentY += 4;

  autoTable(doc, {
    startY: currentY,
    margin: { left: 10, right: 10 },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 3 },
    headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85], fontStyle: 'bold' },
    head: [['Descrição das Características do Veículo / Implemento']],
    body: [
      [vehicle.characteristics && vehicle.characteristics.trim() 
        ? vehicle.characteristics 
        : 'Nenhuma característica técnica detalhada informada até o momento. (Preencha via Gestão de Frota > Informações Gerais).']
    ],
  });

  // @ts-ignore
  currentY = doc.lastAutoTable.finalY + 6;

  // SECTION 3: Informações Adicionais e Observações
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('3. INFORMAÇÕES ADICIONAIS E OBSERVAÇÕES COMPLEMENTARES', 10, currentY);
  currentY += 4;

  autoTable(doc, {
    startY: currentY,
    margin: { left: 10, right: 10 },
    theme: 'grid',
    styles: { fontSize: 8.5, cellPadding: 3 },
    headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85], fontStyle: 'bold' },
    head: [['Informações Adicionais (Rastreamento, Seguros, Operação)', 'Observações Internas']],
    body: [
      [
        vehicle.additionalInfo && vehicle.additionalInfo.trim() 
          ? vehicle.additionalInfo 
          : 'Nenhuma informação adicional cadastrada.',
        vehicle.notes && vehicle.notes.trim() 
          ? vehicle.notes 
          : 'Sem notas ou observações complementares.'
      ]
    ],
  });

  // @ts-ignore
  currentY = doc.lastAutoTable.finalY + 8;

  // SECTION 4: Equipamentos e Instrumentos Calibráveis Cadastrados
  if (currentY > 210) {
    doc.addPage();
    currentY = 16;
  }

  const equipments = vehicle.equipments || [];
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(`4. CONTROLE DE EQUIPAMENTOS & INSTRUMENTOS CALIBRÁVEIS (${equipments.length})`, 10, currentY);
  currentY += 4;

  const eqRows = equipments.map(eq => {
    let sitText = 'Calibrado';
    let statusLabel = 'Calibrado';
    if (eq.nextCalibrationDate) {
      const expDate = new Date(eq.nextCalibrationDate);
      const refDate = new Date('2026-09-25T12:00:00Z');
      const diffDays = Math.ceil((expDate.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays < 0) {
        statusLabel = 'VENCIDO';
        sitText = `Vencido há ${Math.abs(diffDays)}d`;
      } else if (diffDays <= 30) {
        statusLabel = 'VENCENDO';
        sitText = `Expira em ${diffDays}d`;
      } else {
        sitText = `Válido (${diffDays}d)`;
      }
    }
    const hasFile = (eq.fileUrl || eq.dataUrl) ? (eq.fileName ? `Anexo: ${eq.fileName}` : 'Arquivo Anexo') : 'Sem anexo';

    return [
      eq.tag || '—',
      eq.description || '—',
      eq.company || '—',
      eq.certificateNumber || '—',
      formatDate(eq.calibrationDate),
      formatDate(eq.nextCalibrationDate),
      sitText,
      statusLabel,
      hasFile
    ];
  });

  if (eqRows.length === 0) {
    eqRows.push(['—', 'Nenhum equipamento cadastrado para esta frota.', '—', '—', '—', '—', '—', 'Regular', '—']);
  }

  autoTable(doc, {
    startY: currentY,
    margin: { left: 10, right: 10 },
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2.2 },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    head: [['TAG', 'Descrição do Instrumento', 'Empresa / Laboratório', 'Nº Certificado', 'Calibração', 'Próx. Calibração', 'Situação', 'Status', 'Certificado Anexo']],
    body: eqRows,
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 7) {
        const text = String(data.cell.raw);
        if (text === 'VENCIDO') {
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fontStyle = 'bold';
        } else if (text === 'VENCENDO') {
          data.cell.styles.textColor = [180, 83, 9];
          data.cell.styles.fontStyle = 'bold';
        } else if (text === 'Calibrado') {
          data.cell.styles.textColor = [5, 150, 105];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    }
  });

  // @ts-ignore
  currentY = doc.lastAutoTable.finalY + 8;

  // SECTION 5: Documentação Obrigatória e Validades
  if (currentY > 210) {
    doc.addPage();
    currentY = 16;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text('5. QUADRO DE REGULARIDADE DOCUMENTAL E ARQUIVOS', 10, currentY);
  currentY += 4;

  const docTypes: DocumentType[] = ['CRLV', 'CIV', 'CIPP', 'Tacógrafo'];
  const docRows = docTypes.map(dtype => {
    if (dtype === 'Tacógrafo' && vehicle.type === 'Carreta') {
      return [dtype, '—', '—', '—', 'Não aplicável para Carretas / Semirreboques', 'Isento', '—'];
    }

    const docItem = vehicle.documents[dtype];
    if (!docItem || !docItem.expiryDate) {
      return [dtype, '—', '—', '—', 'Documento não cadastrado', 'Pendente', '—'];
    }

    const expDate = new Date(docItem.expiryDate);
    const refDate = new Date('2026-09-02T12:00:00Z');
    const diffDays = Math.ceil((expDate.getTime() - refDate.getTime()) / (1000 * 60 * 60 * 24));

    let statusText = 'Válido';
    let situationText = `Válido (${diffDays} dias restantes)`;
    if (diffDays < 0) {
      statusText = 'VENCIDO';
      situationText = `Vencido há ${Math.abs(diffDays)} dias`;
    } else if (diffDays <= 30) {
      statusText = 'VENCENDO';
      situationText = `Expira em ${diffDays} dias`;
    }

    const docFile = docItem.fileName ? `Digital: ${docItem.fileName}` : (docItem.fileUrl ? 'Arquivo Anexo' : 'Sem anexo digital');

    return [
      dtype,
      docItem.number || 'Registrado',
      formatDate(docItem.issueDate),
      formatDate(docItem.expiryDate),
      situationText,
      statusText,
      docFile
    ];
  });

  autoTable(doc, {
    startY: currentY,
    margin: { left: 10, right: 10 },
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    head: [['Documento', 'Número / Protocolo', 'Data Emissão', 'Data Validade', 'Situação Atual', 'Status', 'Arquivo Anexo']],
    body: docRows,
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 5) {
        const text = String(data.cell.raw);
        if (text === 'VENCIDO') {
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fontStyle = 'bold';
        } else if (text === 'VENCENDO') {
          data.cell.styles.textColor = [180, 83, 9];
          data.cell.styles.fontStyle = 'bold';
        } else if (text === 'Válido') {
          data.cell.styles.textColor = [5, 150, 105];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    }
  });

  // @ts-ignore
  currentY = doc.lastAutoTable.finalY + 6;

  // List additional digital attachments if present
  const attachments = vehicle.attachments || [];
  if (attachments.length > 0) {
    if (currentY > 220) {
      doc.addPage();
      currentY = 16;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Anexos Digitais Adicionais (${attachments.length} arquivos PDF/JPG):`, 10, currentY);
    currentY += 3;

    const attRows = attachments.map(att => [
      att.name,
      att.category,
      att.number || '—',
      formatDate(att.expiryDate),
      att.uploadedAt,
      att.uploadedBy || 'Administrador'
    ]);

    autoTable(doc, {
      startY: currentY,
      margin: { left: 10, right: 10 },
      theme: 'grid',
      styles: { fontSize: 7.5, cellPadding: 2 },
      headStyles: { fillColor: [241, 245, 249], textColor: [51, 65, 85], fontStyle: 'bold' },
      head: [['Nome do Arquivo', 'Categoria', 'Número', 'Validade', 'Data de Envio', 'Responsável']],
      body: attRows,
    });

    // @ts-ignore
    currentY = doc.lastAutoTable.finalY + 8;
  }

  // SECTION 6: Histórico de Ordens de Serviço da Frota
  if (currentY > 210) {
    doc.addPage();
    currentY = 16;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(`6. HISTÓRICO COMPLETO DE ORDENS DE SERVIÇO (${vehicleOrders.length})`, 10, currentY);
  currentY += 4;

  const osRows = vehicleOrders.map(os => {
    return [
      os.code,
      os.title,
      os.category,
      os.priority,
      os.status,
      os.assignedToName || 'Não atribuído',
      formatDate(os.createdAt),
      os.resolvedAt ? formatDate(os.resolvedAt) : 'Pendente',
      os.resolutionNotes || os.description || '—'
    ];
  });

  if (osRows.length === 0) {
    osRows.push(['—', 'Nenhuma Ordem de Serviço registrada para este veículo.', '—', '—', '—', '—', '—', '—', '—']);
  }

  autoTable(doc, {
    startY: currentY,
    margin: { left: 10, right: 10 },
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: [255, 85, 0], textColor: [255, 255, 255], fontStyle: 'bold' },
    head: [['Código', 'Título / Reclamação', 'Categoria', 'Prioridade', 'Status', 'Técnico Responsável', 'Abertura', 'Conclusão', 'Notas / Solução']],
    body: osRows,
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 4) {
        const text = String(data.cell.raw);
        if (text === 'Aberta' || text === 'Em andamento') {
          data.cell.styles.textColor = [194, 65, 12];
          data.cell.styles.fontStyle = 'bold';
        } else if (text === 'Resolvida' || text === 'Encerrada') {
          data.cell.styles.textColor = [5, 150, 105];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    }
  });

  // Signatures on last page
  // @ts-ignore
  let finalY = doc.lastAutoTable.finalY + 14;
  if (finalY > 250) {
    doc.addPage();
    finalY = 30;
  }

  doc.setDrawColor(203, 213, 225);
  doc.line(20, finalY + 15, 85, finalY + 15);
  doc.line(pageWidth - 85, finalY + 15, pageWidth - 20, finalY + 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('Responsável pela Manutenção / Mecânico', 52.5, finalY + 20, { align: 'center' });
  doc.text('Gestor da Frota / Encarregado Operacional', pageWidth - 52.5, finalY + 20, { align: 'center' });

  // Page numbering on all pages
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Relatório da Frota ${vehicle.fleetNumber} (${vehicle.plate})  |  Sistema de Gestão de Frotas  |  Página ${i} de ${pageCount}`,
      pageWidth / 2,
      290,
      { align: 'center' }
    );
  }

  const fileName = `Relatorio_Frota_${vehicle.fleetNumber}_${vehicle.plate}_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
  return fileName;
};

/**
 * 3. RELATÓRIO GERAL COMPLETO DE TODAS AS FROTAS
 */
export const generateFullFleetReportPDF = (
  vehicles: Vehicle[],
  serviceOrders: ServiceOrder[]
) => {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let currentY = 12;

  // Header
  doc.setFillColor(30, 41, 59);
  doc.rect(10, currentY, pageWidth - 20, 20, 'F');

  doc.setFillColor(255, 85, 0);
  doc.rect(10, currentY, 4, 20, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('RELATÓRIO GERAL CONSOLIDADO DE TODA A FROTA E DOCUMENTAÇÃO', 18, currentY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`Total de ${vehicles.length} veículos monitorados  |  Gerado em ${getNowFormatted()}`, 18, currentY + 15);

  currentY += 24;

  const tableRows = vehicles.map(v => {
    const openOrders = serviceOrders.filter(
      os => (os.vehicleId === v.id || os.fleetNumber === v.fleetNumber) && (os.status === 'Aberta' || os.status === 'Em andamento')
    );

    const getDocLabel = (dtype: DocumentType) => {
      if (dtype === 'Tacógrafo' && v.type === 'Carreta') return '—';
      const docItem = v.documents[dtype];
      if (!docItem) return 'Pendente';
      const expDate = docItem.expiryDate ? docItem.expiryDate.split('-').reverse().join('/') : '';
      if (docItem.status === 'expired') return `VENCIDO (${expDate})`;
      if (docItem.status === 'expiring') return `VENCENDO (${expDate})`;
      return `Válido (${expDate})`;
    };

    return [
      v.fleetNumber,
      v.type,
      `${v.plate}/${v.uf}`,
      `${v.brand} ${v.model}`,
      `${v.year}`,
      getDocLabel('CRLV'),
      getDocLabel('CIPP'),
      getDocLabel('CIV'),
      getDocLabel('Tacógrafo'),
      openOrders.length > 0 ? `${openOrders.length} OS aberta(s)` : 'Sem pendências',
      v.status
    ];
  });

  autoTable(doc, {
    startY: currentY,
    margin: { left: 10, right: 10 },
    theme: 'grid',
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold' },
    head: [['Frota', 'Tipo', 'Placa/UF', 'Modelo', 'Ano', 'CRLV', 'CIPP', 'CIV', 'Tacógrafo', 'OS Pendentes', 'Status']],
    body: tableRows,
    didParseCell: (data) => {
      if (data.section === 'body') {
        const text = String(data.cell.raw);
        if (text.includes('VENCIDO')) {
          data.cell.styles.textColor = [185, 28, 28];
          data.cell.styles.fontStyle = 'bold';
        } else if (text.includes('VENCENDO')) {
          data.cell.styles.textColor = [180, 83, 9];
          data.cell.styles.fontStyle = 'bold';
        } else if (text.includes('aberta(s)')) {
          data.cell.styles.textColor = [194, 65, 12];
          data.cell.styles.fontStyle = 'bold';
        }
      }
    }
  });

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Relatório Geral da Frota  |  Página ${i} de ${pageCount}`,
      pageWidth / 2,
      202,
      { align: 'center' }
    );
  }

  const fileName = `Relatorio_Geral_Frotas_${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(fileName);
  return fileName;
};
