/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { 
  LayoutDashboard, ListCollapse, Settings, History, ExternalLink, Download, Search, Filter, Eye, X, 
  Check, FileText, FolderOpen, Calendar, HelpCircle, Save, Edit3, Trash2, ShieldCheck, Database, 
  Activity, Users, UserCheck, AlertTriangle, RefreshCw, Lock, CheckCircle2, XCircle, Clock, CheckCheck,
  ChevronDown
} from 'lucide-react';
import { IniciativaRecord, FormConfigField, AuditLog, EvaluacionEstado, EvaluacionesComite } from '../types';
import { AdminUser, ADMIN_USERS } from '../data/adminUsers';
import { getWorkflowStatus, canUserEvaluateField, WorkflowStatus } from '../lib/workflowUtils';

interface AdminPanelProps {
  records: IniciativaRecord[];
  currentUser?: AdminUser | null;
  onSwitchUser?: (user: AdminUser) => void;
  onUpdateRecord: (updatedRecord: IniciativaRecord) => void;
  onDeleteRecord: (radicado: string) => void;
  auditLogs: AuditLog[];
  formConfig: FormConfigField[];
  onUpdateFormConfig: (updatedConfig: FormConfigField[]) => void;
  onLogout: () => void;
  onSyncFromDb?: () => void;
  isSyncing?: boolean;
}

