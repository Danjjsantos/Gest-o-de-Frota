import React, { useState, useMemo, useRef } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  ReferenceLine 
} from 'recharts';
import { 
  Gauge, 
  Download, 
  Camera, 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Vehicle, getVacuumClassification } from '../types';
import { formatDisplayDate } from '../context/FleetContext';

interface VacuumMonthlyChartProps {
  vehicles: Vehicle[];
  onSelectVehicle?: (vehicle: Vehicle) => void;
}

// Helper to generate a pristine, high-resolution canvas of the monthly vacuum chart
function generateVacuumChartCanvas(
  monthlyData: Array<{
    fleetNumber: string;
    plate: string;
    model: string;
    value: number;
    date: string;
    classification: ReturnType<typeof getVacuumClassification>;
  }>,
  monthLabel: string,
  stats: { total: number; normalCount: number; warningCount: number; criticalCount: number }
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const width = 1200;
  const height = 740;
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // 1. Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // 2. Header banner (dark slate #0f172a)
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, width, 88);

  // Orange accent bar on left
  ctx.fillStyle = '#ff5500';
  ctx.fillRect(0, 0, 8, 88);

  // Platform title
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px Arial, sans-serif';
  ctx.fillText('GESTÃO FROTAS — MONITORAMENTO MENSAL DE VÁCUO', 28, 40);

  ctx.fillStyle = '#94a3b8';
  ctx.font = '13px Arial, sans-serif';
  ctx.fillText(`FROTAS DE GASES DO AR (LO2, LN2, LAR) · MÊS: ${monthLabel.toUpperCase()}`, 28, 68);

  // Emission date on top right
  const now = new Date();
  const nowStr = now.toLocaleDateString('pt-BR') + ' às ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '11px Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`Emitido em: ${nowStr}`, width - 28, 50);
  ctx.textAlign = 'left';

  // 3. KPI Summary Cards (Y: 104 to 174)
  const cardY = 104;
  const cardHeight = 66;
  const cardGap = 16;
  const cardWidth = (width - 56 - cardGap * 3) / 4;
  const startX = 28;

  // Helper for drawing rounded cards
  const drawCard = (x: number, title: string, count: number, sub: string, bg: string, border: string, textCol: string) => {
    ctx.fillStyle = bg;
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, cardY, cardWidth, cardHeight, 10);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = textCol;
    ctx.font = 'bold 10px Arial, sans-serif';
    ctx.fillText(title, x + 14, cardY + 22);

    ctx.fillStyle = textCol;
    ctx.font = 'bold 22px monospace';
    ctx.fillText(`${count} frotas`, x + 14, cardY + 46);

    ctx.fillStyle = textCol;
    ctx.font = '9px Arial, sans-serif';
    ctx.fillText(sub, x + 14, cardY + 59);
  };

  drawCard(startX, 'TOTAL AFERIDAS NO MÊS', stats.total, 'Frotas inspecionadas no período', '#f8fafc', '#e2e8f0', '#334155');
  drawCard(startX + (cardWidth + cardGap), 'DENTRO DO ESPECIFICADO (≤ 80 mtorr)', stats.normalCount, 'Isolamento térmico preservado', '#ecfdf5', '#a7f3d0', '#065f46');
  drawCard(startX + (cardWidth + cardGap) * 2, 'FORA DO ESPECIFICADO (81 - 998 mtorr)', stats.warningCount, 'Programar repump / vácuo', '#fffbeb', '#fde68a', '#92400e');
  drawCard(startX + (cardWidth + cardGap) * 3, 'ATM (≥ 999 mtorr)', stats.criticalCount, 'Perda de vácuo / Risco crítico', '#fff1f2', '#fecdd3', '#9f1239');

  // 4. Chart Area
  const chartX = 70;
  const chartY = 200;
  const chartW = width - 110;
  const chartH = 430;
  const chartBottom = chartY + chartH;

  // Outer border box
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(chartX - 16, chartY - 16, chartW + 32, chartH + 68, 12);
  ctx.fill();
  ctx.stroke();

  if (monthlyData.length === 0) {
    ctx.fillStyle = '#64748b';
    ctx.font = '16px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`Nenhuma medição de vácuo registrada em ${monthLabel}`, width / 2, chartY + chartH / 2);
    ctx.textAlign = 'left';
    return canvas;
  }

  // Calculate Y-axis scaling
  const maxVal = Math.max(...monthlyData.map(d => d.value), 1100);
  const yMax = Math.ceil(maxVal / 200) * 200;

  // Horizontal Grid Lines
  const gridSteps = 5;
  ctx.strokeStyle = '#f1f5f9';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#64748b';
  ctx.font = '10px monospace';
  ctx.textAlign = 'right';

  for (let i = 0; i <= gridSteps; i++) {
    const val = (yMax / gridSteps) * i;
    const yPos = chartBottom - (val / yMax) * chartH;
    
    ctx.beginPath();
    ctx.moveTo(chartX, yPos);
    ctx.lineTo(chartX + chartW, yPos);
    ctx.stroke();

    ctx.fillText(`${Math.round(val)}`, chartX - 8, yPos + 4);
  }
  ctx.textAlign = 'left';

  // Y-Axis Unit Label
  ctx.save();
  ctx.translate(22, chartY + chartH / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = '#64748b';
  ctx.font = 'bold 11px Arial, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('VÁCUO MEDIDO (mtorr)', 0, 0);
  ctx.restore();

  // Reference Line 1: 80 mtorr (Limite Especificado)
  const y80 = chartBottom - (80 / yMax) * chartH;
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(chartX, y80);
  ctx.lineTo(chartX + chartW, y80);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#059669';
  ctx.font = 'bold 10px Arial, sans-serif';
  ctx.fillText('Limite Especificado: 80 mtorr', chartX + 10, y80 - 6);

  // Reference Line 2: 999 mtorr (ATM)
  const y999 = chartBottom - (999 / yMax) * chartH;
  ctx.strokeStyle = '#ef4444';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(chartX, y999);
  ctx.lineTo(chartX + chartW, y999);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#dc2626';
  ctx.font = 'bold 10px Arial, sans-serif';
  ctx.fillText('ATM - Perda de Vácuo (≥ 999 mtorr)', chartX + 10, y999 - 6);

  // Bars
  const n = monthlyData.length;
  const barPadding = Math.max(14, Math.min(32, chartW / (n * 3)));
  const totalBarWidth = (chartW - (n + 1) * barPadding) / n;
  const barWidth = Math.min(62, Math.max(26, totalBarWidth));
  const spacing = (chartW - barWidth * n) / (n + 1);

  monthlyData.forEach((item, idx) => {
    const xPos = chartX + spacing * (idx + 1) + barWidth * idx;
    const bHeight = Math.max(8, (item.value / yMax) * chartH);
    const yPos = chartBottom - bHeight;

    let barColor = '#10b981'; // verde
    if (item.value > 80 && item.value <= 998) {
      barColor = '#f59e0b'; // amarelo
    } else if (item.value >= 999) {
      barColor = '#ef4444'; // vermelho
    }

    // Bar rectangle
    ctx.fillStyle = barColor;
    ctx.beginPath();
    ctx.roundRect(xPos, yPos, barWidth, bHeight, [5, 5, 0, 0]);
    ctx.fill();

    // Value on top of bar
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${item.value}`, xPos + barWidth / 2, yPos - 5);

    // Fleet label under bar
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 11px Arial, sans-serif';
    ctx.fillText(`Frota ${item.fleetNumber}`, xPos + barWidth / 2, chartBottom + 16);

    // Plate under fleet
    ctx.fillStyle = '#64748b';
    ctx.font = '9px monospace';
    ctx.fillText(item.plate, xPos + barWidth / 2, chartBottom + 29);

    ctx.textAlign = 'left';
  });

  // Footer notes
  ctx.fillStyle = '#94a3b8';
  ctx.font = 'italic 10px Arial, sans-serif';
  ctx.fillText('Critérios de aceitação: Até 80 mtorr (Verde - Dentro do especificado) | 81 a 998 mtorr (Amarelo - Fora do especificado) | ≥ 999 mtorr (Vermelho - ATM)', 28, height - 12);

  return canvas;
}

export const VacuumMonthlyChart: React.FC<VacuumMonthlyChartProps> = ({ 
  vehicles,
  onSelectVehicle 
}) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [isExportingPhoto, setIsExportingPhoto] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportFeedback, setExportFeedback] = useState<string>('');

  // Default to current month: YYYY-MM (e.g. 2026-10)
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);

  // Filter only vehicles that carry "Gases do Ar"
  const gasesDoArVehicles = useMemo(() => {
    return vehicles.filter(v => 
      (v.cargoProducts && v.cargoProducts.includes('Gases do Ar (LO2, LN2, LAR)')) ||
      (v.cargoProduct && v.cargoProduct.includes('Gases do Ar'))
    );
  }, [vehicles]);

  // Generate list of available months from data or recent 12 months
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    monthSet.add(currentMonthKey);

    gasesDoArVehicles.forEach(v => {
      if (v.vacuumDate && v.vacuumDate.length >= 7) {
        monthSet.add(v.vacuumDate.substring(0, 7));
      }
      if (v.vacuumReadings) {
        v.vacuumReadings.forEach(r => {
          if (r.date && r.date.length >= 7) {
            monthSet.add(r.date.substring(0, 7));
          }
        });
      }
    });

    // Add recent 6 months backward if not present
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthSet.add(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    return Array.from(monthSet).sort().reverse();
  }, [gasesDoArVehicles, currentMonthKey]);

  // Format month name for display (e.g. "Outubro de 2026")
  const formatMonthLabel = (monthStr: string) => {
    const [year, month] = monthStr.split('-').map(Number);
    if (!year || !month) return monthStr;
    const date = new Date(year, month - 1, 15);
    const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  // Extract readings for the selected month
  const monthlyData = useMemo(() => {
    const list: Array<{
      vehicle: Vehicle;
      fleetNumber: string;
      plate: string;
      model: string;
      value: number;
      displayValue: string;
      date: string;
      classification: ReturnType<typeof getVacuumClassification>;
    }> = [];

    gasesDoArVehicles.forEach(v => {
      let matchedValue: number | null = null;
      let matchedDate = '';

      // Check primary vacuum measurement
      if (v.vacuumDate && v.vacuumDate.startsWith(selectedMonth) && v.vacuumValue != null && v.vacuumValue !== '') {
        const num = typeof v.vacuumValue === 'number' ? v.vacuumValue : parseFloat(String(v.vacuumValue).replace(',', '.'));
        if (!isNaN(num)) {
          matchedValue = num;
          matchedDate = v.vacuumDate;
        }
      }

      // Check readings history if available and matches month
      if (v.vacuumReadings && v.vacuumReadings.length > 0) {
        const inMonth = v.vacuumReadings.filter(r => r.date && r.date.startsWith(selectedMonth));
        if (inMonth.length > 0) {
          // Sort by date descending
          const latest = [...inMonth].sort((a, b) => b.date.localeCompare(a.date))[0];
          const num = typeof latest.value === 'number' ? latest.value : parseFloat(String(latest.value).replace(',', '.'));
          if (!isNaN(num)) {
            matchedValue = num;
            matchedDate = latest.date;
          }
        }
      }

      // If this vehicle has a valid measurement in the chosen month, add it
      if (matchedValue !== null) {
        const classification = getVacuumClassification(matchedValue);
        list.push({
          vehicle: v,
          fleetNumber: v.fleetNumber,
          plate: v.plate,
          model: v.model,
          value: matchedValue,
          displayValue: `${matchedValue} mtorr`,
          date: matchedDate,
          classification,
        });
      }
    });

    // Sort by vacuum value ascending so chart is clear and organized
    return list.sort((a, b) => a.value - b.value);
  }, [gasesDoArVehicles, selectedMonth]);

  // Statistics for the selected month
  const stats = useMemo(() => {
    let normalCount = 0;   // <= 80 mtorr (Verde)
    let warningCount = 0;  // > 80 && <= 998 mtorr (Amarelo)
    let criticalCount = 0; // >= 999 mtorr (Vermelho - ATM)

    monthlyData.forEach(item => {
      if (item.value <= 80) normalCount++;
      else if (item.value <= 998) warningCount++;
      else criticalCount++;
    });

    return {
      total: monthlyData.length,
      normalCount,
      warningCount,
      criticalCount,
    };
  }, [monthlyData]);

  // Handle Month Navigation
  const handlePrevMonth = () => {
    const idx = availableMonths.indexOf(selectedMonth);
    if (idx < availableMonths.length - 1) {
      setSelectedMonth(availableMonths[idx + 1]);
    } else {
      const [year, month] = selectedMonth.split('-').map(Number);
      const prev = new Date(year, month - 2, 1);
      setSelectedMonth(`${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, '0')}`);
    }
  };

  const handleNextMonth = () => {
    const idx = availableMonths.indexOf(selectedMonth);
    if (idx > 0) {
      setSelectedMonth(availableMonths[idx - 1]);
    } else {
      const [year, month] = selectedMonth.split('-').map(Number);
      const next = new Date(year, month, 1);
      setSelectedMonth(`${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`);
    }
  };

  // 1. Export as Photo (PNG)
  const handleSavePhoto = () => {
    setIsExportingPhoto(true);
    setExportFeedback('Gerando imagem...');

    try {
      const canvas = generateVacuumChartCanvas(monthlyData, formatMonthLabel(selectedMonth), stats);
      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `grafico-vacuo-gases-do-ar-${selectedMonth}.png`;
      link.href = imgData;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setExportFeedback('Foto salva com sucesso!');
      setTimeout(() => setExportFeedback(''), 3000);
    } catch (err) {
      console.error('Erro ao salvar foto:', err);
      setExportFeedback('Falha ao gerar foto');
      setTimeout(() => setExportFeedback(''), 3000);
    } finally {
      setIsExportingPhoto(false);
    }
  };

  // 2. Export as PDF
  const handleSavePDF = () => {
    setIsExportingPdf(true);
    setExportFeedback('Gerando PDF...');

    try {
      const canvas = generateVacuumChartCanvas(monthlyData, formatMonthLabel(selectedMonth), stats);
      const imgData = canvas.toDataURL('image/png');

      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
      const pageHeight = doc.internal.pageSize.getHeight(); // 210mm

      // Top chart image centered with margin
      const chartWidth = pageWidth - 20; // 277mm
      const chartHeight = (chartWidth * canvas.height) / canvas.width; // proportional
      doc.addImage(imgData, 'PNG', 10, 10, chartWidth, Math.min(chartHeight, pageHeight - 20), undefined, 'FAST');

      // Add Page 2: Detailed Technical Audit Table
      if (monthlyData.length > 0) {
        doc.addPage();

        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, pageWidth, 18, 'F');
        doc.setFillColor(255, 85, 0);
        doc.rect(0, 0, 6, 18, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`AUDITORIA TÉCNICA DE VÁCUO CRIOGÊNICO — ${formatMonthLabel(selectedMonth).toUpperCase()}`, 14, 12);

        const tableRows = monthlyData.map(item => {
          let statusText = 'Dentro do Especificado (≤ 80 mtorr)';
          let acao = 'Isolamento normal. Monitoramento preventivo mensal.';
          if (item.value > 80 && item.value <= 998) {
            statusText = 'Fora do Especificado (81-998 mtorr)';
            acao = 'Degradação térmica. Programar repump / vácuo.';
          } else if (item.value >= 999) {
            statusText = 'ATM - Perda de Vácuo (≥ 999 mtorr)';
            acao = 'CRÍTICO: Perda total de vácuo. Manutenção imediata.';
          }

          return [
            `Frota ${item.fleetNumber}`,
            `${item.plate} / ${item.vehicle.uf}`,
            item.model,
            `${item.value} mtorr`,
            formatDisplayDate(item.date),
            statusText,
            acao
          ];
        });

        autoTable(doc, {
          startY: 24,
          head: [['Frota', 'Placa/UF', 'Modelo', 'Vácuo (mtorr)', 'Data Medição', 'Faixa de Aceitação', 'Recomendação Técnica']],
          body: tableRows,
          theme: 'grid',
          headStyles: {
            fillColor: [30, 41, 59],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9,
          },
          bodyStyles: {
            fontSize: 8,
            cellPadding: 3,
          },
          columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 24 },
            1: { cellWidth: 28 },
            2: { cellWidth: 35 },
            3: { fontStyle: 'bold', cellWidth: 28 },
            4: { cellWidth: 24 },
            5: { cellWidth: 55 },
            6: { cellWidth: 'auto' },
          },
          didParseCell: (data) => {
            if (data.section === 'body' && data.column.index === 3) {
              const valNum = parseFloat(String(data.cell.raw).replace(/[^\d.]/g, ''));
              if (valNum <= 80) {
                data.cell.styles.textColor = [5, 150, 105];
              } else if (valNum <= 998) {
                data.cell.styles.textColor = [217, 119, 6];
              } else {
                data.cell.styles.textColor = [220, 38, 38];
              }
            }
          }
        });
      }

      doc.save(`relatorio-vacuo-gases-do-ar-${selectedMonth}.pdf`);
      setExportFeedback('PDF gerado com sucesso!');
      setTimeout(() => setExportFeedback(''), 3000);
    } catch (err) {
      console.error('Erro ao gerar PDF:', err);
      setExportFeedback('Falha ao gerar PDF');
      setTimeout(() => setExportFeedback(''), 3000);
    } finally {
      setIsExportingPdf(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden transition-all space-y-0">
      {/* Top Header & Actions Bar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700 shrink-0">
            <Gauge className="w-4 h-4" />
          </div>
          <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight font-sans">
            Monitoramento Mensal de Vácuo — Gases do Ar
          </h3>
        </div>

        {/* Month Selector + Export Buttons (Salvar Foto e Salvar PDF na mesma linha) */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Month Navigator */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-2xs shrink-0">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
              title="Mês anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="relative px-2">
              <select
                value={selectedMonth}
                onChange={e => setSelectedMonth(e.target.value)}
                className="text-xs font-bold text-slate-800 bg-transparent py-1 pr-6 cursor-pointer focus:outline-none appearance-none"
              >
                {availableMonths.map(m => (
                  <option key={m} value={m}>
                    {formatMonthLabel(m)}
                  </option>
                ))}
              </select>
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>

            <button
              type="button"
              onClick={handleNextMonth}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition cursor-pointer"
              title="Próximo mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Botões Salvar Foto e Salvar PDF lado a lado na mesma linha */}
          <div className="flex items-center gap-2 shrink-0 flex-nowrap">
            <button
              type="button"
              onClick={handleSavePhoto}
              disabled={isExportingPhoto}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-2xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 whitespace-nowrap shrink-0"
              title="Salvar gráfico como foto (PNG)"
            >
              <Camera className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span>{isExportingPhoto ? 'Salvando...' : 'Salvar Foto'}</span>
            </button>

            <button
              type="button"
              onClick={handleSavePDF}
              disabled={isExportingPdf}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[#ff5500] hover:bg-[#e64d00] text-white shadow-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 whitespace-nowrap shrink-0"
              title="Exportar gráfico e auditoria em PDF"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>{isExportingPdf ? 'Gerando...' : 'Salvar PDF'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Export Feedback notification banner if any */}
      {exportFeedback && (
        <div className="bg-indigo-50 border-b border-indigo-100 px-4 py-2 text-xs font-bold text-indigo-800 flex items-center justify-between animate-in fade-in duration-150">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
            {exportFeedback}
          </span>
        </div>
      )}

      {/* Content wrapper with ref for html2canvas capture */}
      <div ref={chartContainerRef} className="p-4 sm:p-6 bg-white space-y-5">
        {/* Threshold Classification Legend & KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Faixa 1: Até 80 mtorr (Verde) */}
          <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/60 flex items-start justify-between">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <h4 className="text-xs font-black text-emerald-900 tracking-tight uppercase">
                  Até 80 mtorr
                </h4>
              </div>
              <p className="text-[11px] font-bold text-emerald-700">
                Dentro do especificado
              </p>
              <p className="text-[10px] text-emerald-600/90 leading-tight">
                Isolamento térmico preservado
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xl sm:text-2xl font-black font-mono text-emerald-800 tabular-nums">
                {stats.normalCount}
              </span>
              <span className="block text-[10px] font-semibold text-emerald-600">frotas</span>
            </div>
          </div>

          {/* Faixa 2: Acima de 80 até 998 mtorr (Amarelo) */}
          <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/60 flex items-start justify-between">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                <h4 className="text-xs font-black text-amber-900 tracking-tight uppercase">
                  81 a 998 mtorr
                </h4>
              </div>
              <p className="text-[11px] font-bold text-amber-700">
                Fora do especificado
              </p>
              <p className="text-[10px] text-amber-600/90 leading-tight">
                Programar repump / vácuo
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xl sm:text-2xl font-black font-mono text-amber-800 tabular-nums">
                {stats.warningCount}
              </span>
              <span className="block text-[10px] font-semibold text-amber-600">frotas</span>
            </div>
          </div>

          {/* Faixa 3: Acima de 999 mtorr (Vermelho - ATM) */}
          <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/60 flex items-start justify-between">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shrink-0" />
                <h4 className="text-xs font-black text-rose-900 tracking-tight uppercase">
                  ≥ 999 mtorr (ATM)
                </h4>
              </div>
              <p className="text-[11px] font-bold text-rose-700">
                Considerado ATM
              </p>
              <p className="text-[10px] text-rose-600/90 leading-tight">
                Perda de vácuo / Risco crítico
              </p>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xl sm:text-2xl font-black font-mono text-rose-800 tabular-nums">
                {stats.criticalCount}
              </span>
              <span className="block text-[10px] font-semibold text-rose-600">frotas</span>
            </div>
          </div>
        </div>

        {/* Main Bar Chart Container */}
        {monthlyData.length === 0 ? (
          <div className="p-10 border border-dashed border-slate-200 rounded-2xl text-center space-y-2 bg-slate-50/50">
            <Gauge className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-700">
              Nenhuma medição de vácuo registrada em {formatMonthLabel(selectedMonth)}
            </p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              As frotas de Gases do Ar registradas ainda não possuem aferições gravadas neste mês. Você pode registrar a medição no cadastro ou no cabeçalho da frota.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
              <span>Mês de Referência: <strong className="text-slate-800">{formatMonthLabel(selectedMonth)}</strong></span>
              <span className="font-mono text-[11px]">{monthlyData.length} frotas aferidas</span>
            </div>

            <div className="h-72 sm:h-80 w-full pt-4 pb-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyData}
                  margin={{ top: 20, right: 20, left: -10, bottom: 25 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  
                  <XAxis 
                    dataKey="fleetNumber"
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tick={{ fill: '#334155', fontSize: 11, fontWeight: 700 }}
                    tickFormatter={(val) => `Frota ${val}`}
                  />
                  
                  <YAxis 
                    tickLine={false}
                    axisLine={{ stroke: '#cbd5e1' }}
                    tick={{ fill: '#64748b', fontSize: 10, fontFamily: 'monospace' }}
                    tickFormatter={(val) => `${val}`}
                    label={{ 
                      value: 'Vácuo (mtorr)', 
                      angle: -90, 
                      position: 'insideLeft', 
                      offset: 15,
                      style: { fill: '#64748b', fontSize: 11, fontWeight: 600 } 
                    }}
                  />

                  {/* Reference Line for Maximum Spec (80 mtorr) */}
                  <ReferenceLine 
                    y={80} 
                    stroke="#10b981" 
                    strokeDasharray="4 4" 
                    strokeWidth={2}
                    label={{ 
                      value: 'Limite 80 mtorr', 
                      fill: '#059669', 
                      fontSize: 10, 
                      fontWeight: 700, 
                      position: 'top' 
                    }} 
                  />

                  {/* Reference Line for ATM Threshold (999 mtorr) */}
                  <ReferenceLine 
                    y={999} 
                    stroke="#ef4444" 
                    strokeDasharray="4 4" 
                    strokeWidth={2}
                    label={{ 
                      value: 'ATM (≥ 999 mtorr)', 
                      fill: '#dc2626', 
                      fontSize: 10, 
                      fontWeight: 700, 
                      position: 'top' 
                    }} 
                  />

                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const item = payload[0].payload as typeof monthlyData[0];
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl border border-slate-700 text-xs space-y-1.5 min-w-[200px]">
                          <div className="flex items-center justify-between border-b border-slate-800 pb-1">
                            <span className="font-black text-sm text-[#ff5500]">Frota {item.fleetNumber}</span>
                            <span className="font-mono text-[10px] text-slate-400">{item.plate}</span>
                          </div>
                          <p className="text-slate-300 font-medium">{item.model}</p>
                          <div className="flex items-center justify-between pt-1 font-mono">
                            <span className="text-slate-400">Vácuo medido:</span>
                            <span className="text-sm font-bold text-white">{item.value} mtorr</span>
                          </div>
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">Data da medição:</span>
                            <span className="text-slate-200">{formatDisplayDate(item.date)}</span>
                          </div>
                          <div className="pt-1.5 border-t border-slate-800">
                            <span 
                              className="inline-block px-2 py-0.5 rounded text-[10px] font-bold"
                              style={{ 
                                backgroundColor: `${item.classification.color}20`,
                                color: item.classification.color,
                                border: `1px solid ${item.classification.color}50`
                              }}
                            >
                              {item.classification.label}
                            </span>
                          </div>
                        </div>
                      );
                    }}
                  />

                  <Bar 
                    dataKey="value" 
                    radius={[6, 6, 0, 0]}
                    onClick={(entry: any) => {
                      if (onSelectVehicle && (entry?.vehicle || entry?.payload?.vehicle)) {
                        onSelectVehicle(entry.vehicle || entry.payload.vehicle);
                      }
                    }}
                    cursor="pointer"
                  >
                    {monthlyData.map((entry) => {
                      // Color mapping according to strict specification:
                      // <= 80: verde (#10b981)
                      // > 80 && <= 998: amarelo (#f59e0b)
                      // >= 999: vermelho (#ef4444)
                      let fillColor = '#10b981'; // verde
                      if (entry.value > 80 && entry.value <= 998) {
                        fillColor = '#f59e0b'; // amarelo
                      } else if (entry.value >= 999) {
                        fillColor = '#ef4444'; // vermelho
                      }

                      return (
                        <Cell 
                          key={`cell-${entry.fleetNumber}`} 
                          fill={fillColor}
                          className="hover:opacity-85 transition-opacity"
                        />
                      );
                    })}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