export default function AdminPanel({ 
  records, 
  currentUser,
  onSwitchUser,
  onUpdateRecord, 
  onDeleteRecord,
  auditLogs, 
  formConfig, 
  onUpdateFormConfig,
  onLogout,
  onSyncFromDb,
  isSyncing = false
}: AdminPanelProps) {
  
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<'dashboard' | 'records' | 'config' | 'audit'>('dashboard');

  // Search & Filters for Records Table
  const [searchQuery, setSearchQuery] = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [filterFlow, setFilterFlow] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState(''); // '' | 'IA' | 'BI'

  // Selected Record for Detail View modal
  const [selectedRecord, setSelectedRecord] = useState<IniciativaRecord | null>(null);

  // Deletion confirmation state
  const [recordToDelete, setRecordToDelete] = useState<IniciativaRecord | null>(null);

  // Editing administrative state in detail view
  const [adminComments, setAdminComments] = useState('');
  const [adminReviewer, setAdminReviewer] = useState('');
  const [adminStatus, setAdminStatus] = useState<IniciativaRecord['estadoRevision']>('Recibido');

  // Editing form configuration
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [tempHelpText, setTempHelpText] = useState('');
  const [tempRequired, setTempRequired] = useState(true);
  const [tempActive, setTempActive] = useState(true);

  // Computed Areas list for filters
  const areasList = useMemo(() => {
    const list = new Set<string>();
    if (Array.isArray(records)) {
      records.forEach(r => { if(r?.areaServicio) list.add(r.areaServicio); });
    }
    return Array.from(list);
  }, [records]);

  // Apply filters on records
  const filteredRecords = useMemo(() => {
    if (!Array.isArray(records)) return [];
    return records.filter(record => {
      if (!record) return false;
      
      // search match
      const query = searchQuery.toLowerCase().trim();
      const nombreCompleto = record.nombreCompleto || '';
      const cedula = record.cedula || '';
      const correo = record.correo || '';
      const radicado = record.radicado || '';
      const nombreIniciativa = record.nombreIniciativa || '';

      const matchSearch = !query || 
        nombreCompleto.toLowerCase().includes(query) ||
        cedula.includes(query) ||
        correo.toLowerCase().includes(query) ||
        radicado.toLowerCase().includes(query) ||
        nombreIniciativa.toLowerCase().includes(query);

      // filters match
      const matchArea = !filterArea || record.areaServicio === filterArea;
      const flujoAsignado = record.flujoAsignado || '';
      const matchFlow = !filterFlow || flujoAsignado.includes(filterFlow);
      const matchStatus = !filterStatus || record.estadoRevision === filterStatus;
      const matchType = !filterType || record.tipoIniciativa === filterType;

      return matchSearch && matchArea && matchFlow && matchStatus && matchType;
    });
  }, [records, searchQuery, filterArea, filterFlow, filterStatus, filterType]);

  // Compute Dashboard Metrics
  const metrics = useMemo(() => {
    const safeRecords = Array.isArray(records) ? records : [];
    const totalRecords = safeRecords.length;
    const uniqueRegistrars = new Set(safeRecords.map(r => r?.cedula || '')).size;
    const pendingReview = safeRecords.filter(r => r?.estadoRevision === 'Recibido' || r?.estadoRevision === 'En revisión').length;
    const approvedCount = safeRecords.filter(r => r?.estadoRevision === 'Aprobado para piloto' || r?.estadoRevision === 'Aprobado para Comité de Innovación').length;
    
    // average risk score
    const avgRisk = totalRecords > 0 
      ? parseFloat((safeRecords.reduce((sum, r) => sum + (r?.puntajeTotal || 0), 0) / totalRecords).toFixed(1))
      : 0;

    // counts for types of IA
    const iaTypesMap: Record<string, number> = {};
    safeRecords.forEach(r => {
      if (Array.isArray(r?.tipoIa)) {
        r.tipoIa.forEach(type => {
          if (type) iaTypesMap[type] = (iaTypesMap[type] || 0) + 1;
        });
      }
    });
    const iaTypesData = Object.entries(iaTypesMap).map(([name, value]) => ({ name, value }));

    // counts for flows
    const flowMap: Record<string, number> = { 'Flujo A': 0, 'Flujo B': 0 };
    safeRecords.forEach(r => {
      const flujo = r?.flujoAsignado || '';
      if (flujo.includes('Flujo A')) flowMap['Flujo A']++;
      if (flujo.includes('Flujo B')) flowMap['Flujo B']++;
    });
    const flowData = Object.entries(flowMap).map(([name, value]) => ({ name, value }));

    // initiatives by area
    const areaMap: Record<string, number> = {};
    safeRecords.forEach(r => {
      const area = r?.areaServicio || 'Sin especificación';
      areaMap[area] = (areaMap[area] || 0) + 1;
    });
    const areaData = Object.entries(areaMap).map(([name, value]) => ({ name, value }));

    // stats
    const patientDataCount = safeRecords.filter(r => r?.incluyeDatosPacientes === 'Sí').length;
    const sensitiveDataCount = safeRecords.filter(r => r?.incluyeDatosSensibles === 'Sí').length;
    const integrationCount = safeRecords.filter(r => r?.requiereIntegracion === 'Sí').length;
    const totalAttachments = safeRecords.reduce((sum, r) => sum + (r?.urlsDocumentosAnexos?.length || 0), 0);

    return {
      totalRecords,
      uniqueRegistrars,
      pendingReview,
      approvedCount,
      avgRisk,
      iaTypesData,
      flowData,
      areaData,
      patientDataCount,
      sensitiveDataCount,
      integrationCount,
      totalAttachments
    };
  }, [records]);

  // Colors for Pie Charts
  const COLORS = ['#0f4c81', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#3b82f6', '#6b7280'];

  // Handle Detail selection
  const handleOpenDetail = (record: IniciativaRecord) => {
    setSelectedRecord(record);
    setAdminComments(record.observacionesAdministrador || '');
    setAdminReviewer(record.responsableRevision || 'AI Product Owner');
    setAdminStatus(record.estadoRevision || 'Recibido');
  };

  const handleSaveAdminFields = () => {
    if (!selectedRecord) return;
    
    const updated: IniciativaRecord = {
      ...selectedRecord,
      estadoRevision: adminStatus,
      responsableRevision: adminReviewer,
      observacionesAdministrador: adminComments,
      ultimaActualizacion: new Date().toISOString()
    };

    onUpdateRecord(updated);
    setSelectedRecord(updated); // update local modal
    alert('✓ Campos de revisión actualizados exitosamente en la base de datos.');
  };

  // Multi-user Committee Evaluation Handler
  const handleUpdateEvaluation = (
    record: IniciativaRecord,
    fieldKey: 'proteccionDato' | 'gobiernoSistemas' | 'gobiernoEstadistica' | 'validacionGerencia' | 'validacionPlaneacion' | 'validacionAdmin',
    newEstado: EvaluacionEstado
  ) => {
    const currentEvaluaciones: EvaluacionesComite = record.evaluaciones || {};
    const nowStr = new Date().toLocaleString('es-CO');
    const evaluatorUser = currentUser ? currentUser.username : 'admin';

    const updatedEvaluaciones: EvaluacionesComite = {
      ...currentEvaluaciones,
      [fieldKey]: {
        estado: newEstado,
        fecha: nowStr,
        usuario: evaluatorUser
      }
    };

    // Calculate workflow status preview with the new evaluation
    const previewRecord: IniciativaRecord = {
      ...record,
      evaluaciones: updatedEvaluaciones
    };
    const wf = getWorkflowStatus(previewRecord);

    let nextEstadoRevision = record.estadoRevision;
    if (wf.isAllApproved) {
      nextEstadoRevision = 'Aprobado para Comité de Innovación';
    } else if (wf.isAnyRejected) {
      nextEstadoRevision = 'No aprobado';
    }

    const finalRecord: IniciativaRecord = {
      ...previewRecord,
      estadoRevision: nextEstadoRevision,
      ultimaActualizacion: new Date().toISOString()
    };

    onUpdateRecord(finalRecord);

    if (selectedRecord && selectedRecord.radicado === record.radicado) {
      setSelectedRecord(finalRecord);
    }
  };

  // CSV Exporter
  const handleExportCSV = () => {
    if (records.length === 0) {
      alert('No hay registros para exportar.');
      return;
    }

    const headers = [
      'Radicado', 'Tipo Iniciativa', 'Fecha Registro', 'Nombre Completo', 'Cédula', 'Correo', 'Área/Servicio',
      'Nombre de Iniciativa', 'Problema', 'Objetivo', 'Tipo IA/BI', 'Herramienta Sugerida', 'Link Herramienta', 'Estado Herramienta',
      'Incluye Datos Pacientes', 'Incluye Datos Sensibles', 'Requiere Integración',
      'Puntaje Total', 'Nivel Riesgo', 'Flujo Asignado', 'Estado Revisión', 'Responsable Revisión', 'Observaciones Administrador'
    ];

    const cleanField = (val: any) => {
      if (val === undefined || val === null) return '';
      let str = String(val);
      // Replace semicolons with commas to not break columns, and clean quotes & newlines
      str = str.replace(/;/g, ',');
      str = str.replace(/"/g, '""');
      str = str.replace(/\r?\n|\r/g, ' ');
      return `"${str}"`;
    };

    const rows = records.map(r => [
      cleanField(r.radicado),
      cleanField(r.tipoIniciativa),
      cleanField(r.fechaRegistro),
      cleanField(r.nombreCompleto),
      cleanField(r.cedula),
      cleanField(r.correo),
      cleanField(r.areaServicio),
      cleanField(r.nombreIniciativa),
      cleanField(r.problema),
      cleanField(r.objetivo),
      cleanField(r.tipoIniciativa === 'IA' ? (Array.isArray(r.tipoIa) ? r.tipoIa.join(', ') : String(r.tipoIa || '')) : 'BI Tablero'),
      cleanField(r.herramientaSugerida || ''),
      cleanField(r.linkHerramienta || ''),
      cleanField(r.estadoHerramienta || ''),
      cleanField(r.incluyeDatosPacientes || ''),
      cleanField(r.incluyeDatosSensibles || ''),
      cleanField(r.requiereIntegracion || ''),
      cleanField(r.puntajeTotal !== undefined ? r.puntajeTotal : ''),
      cleanField(r.nivelRiesgo || ''),
      cleanField(r.flujoAsignado || ''),
      cleanField(r.estadoRevision),
      cleanField(r.responsableRevision),
      cleanField(r.observacionesAdministrador || '')
    ]);

    // Build perfect Csv content with sep=; declaration for Spanish Excel autoloading
    const csvHeaderLine = "sep=;\n";
    const csvBody = [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    
    // Create Blob with UTF-8 BOM so Spanish accents are preserved perfectly in Excel
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvHeaderLine, csvBody], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `HILA_Banco_Iniciativas_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // PDF Report Exporter (Filtered list)
  const handleExportPDF = () => {
    const listToExport = filteredRecords.length > 0 ? filteredRecords : records;
    if (!listToExport || listToExport.length === 0) {
      alert('No hay registros para exportar a PDF.');
      return;
    }

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Header bar
    doc.setFillColor(12, 45, 72); // sky-950
    doc.rect(0, 0, 297, 24, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text('HOSPITAL INFANTIL LOS ÁNGELES', 14, 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(203, 213, 225);
    doc.text('Banco Institucional de Iniciativas e Invenciones con IA • Consolidado', 14, 17);

    // Metadata info
    const nowStr = new Date().toLocaleString('es-CO');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`Fecha de generación: ${nowStr} | Total iniciativas: ${listToExport.length}`, 14, 30);

    // Table Data
    const tableHeaders = [
      ['Radicado', 'Fecha', 'Solicitante', 'Área', 'Iniciativa', 'Paso 1: Protección', 'Paso 2: Gob & Calidad', 'Paso 3: Val. Final', 'Estado']
    ];

    const tableData = listToExport.map(r => {
      const wf = getWorkflowStatus(r);
      const ev = r.evaluaciones || {};
      const paso1 = ev.proteccionDato?.estado || 'Pendiente';
      const paso2 = `Sist: ${ev.gobiernoSistemas?.estado || 'Pend'} | Estad: ${ev.gobiernoEstadistica?.estado || 'Pend'}`;
      const paso3 = `Ger: ${ev.validacionGerencia?.estado || 'Pend'} | Plan: ${ev.validacionPlaneacion?.estado || 'Pend'} | Adm: ${ev.validacionAdmin?.estado || 'Pend'}`;
      const estadoFinal = wf.isAllApproved ? 'APROBADO (6/6)' : wf.isAnyRejected ? 'RECHAZADO' : `En Proceso (${wf.validatedCount}/6)`;

      return [
        r.radicado || '',
        r.fechaRegistro || '',
        r.nombreCompleto || '',
        r.areaServicio || '',
        r.nombreIniciativa || '',
        paso1,
        paso2,
        paso3,
        estadoFinal
      ];
    });

    autoTable(doc, {
      startY: 34,
      head: tableHeaders,
      body: tableData,
      theme: 'grid',
      headStyles: {
        fillColor: [12, 74, 110], // sky-900
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 7,
        textColor: [30, 41, 59]
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 26 },
        1: { cellWidth: 20 },
        2: { cellWidth: 32 },
        3: { cellWidth: 28 },
        4: { cellWidth: 46 },
        5: { cellWidth: 24, halign: 'center' },
        6: { cellWidth: 40, halign: 'center' },
        7: { cellWidth: 50, halign: 'center' },
        8: { cellWidth: 25, halign: 'center', fontStyle: 'bold' }
      },
      margin: { left: 14, right: 14 }
    });

    // Page numbers
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`Hospital Infantil Los Ángeles • Sistema de Gestión HILA • Página ${i} de ${pageCount}`, 14, 202);
    }

    doc.save(`HILA_Reporte_Iniciativas_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // PDF Single Ficha Exporter
  const handleExportSingleRecordPDF = (record: IniciativaRecord) => {
    if (!record) return;

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Header bar
    doc.setFillColor(12, 45, 72); // sky-950
    doc.rect(0, 0, 210, 26, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text('HOSPITAL INFANTIL LOS ÁNGELES', 14, 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(203, 213, 225);
    doc.text(`Ficha Técnica de Iniciativa IA/BI • Radicado: ${record.radicado}`, 14, 18);

    doc.setFontSize(8);
    doc.setTextColor(16, 185, 129); // emerald-400
    doc.text(`Estado: ${record.estadoRevision || 'Recibido'} | Flujo: ${record.flujoAsignado || '-'}`, 14, 23);

    let y = 32;

    const addSection = (title: string, items: Array<[string, string]>) => {
      if (y > 255) {
        doc.addPage();
        y = 20;
      }

      doc.setFillColor(241, 245, 249);
      doc.rect(14, y, 182, 6, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(12, 74, 110);
      doc.text(title.toUpperCase(), 16, y + 4.5);
      y += 8;

      autoTable(doc, {
        startY: y,
        body: items.map(([label, val]) => [label, val || '-']),
        theme: 'plain',
        bodyStyles: { fontSize: 8, textColor: [30, 41, 59], cellPadding: 1.5 },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 52, textColor: [71, 85, 105] },
          1: { cellWidth: 130 }
        },
        margin: { left: 14, right: 14 }
      });

      // @ts-ignore
      y = (doc as any).lastAutoTable.finalY + 6;
    };

    addSection('1. Datos del Solicitante', [
      ['Nombre Completo:', record.nombreCompleto],
      ['Cédula de Ciudadanía:', record.cedula],
      ['Correo Electrónico:', record.correo],
      ['Área / Servicio:', record.areaServicio],
      ['Fecha de Registro:', record.fechaRegistro]
    ]);

    addSection('2. Identificación de la Propuesta', [
      ['Nombre de la Iniciativa:', record.nombreIniciativa],
      ['Área Solicitante:', record.areaSolicitante],
      ['Tipo de Propuesta:', record.tipoIniciativa === 'IA' ? `IA (${Array.isArray(record.tipoIa) ? record.tipoIa.join(', ') : record.tipoIa})` : 'BI Tablero PowerBI'],
      ['Herramienta Sugerida:', record.herramientaSugerida || 'N/A'],
      ['Link Herramienta:', record.linkHerramienta || 'N/A'],
      ['Estado Herramienta:', record.estadoHerramienta || 'N/A']
    ]);

    addSection('3. Justificación y Alcance', [
      ['Problema a Resolver:', record.problema],
      ['Objetivo Principal:', record.objetivo],
      ['Usuarios Beneficiados:', record.usuarios],
      ['Beneficios Esperados:', record.beneficios],
      ['Indicadores de Éxito:', record.indicadores],
      ['Riesgos Identificados:', record.riesgos],
      ['Costo Estimado:', record.costoEstimado || 'No especificado'],
      ['Propuesta Plan Piloto:', record.propuestaPlanPiloto]
    ]);

    addSection('4. Evaluación de Riesgo y Gobernanza', [
      ['Datos de Pacientes:', record.incluyeDatosPacientes],
      ['Datos Sensibles:', record.incluyeDatosSensibles],
      ['Requiere Integración SI:', record.requiereIntegracion],
      ['Puntaje Total de Riesgo:', `${record.puntajeTotal ?? 0} / 15`],
      ['Nivel de Riesgo:', record.nivelRiesgo || 'Por determinar'],
      ['Flujo Asignado:', record.flujoAsignado || 'Por determinar'],
      ['D1 - Impacto Paciente:', `${record.puntajeD1 || 0}/5 - ${record.justificacionD1 || ''}`],
      ['D2 - Tipo de Dato:', `${record.puntajeD2 || 0}/5 - ${record.justificacionD2 || ''}`],
      ['D3 - Alcance Institucional:', `${record.puntajeD3 || 0}/5 - ${record.justificacionD3 || ''}`]
    ]);

    const evRec = record.evaluaciones || {};
    const wfRec = getWorkflowStatus(record);

    addSection('5. Validaciones y Gobernanza del Comité Institucional', [
      ['Paso 1 - Protección de Dato (adminsistem):', `${evRec.proteccionDato?.estado || 'Pendiente'}${evRec.proteccionDato?.fecha ? ` (${evRec.proteccionDato.fecha})` : ''}`],
      ['Paso 2 - Gobierno del Dato (adminsistem):', `${evRec.gobiernoSistemas?.estado || 'Pendiente'}${evRec.gobiernoSistemas?.fecha ? ` (${evRec.gobiernoSistemas.fecha})` : ''}`],
      ['Paso 2 - Calidad del Dato (estadmin):', `${evRec.gobiernoEstadistica?.estado || 'Pendiente'}${evRec.gobiernoEstadistica?.fecha ? ` (${evRec.gobiernoEstadistica.fecha})` : ''}`],
      ['Paso 3 - Validación Final (geradmin):', `${evRec.validacionGerencia?.estado || 'Pendiente'}${evRec.validacionGerencia?.fecha ? ` (${evRec.validacionGerencia.fecha})` : ''}`],
      ['Paso 3 - Validación Final (planadmin):', `${evRec.validacionPlaneacion?.estado || 'Pendiente'}${evRec.validacionPlaneacion?.fecha ? ` (${evRec.validacionPlaneacion.fecha})` : ''}`],
      ['Paso 3 - Validación Final (admin):', `${evRec.validacionAdmin?.estado || 'Pendiente'}${evRec.validacionAdmin?.fecha ? ` (${evRec.validacionAdmin.fecha})` : ''}`],
      ['Estado Global del Comité:', wfRec.isAllApproved ? 'APROBADO POR EL COMITÉ COMPLETO (100% VALIDADO)' : wfRec.isAnyRejected ? 'RECHAZADO' : `EN PROCESO (${wfRec.validatedCount}/6 Validaciones)`]
    ]);

    addSection('6. Dictamen Administrativo AI Product Owner', [
      ['Estado de la Revisión:', record.estadoRevision || 'Recibido'],
      ['Responsable Asignado:', record.responsableRevision || 'Pendiente'],
      ['Observaciones del AI Product Owner:', record.observacionesAdministrador || 'Sin observaciones registradas']
    ]);

    // Footer
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(`Hospital Infantil Los Ángeles • Sistema de Gestión de Iniciativas IA • Página ${i} de ${pageCount}`, 14, 287);
    }

    doc.save(`Ficha_Iniciativa_${record.radicado}.pdf`);
  };

  // Form Config Actions
  const handleEditConfig = (fieldId: string, currentHelpText: string, currentRequired: boolean, currentActive: boolean) => {
    setEditingFieldId(fieldId);
    setTempHelpText(currentHelpText);
    setTempRequired(currentRequired);
    setTempActive(currentActive);
  };

  const handleSaveConfig = (fieldId: string) => {
    const updated = formConfig.map(f => {
      if (f.id === fieldId) {
        return {
          ...f,
          textoAyuda: tempHelpText,
          obligatorio: tempRequired,
          activo: tempActive,
          ultimaActualizacion: new Date().toISOString()
        };
      }
      return f;
    });

    onUpdateFormConfig(updated);
    setEditingFieldId(null);
    alert('✓ Configuración del campo actualizada en la hoja "Configuración Formulario".');
  };

  // Render an evaluation cell in the table
  const renderEvaluationCell = (
    record: IniciativaRecord,
    fieldKey: 'proteccionDato' | 'gobiernoSistemas' | 'gobiernoEstadistica' | 'validacionGerencia' | 'validacionPlaneacion' | 'validacionAdmin',
    assignedUser: string,
    workflow: WorkflowStatus
  ) => {
    const currentItem = record.evaluaciones?.[fieldKey];
    const estado: EvaluacionEstado = currentItem?.estado || 'Pendiente';
    const perm = canUserEvaluateField(currentUser || null, fieldKey, workflow);

    // If step is locked (previous step not completed)
    if (!perm.canEdit && perm.reason?.startsWith('Bloqueado:')) {
      return (
        <td key={fieldKey} className="p-2.5 text-center whitespace-nowrap bg-slate-50/70 border-r border-slate-100" title={perm.reason}>
          <span className="px-2 py-1 rounded-lg text-[9px] font-bold bg-slate-100 text-slate-400 border border-slate-200 inline-flex items-center gap-1 cursor-not-allowed">
            <Lock className="h-3 w-3 text-slate-400 shrink-0" />
            <span>Bloqueado</span>
          </span>
        </td>
      );
    }

    // If active user CAN edit this field
    if (perm.canEdit) {
      return (
        <td key={fieldKey} className={`p-2.5 text-center whitespace-nowrap border-r transition-colors ${
          estado === 'Validado' ? 'bg-emerald-50/70 border-emerald-200' : estado === 'Rechazado' ? 'bg-rose-50/70 border-rose-200' : 'bg-amber-50/40 border-slate-200'
        }`}>
          <div className="flex flex-col items-center justify-center gap-1">
            <select
              value={estado}
              onChange={(e) => handleUpdateEvaluation(record, fieldKey, e.target.value as EvaluacionEstado)}
              title={`Calificar como ${assignedUser}. Clic para cambiar estado.`}
              className={`px-2 py-1 rounded-lg text-[10px] font-extrabold border transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-300 shadow-2xs ${
                estado === 'Validado'
                  ? 'bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700'
                  : estado === 'Rechazado'
                  ? 'bg-rose-600 text-white border-rose-700 hover:bg-rose-700'
                  : 'bg-amber-100 text-amber-900 border-amber-300 hover:bg-amber-200'
              }`}
            >
              <option value="Pendiente" className="bg-white text-slate-800">⏳ Pendiente</option>
              <option value="Validado" className="bg-white text-emerald-800 font-bold">✓ Validado</option>
              <option value="Rechazado" className="bg-white text-rose-800 font-bold">✕ Rechazado</option>
            </select>
            <span className="text-[8px] text-slate-400 font-medium">
              {currentItem?.fecha ? currentItem.fecha.split(',')[0] : `(Tú: ${assignedUser})`}
            </span>
          </div>
        </td>
      );
    }

    // Read-only for other users
    return (
      <td key={fieldKey} className={`p-2.5 text-center whitespace-nowrap border-r border-slate-100 ${
        estado === 'Validado' ? 'bg-emerald-50/40' : estado === 'Rechazado' ? 'bg-rose-50/40' : ''
      }`} title={`Calificado por: ${currentItem?.usuario || assignedUser}${currentItem?.fecha ? ` • ${currentItem.fecha}` : ''}`}>
        <div className="flex flex-col items-center justify-center gap-0.5">
          {estado === 'Validado' ? (
            <span className="px-2 py-1 rounded-lg text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-300 inline-flex items-center gap-1 shadow-2xs">
              <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" /> Validado
            </span>
          ) : estado === 'Rechazado' ? (
            <span className="px-2 py-1 rounded-lg text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-300 inline-flex items-center gap-1 shadow-2xs">
              <XCircle className="h-3 w-3 text-rose-600 shrink-0" /> Rechazado
            </span>
          ) : (
            <span className="px-2 py-1 rounded-lg text-[9.5px] font-bold bg-amber-50 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
              <Clock className="h-3 w-3 text-amber-500 shrink-0" /> Pendiente
            </span>
          )}
          {currentItem?.usuario && (
            <span className="text-[8px] text-slate-400 font-medium">{currentItem.usuario}</span>
          )}
        </div>
      </td>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800">
      
      {/* Top Admin Bar */}
      <div className="bg-sky-950 text-white shadow-md border-b border-sky-900/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2.5 rounded-xl border border-white/20">
              <Activity className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight">HILA • Panel de Control Administrativo</h1>
              <p className="text-[10px] text-slate-300 font-medium">Banco Institucional de Iniciativas e Invenciones con IA y BI</p>
            </div>
          </div>

          {/* Active Admin User and Controls */}
          <div className="flex flex-wrap items-center gap-3">
            
            {/* Active User Indicator */}
            {currentUser && (
              <div className="bg-white/10 border border-white/15 rounded-xl px-3 py-1.5 flex items-center gap-2.5 text-xs">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center justify-center font-bold text-xs">
                  {currentUser.username.substring(0, 2).toUpperCase()}
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-white text-xs">{currentUser.name}</span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 uppercase">
                      {currentUser.username}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-300 block font-normal">
                    {currentUser.roleTitle} • <strong className="text-emerald-300">{currentUser.stepAssigned.split('&')[0]}</strong>
                  </span>
                </div>
              </div>
            )}

            {/* Quick Switcher for testing all 5 roles */}
            {onSwitchUser && (
              <div className="relative">
                <select
                  value={currentUser ? currentUser.username : ''}
                  onChange={(e) => {
                    const selected = ADMIN_USERS.find(u => u.username === e.target.value);
                    if (selected) onSwitchUser(selected);
                  }}
                  title="Cambiar rápidamente de usuario para calificar como otro administrador"
                  className="px-2.5 py-2 bg-sky-900 hover:bg-sky-850 text-white border border-sky-700/80 rounded-xl text-xs font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  <option value="" disabled>Cambiar de perfil...</option>
                  {ADMIN_USERS.map(u => (
                    <option key={u.username} value={u.username}>
                      👤 {u.username} ({u.roleTitle.split('(')[0].trim()})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {onSyncFromDb && (
              <button
                onClick={onSyncFromDb}
                disabled={isSyncing}
                title="Sincronizar y actualizar registros desde Firestore"
                className="px-3 py-2 bg-sky-800 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">{isSyncing ? 'Sincronizando...' : 'Sincronizar'}</span>
              </button>
            )}

            <button 
              onClick={onLogout}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>

      {/* Main Container Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Navigation Tabs Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
              { id: 'records', label: 'Registros Recibidos', icon: ListCollapse },
              { id: 'config', label: 'Configuración Instrumento', icon: Settings },
              { id: 'audit', label: 'Auditoría Trazabilidad', icon: History }
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer ${
                    activeTab === tab.id 
                      ? 'bg-sky-900 text-white shadow-md shadow-sky-900/15' 
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Action Exporter / Access Links */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExportCSV}
              title="Exportar base de datos consolidada a formato CSV"
              className="px-3.5 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs"
            >
              <Download className="h-3.5 w-3.5 text-emerald-700" /> Exportar CSV
            </button>
            <button
              onClick={handleExportPDF}
              title="Exportar reporte institucional consolidado a PDF"
              className="px-3.5 py-2 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all inline-flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" /> Exportar PDF
            </button>
          </div>
        </div>

        {/* TAB CONTENT: 1. DASHBOARD */}
        {activeTab === 'dashboard' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { title: 'Iniciativas IA', val: metrics.totalRecords, desc: 'Registros totales recibidos', icon: Activity, color: 'text-sky-600 bg-sky-50' },
                { title: 'Colaboradores', val: metrics.uniqueRegistrars, desc: 'Funcionarios proponentes', icon: Users, color: 'text-teal-600 bg-teal-50' },
                { title: 'Promedio Riesgo', val: metrics.avgRisk, desc: 'Puntuación escala 0 - 15', icon: ShieldCheck, color: 'text-amber-600 bg-amber-50' },
                { title: 'Anexos en Drive', val: metrics.totalAttachments, desc: 'Documentos cargados', icon: FolderOpen, color: 'text-purple-600 bg-purple-50' }
              ].map((m, idx) => {
                const Icon = m.icon;
                return (
                  <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">{m.title}</span>
                      <span className="text-2xl font-black text-slate-900 block">{m.val}</span>
                      <span className="text-[10px] text-slate-500 font-medium block">{m.desc}</span>
                    </div>
                    <div className={`p-3 rounded-xl ${m.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Removed Quick Access links as requested */}

            {/* Recharts Data Analytics Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Chart 1: Initiatives by Area */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm col-span-1 lg:col-span-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Iniciativas por Área o Servicio</h4>
                <div className="h-64">
                  {metrics.areaData.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-400 text-xs">No hay datos suficientes</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={metrics.areaData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 9 }} interval={0} stroke="#64748b" />
                        <YAxis stroke="#64748b" tick={{ fontSize: 10 }} allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#0f4c81" radius={[4, 4, 0, 0]} barSize={25} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Chart 2: Initiatives by Flow */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm col-span-1">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Iniciativas por Flujo Asignado</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metrics.flowData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="#64748b" />
                      <YAxis stroke="#64748b" tick={{ fontSize: 10 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                        {metrics.flowData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#b91c1c' : '#0369a1'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 3: Initiatives by IA Type */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm col-span-1 lg:col-span-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Iniciativas por Tipo de IA</h4>
                <div className="h-64">
                  {metrics.iaTypesData.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-slate-400 text-xs">No hay datos suficientes</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={metrics.iaTypesData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" stroke="#64748b" tick={{ fontSize: 10 }} allowDecimals={false} />
                        <YAxis dataKey="name" type="category" stroke="#64748b" tick={{ fontSize: 9 }} width={120} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} barSize={15} />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Patient and Sensitive Data Quick Statistics */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm col-span-1">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Indicadores de Cumplimiento Técnico</h4>
                <div className="space-y-4">
                  {[
                    { label: 'Involucra Datos de Pacientes', val: metrics.patientDataCount, pct: metrics.totalRecords > 0 ? Math.round((metrics.patientDataCount/metrics.totalRecords)*100) : 0, color: 'bg-indigo-600' },
                    { label: 'Contiene Datos Sensibles (Ley 1581)', val: metrics.sensitiveDataCount, pct: metrics.totalRecords > 0 ? Math.round((metrics.sensitiveDataCount/metrics.totalRecords)*100) : 0, color: 'bg-rose-600' },
                    { label: 'Requiere Integración Tecnológica', val: metrics.integrationCount, pct: metrics.totalRecords > 0 ? Math.round((metrics.integrationCount/metrics.totalRecords)*100) : 0, color: 'bg-amber-500' }
                  ].map((stat, idx) => (
                    <div key={idx} className="space-y-1.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                        <span>{stat.label}</span>
                        <span>{stat.val} ({stat.pct}%)</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div className={`h-full ${stat.color}`} style={{ width: `${stat.pct}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </motion.div>
        )}

        {/* TAB CONTENT: 2. RECORDS TABLE */}
        {activeTab === 'records' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            {/* Search and filter tools */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-4">
              
              {/* Search Bar */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-2.5 h-4.5 w-4.5 text-slate-400" />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar por nombre, cédula, radicado..."
                  className="w-full pl-10 pr-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-100 focus:border-sky-900 transition-all font-semibold"
                />
              </div>

              {/* Tipo de Iniciativa Filter */}
              <div className="w-full md:w-44">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-100 bg-white font-semibold"
                >
                  <option value="">Todos los Tipos</option>
                  <option value="IA">🤖 Iniciativa IA</option>
                  <option value="BI">📊 Tablero BI</option>
                </select>
              </div>

              {/* Area Filter */}
              <div className="w-full md:w-44">
                <select
                  value={filterArea}
                  onChange={(e) => setFilterArea(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-100 bg-white font-semibold"
                >
                  <option value="">Todas las Áreas</option>
                  {areasList.map(area => (
                    <option key={area} value={area}>{area}</option>
                  ))}
                </select>
              </div>

              {/* Flow Filter */}
              <div className="w-full md:w-44">
                <select
                  value={filterFlow}
                  onChange={(e) => setFilterFlow(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-100 bg-white font-semibold"
                >
                  <option value="">Todos los Flujos</option>
                  <option value="Flujo A">Flujo A (Alto Impacto)</option>
                  <option value="Flujo B">Flujo B (Bajo/Mod Impacto)</option>
                </select>
              </div>

              {/* Review Status Filter */}
              <div className="w-full md:w-44">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-100 bg-white font-semibold"
                >
                  <option value="">Todos los Estados</option>
                  <option value="Recibido">Recibido</option>
                  <option value="En revisión">En revisión</option>
                  <option value="Requiere ajustes">Requiere ajustes</option>
                  <option value="Aprobado para Comité de Innovación">Aprobado para Comité de Innovación</option>
                  <option value="Aprobado para piloto">Aprobado para piloto</option>
                  <option value="No aprobado">No aprobado</option>
                  <option value="Cerrado">Cerrado</option>
                </select>
              </div>

              {/* Reset button */}
              {(searchQuery || filterArea || filterFlow || filterStatus || filterType) && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterArea('');
                    setFilterFlow('');
                    setFilterStatus('');
                    setFilterType('');
                  }}
                  className="text-xs text-rose-600 hover:underline font-bold shrink-0 cursor-pointer"
                >
                  Limpiar Filtros
                </button>
              )}
            </div>

            {/* Sequential Approval Workflow Explanatory Card */}
            <div className="bg-gradient-to-r from-sky-950 via-sky-900 to-indigo-950 text-white p-4 rounded-2xl shadow-sm border border-sky-850 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span className="font-extrabold text-xs uppercase tracking-wider text-emerald-300">
                    Gobernanza y Comité de Aprobación por Pasos Secuenciales
                  </span>
                </div>
                <p className="text-[11px] text-slate-200 leading-relaxed max-w-3xl">
                  <strong>Paso 1:</strong> <span className="text-cyan-300 font-bold">adminsistem</span> valida la Protección de Dato. Al validar se pone en verde y habilita el Paso 2.
                  • <strong>Paso 2:</strong> <span className="text-indigo-300 font-bold">adminsistem</span> y <span className="text-indigo-300 font-bold">estadmin</span> evalúan Gobierno y Calidad del Dato.
                  • <strong>Paso 3:</strong> <span className="text-emerald-300 font-bold">geradmin</span>, <span className="text-emerald-300 font-bold">planadmin</span> y <span className="text-emerald-300 font-bold">admin</span> realizan la Validación Final.
                </p>
              </div>
              <div className="px-3 py-1.5 bg-white/10 rounded-xl border border-white/15 text-[10px] shrink-0 font-semibold text-emerald-300">
                ✓ Cuando todos ponen Validado, el registro se aprueba en verde
              </div>
            </div>

            {/* Records Data Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    {/* Header Row 1 - Category Super Headers */}
                    <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-500 font-black uppercase tracking-wider text-[10px]">
                      <th rowSpan={2} className="p-3.5 border-r border-slate-200">Radicado</th>
                      <th rowSpan={2} className="p-3.5 border-r border-slate-200 whitespace-nowrap">Fecha</th>
                      <th rowSpan={2} className="p-3.5 border-r border-slate-200">Solicitante</th>
                      <th rowSpan={2} className="p-3.5 border-r border-slate-200">Área / Servicio</th>
                      <th rowSpan={2} className="p-3.5 border-r border-slate-200 min-w-[170px]">Iniciativa / Propuesta</th>
                      <th rowSpan={2} className="p-3.5 border-r border-slate-200 text-center">Flujo</th>

                      {/* Paso 1: Protección de Dato */}
                      <th colSpan={1} className="p-2 text-center bg-cyan-900/10 text-cyan-950 border-r border-cyan-200 font-black">
                        1. PROTECCIÓN DE DATO
                      </th>

                      {/* Paso 2: Gobierno y Calidad del Dato */}
                      <th colSpan={2} className="p-2 text-center bg-indigo-900/10 text-indigo-950 border-r border-indigo-200 font-black">
                        2. GOBIERNO Y CALIDAD DEL DATO
                      </th>

                      {/* Paso 3: Validación Final */}
                      <th colSpan={3} className="p-2 text-center bg-emerald-900/10 text-emerald-950 border-r border-emerald-200 font-black">
                        3. VALIDACIÓN FINAL
                      </th>

                      <th rowSpan={2} className="p-3.5 border-r border-slate-200 text-center">Estado General</th>
                      <th rowSpan={2} className="p-3.5 text-center">Acciones</th>
                    </tr>

                    {/* Header Row 2 - Evaluator User Columns */}
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-tight text-slate-600">
                      {/* Step 1 User */}
                      <th className="p-2 text-center bg-cyan-50/70 border-r border-cyan-200 text-cyan-900" title="Usuario: adminsistem (Subgerencia / Sistemas)">
                        adminsistem
                      </th>

                      {/* Step 2 Users */}
                      <th className="p-2 text-center bg-indigo-50/70 border-r border-indigo-150 text-indigo-900" title="Usuario: adminsistem (Gobierno del Dato)">
                        adminsistem
                      </th>
                      <th className="p-2 text-center bg-indigo-50/70 border-r border-indigo-200 text-indigo-900" title="Usuario: estadmin (Calidad del Dato)">
                        estadmin
                      </th>

                      {/* Step 3 Users */}
                      <th className="p-2 text-center bg-emerald-50/70 border-r border-emerald-150 text-emerald-900" title="Usuario: geradmin (Gerencia General)">
                        geradmin
                      </th>
                      <th className="p-2 text-center bg-emerald-50/70 border-r border-emerald-150 text-emerald-900" title="Usuario: planadmin (Planeación)">
                        planadmin
                      </th>
                      <th className="p-2 text-center bg-emerald-50/70 border-r border-emerald-200 text-emerald-900" title="Usuario: admin (Admin General)">
                        admin
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRecords.length === 0 ? (
                      <tr>
                        <td colSpan={14} className="p-8 text-center text-slate-400 font-semibold">
                          No se encontraron iniciativas registradas con los filtros seleccionados.
                        </td>
                      </tr>
                    ) : (
                      filteredRecords.map((record) => {
                        const flujo = record.flujoAsignado || '';
                        const isHigh = flujo.includes('Flujo A');
                        const wf = getWorkflowStatus(record);
                        const isApproved = wf.isAllApproved;
                        const isRejected = wf.isAnyRejected;

                        return (
                          <tr 
                            key={record.radicado} 
                            className={`transition-all font-semibold border-b ${
                              isApproved
                                ? 'bg-emerald-100/70 hover:bg-emerald-100 border-l-4 border-l-emerald-600 ring-1 ring-emerald-300'
                                : isRejected
                                ? 'bg-rose-50/40 hover:bg-rose-50/70 border-l-4 border-l-rose-500'
                                : 'hover:bg-slate-50/60 border-l-4 border-l-transparent'
                            }`}
                          >
                            <td className="p-3 font-black text-sky-950 border-r border-slate-100 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                {isApproved && <CheckCheck className="h-4 w-4 text-emerald-700" />}
                                <span>{record.radicado}</span>
                              </div>
                            </td>
                            <td className="p-3 text-slate-500 whitespace-nowrap border-r border-slate-100 text-[11px]">{record.fechaRegistro}</td>
                            <td className="p-3 border-r border-slate-100">
                              <div className="space-y-0.5 max-w-[140px]">
                                <span className="text-slate-800 font-bold block truncate" title={record.nombreCompleto}>{record.nombreCompleto}</span>
                                <span className="text-[10px] text-slate-400 block font-medium">CC. {record.cedula}</span>
                              </div>
                            </td>
                            <td className="p-3 text-slate-600 whitespace-nowrap border-r border-slate-100 text-[11px]">{record.areaServicio}</td>
                            <td className="p-3 max-w-xs border-r border-slate-100">
                              <div className="flex flex-col gap-1 font-semibold">
                                <span className={`w-fit px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                                  record.tipoIniciativa === 'IA' 
                                    ? 'bg-purple-100 text-purple-800' 
                                    : 'bg-indigo-100 text-indigo-800'
                                }`}>
                                  {record.tipoIniciativa === 'IA' ? '🤖 IA' : '📊 BI'}
                                </span>
                                <span className="text-slate-700 block truncate max-w-[200px]" title={record.nombreIniciativa}>
                                  {record.nombreIniciativa}
                                </span>
                              </div>
                            </td>
                            <td className="p-3 whitespace-nowrap border-r border-slate-100 text-center">
                              {record.tipoIniciativa === 'BI' ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-teal-100 text-teal-800 border border-teal-200">
                                  Flujo BI
                                </span>
                              ) : (
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                                  isHigh ? 'bg-rose-100 text-rose-800' : 'bg-sky-100 text-sky-800'
                                }`}>
                                  {isHigh ? 'Flujo A' : 'Flujo B'}
                                </span>
                              )}
                            </td>

                            {/* Column 1: Paso 1 - PROTECCIÓN DE DATO (adminsistem) */}
                            {renderEvaluationCell(record, 'proteccionDato', 'adminsistem', wf)}

                            {/* Column 2: Paso 2 - GOBIERNO Y CALIDAD (adminsistem) */}
                            {renderEvaluationCell(record, 'gobiernoSistemas', 'adminsistem', wf)}

                            {/* Column 3: Paso 2 - GOBIERNO Y CALIDAD (estadmin) */}
                            {renderEvaluationCell(record, 'gobiernoEstadistica', 'estadmin', wf)}

                            {/* Column 4: Paso 3 - VALIDACIÓN FINAL (geradmin) */}
                            {renderEvaluationCell(record, 'validacionGerencia', 'geradmin', wf)}

                            {/* Column 5: Paso 3 - VALIDACIÓN FINAL (planadmin) */}
                            {renderEvaluationCell(record, 'validacionPlaneacion', 'planadmin', wf)}

                            {/* Column 6: Paso 3 - VALIDACIÓN FINAL (admin) */}
                            {renderEvaluationCell(record, 'validacionAdmin', 'admin', wf)}

                            {/* Consolidated Global Estado */}
                            <td className="p-3 text-center whitespace-nowrap border-r border-slate-100">
                              {isApproved ? (
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className="px-2.5 py-1 rounded-full text-[10.5px] font-black bg-emerald-600 text-white shadow-xs inline-flex items-center gap-1">
                                    <CheckCheck className="h-3.5 w-3.5" /> APROBADO
                                  </span>
                                  <span className="text-[8.5px] text-emerald-800 font-extrabold uppercase tracking-wider">
                                    Comité 100%
                                  </span>
                                </div>
                              ) : isRejected ? (
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-600 text-white inline-flex items-center gap-1">
                                    <XCircle className="h-3 w-3" /> Rechazado
                                  </span>
                                  <span className="text-[8.5px] text-rose-700 font-medium">Objeción registrada</span>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center gap-0.5">
                                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1">
                                    <Clock className="h-3 w-3 text-amber-600" /> Pendiente
                                  </span>
                                  <span className="text-[8.5px] text-slate-500 font-medium">{wf.validatedCount}/6 Validados</span>
                                </div>
                              )}
                            </td>

                            {/* Actions: View Detail / Delete */}
                            <td className="p-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => handleOpenDetail(record)}
                                  className="p-1.5 hover:bg-slate-100 rounded-lg text-sky-900 transition-colors cursor-pointer"
                                  title="Ver Ficha y Calificaciones Detalladas"
                                >
                                  <Eye className="h-4.5 w-4.5" />
                                </button>
                                <button
                                  onClick={() => setRecordToDelete(record)}
                                  className="p-1.5 hover:bg-rose-50 rounded-lg text-red-600 transition-colors cursor-pointer"
                                  title="Eliminar Registro"
                                >
                                  <Trash2 className="h-4.5 w-4.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB CONTENT: 3. CONFIGURATION */}
        {activeTab === 'config' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
              <h3 className="text-sm font-bold text-slate-900 mb-2 inline-flex items-center gap-2">
                <Settings className="h-4 w-4 text-sky-900" /> Configuración Dinámica de Preguntas del Formulario
              </h3>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                Este módulo le permite administrar la configuración del instrumento de solicitud <span className="font-semibold">F-IA-001</span>. 
                Cualquier cambio guardado aquí se sincronizará automáticamente con la hoja <span className="font-semibold">"Configuración Formulario"</span> y actualizará la visualización de la ficha para los registradores.
              </p>

              <div className="space-y-4">
                {formConfig.map((field) => (
                  <div key={field.id} className="p-4 border border-slate-200 rounded-xl bg-slate-5/50 hover:border-slate-300 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      
                      {/* Field Metadata info */}
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-black uppercase">{field.seccion}</span>
                          <span className="text-xs font-black text-slate-900">{field.nombreCampo}</span>
                          <span className="text-[9px] text-slate-400 font-medium">ID: {field.id}</span>
                        </div>

                        {editingFieldId === field.id ? (
                          <div className="space-y-3.5 pt-2">
                            <div>
                              <label className="block text-[10px] text-slate-400 font-bold uppercase mb-1">Texto de Ayuda del Campo</label>
                              <textarea
                                value={tempHelpText}
                                onChange={(e) => setTempHelpText(e.target.value)}
                                rows={2}
                                className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-100"
                              />
                            </div>
                            <div className="flex items-center gap-4">
                              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={tempRequired} 
                                  onChange={(e) => setTempRequired(e.target.checked)}
                                  className="rounded text-sky-900 focus:ring-sky-900"
                                />
                                Campo Obligatorio
                              </label>

                              <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  checked={tempActive} 
                                  onChange={(e) => setTempActive(e.target.checked)}
                                  className="rounded text-sky-900 focus:ring-sky-900"
                                />
                                Campo Activo
                              </label>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1 font-medium text-xs leading-relaxed">
                            <p className="text-slate-500"><span className="text-[10px] font-bold text-slate-400">Texto ayuda:</span> {field.textoAyuda}</p>
                            <p className="text-slate-400 text-[10px]">
                              Requerido: <span className="font-bold text-slate-600">{field.obligatorio ? 'Sí' : 'No'}</span> • 
                              Activo: <span className="font-bold text-slate-600">{field.activo ? 'Sí' : 'No'}</span> • 
                              Actualizado: <span className="font-mono text-[9px]">{new Date(field.ultimaActualizacion).toLocaleDateString()}</span>
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Action edit triggers */}
                      <div className="shrink-0 flex items-center gap-1.5 self-end sm:self-start">
                        {editingFieldId === field.id ? (
                          <>
                            <button
                              onClick={() => setEditingFieldId(null)}
                              className="px-2.5 py-1.5 text-xs font-bold bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 cursor-pointer"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => handleSaveConfig(field.id)}
                              className="px-3 py-1.5 text-xs font-bold bg-green-600 text-white rounded-lg hover:bg-green-700 inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Save className="h-3 w-3" /> Guardar
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleEditConfig(field.id, field.textoAyuda, field.obligatorio, field.activo)}
                            className="px-3 py-1.5 text-xs font-bold bg-sky-900 text-white rounded-lg hover:bg-sky-950 inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="h-3.5 w-3.5" /> Editar Campo
                          </button>
                        )}
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* TAB CONTENT: 4. AUDIT TRAIL */}
        {activeTab === 'audit' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6">
              <h3 className="text-sm font-bold text-slate-900 mb-2 inline-flex items-center gap-2">
                <History className="h-4 w-4 text-sky-900" /> Historial de Trazabilidad y Auditoría del Sistema
              </h3>
              <p className="text-xs text-slate-500 mb-6">
                A continuación se listan las acciones y bitácoras registradas de forma segura. Esta información provee cumplimiento normativo y control detallado de ingresos, registros de iniciativas e intervenciones administrativas en la hoja <span className="font-semibold">"Auditoría Sistema"</span>.
              </p>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs font-semibold">
                  <thead>
                    <tr className="bg-slate-50 text-slate-400 font-bold border-b border-slate-200">
                      <th className="p-3">Marca de Tiempo</th>
                      <th className="p-3">Usuario</th>
                      <th className="p-3">Rol</th>
                      <th className="p-3">Acción</th>
                      <th className="p-3">Radicado</th>
                      <th className="p-3">Detalle</th>
                      <th className="p-3">Área o Servicio</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(auditLogs || []).map((log, index) => (
                      <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 text-slate-500 whitespace-nowrap">{new Date(log.timestamp || Date.now()).toLocaleString()}</td>
                        <td className="p-3 text-slate-800 font-bold">{log.usuario}</td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            log.rol === 'Administrador' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-800'
                          }`}>
                            {log.rol}
                          </span>
                        </td>
                        <td className="p-3 text-sky-900 font-black">{log.accionRealizada}</td>
                        <td className="p-3 text-slate-600">{log.radicadoRelacionado}</td>
                        <td className="p-3 max-w-sm text-slate-600 leading-relaxed font-medium">{log.detalleAccion}</td>
                        <td className="p-3 text-slate-500 whitespace-nowrap">{log.areaServicio}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

      </div>

      {/* DETAIL VIEW MODAL */}
      {selectedRecord && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 flex flex-col"
          >
            {/* Modal Header */}
            <div className="bg-sky-950 text-white p-5 flex items-center justify-between sticky top-0 z-10 shrink-0">
              <div className="flex items-center gap-3">
                <FileText className="h-5.5 w-5.5 text-emerald-400" />
                <div>
                  <h3 className="text-base font-black tracking-tight">{selectedRecord.radicado}</h3>
                  <p className="text-[10px] text-slate-300">Ficha IA: {selectedRecord.nombreIniciativa}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportSingleRecordPDF(selectedRecord)}
                  title="Descargar Ficha Técnica en PDF"
                  className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white font-bold text-xs rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Download className="h-3.5 w-3.5" /> Ficha PDF
                </button>
                <button 
                  onClick={() => setSelectedRecord(null)}
                  className="p-1 hover:bg-white/10 rounded-lg text-white/80 hover:text-white transition-colors cursor-pointer"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 md:p-8 space-y-6 flex-1 text-xs">
              
              {/* Grid block: Personal & Proposal Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Applicant card */}
                <div className="space-y-3.5 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <h4 className="font-bold text-sky-950 text-xs border-b border-slate-200 pb-1.5 uppercase">Información del Solicitante</h4>
                  <div className="space-y-2.5 font-semibold text-slate-700">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Nombre Completo:</span>
                      <span className="text-slate-900 text-xs font-bold">{selectedRecord.nombreCompleto}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Cédula:</span>
                      <span className="text-slate-800">{selectedRecord.cedula}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Correo Electrónico:</span>
                      <span className="text-slate-800">{selectedRecord.correo}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Área o Servicio:</span>
                      <span className="text-slate-800">{selectedRecord.areaServicio}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Fecha Radicación:</span>
                      <span className="text-slate-800">{selectedRecord.fechaRegistro}</span>
                    </div>
                  </div>
                </div>

                {/* Initiative general */}
                <div className="space-y-3.5 p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <h4 className="font-bold text-sky-950 text-xs border-b border-slate-200 pb-1.5 uppercase">A. Identificación de la Iniciativa</h4>
                  <div className="space-y-2.5 font-semibold text-slate-700">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Nombre Iniciativa IA:</span>
                      <span className="text-slate-900 text-xs font-bold block">{selectedRecord.nombreIniciativa}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Área Solicitante:</span>
                      <span className="text-slate-800 block">{selectedRecord.areaSolicitante}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Líder Responsable:</span>
                      <span className="text-slate-800 block">{selectedRecord.liderResponsable}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Tipo de IA propuesta:</span>
                      <span className="text-slate-800 block">
                        {Array.isArray(selectedRecord.tipoIa) ? selectedRecord.tipoIa.join(', ') : (selectedRecord.tipoIa || 'N/A')} {selectedRecord.otroTipoIa && `(${selectedRecord.otroTipoIa})`}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sections details */}
              <div className="space-y-4 font-semibold text-slate-700">
                
                {/* B. Need */}
                <div className="p-4 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-sky-950 mb-2 border-b border-slate-100 pb-1 uppercase">B. Descripción y Contexto de la Necesidad</h4>
                  <div className="space-y-2.5">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Problema o Necesidad:</span>
                      <p className="text-slate-800 font-medium leading-relaxed">{selectedRecord.problema}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Objetivo del Proyecto:</span>
                      <p className="text-slate-800 font-medium leading-relaxed">{selectedRecord.objetivo}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Proceso o Servicio Impactado:</span>
                      <p className="text-slate-800">{selectedRecord.procesoImpactado}</p>
                    </div>
                  </div>
                </div>

                {/* C. Herramienta */}
                <div className="p-4 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-sky-950 mb-2 border-b border-slate-100 pb-1 uppercase">C. Herramienta y Proveedor Propuesto</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Herramienta o Proveedor:</span>
                      <p className="text-slate-800 font-medium">{selectedRecord.herramientaSugerida}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Estado de la Herramienta:</span>
                      <p className="text-slate-800 font-medium">{selectedRecord.estadoHerramienta} {selectedRecord.descripcionEvaluacion && `(${selectedRecord.descripcionEvaluacion})`}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-[10px] text-slate-400 block font-medium">Soportes Anexos Disponibles:</span>
                      <p className="text-slate-800 font-medium">{selectedRecord.soportesAnexos || 'Ninguno reportado.'}</p>
                    </div>
                    {selectedRecord.linkHerramienta && (
                      <div className="sm:col-span-2 mt-2 bg-sky-50 border border-sky-100 p-2.5 rounded-lg flex items-center justify-between">
                        <div>
                          <span className="text-[10px] text-sky-950 block font-bold uppercase">Enlace a la Herramienta / Tablero:</span>
                          <span className="text-sky-900 font-medium truncate max-w-lg block text-xs">{selectedRecord.linkHerramienta}</span>
                        </div>
                        <a 
                          href={selectedRecord.linkHerramienta} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="bg-sky-900 text-white hover:bg-sky-950 font-bold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 cursor-pointer text-[10px] whitespace-nowrap"
                        >
                          Abrir Enlace <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* D. Datos */}
                <div className="p-4 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-sky-950 mb-2 border-b border-slate-100 pb-1 uppercase">D. Datos e Integración Tecnológica</h4>
                  <div className="space-y-2.5">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Datos Utilizados por la Herramienta:</span>
                      <p className="text-slate-800 font-medium leading-relaxed">{selectedRecord.datosUtilizados}</p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                      <div className="p-2 rounded-lg bg-slate-50 border">
                        <span className="text-slate-400 block">¿Datos de Pacientes?</span>
                        <strong className="text-slate-800 text-xs">{selectedRecord.incluyeDatosPacientes}</strong>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 border">
                        <span className="text-slate-400 block">¿Datos Sensibles (L1581)?</span>
                        <strong className="text-slate-800 text-xs">{selectedRecord.incluyeDatosSensibles}</strong>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 border">
                        <span className="text-slate-400 block">¿Requiere Integración?</span>
                        <strong className="text-slate-800 text-xs">{selectedRecord.requiereIntegracion}</strong>
                      </div>
                    </div>
                    {selectedRecord.requiereIntegracion === 'Sí' && (
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Sistemas Integración:</span>
                        <p className="text-slate-800">{selectedRecord.sistemasIntegracion}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* E & F. Impact & Pilot */}
                <div className="p-4 rounded-xl border border-slate-200">
                  <h4 className="font-bold text-sky-950 mb-2 border-b border-slate-100 pb-1 uppercase">E. Impacto, Beneficios y Plan Piloto</h4>
                  <div className="space-y-2.5">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Usuarios Destinatarios:</span>
                      <p className="text-slate-800">{selectedRecord.usuarios}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Beneficios Esperados:</span>
                      <p className="text-slate-800 font-medium leading-relaxed">{selectedRecord.beneficios}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-medium">Indicadores de Éxito:</span>
                      <p className="text-slate-800 font-medium leading-relaxed">{selectedRecord.indicadores}</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Riesgos Identificados:</span>
                        <p className="text-slate-800 font-medium leading-relaxed">{selectedRecord.riesgos}</p>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">Costo Inversión Estimado:</span>
                        <p className="text-slate-800 font-medium">{selectedRecord.costoEstimado}</p>
                      </div>
                    </div>
                    <div className="pt-2">
                      <span className="text-[10px] text-slate-400 block font-medium">Propuesta de Plan Piloto Controlado:</span>
                      <p className="text-slate-800 font-medium leading-relaxed">{selectedRecord.propuestaPlanPiloto}</p>
                    </div>
                  </div>
                </div>

                {/* G. Riesgos dimensiones */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/50">
                  <h4 className="font-bold text-sky-950 mb-2 border-b border-slate-200 pb-1 uppercase">G. Detalle Escala de Riesgos (Total: {selectedRecord.puntajeTotal}/15)</h4>
                  <div className="space-y-2 text-[11px] font-semibold text-slate-700">
                    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-1">
                      <div>
                        <p className="text-slate-900 font-bold">D1. Impacto en atención al paciente</p>
                        <p className="text-[10px] text-slate-500 font-medium">{selectedRecord.justificacionD1}</p>
                      </div>
                      <span className="bg-sky-900 text-white font-bold px-2 py-0.5 rounded text-xs shrink-0">{selectedRecord.puntajeD1}</span>
                    </div>
                    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-1">
                      <div>
                        <p className="text-slate-900 font-bold">D2. Tipo de dato involucrado</p>
                        <p className="text-[10px] text-slate-500 font-medium">{selectedRecord.justificacionD2}</p>
                      </div>
                      <span className="bg-sky-900 text-white font-bold px-2 py-0.5 rounded text-xs shrink-0">{selectedRecord.puntajeD2}</span>
                    </div>
                    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-1">
                      <div>
                        <p className="text-slate-900 font-bold">D3. Alcance institucional</p>
                        <p className="text-[10px] text-slate-500 font-medium">{selectedRecord.justificacionD3}</p>
                      </div>
                      <span className="bg-sky-900 text-white font-bold px-2 py-0.5 rounded text-xs shrink-0">{selectedRecord.puntajeD3}</span>
                    </div>
                    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-1">
                      <div>
                        <p className="text-slate-900 font-bold">D4. Implicaciones tecnológicas / contractuales</p>
                        <p className="text-[10px] text-slate-500 font-medium">{selectedRecord.justificacionD4}</p>
                      </div>
                      <span className="bg-sky-900 text-white font-bold px-2 py-0.5 rounded text-xs shrink-0">{selectedRecord.puntajeD4}</span>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-slate-900 font-bold">D5. Riesgo ético, normativo o reputacional</p>
                        <p className="text-[10px] text-slate-500 font-medium">{selectedRecord.justificacionD5}</p>
                      </div>
                      <span className="bg-sky-900 text-white font-bold px-2 py-0.5 rounded text-xs shrink-0">{selectedRecord.puntajeD5}</span>
                    </div>
                  </div>
                </div>

                {/* Documents attachments from Drive */}
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
                  <h4 className="font-bold text-sky-950 mb-3 inline-flex items-center gap-1.5 uppercase">
                    <FolderOpen className="h-4 w-4 text-sky-900" /> Documentos de Soporte Subidos en Google Drive
                  </h4>
                  
                  {selectedRecord.nombresDocumentosAnexos && selectedRecord.nombresDocumentosAnexos.length > 0 ? (
                    <div className="space-y-2">
                      {selectedRecord.nombresDocumentosAnexos.map((name, i) => {
                        const link = selectedRecord.urlsDocumentosAnexos?.[i] || '#';
                        return (
                          <div key={i} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors">
                            <span className="font-bold text-slate-700 truncate inline-flex items-center gap-1.5 max-w-md">
                              <FileText className="h-4 w-4 text-sky-900 shrink-0" /> {name}
                            </span>
                            <a 
                              href={link} 
                              target="_blank" 
                              rel="noreferrer"
                              className="text-sky-900 hover:underline font-bold text-[10px] inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              Descargar / Ver <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        );
                      })}
                      
                      <a 
                        href="https://drive.google.com/drive/folders/1dQ3LYezaW-GaRQSkFTenmlXTQk-Lg1-i?usp=sharing" 
                        target="_blank" 
                        rel="noreferrer"
                        className="mt-3 block text-center p-2.5 bg-sky-50 hover:bg-sky-100 border border-sky-100 rounded-xl text-sky-950 font-bold transition-all text-[10px] cursor-pointer"
                      >
                        Ver Carpeta Individual del Solicitante en Drive
                      </a>
                    </div>
                  ) : (
                    <div className="text-center py-4 border border-slate-100 rounded-xl text-slate-400 font-medium">
                      El solicitante no adjuntó documentos anexos para este registro.
                    </div>
                  )}
                </div>

              </div>

              {/* COMMITTEE MULTI-USER APPROVAL WORKFLOW SECTION */}
              {(() => {
                const wf = getWorkflowStatus(selectedRecord);
                const ev = selectedRecord.evaluaciones || {};

                return (
                  <div className={`rounded-2xl p-6 md:p-7 space-y-5 border transition-all ${
                    wf.isAllApproved 
                      ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-400' 
                      : wf.isAnyRejected
                      ? 'bg-rose-50/60 border-rose-300'
                      : 'bg-white border-slate-200 shadow-sm'
                  }`}>
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
                      <div className="flex items-center gap-2.5">
                        <ShieldCheck className="h-5 w-5 text-sky-900" />
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">
                            Matriz de Calificación Institucional y Gobernanza
                          </h4>
                          <p className="text-[10px] text-slate-500 font-medium">
                            Comité Multidisciplinario • Sistema de validación secuencial por pasos
                          </p>
                        </div>
                      </div>

                      {/* Overall badge */}
                      {wf.isAllApproved ? (
                        <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-600 text-white shadow-xs inline-flex items-center gap-1.5">
                          <CheckCheck className="h-4 w-4" /> INICIATIVA APROBADA (6/6)
                        </span>
                      ) : wf.isAnyRejected ? (
                        <span className="px-3 py-1 rounded-full text-xs font-black bg-rose-600 text-white shadow-xs inline-flex items-center gap-1.5">
                          <XCircle className="h-4 w-4" /> INICIATIVA RECHAZADA
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 inline-flex items-center gap-1.5">
                          <Clock className="h-4 w-4 text-amber-600" /> EN PROCESO ({wf.validatedCount}/6 Validados)
                        </span>
                      )}
                    </div>

                    {/* Step Cards Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      
                      {/* CARD 1: PASO 1 - PROTECCIÓN DE DATO */}
                      <div className={`p-4 rounded-xl border space-y-3 transition-all ${
                        wf.isStep1Valid 
                          ? 'bg-emerald-50/90 border-emerald-300 shadow-2xs' 
                          : wf.isStep1Rejected
                          ? 'bg-rose-50/80 border-rose-300'
                          : 'bg-slate-50/80 border-slate-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-cyan-100 text-cyan-900 border border-cyan-200">
                            Paso 1
                          </span>
                          <span className="text-[10px] text-slate-500 font-bold">adminsistem</span>
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-slate-900">Protección de Dato</h5>
                          <p className="text-[10px] text-slate-500">Evaluación de datos sensibles y privacidad Ley 1581</p>
                        </div>

                        {/* Status & Action */}
                        <div className="pt-1 flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-slate-500 font-medium">Estado:</span>
                            {ev.proteccionDato?.estado === 'Validado' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white inline-flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" /> Validado
                              </span>
                            ) : ev.proteccionDato?.estado === 'Rechazado' ? (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-600 text-white inline-flex items-center gap-1">
                                <XCircle className="h-3 w-3" /> Rechazado
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center gap-1">
                                <Clock className="h-3 w-3 text-amber-500" /> Pendiente
                              </span>
                            )}
                          </div>

                          {/* Interactive control if user is adminsistem or admin */}
                          {canUserEvaluateField(currentUser || null, 'proteccionDato', wf).canEdit && (
                            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between gap-2">
                              <span className="text-[10px] font-bold text-slate-700">Tu dictamen:</span>
                              <select
                                value={ev.proteccionDato?.estado || 'Pendiente'}
                                onChange={(e) => handleUpdateEvaluation(selectedRecord, 'proteccionDato', e.target.value as EvaluacionEstado)}
                                className="px-2 py-1 text-xs font-bold rounded-lg border bg-white cursor-pointer focus:ring-2 focus:ring-sky-200"
                              >
                                <option value="Pendiente">Pendiente</option>
                                <option value="Validado">Validado</option>
                                <option value="Rechazado">Rechazado</option>
                              </select>
                            </div>
                          )}

                          {ev.proteccionDato?.fecha && (
                            <span className="text-[9px] text-slate-400 block text-right">
                              Registrado: {ev.proteccionDato.fecha}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* CARD 2: PASO 2 - GOBIERNO Y CALIDAD DEL DATO */}
                      <div className={`p-4 rounded-xl border space-y-3 transition-all ${
                        !wf.isStep2Unlocked
                          ? 'bg-slate-100/60 border-slate-200 opacity-70'
                          : wf.isStep2Valid
                          ? 'bg-emerald-50/90 border-emerald-300 shadow-2xs'
                          : wf.isStep2Rejected
                          ? 'bg-rose-50/80 border-rose-300'
                          : 'bg-slate-50/80 border-slate-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-900 border border-indigo-200">
                            Paso 2
                          </span>
                          {!wf.isStep2Unlocked && (
                            <span className="text-[10px] text-amber-700 font-bold inline-flex items-center gap-1">
                              <Lock className="h-3 w-3" /> Requiere Paso 1
                            </span>
                          )}
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-slate-900">Gobierno y Calidad del Dato</h5>
                          <p className="text-[10px] text-slate-500">Evaluado por adminsistem y estadmin</p>
                        </div>

                        {/* Sub-evaluators */}
                        <div className="space-y-2 pt-1">
                          
                          {/* 2.1 adminsistem */}
                          <div className="p-2 bg-white rounded-lg border border-slate-200/80 space-y-1 text-[11px]">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800">adminsistem (Gobierno):</span>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                ev.gobiernoSistemas?.estado === 'Validado' ? 'bg-emerald-100 text-emerald-800' : ev.gobiernoSistemas?.estado === 'Rechazado' ? 'bg-rose-100 text-rose-800' : 'bg-amber-50 text-amber-800'
                              }`}>
                                {ev.gobiernoSistemas?.estado || 'Pendiente'}
                              </span>
                            </div>
                            {canUserEvaluateField(currentUser || null, 'gobiernoSistemas', wf).canEdit && (
                              <div className="pt-1 flex items-center justify-between">
                                <span className="text-[9px] text-slate-500">Calificar:</span>
                                <select
                                  value={ev.gobiernoSistemas?.estado || 'Pendiente'}
                                  onChange={(e) => handleUpdateEvaluation(selectedRecord, 'gobiernoSistemas', e.target.value as EvaluacionEstado)}
                                  className="px-2 py-0.5 text-[10px] font-bold rounded border bg-white"
                                >
                                  <option value="Pendiente">Pendiente</option>
                                  <option value="Validado">Validado</option>
                                  <option value="Rechazado">Rechazado</option>
                                </select>
                              </div>
                            )}
                          </div>

                          {/* 2.2 estadmin */}
                          <div className="p-2 bg-white rounded-lg border border-slate-200/80 space-y-1 text-[11px]">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800">estadmin (Calidad):</span>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                ev.gobiernoEstadistica?.estado === 'Validado' ? 'bg-emerald-100 text-emerald-800' : ev.gobiernoEstadistica?.estado === 'Rechazado' ? 'bg-rose-100 text-rose-800' : 'bg-amber-50 text-amber-800'
                              }`}>
                                {ev.gobiernoEstadistica?.estado || 'Pendiente'}
                              </span>
                            </div>
                            {canUserEvaluateField(currentUser || null, 'gobiernoEstadistica', wf).canEdit && (
                              <div className="pt-1 flex items-center justify-between">
                                <span className="text-[9px] text-slate-500">Calificar:</span>
                                <select
                                  value={ev.gobiernoEstadistica?.estado || 'Pendiente'}
                                  onChange={(e) => handleUpdateEvaluation(selectedRecord, 'gobiernoEstadistica', e.target.value as EvaluacionEstado)}
                                  className="px-2 py-0.5 text-[10px] font-bold rounded border bg-white"
                                >
                                  <option value="Pendiente">Pendiente</option>
                                  <option value="Validado">Validado</option>
                                  <option value="Rechazado">Rechazado</option>
                                </select>
                              </div>
                            )}
                          </div>

                        </div>
                      </div>

                      {/* CARD 3: PASO 3 - VALIDACIÓN FINAL */}
                      <div className={`p-4 rounded-xl border space-y-3 transition-all ${
                        !wf.isStep3Unlocked
                          ? 'bg-slate-100/60 border-slate-200 opacity-70'
                          : wf.isStep3Valid
                          ? 'bg-emerald-50/90 border-emerald-300 shadow-2xs'
                          : wf.isStep3Rejected
                          ? 'bg-rose-50/80 border-rose-300'
                          : 'bg-slate-50/80 border-slate-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-200">
                            Paso 3
                          </span>
                          {!wf.isStep3Unlocked && (
                            <span className="text-[10px] text-amber-700 font-bold inline-flex items-center gap-1">
                              <Lock className="h-3 w-3" /> Requiere Paso 2
                            </span>
                          )}
                        </div>
                        <div>
                          <h5 className="text-xs font-bold text-slate-900">Validación Final</h5>
                          <p className="text-[10px] text-slate-500">Evaluado por geradmin, planadmin y admin</p>
                        </div>

                        {/* Sub-evaluators */}
                        <div className="space-y-2 pt-1">
                          
                          {/* 3.1 geradmin */}
                          <div className="p-2 bg-white rounded-lg border border-slate-200/80 space-y-1 text-[11px]">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800">geradmin (Gerencia):</span>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                ev.validacionGerencia?.estado === 'Validado' ? 'bg-emerald-100 text-emerald-800' : ev.validacionGerencia?.estado === 'Rechazado' ? 'bg-rose-100 text-rose-800' : 'bg-amber-50 text-amber-800'
                              }`}>
                                {ev.validacionGerencia?.estado || 'Pendiente'}
                              </span>
                            </div>
                            {canUserEvaluateField(currentUser || null, 'validacionGerencia', wf).canEdit && (
                              <div className="pt-1 flex items-center justify-between">
                                <span className="text-[9px] text-slate-500">Calificar:</span>
                                <select
                                  value={ev.validacionGerencia?.estado || 'Pendiente'}
                                  onChange={(e) => handleUpdateEvaluation(selectedRecord, 'validacionGerencia', e.target.value as EvaluacionEstado)}
                                  className="px-2 py-0.5 text-[10px] font-bold rounded border bg-white"
                                >
                                  <option value="Pendiente">Pendiente</option>
                                  <option value="Validado">Validado</option>
                                  <option value="Rechazado">Rechazado</option>
                                </select>
                              </div>
                            )}
                          </div>

                          {/* 3.2 planadmin */}
                          <div className="p-2 bg-white rounded-lg border border-slate-200/80 space-y-1 text-[11px]">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800">planadmin (Planeación):</span>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                ev.validacionPlaneacion?.estado === 'Validado' ? 'bg-emerald-100 text-emerald-800' : ev.validacionPlaneacion?.estado === 'Rechazado' ? 'bg-rose-100 text-rose-800' : 'bg-amber-50 text-amber-800'
                              }`}>
                                {ev.validacionPlaneacion?.estado || 'Pendiente'}
                              </span>
                            </div>
                            {canUserEvaluateField(currentUser || null, 'validacionPlaneacion', wf).canEdit && (
                              <div className="pt-1 flex items-center justify-between">
                                <span className="text-[9px] text-slate-500">Calificar:</span>
                                <select
                                  value={ev.validacionPlaneacion?.estado || 'Pendiente'}
                                  onChange={(e) => handleUpdateEvaluation(selectedRecord, 'validacionPlaneacion', e.target.value as EvaluacionEstado)}
                                  className="px-2 py-0.5 text-[10px] font-bold rounded border bg-white"
                                >
                                  <option value="Pendiente">Pendiente</option>
                                  <option value="Validado">Validado</option>
                                  <option value="Rechazado">Rechazado</option>
                                </select>
                              </div>
                            )}
                          </div>

                          {/* 3.3 admin */}
                          <div className="p-2 bg-white rounded-lg border border-slate-200/80 space-y-1 text-[11px]">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800">admin (Admin General):</span>
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                ev.validacionAdmin?.estado === 'Validado' ? 'bg-emerald-100 text-emerald-800' : ev.validacionAdmin?.estado === 'Rechazado' ? 'bg-rose-100 text-rose-800' : 'bg-amber-50 text-amber-800'
                              }`}>
                                {ev.validacionAdmin?.estado || 'Pendiente'}
                              </span>
                            </div>
                            {canUserEvaluateField(currentUser || null, 'validacionAdmin', wf).canEdit && (
                              <div className="pt-1 flex items-center justify-between">
                                <span className="text-[9px] text-slate-500">Calificar:</span>
                                <select
                                  value={ev.validacionAdmin?.estado || 'Pendiente'}
                                  onChange={(e) => handleUpdateEvaluation(selectedRecord, 'validacionAdmin', e.target.value as EvaluacionEstado)}
                                  className="px-2 py-0.5 text-[10px] font-bold rounded border bg-white"
                                >
                                  <option value="Pendiente">Pendiente</option>
                                  <option value="Validado">Validado</option>
                                  <option value="Rechazado">Rechazado</option>
                                </select>
                              </div>
                            )}
                          </div>

                        </div>
                      </div>

                    </div>
                  </div>
                );
              })()}

              {/* ADMINISTRATIVE EDIT AREA */}
              <div className="bg-amber-50/55 border border-amber-200/70 rounded-2xl p-6 md:p-8 space-y-5">
                <div className="flex items-center gap-2.5 border-b border-amber-200 pb-3">
                  <Settings className="h-5.5 w-5.5 text-sky-900" />
                  <h4 className="text-sm font-bold text-slate-900">Módulo de Revisión y Gestión del AI Product Owner</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Status revision drop */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Estado de la Revisión</label>
                    <select
                      value={adminStatus}
                      onChange={(e) => setAdminStatus(e.target.value as any)}
                      className="w-full px-4 py-2 text-xs border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-100 bg-white font-semibold text-slate-800"
                    >
                      <option value="Recibido">Recibido</option>
                      <option value="En revisión">En revisión</option>
                      <option value="Requiere ajustes">Requiere ajustes</option>
                      <option value="Aprobado para Comité de Innovación">Aprobado para Comité de Innovación</option>
                      <option value="Aprobado para piloto">Aprobado para piloto</option>
                      <option value="No aprobado">No aprobado</option>
                      <option value="Cerrado">Cerrado</option>
                    </select>
                  </div>

                  {/* Reviewer text */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Responsable de Revisión</label>
                    <input 
                      type="text"
                      value={adminReviewer}
                      onChange={(e) => setAdminReviewer(e.target.value)}
                      placeholder="Nombre o cargo del responsable"
                      className="w-full px-4 py-2 text-xs border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-100 bg-white font-semibold text-slate-800"
                    />
                  </div>

                </div>

                {/* Comments text */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Observaciones Administrativas / Dictamen del AI Product Owner</label>
                  <textarea
                    rows={4}
                    value={adminComments}
                    onChange={(e) => setAdminComments(e.target.value)}
                    placeholder="Escriba aquí el dictamen técnico, directrices, requerimientos del comité o actas..."
                    className="w-full px-4 py-2.5 text-xs border border-amber-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-100 bg-white font-semibold text-slate-800"
                  />
                </div>

                {/* Save button administrative */}
                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    onClick={() => handleSaveAdminFields()}
                    className="px-6 py-2.5 bg-sky-900 hover:bg-sky-950 text-white font-bold text-xs rounded-xl shadow-md inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Save className="h-3.5 w-3.5" /> Registrar Dictamen de Revisión
                  </button>
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap justify-between items-center gap-3 shrink-0">
              <button
                onClick={() => {
                  setRecordToDelete(selectedRecord);
                  setSelectedRecord(null);
                }}
                className="px-4 py-2 text-xs font-bold text-red-600 bg-red-50 border border-red-100 hover:bg-red-100 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5"
              >
                <Trash2 className="h-3.5 w-3.5" /> Eliminar Iniciativa
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportSingleRecordPDF(selectedRecord)}
                  className="px-4 py-2 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-xl transition-all shadow-md cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" /> Descargar Ficha PDF
                </button>
                <button 
                  onClick={() => setSelectedRecord(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cerrar Ventana
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* DELETION CONFIRMATION DIALOG OVERLAY */}
      {recordToDelete && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full p-6 space-y-5"
          >
            <div className="flex items-start gap-4">
              <div className="bg-red-50 text-red-600 p-3 rounded-2xl">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black text-slate-900">¿Eliminar Iniciativa de Forma Permanente?</h3>
                <p className="text-xs text-slate-500 font-semibold">Esta acción no se puede deshacer.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-semibold">
              ¿Está absolutamente seguro de que desea eliminar permanentemente la iniciativa <strong className="text-slate-900">"{recordToDelete.nombreIniciativa}"</strong> con radicado <strong className="text-sky-950">{recordToDelete.radicado}</strong>? Se borrará por completo de la base de datos de Firestore.
            </p>

            <div className="flex gap-3 justify-end text-xs font-bold">
              <button
                onClick={() => setRecordToDelete(null)}
                className="px-4 py-2.5 text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onDeleteRecord(recordToDelete.radicado);
                  setRecordToDelete(null);
                }}
                className="px-5 py-2.5 text-white bg-red-600 hover:bg-red-700 rounded-xl transition-all shadow-md cursor-pointer inline-flex items-center gap-1.5"
              >
                <Trash2 className="h-4 w-4" /> Sí, eliminar para siempre
              </button>
            </div>
          </motion.div>
        </div>
      )}

    </div>
  );
}
