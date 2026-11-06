/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  User, Info, ArrowRight, ArrowLeft, Upload, FileText, CheckCircle, AlertTriangle, Database, Activity, ShieldAlert, Eye, BarChart2, AlertCircle, Download
} from 'lucide-react';
import { IniciativaRecord } from '../types';

interface FormRegistradorProps {
  onBackToHome: () => void;
  onSubmitRecord: (record: IniciativaRecord) => void;
  nextRadicado: string;
  isBI: boolean;
}

export default function FormRegistrador({ onBackToHome, onSubmitRecord, nextRadicado, isBI }: FormRegistradorProps) {
  // Step tracker: 1 = Personal Data, 2 = Main Instrument, 3 = Attachments, 4 = Success
  const [step, setStep] = useState<1 | 2 | 3 | 4>(() => {
    const cached = localStorage.getItem(isBI ? 'hila_draft_step_bi' : 'hila_draft_step_ia');
    if (cached) {
      const parsed = parseInt(cached);
      if (parsed === 1 || parsed === 2 || parsed === 3) {
        return parsed as 1 | 2 | 3;
      }
    }
    return 1;
  });

  // Form State - Personal Data
  const [personalData, setPersonalData] = useState(() => {
    const cached = localStorage.getItem(isBI ? 'hila_draft_personal_bi' : 'hila_draft_personal_ia');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        // ignore
      }
    }
    return {
      nombreCompleto: '',
      cedula: '',
      correo: isBI ? 'crizdg11@gmail.com' : '',
      areaServicio: isBI ? 'Dirección General' : '',
      fechaRegistro: '2026-07-17' // July 17th, 2026
    };
  });

  // Errors for Step 1
  const [errorsStep1, setErrorsStep1] = useState<Record<string, string>>({});

  // Form State - Main Instrument (Combined for IA and BI)
  const [mainForm, setMainForm] = useState(() => {
    const cached = localStorage.getItem(isBI ? 'hila_draft_main_bi' : 'hila_draft_main_ia');
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        // ignore
      }
    }
    return {
      nombreIniciativa: '',
      areaSolicitante: '',
      liderResponsable: '',
      problema: '',
      objetivo: '',
      procesoImpactado: '',
      tipoIa: [] as string[],
      otroTipoIa: '',
      herramientaSugerida: isBI ? 'Power BI / Data Studio' : '',
      estadoHerramienta: 'Herramienta nueva sin evaluación previa',
      descripcionEvaluacion: '',
      soportesAnexos: '',
      datosUtilizados: '',
      incluyeDatosPacientes: 'No' as 'Sí' | 'No',
      incluyeDatosSensibles: 'No' as 'Sí' | 'No' | 'No estoy seguro/a',
      requiereIntegracion: 'No' as 'Sí' | 'No',
      sistemasIntegracion: '',
      usuarios: '',
      beneficios: '',
      indicadores: '',
      riesgos: '',
      costoEstimado: '',
      propuestaPlanPiloto: '',
      linkHerramienta: '',
      
      // BI specific fields
      alcanceBI: '',
      fuentesDatosBI: '',
      funcionalidadesBI: '',
      disenoVisualBI: '',
      integracionIaBI: '',
      criteriosExitoBI: '',
      limitacionesRiesgosBI: '',

      // Risk Scale (IA only)
      justificacionD1: '',
      puntajeD1: 0,
      justificacionD2: '',
      puntajeD2: 0,
      justificacionD3: '',
      puntajeD3: 0,
      justificacionD4: '',
      puntajeD4: 0,
      justificacionD5: '',
      puntajeD5: 0
    };
  });

  // Auto-save form progress to localStorage
  React.useEffect(() => {
    if (step < 4) {
      localStorage.setItem(isBI ? 'hila_draft_step_bi' : 'hila_draft_step_ia', String(step));
    }
  }, [step, isBI]);

  React.useEffect(() => {
    localStorage.setItem(isBI ? 'hila_draft_personal_bi' : 'hila_draft_personal_ia', JSON.stringify(personalData));
  }, [personalData, isBI]);

  React.useEffect(() => {
    localStorage.setItem(isBI ? 'hila_draft_main_bi' : 'hila_draft_main_ia', JSON.stringify(mainForm));
  }, [mainForm, isBI]);

  const handleCancel = () => {
    if (confirm("¿Está seguro que desea cancelar el registro? Se perderán todos los datos diligenciados.")) {
      localStorage.removeItem(isBI ? 'hila_draft_personal_bi' : 'hila_draft_personal_ia');
      localStorage.removeItem(isBI ? 'hila_draft_main_bi' : 'hila_draft_main_ia');
      localStorage.removeItem(isBI ? 'hila_draft_step_bi' : 'hila_draft_step_ia');
      onBackToHome();
    }
  };

  // Errors for Step 2
  const [errorsStep2, setErrorsStep2] = useState<Record<string, string>>({});

  // Attachments State
  const [attachments, setAttachments] = useState<{
    metodologia: File | null;
    funcionalidad: File | null;
    soportes: File | null;
  }>({
    metodologia: null,
    funcionalidad: null,
    soportes: null
  });

  const [attachedNames, setAttachedNames] = useState({
    metodologia: '',
    funcionalidad: '',
    soportes: ''
  });

  // Calculated variables
  const puntajeTotal = mainForm.puntajeD1 + mainForm.puntajeD2 + mainForm.puntajeD3 + mainForm.puntajeD4 + mainForm.puntajeD5;
  const flowType = puntajeTotal >= 9 
    ? {
        code: 'Flujo A — IAI',
        fullName: 'Flujo A — IAI: Alto impacto, aprobación Comité + Gerencia',
        level: 'Alto impacto / riesgo alto',
        colorText: 'text-rose-700 bg-rose-50 border-rose-200',
        colorBadge: 'bg-rose-100 text-rose-800',
        recommendation: 'Requiere revisión detallada por el AI Product Owner, dictamen de viabilidad de TI, seguridad informática y presentación formal ante el Comité de Innovación + Gerencia para su aprobación.'
      }
    : {
        code: 'Flujo B — CUIA',
        fullName: 'Flujo B — CUIA: Impacto bajo/moderado, validación Data Owner',
        level: 'Impacto bajo / moderado',
        colorText: 'text-sky-700 bg-sky-50 border-sky-200',
        colorBadge: 'bg-sky-100 text-sky-800',
        recommendation: 'Requiere validación del Data Owner (líder del área solicitante) y aprobación técnica simplificada por el AI Product Owner para registro directo en el banco institucional.'
      };

  // Validation functions
  const validateStep1 = () => {
    const errs: Record<string, string> = {};
    if (!personalData.nombreCompleto.trim()) errs.nombreCompleto = 'El nombre completo es obligatorio.';
    if (!personalData.cedula.trim()) {
      errs.cedula = 'La cédula es obligatoria.';
    } else if (!/^\d+$/.test(personalData.cedula)) {
      errs.cedula = 'La cédula solo debe contener números.';
    }
    if (!personalData.correo.trim()) {
      errs.correo = 'El correo electrónico es obligatorio.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personalData.correo)) {
      errs.correo = 'Formato de correo electrónico no válido.';
    }
    if (!personalData.areaServicio.trim()) errs.areaServicio = 'El área o servicio es obligatorio.';
    if (!personalData.fechaRegistro) errs.fechaRegistro = 'Debe seleccionar una fecha de registro.';

    setErrorsStep1(errs);
    return Object.keys(errs).length === 0;
  };

  const getStep2Errors = () => {
    const errs: Record<string, string> = {};
    if (isBI) {
      if (!mainForm.nombreIniciativa.trim()) errs.nombreIniciativa = 'El nombre de la iniciativa de BI es obligatorio.';
      if (!mainForm.areaSolicitante.trim()) errs.areaSolicitante = 'El área solicitante es obligatoria.';
      if (!mainForm.liderResponsable.trim()) errs.liderResponsable = 'El líder responsable o Data Owner es obligatorio.';
      if (!mainForm.problema.trim()) errs.problema = 'Debe describir el problema o necesidad.';
      if (!mainForm.objetivo.trim()) errs.objetivo = 'Debe definir el objetivo del proyecto.';
      if (!mainForm.procesoImpactado.trim()) errs.procesoImpactado = 'Debe identificar el proceso o servicio impactado.';
      
      // BI specific validations
      if (!mainForm.alcanceBI.trim()) errs.alcanceBI = 'El alcance e indicadores de BI son obligatorios.';
      if (!mainForm.fuentesDatosBI.trim()) errs.fuentesDatosBI = 'Las fuentes de datos son obligatorias.';
      if (!mainForm.funcionalidadesBI.trim()) errs.funcionalidadesBI = 'Las funcionalidades clave son obligatorias.';
      if (!mainForm.disenoVisualBI.trim()) errs.disenoVisualBI = 'El diseño visual e institucional es obligatorio.';
      if (!mainForm.integracionIaBI.trim()) errs.integracionIaBI = 'La descripción de integración con IA es obligatoria.';
      if (!mainForm.criteriosExitoBI.trim()) errs.criteriosExitoBI = 'Los criterios de éxito son obligatorios.';
      if (!mainForm.limitacionesRiesgosBI.trim()) errs.limitacionesRiesgosBI = 'Las limitaciones y riesgos son obligatorios.';
    } else {
      if (!mainForm.nombreIniciativa.trim()) errs.nombreIniciativa = 'El nombre de la iniciativa de IA es obligatorio.';
      if (!mainForm.areaSolicitante.trim()) errs.areaSolicitante = 'El área solicitante es obligatoria.';
      if (!mainForm.liderResponsable.trim()) errs.liderResponsable = 'El líder responsable o Data Owner es obligatorio.';
      if (mainForm.tipoIa.length === 0) errs.tipoIa = 'Debe seleccionar al menos un tipo de Inteligencia Artificial.';
      if (mainForm.tipoIa.includes('Otra') && !mainForm.otroTipoIa.trim()) {
        errs.otroTipoIa = 'Especifique el otro tipo de IA propuesta.';
      }
      if (!mainForm.problema.trim()) errs.problema = 'Debe describir el problema o necesidad.';
      if (!mainForm.objetivo.trim()) errs.objetivo = 'Debe definir el objetivo del proyecto.';
      if (!mainForm.procesoImpactado.trim()) errs.procesoImpactado = 'Debe identificar el proceso o servicio impactado.';
      if (!mainForm.herramientaSugerida.trim()) errs.herramientaSugerida = 'Este campo es obligatorio.';
      if (mainForm.estadoHerramienta === 'En evaluación' && !mainForm.descripcionEvaluacion.trim()) {
        errs.descripcionEvaluacion = 'Describa el estado actual de la evaluación.';
      }
      if (!mainForm.datosUtilizados.trim()) errs.datosUtilizados = 'Describa los datos que procesará la herramienta.';
      if (!mainForm.usuarios.trim()) errs.usuarios = 'Indique quiénes utilizarán la herramienta.';
      if (!mainForm.beneficios.trim()) errs.beneficios = 'Escriba los beneficios esperados.';
      if (!mainForm.riesgos.trim()) errs.riesgos = 'Establezca los riesgos identificados preliminarmente.';
      if (!mainForm.costoEstimado.trim()) errs.costoEstimado = 'Escriba la estimación de costos.';

      // Risk validation
      if (!mainForm.justificacionD1.trim()) errs.justificacionD1 = 'Justifique el puntaje asignado para D1.';
      if (!mainForm.justificacionD2.trim()) errs.justificacionD2 = 'Justifique el puntaje asignado para D2.';
      if (!mainForm.justificacionD3.trim()) errs.justificacionD3 = 'Justifique el puntaje asignado para D3.';
      if (!mainForm.justificacionD4.trim()) errs.justificacionD4 = 'Justifique el puntaje asignado para D4.';
      if (!mainForm.justificacionD5.trim()) errs.justificacionD5 = 'Justifique el puntaje asignado para D5.';
    }
    return errs;
  };

  const validateStep2 = () => {
    const errs = getStep2Errors();
    setErrorsStep2(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNextStep1 = () => {
    if (validateStep1()) {
      // prefill fields in main form
      setMainForm(prev => ({
        ...prev,
        areaSolicitante: prev.areaSolicitante || personalData.areaServicio,
        liderResponsable: prev.liderResponsable || personalData.nombreCompleto
      }));
      setStep(2);
      window.scrollTo(0, 0);
    }
  };

  const handleNextStep2 = () => {
    const errs = getStep2Errors();
    setErrorsStep2(errs);

    if (Object.keys(errs).length === 0) {
      setStep(3);
      window.scrollTo(0, 0);
    } else {
      // scroll to first error
      const firstErrorKey = Object.keys(errs)[0];
      setTimeout(() => {
        const element = document.getElementById(`error-container-${firstErrorKey}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);
    }
  };

  const handleFileChange = (slot: 'metodologia' | 'funcionalidad' | 'soportes', file: File | null) => {
    if (file) {
      setAttachments(prev => ({ ...prev, [slot]: file }));
      setAttachedNames(prev => ({ ...prev, [slot]: file.name }));
    } else {
      setAttachments(prev => ({ ...prev, [slot]: null }));
      setAttachedNames(prev => ({ ...prev, [slot]: '' }));
    }
  };

  const handleCheckboxChange = (value: string) => {
    setMainForm(prev => {
      const exists = prev.tipoIa.includes(value);
      if (exists) {
        return { ...prev, tipoIa: prev.tipoIa.filter(v => v !== value) };
      } else {
        return { ...prev, tipoIa: [...prev.tipoIa, value] };
      }
    });
  };

  const handleFormSubmit = () => {
    // build completed record
    const record: IniciativaRecord = {
      tipoIniciativa: isBI ? 'BI' : 'IA',
      timestamp: new Date().toISOString(),
      radicado: nextRadicado,
      nombreCompleto: personalData.nombreCompleto,
      cedula: personalData.cedula,
      correo: personalData.correo,
      areaServicio: personalData.areaServicio,
      fechaRegistro: personalData.fechaRegistro,
      
      nombreIniciativa: mainForm.nombreIniciativa,
      areaSolicitante: mainForm.areaSolicitante,
      liderResponsable: mainForm.liderResponsable,
      fechaSolicitud: formatDateSpanish(personalData.fechaRegistro),
      problema: mainForm.problema,
      objetivo: mainForm.objetivo,
      procesoImpactado: mainForm.procesoImpactado,
      linkHerramienta: mainForm.linkHerramienta,
      
      // IA fields (conditional)
      ...(!isBI && {
        tipoIa: mainForm.tipoIa,
        otroTipoIa: mainForm.otroTipoIa,
        herramientaSugerida: mainForm.herramientaSugerida,
        estadoHerramienta: mainForm.estadoHerramienta,
        descripcionEvaluacion: mainForm.descripcionEvaluacion,
        soportesAnexos: mainForm.soportesAnexos,
        datosUtilizados: mainForm.datosUtilizados,
        incluyeDatosPacientes: mainForm.incluyeDatosPacientes,
        incluyeDatosSensibles: mainForm.incluyeDatosSensibles,
        requiereIntegracion: mainForm.requiereIntegracion,
        sistemasIntegracion: mainForm.sistemasIntegracion,
        usuarios: mainForm.usuarios,
        beneficios: mainForm.beneficios,
        indicadores: mainForm.indicadores,
        riesgos: mainForm.riesgos,
        costoEstimado: mainForm.costoEstimado,
        propuestaPlanPiloto: mainForm.propuestaPlanPiloto,
        
        justificacionD1: mainForm.justificacionD1,
        puntajeD1: mainForm.puntajeD1,
        justificacionD2: mainForm.justificacionD2,
        puntajeD2: mainForm.puntajeD2,
        justificacionD3: mainForm.justificacionD3,
        puntajeD3: mainForm.puntajeD3,
        justificacionD4: mainForm.justificacionD4,
        puntajeD4: mainForm.puntajeD4,
        justificacionD5: mainForm.justificacionD5,
        puntajeD5: mainForm.puntajeD5,
        
        puntajeTotal: puntajeTotal,
        nivelRiesgo: flowType.level,
        flujoAsignado: flowType.fullName,
      }),

      // BI fields (conditional)
      ...(isBI && {
        alcanceBI: mainForm.alcanceBI,
        fuentesDatosBI: mainForm.fuentesDatosBI,
        funcionalidadesBI: mainForm.funcionalidadesBI,
        disenoVisualBI: mainForm.disenoVisualBI,
        integracionIaBI: mainForm.integracionIaBI,
        criteriosExitoBI: mainForm.criteriosExitoBI,
        limitacionesRiesgosBI: mainForm.limitacionesRiesgosBI,
        
        // Populate placeholders for consistency
        estadoHerramienta: 'Herramienta nueva sin evaluación previa',
        nivelRiesgo: 'Evaluación Técnica',
        flujoAsignado: 'Flujo Especial BI - Calidad y Tecnología',
        puntajeTotal: 0
      }),
      
      mensajeRevisionMostrado: true,
      
      // drive folders
      urlCarpetaAnexos: 'https://drive.google.com/drive/folders/1dQ3LYezaW-GaRQSkFTenmlXTQk-Lg1-i',
      urlsDocumentosAnexos: [attachedNames.metodologia, attachedNames.funcionalidad, attachedNames.soportes]
        .filter(n => n !== '')
        .map(name => `https://example.com/demo_${encodeURIComponent(name)}`),
      nombresDocumentosAnexos: [attachedNames.metodologia, attachedNames.funcionalidad, attachedNames.soportes]
        .filter(n => n !== ''),
      
      // default admin
      estadoRevision: 'Recibido',
      responsableRevision: isBI ? 'Gestor de BI' : 'AI Product Owner',
      observacionesAdministrador: '',
      ultimaActualizacion: new Date().toISOString()
    };

    onSubmitRecord(record);
    // Clear draft cache upon successful submission
    localStorage.removeItem(isBI ? 'hila_draft_personal_bi' : 'hila_draft_personal_ia');
    localStorage.removeItem(isBI ? 'hila_draft_main_bi' : 'hila_draft_main_ia');
    localStorage.removeItem(isBI ? 'hila_draft_step_bi' : 'hila_draft_step_ia');
    setStep(4);
    window.scrollTo(0, 0);
  };

  const formatDateSpanish = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const handleDownloadReceiptPDF = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    // Header bar
    doc.setFillColor(12, 45, 72); // sky-950
    doc.rect(0, 0, 210, 28, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text('HOSPITAL INFANTIL LOS ÁNGELES', 14, 11);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(203, 213, 225);
    doc.text(`Comprobante Oficial de Radicación de Solicitud ${isBI ? 'BI' : 'IA'}`, 14, 18);

    doc.setFontSize(8.5);
    doc.setTextColor(16, 185, 129); // emerald-400
    doc.text(`Radicado Nº: ${nextRadicado} | Estado: RECIBIDO`, 14, 24);

    let y = 36;

    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, 182, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(12, 74, 110);
    doc.text('DATOS DE LA RADICACIÓN', 16, y + 4.5);
    y += 9;

    const receiptData = [
      ['Nº Radicado Institucional:', nextRadicado],
      ['Fecha de Registro:', formatDateSpanish(personalData.fechaRegistro) || new Date().toLocaleDateString('es-CO')],
      ['Nombre del Solicitante:', personalData.nombreCompleto],
      ['Cédula de Ciudadanía:', personalData.cedula],
      ['Correo Electrónico:', personalData.correo],
      ['Área / Servicio:', personalData.areaServicio],
      ['Nombre de la Iniciativa:', mainForm.nombreIniciativa],
      ['Tipo de Propuesta:', isBI ? 'BI Tablero PowerBI' : `IA (${mainForm.tipoIa.join(', ') || 'IA'})`],
      ['Flujo Asignado:', isBI ? 'Flujo Especial BI - Calidad y Tecnología' : flowType.fullName]
    ];

    autoTable(doc, {
      startY: y,
      body: receiptData,
      theme: 'plain',
      bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59], cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 55, textColor: [71, 85, 105] },
        1: { cellWidth: 127 }
      },
      margin: { left: 14, right: 14 }
    });

    // @ts-ignore
    y = (doc as any).lastAutoTable.finalY + 8;

    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, 182, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(12, 74, 110);
    doc.text('RESUMEN DE LA PROPUESTA REGISTRADA', 16, y + 4.5);
    y += 9;

    const summaryData = [
      ['Problema / Necesidad:', mainForm.problema || 'N/A'],
      ['Objetivo Principal:', mainForm.objetivo || 'N/A'],
      ['Proceso Impactado:', mainForm.procesoImpactado || 'N/A']
    ];

    autoTable(doc, {
      startY: y,
      body: summaryData,
      theme: 'plain',
      bodyStyles: { fontSize: 8, textColor: [30, 41, 59], cellPadding: 2 },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 55, textColor: [71, 85, 105] },
        1: { cellWidth: 127 }
      },
      margin: { left: 14, right: 14 }
    });

    // Footer
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text('Hospital Infantil Los Ángeles • Sistema Institucional de Gestión de Iniciativas', 14, 285);

    doc.save(`Comprobante_Radicado_${nextRadicado}.pdf`);
  };

  const areasDeServicio = [
    'Urgencias Pediátricas', 'Hospitalización Pediátrica', 'UCI Pediátrica', 'UCI Neonatal',
    'Radiología e Imágenes', 'Laboratorio Clínico', 'Consulta Externa', 'Sistemas e Informática',
    'Garantía de Calidad', 'Talento Humano', 'Facturación y Glosas', 'Admisiones', 'Dirección General',
    'Comité de Innovación', 'Farmacia', 'Trabajo Social'
  ];

  return (
    <div id="form-registrador-main" className="min-h-screen bg-slate-50 text-slate-800 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Main Hospital Branding Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between border-b border-slate-200 pb-6 mb-8 gap-4 bg-white p-6 rounded-2xl shadow-sm">
          <div className="flex items-center gap-3">
            {/* Added hospital custom public logo here with smooth container */}
            <div className="bg-white p-1 rounded-xl shadow-md border border-slate-100 flex items-center justify-center overflow-hidden w-14 h-14 shrink-0">
              <img 
                src="https://lh3.googleusercontent.com/d/1JhYNFWl0CkW_4_HKkR1ziY-HBk2YGUm6" 
                alt="Logo HILA" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  // Fallback to Icon if image error
                  e.currentTarget.style.display = 'none';
                  const nextSibling = e.currentTarget.nextElementSibling;
                  if (nextSibling) (nextSibling as HTMLElement).style.display = 'block';
                }}
              />
              <div style={{ display: 'none' }} className="text-sky-900">
                <Activity className="h-8 w-8" />
              </div>
            </div>
            <div>
              <h1 className="text-xl font-bold text-sky-950 tracking-tight">Hospital Infantil Los Ángeles</h1>
              <p className="text-xs text-slate-500 font-medium">Pasto, Nariño • Excelencia y Calidad en Salud Infantil</p>
            </div>
          </div>
          <div className="text-right sm:text-right text-center">
            <span className="inline-block bg-slate-100 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200">
              {isBI ? 'F-BI-002' : 'F-IA-001'} • v1.0 / 2026
            </span>
            <p className="text-[10px] text-slate-400 mt-1">Radicado Provisorio: {nextRadicado}</p>
          </div>
        </div>

        {/* Form Title & Stepper Progress */}
        {step < 4 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight text-center sm:text-left mb-4">
              {isBI 
                ? 'Ficha de Solicitud de Registro de Tableros BI (Power BI o Data Studio)'
                : 'Ficha de Solicitud de Iniciativa de Inteligencia Artificial'
              }
            </h2>
            
            {/* Visual Stepper */}
            <div className="relative flex items-center justify-between max-w-lg mx-auto sm:mx-0">
              <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-slate-200 -translate-y-1/2 z-0"></div>
              
              {/* Step 1 Indicator */}
              <div className="relative z-10 flex flex-col items-center">
                <button 
                  onClick={() => step > 1 && setStep(1)}
                  disabled={step === 1}
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all shadow-md ${
                    step >= 1 ? 'bg-sky-900 text-white shadow-sky-900/20' : 'bg-white text-slate-400 border border-slate-200'
                  }`}
                >
                  1
                </button>
                <span className="text-[11px] font-medium mt-1 text-slate-500">Solicitante</span>
              </div>

              {/* Step 2 Indicator */}
              <div className="relative z-10 flex flex-col items-center">
                <button 
                  onClick={() => step > 2 && setStep(2)}
                  disabled={step <= 2}
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all shadow-md ${
                    step >= 2 ? 'bg-sky-900 text-white shadow-sky-900/20' : 'bg-white text-slate-400 border border-slate-200'
                  }`}
                >
                  2
                </button>
                <span className="text-[11px] font-medium mt-1 text-slate-500">{isBI ? 'Ficha BI' : 'Iniciativa IA'}</span>
              </div>

              {/* Step 3 Indicator */}
              <div className="relative z-10 flex flex-col items-center">
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all shadow-md ${
                    step >= 3 ? 'bg-sky-900 text-white shadow-sky-900/20' : 'bg-white text-slate-400 border border-slate-200'
                  }`}
                >
                  3
                </div>
                <span className="text-[11px] font-medium mt-1 text-slate-500">Documentos</span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 1: SOLICITANTE */}
        {step === 1 && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8"
          >
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <User className="text-sky-900 h-6 w-6" />
              <h3 className="text-lg font-bold text-slate-900">1. Identificación Básica del Solicitante</h3>
            </div>
            <p className="text-sm text-slate-600 mb-6">
              Por favor complete los siguientes datos para identificarlo como el proponente de la iniciativa. Estos datos se utilizarán para la creación automática de su carpeta de soportes en Google Drive.
            </p>

            <div className="space-y-5">
              {/* Nombre Completo */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Nombre Completo <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={personalData.nombreCompleto}
                  onChange={(e) => setPersonalData(prev => ({ ...prev, nombreCompleto: e.target.value }))}
                  placeholder="Ej. Juan Pérez Gómez"
                  className={`w-full px-4 py-2.5 rounded-xl border ${errorsStep1.nombreCompleto ? 'border-red-500 focus:ring-red-200' : 'border-slate-200 focus:ring-sky-100'} focus:outline-none focus:ring-4 focus:border-sky-900 transition-all text-sm`}
                />
                {errorsStep1.nombreCompleto && <p className="text-xs text-red-500 mt-1 font-medium">{errorsStep1.nombreCompleto}</p>}
              </div>

              {/* Cédula */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Cédula de Ciudadanía <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={personalData.cedula}
                  onChange={(e) => setPersonalData(prev => ({ ...prev, cedula: e.target.value }))}
                  placeholder="Ej. 1085123456 (Solo números)"
                  className={`w-full px-4 py-2.5 rounded-xl border ${errorsStep1.cedula ? 'border-red-500 focus:ring-red-200' : 'border-slate-200 focus:ring-sky-100'} focus:outline-none focus:ring-4 focus:border-sky-900 transition-all text-sm`}
                />
                {errorsStep1.cedula && <p className="text-xs text-red-500 mt-1 font-medium">{errorsStep1.cedula}</p>}
              </div>

              {/* Correo Electrónico */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Correo Electrónico Institucional <span className="text-red-500">*</span></label>
                <input 
                  type="email" 
                  value={personalData.correo}
                  onChange={(e) => setPersonalData(prev => ({ ...prev, correo: e.target.value }))}
                  placeholder="Ej. crizdg11@gmail.com"
                  className={`w-full px-4 py-2.5 rounded-xl border ${errorsStep1.correo ? 'border-red-500 focus:ring-red-200' : 'border-slate-200 focus:ring-sky-100'} focus:outline-none focus:ring-4 focus:border-sky-900 transition-all text-sm`}
                />
                {errorsStep1.correo && <p className="text-xs text-red-500 mt-1 font-medium">{errorsStep1.correo}</p>}
              </div>

              {/* Área o Servicio */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Área o Servicio del Colaborador <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  value={personalData.areaServicio}
                  onChange={(e) => setPersonalData(prev => ({ ...prev, areaServicio: e.target.value }))}
                  placeholder="Ej. Urgencias Pediátricas, Sistemas e Informática, Dirección, etc."
                  className={`w-full px-4 py-2.5 rounded-xl border ${errorsStep1.areaServicio ? 'border-red-500 focus:ring-red-200' : 'border-slate-200 focus:ring-sky-100'} focus:outline-none focus:ring-4 focus:border-sky-900 transition-all text-sm`}
                />
                {errorsStep1.areaServicio && <p className="text-xs text-red-500 mt-1 font-medium">{errorsStep1.areaServicio}</p>}
              </div>

              {/* Fecha de Registro */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Fecha de Registro <span className="text-red-500">*</span></label>
                <input 
                  type="date" 
                  value={personalData.fechaRegistro}
                  onChange={(e) => setPersonalData(prev => ({ ...prev, fechaRegistro: e.target.value }))}
                  className={`w-full px-4 py-2.5 rounded-xl border ${errorsStep1.fechaRegistro ? 'border-red-500 focus:ring-red-200' : 'border-slate-200 focus:ring-sky-100'} focus:outline-none focus:ring-4 focus:border-sky-900 transition-all text-sm`}
                />
                {errorsStep1.fechaRegistro && <p className="text-xs text-red-500 mt-1 font-medium">{errorsStep1.fechaRegistro}</p>}
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-100">
              <button 
                type="button"
                onClick={handleCancel}
                className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors inline-flex items-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" /> Cancelar
              </button>
              <button 
                type="button"
                onClick={handleNextStep1}
                className="px-6 py-2.5 text-sm font-semibold text-white bg-sky-900 hover:bg-sky-950 rounded-xl transition-colors shadow-md inline-flex items-center gap-2 cursor-pointer"
              >
                Continuar al registro <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 2: FICHA DE SOLICITUD PRINCIPAL */}
        {step === 2 && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Context Info alert */}
            <div className="bg-sky-50 border border-sky-100 text-sky-950 p-4 rounded-2xl flex items-start gap-3 shadow-sm">
              <Info className="h-5 w-5 text-sky-900 shrink-0 mt-0.5" />
              <div className="text-xs space-y-1">
                <p className="font-bold">Solicitante Activo:</p>
                <p className="font-semibold text-slate-700">
                  {personalData.nombreCompleto} • CC. {personalData.cedula} • Área: {personalData.areaServicio}
                </p>
                <p className="text-slate-500">La carpeta en Google Drive se creará como: <span className="font-mono text-xs bg-sky-100 px-1 py-0.5 rounded">{personalData.nombreCompleto} - {personalData.cedula}</span></p>
              </div>
            </div>

            {/* SECTION A */}
            <div id="error-container-nombreIniciativa" className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="bg-slate-100 text-slate-800 p-2 rounded-lg font-bold text-xs uppercase">Sección A</div>
                <h3 className="text-lg font-bold text-slate-900">A. Identificación de la Iniciativa</h3>
              </div>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">
                    {isBI ? 'Nombre de la iniciativa de BI *' : 'Nombre de la iniciativa de IA *'}
                  </label>
                  <p className="text-xs text-slate-400 mb-1.5">
                    {isBI 
                      ? 'Escriba el nombre claro y descriptivo de la herramienta. Ej. Productividad' 
                      : 'Escriba el nombre claro y descriptivo de la herramienta, idea, invención o proyecto de Inteligencia Artificial.'
                    }
                  </p>
                  <input 
                    type="text"
                    value={mainForm.nombreIniciativa}
                    onChange={(e) => setMainForm(prev => ({ ...prev, nombreIniciativa: e.target.value }))}
                    placeholder={isBI ? 'Ej. Productividad de Consulta Externa' : 'Ej. Diagnóstico Clínico Asistido por Visión Artificial'}
                    className={`w-full px-4 py-2 rounded-xl border text-sm focus:outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-900 transition-all ${
                      errorsStep2.nombreIniciativa ? 'border-red-500 bg-red-50/20' : 'border-slate-200'
                    }`}
                  />
                  {errorsStep2.nombreIniciativa && <p className="text-xs text-red-500 mt-1 font-medium">{errorsStep2.nombreIniciativa}</p>}
                </div>

                {!isBI && (
                  <div id="error-container-tipoIa" className="border-t border-slate-100 pt-4">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">
                      Tipo(s) de Inteligencia Artificial <span className="text-red-500">*</span>
                    </label>
                    <p className="text-xs text-slate-400 mb-2.5">
                      Seleccione una o varias opciones según el tipo de solución de IA contemplado.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {[
                        'IA Generativa / Modelos de Lenguaje (LLM / GPT)',
                        'Visión por Computador e Imágenes Médicas',
                        'Procesamiento de Lenguaje Natural (PLN / NLP)',
                        'Análisis Predictivo y Machine Learning (ML)',
                        'Reconocimiento de Voz / Transcripción',
                        'Automatización y Agentes Inteligentes',
                        'Otra'
                      ].map((type) => {
                        const isChecked = mainForm.tipoIa.includes(type);
                        return (
                          <label
                            key={type}
                            className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                              isChecked 
                                ? 'bg-sky-50 border-sky-900 text-sky-950 shadow-sm' 
                                : errorsStep2.tipoIa ? 'bg-red-50/20 border-red-300 text-slate-700 hover:bg-slate-100' : 'bg-slate-50/50 border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleCheckboxChange(type)}
                              className="rounded text-sky-900 focus:ring-sky-900 h-4 w-4 cursor-pointer"
                            />
                            <span>{type}</span>
                          </label>
                        );
                      })}
                    </div>
                    {errorsStep2.tipoIa && (
                      <p className="text-xs text-red-500 mt-2 font-medium bg-red-50 p-2.5 rounded-xl border border-red-200 flex items-center gap-1.5">
                        <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
                        <span>{errorsStep2.tipoIa}</span>
                      </p>
                    )}

                    {mainForm.tipoIa.includes('Otra') && (
                      <div id="error-container-otroTipoIa" className="mt-3">
                        <label className="block text-xs font-bold text-slate-700 mb-1">Especifique el otro tipo de IA <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          value={mainForm.otroTipoIa}
                          onChange={(e) => setMainForm(prev => ({ ...prev, otroTipoIa: e.target.value }))}
                          placeholder="Escriba la categoría o tipo de IA..."
                          className={`w-full px-4 py-2 rounded-xl border text-sm focus:outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-900 transition-all ${
                            errorsStep2.otroTipoIa ? 'border-red-500 bg-red-50/20' : 'border-slate-200'
                          }`}
                        />
                        {errorsStep2.otroTipoIa && <p className="text-xs text-red-500 mt-1 font-medium">{errorsStep2.otroTipoIa}</p>}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div id="error-container-areaSolicitante">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Área solicitante <span className="text-red-500">*</span></label>
                    <input 
                      type="text"
                      value={mainForm.areaSolicitante}
                      onChange={(e) => setMainForm(prev => ({ ...prev, areaSolicitante: e.target.value }))}
                      placeholder="Área u oficina solicitante"
                      className={`w-full px-4 py-2 rounded-xl border text-sm focus:outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-900 transition-all ${
                        errorsStep2.areaSolicitante ? 'border-red-500 bg-red-50/20' : 'border-slate-200'
                      }`}
                    />
                    {errorsStep2.areaSolicitante && <p className="text-xs text-red-500 mt-1 font-medium">{errorsStep2.areaSolicitante}</p>}
                  </div>

                  <div id="error-container-liderResponsable">
                    <label className="block text-sm font-semibold text-slate-700 mb-1">Líder responsable / Data Owner <span className="text-red-500">*</span></label>
                    <input 
                      type="text"
                      value={mainForm.liderResponsable}
                      onChange={(e) => setMainForm(prev => ({ ...prev, liderResponsable: e.target.value }))}
                      placeholder="Nombre, cargo y correo del líder responsable"
                      className={`w-full px-4 py-2 rounded-xl border text-sm focus:outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-900 transition-all ${
                        errorsStep2.liderResponsable ? 'border-red-500 bg-red-50/20' : 'border-slate-200'
                      }`}
                    />
                    {errorsStep2.liderResponsable && <p className="text-xs text-red-500 mt-1 font-medium">{errorsStep2.liderResponsable}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Fecha de solicitud</label>
                  <input 
                    type="text"
                    disabled
                    value={isBI ? "17/01/2026" : formatDateSpanish(personalData.fechaRegistro)}
                    className="w-full px-4 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-500 text-sm font-medium"
                  />
                </div>
              </div>
            </div>

            {/* SECTION B */}
            <div id="error-container-problema" className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                <div className="bg-slate-100 text-slate-800 p-2 rounded-lg font-bold text-xs uppercase">Sección B</div>
                <h3 className="text-lg font-bold text-slate-900">B. Descripción y Contexto de la Necesidad</h3>
              </div>
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Problema o necesidad <span className="text-red-500">*</span></label>
                  <p className="text-xs text-slate-400 mb-1.5">
                    {isBI ? 'Escriba aquí los detalles de la necesidad del tablero o datos...' : 'Describa el problema concreto que la IA debería resolver o la oportunidad que se quiere aprovechar.'}
                  </p>
                  <textarea 
                    rows={3}
                    value={mainForm.problema}
                    onChange={(e) => setMainForm(prev => ({ ...prev, problema: e.target.value }))}
                    placeholder="Escriba aquí los detalles..."
                    className={`w-full px-4 py-2 rounded-xl border text-sm focus:outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-900 transition-all ${
                      errorsStep2.problema ? 'border-red-500 bg-red-50/20' : 'border-slate-200'
                    }`}
                  />
                  {errorsStep2.problema && <p className="text-xs text-red-500 mt-1 font-medium">{errorsStep2.problema}</p>}
                </div>

                <div id="error-container-objetivo">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Objetivo del proyecto <span className="text-red-500">*</span></label>
                  <p className="text-xs text-slate-400 mb-1.5">Indique qué resultado específico se espera lograr con esta herramienta. Escriba aquí el objetivo...</p>
                  <textarea 
                    rows={3}
                    value={mainForm.objetivo}
                    onChange={(e) => setMainForm(prev => ({ ...prev, objetivo: e.target.value }))}
                    placeholder="Escriba aquí el objetivo..."
                    className={`w-full px-4 py-2 rounded-xl border text-sm focus:outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-900 transition-all ${
                      errorsStep2.objetivo ? 'border-red-500 bg-red-50/20' : 'border-slate-200'
                    }`}
                  />
                  {errorsStep2.objetivo && <p className="text-xs text-red-500 mt-1 font-medium">{errorsStep2.objetivo}</p>}
                </div>

                <div id="error-container-procesoImpactado">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Proceso o servicio impactado <span className="text-red-500">*</span></label>
                  <p className="text-xs text-slate-400 mb-1.5">Identifique el proceso institucional, servicio o área que se verá impactado o modificado con la implementación.</p>
                  <input 
                    type="text"
                    value={mainForm.procesoImpactado}
                    onChange={(e) => setMainForm(prev => ({ ...prev, procesoImpactado: e.target.value }))}
                    placeholder="Identifique el proceso institucional..."
                    className={`w-full px-4 py-2 rounded-xl border text-sm focus:outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-900 transition-all ${
                      errorsStep2.procesoImpactado ? 'border-red-500 bg-red-50/20' : 'border-slate-200'
                    }`}
                  />
                  {errorsStep2.procesoImpactado && <p className="text-xs text-red-500 mt-1 font-medium">{errorsStep2.procesoImpactado}</p>}
                </div>
              </div>
            </div>

            {/* RENDER BI SPECIFIC FIELDS BASED ON IMAGE SHEETS */}
            {isBI ? (
              <div className="space-y-6">
                {/* BI Core Details Card */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
                  <div className="flex items-center gap-3 mb-2 pb-4 border-b border-slate-100">
                    <BarChart2 className="text-yellow-600 h-6 w-6" />
                    <h3 className="text-lg font-bold text-slate-900">C. Especificaciones y Requisitos Técnicos del Tablero BI</h3>
                  </div>

                  {/* Alcance */}
                  <div id="error-container-alcanceBI">
                    <label className="block text-sm font-bold text-slate-800 mb-1">Alcance e Indicadores del Tablero <span className="text-red-500">*</span></label>
                    <p className="text-xs text-slate-400 mb-1.5">Especifique qué indicadores clave de rendimiento (KPIs) incluirá el tablero y qué aspectos quedan fuera del alcance.</p>
                    <textarea 
                      rows={3}
                      value={mainForm.alcanceBI}
                      onChange={(e) => setMainForm(prev => ({ ...prev, alcanceBI: e.target.value }))}
                      placeholder="Describa el alcance e indicadores clave..."
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-900 transition-all"
                    />
                    {errorsStep2.alcanceBI && <p className="text-xs text-red-500 mt-1 font-medium">{errorsStep2.alcanceBI}</p>}
                  </div>

                  {/* Fuentes de Datos */}
                  <div id="error-container-fuentesDatosBI">
                    <label className="block text-sm font-bold text-slate-800 mb-1">Fuentes de Datos y Frecuencia de Actualización <span className="text-red-500">*</span></label>
                    <p className="text-xs text-slate-400 mb-1.5">Identifique de dónde provienen los datos (ERP institucional, archivos Excel, bases de datos SQL, sistemas hospitalarios) y con qué frecuencia deben actualizarse.</p>
                    <textarea 
                      rows={2}
                      value={mainForm.fuentesDatosBI}
                      onChange={(e) => setMainForm(prev => ({ ...prev, fuentesDatosBI: e.target.value }))}
                      placeholder="Ej. Base de datos SQL del ERP de Facturación, archivos Excel mensuales de cartera..."
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-900 transition-all"
                    />
                    {errorsStep2.fuentesDatosBI && <p className="text-xs text-red-500 mt-1 font-medium">{errorsStep2.fuentesDatosBI}</p>}
                  </div>

                  {/* Funcionalidades Clave */}
                  <div id="error-container-funcionalidadesBI">
                    <label className="block text-sm font-bold text-slate-800 mb-1">Funcionalidades Clave Requeridas <span className="text-red-500">*</span></label>
                    <p className="text-xs text-slate-400 mb-1.5">Detalle funcionalidades deseadas (Filtros dinámicos por área/fecha, alertas automáticas, comparativos con metas o años anteriores, exportación directa de reportes).</p>
                    <textarea 
                      rows={2}
                      value={mainForm.funcionalidadesBI}
                      onChange={(e) => setMainForm(prev => ({ ...prev, funcionalidadesBI: e.target.value }))}
                      placeholder="Ej. Filtros dinámicos por área, exportación en PDF, comparativo histórico..."
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-900 transition-all"
                    />
                    {errorsStep2.funcionalidadesBI && <p className="text-xs text-red-500 mt-1 font-medium">{errorsStep2.funcionalidadesBI}</p>}
                  </div>

                  {/* Diseño Visual */}
                  <div id="error-container-disenoVisualBI">
                    <label className="block text-sm font-bold text-slate-800 mb-1">Diseño Visual y Directrices Estéticas <span className="text-red-500">*</span></label>
                    <p className="text-xs text-slate-400 mb-1.5">Defina tipos de gráficos preferidos (líneas, barras, mapas de calor), colores institucionales HILA, o íconos relacionados con transparencia y sostenibilidad.</p>
                    <textarea 
                      rows={2}
                      value={mainForm.disenoVisualBI}
                      onChange={(e) => setMainForm(prev => ({ ...prev, disenoVisualBI: e.target.value }))}
                      placeholder="Ej. Paleta de colores azul y verde HILA, gráficos de barras sencillos y tarjetas de resumen..."
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-900 transition-all"
                    />
                    {errorsStep2.disenoVisualBI && <p className="text-xs text-red-500 mt-1 font-medium">{errorsStep2.disenoVisualBI}</p>}
                  </div>

                  {/* Integración con IA */}
                  <div id="error-container-integracionIaBI">
                    <label className="block text-sm font-bold text-slate-800 mb-1">Integración Propuesta con Inteligencia Artificial <span className="text-red-500">*</span></label>
                    <p className="text-xs text-slate-400 mb-1.5">Describa si se requiere predicciones de tendencias, generación de insights automáticos por lenguaje natural o recomendaciones dinámicas de gestión para apoyar la toma de decisiones.</p>
                    <textarea 
                      rows={2}
                      value={mainForm.integracionIaBI}
                      onChange={(e) => setMainForm(prev => ({ ...prev, integracionIaBI: e.target.value }))}
                      placeholder="Ej. Predicción de ingresos del próximo mes, recomendaciones de optimización de cupos..."
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-900 transition-all"
                    />
                    {errorsStep2.integracionIaBI && <p className="text-xs text-red-500 mt-1 font-medium">{errorsStep2.integracionIaBI}</p>}
                  </div>

                  {/* Criterios de Éxito */}
                  <div id="error-container-criteriosExitoBI">
                    <label className="block text-sm font-bold text-slate-800 mb-1">Criterios de Éxito del Proyecto <span className="text-red-500">*</span></label>
                    <p className="text-xs text-slate-400 mb-1.5">¿Qué definirá que el tablero BI sea exitoso? (Ej. Facilidad de uso para los líderes, alta precisión de los datos presentados, impacto real en la toma de decisiones rápidas).</p>
                    <textarea 
                      rows={2}
                      value={mainForm.criteriosExitoBI}
                      onChange={(e) => setMainForm(prev => ({ ...prev, criteriosExitoBI: e.target.value }))}
                      placeholder="Ej. Reducción en un 50% del tiempo de elaboración de reportes mensuales..."
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-900 transition-all"
                    />
                    {errorsStep2.criteriosExitoBI && <p className="text-xs text-red-500 mt-1 font-medium">{errorsStep2.criteriosExitoBI}</p>}
                  </div>

                  {/* Limitaciones y Riesgos */}
                  <div id="error-container-limitacionesRiesgosBI">
                    <label className="block text-sm font-bold text-slate-800 mb-1">Limitaciones, Riesgos y Seguridad de la Información <span className="text-red-500">*</span></label>
                    <p className="text-xs text-slate-400 mb-1.5">Identifique posibles riesgos (seguridad y acceso de datos confidenciales, posibles sesgos en los modelos de IA predictivos, o dependencia estricta de la calidad de información en los sistemas de origen).</p>
                    <textarea 
                      rows={2}
                      value={mainForm.limitacionesRiesgosBI}
                      onChange={(e) => setMainForm(prev => ({ ...prev, limitacionesRiesgosBI: e.target.value }))}
                      placeholder="Ej. Permisos restringidos a líderes de área, dependencia de que facturación suba los datos a tiempo..."
                      className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-900 transition-all"
                    />
                    {errorsStep2.limitacionesRiesgosBI && <p className="text-xs text-red-500 mt-1 font-medium">{errorsStep2.limitacionesRiesgosBI}</p>}
                  </div>
                </div>
              </div>
            ) : (
              /* IA SPECIFIC VIEWS (SECTIONS C, D, E, F, G) */
              <>
                {/* SECTION C */}
                <div id="error-container-herramientaSugerida" className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                    <div className="bg-slate-100 text-slate-800 p-2 rounded-lg font-bold text-xs uppercase">Sección C</div>
                    <h3 className="text-lg font-bold text-slate-900">C. Herramienta y Proveedor Propuesto</h3>
                  </div>
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Herramienta o proveedor sugerido <span className="text-red-500">*</span></label>
                      <p className="text-xs text-slate-400 mb-1.5">Nombre comercial, proveedor, plataforma, desarrollo interno o solución tecnológica que el área tiene en mente.</p>
                      <input 
                        type="text"
                        value={mainForm.herramientaSugerida}
                        onChange={(e) => setMainForm(prev => ({ ...prev, herramientaSugerida: e.target.value }))}
                        placeholder="Ej. AWS Medical Comprehend, Google Cloud Dialogflow, desarrollo propio..."
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-900 transition-all"
                      />
                      {errorsStep2.herramientaSugerida && <p className="text-xs text-red-500 mt-1 font-medium">{errorsStep2.herramientaSugerida}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">¿Es herramienta nueva o ya autorizada?</label>
                      <select 
                        value={mainForm.estadoHerramienta}
                        onChange={(e) => setMainForm(prev => ({ ...prev, estadoHerramienta: e.target.value }))}
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-900 bg-white transition-all"
                      >
                        <option value="Ya autorizada por el hospital">Ya autorizada por el hospital</option>
                        <option value="Herramienta nueva sin evaluación previa">Herramienta nueva sin evaluación previa</option>
                        <option value="En evaluación">En evaluación</option>
                      </select>
                    </div>

                    {mainForm.estadoHerramienta === 'En evaluación' && (
                      <div id="error-container-descripcionEvaluacion">
                        <label className="block text-sm font-semibold text-slate-700 mb-1">Describa el estado actual de evaluación <span className="text-red-500">*</span></label>
                        <textarea 
                          rows={2}
                          value={mainForm.descripcionEvaluacion}
                          onChange={(e) => setMainForm(prev => ({ ...prev, descripcionEvaluacion: e.target.value }))}
                          placeholder="Describa brevemente en qué va el proceso de evaluación..."
                          className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-900 transition-all"
                        />
                        {errorsStep2.descripcionEvaluacion && <p className="text-xs text-red-500 mt-1 font-medium">{errorsStep2.descripcionEvaluacion}</p>}
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Soportes anexos disponibles</label>
                      <p className="text-xs text-slate-400 mb-1.5">Indique cuáles soportes adjunta: cotización, ficha técnica, demo, política de privacidad, términos de uso, evidencia científica, experiencia en otras IPS u otros documentos.</p>
                      <input 
                        type="text"
                        value={mainForm.soportesAnexos}
                        onChange={(e) => setMainForm(prev => ({ ...prev, soportesAnexos: e.target.value }))}
                        placeholder="Ej. Cotización del integrador, ficha técnica PDF..."
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-900 transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION D */}
                <div id="error-container-datosUtilizados" className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                    <div className="bg-slate-100 text-slate-800 p-2 rounded-lg font-bold text-xs uppercase">Sección D</div>
                    <h3 className="text-lg font-bold text-slate-900">D. Datos e Integración Tecnológica</h3>
                  </div>
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Datos que utilizaría la herramienta <span className="text-red-500">*</span></label>
                      <p className="text-xs text-slate-400 mb-1.5">Describa qué tipo de información necesitaría procesar la herramienta: datos de pacientes, información administrativa, datos estadísticos, imágenes, documentos, bases de datos u otros.</p>
                      <textarea 
                        rows={3}
                        value={mainForm.datosUtilizados}
                        onChange={(e) => setMainForm(prev => ({ ...prev, datosUtilizados: e.target.value }))}
                        placeholder="Describa el origen y naturaleza de los datos..."
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-900 transition-all"
                      />
                      {errorsStep2.datosUtilizados && <p className="text-xs text-red-500 mt-1 font-medium">{errorsStep2.datosUtilizados}</p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">¿Incluye datos de pacientes?</label>
                        <div className="flex gap-4">
                          {['Sí', 'No'].map((opt) => (
                            <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm font-semibold">
                              <input 
                                type="radio" 
                                name="incluyeDatosPacientes"
                                checked={mainForm.incluyeDatosPacientes === opt}
                                onChange={() => setMainForm(prev => ({ ...prev, incluyeDatosPacientes: opt as 'Sí' | 'No' }))}
                                className="text-sky-900 focus:ring-sky-900 h-4 w-4"
                              />
                              {opt}
                            </label>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">¿Incluye datos sensibles, según Ley 1581?</label>
                        <div className="flex gap-4 flex-wrap">
                          {['Sí', 'No', 'No estoy seguro/a'].map((opt) => (
                            <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm font-semibold">
                              <input 
                                type="radio" 
                                name="incluyeDatosSensibles"
                                checked={mainForm.incluyeDatosSensibles === opt}
                                onChange={() => setMainForm(prev => ({ ...prev, incluyeDatosSensibles: opt as 'Sí' | 'No' | 'No estoy seguro/a' }))}
                                className="text-sky-900 focus:ring-sky-900 h-4 w-4"
                              />
                              {opt}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-slate-100 pt-4">
                      <div className="md:col-span-1">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">¿Requiere integración tecnológica?</label>
                        <div className="flex gap-4">
                          {['Sí', 'No'].map((opt) => (
                            <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm font-semibold">
                              <input 
                                type="radio" 
                                name="requiereIntegracion"
                                checked={mainForm.requiereIntegracion === opt}
                                onChange={() => setMainForm(prev => ({ ...prev, requiereIntegracion: opt as 'Sí' | 'No' }))}
                                className="text-sky-900 focus:ring-sky-900 h-4 w-4"
                              />
                              {opt}
                            </label>
                          ))}
                        </div>
                      </div>

                      {mainForm.requiereIntegracion === 'Sí' && (
                        <div className="md:col-span-2">
                          <label className="block text-sm font-semibold text-slate-700 mb-1">Sistemas con los que se integraría</label>
                          <p className="text-xs text-slate-400 mb-1.5">Indique si requiere integración con historia clínica, Power BI, Google Workspace, LIS, PACS, sistemas administrativos...</p>
                          <input 
                            type="text"
                            value={mainForm.sistemasIntegracion}
                            onChange={(e) => setMainForm(prev => ({ ...prev, sistemasIntegracion: e.target.value }))}
                            placeholder="Ej. PACS de radiología, HCE Dinámica"
                            className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-900 transition-all"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* SECTION E */}
                <div id="error-container-usuarios" className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                    <div className="bg-slate-100 text-slate-800 p-2 rounded-lg font-bold text-xs uppercase">Sección E</div>
                    <h3 className="text-lg font-bold text-slate-900">E. Impacto, Usuarios y Beneficios Esperados</h3>
                  </div>
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Usuarios que la usarían <span className="text-red-500">*</span></label>
                      <p className="text-xs text-slate-400 mb-1.5">Indique quiénes utilizarían la herramienta: un colaborador, un equipo, un área, varios servicios o toda la institución.</p>
                      <input 
                        type="text"
                        value={mainForm.usuarios}
                        onChange={(e) => setMainForm(prev => ({ ...prev, usuarios: e.target.value }))}
                        placeholder="Ej. Personal médico, enfermeras, administrativos de facturación..."
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-900 transition-all"
                      />
                      {errorsStep2.usuarios && <p className="text-xs text-red-500 mt-1 font-medium">{errorsStep2.usuarios}</p>}
                    </div>

                    <div id="error-container-beneficios">
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Beneficios esperados <span className="text-red-500">*</span></label>
                      <p className="text-xs text-slate-400 mb-1.5">Describa el valor institucional esperado: eficiencia, seguridad, calidad, oportunidad, experiencia del paciente, ahorro, productividad, innovación o mejora en la toma de decisiones.</p>
                      <textarea 
                        rows={3}
                        value={mainForm.beneficios}
                        onChange={(e) => setMainForm(prev => ({ ...prev, beneficios: e.target.value }))}
                        placeholder="Detalle los beneficios principales..."
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-900 transition-all"
                      />
                      {errorsStep2.beneficios && <p className="text-xs text-red-500 mt-1 font-medium">{errorsStep2.beneficios}</p>}
                    </div>


                  </div>
                </div>

                {/* SECTION F */}
                <div id="error-container-riesgos" className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                    <div className="bg-slate-100 text-slate-800 p-2 rounded-lg font-bold text-xs uppercase">Sección F</div>
                    <h3 className="text-lg font-bold text-slate-900">F. Riesgos, Costos y Plan Piloto</h3>
                  </div>
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Riesgos identificados por el área <span className="text-red-500">*</span></label>
                      <p className="text-xs text-slate-400 mb-1.5">Describa los riesgos que el área identifica: éticos, legales, reputacionales, operativos, financieros, de seguridad de la información, privacidad, uso inadecuado de datos o afectación en la atención.</p>
                      <textarea 
                        rows={3}
                        value={mainForm.riesgos}
                        onChange={(e) => setMainForm(prev => ({ ...prev, riesgos: e.target.value }))}
                        placeholder="Describa los riesgos potenciales identificados..."
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-900 transition-all"
                      />
                      {errorsStep2.riesgos && <p className="text-xs text-red-500 mt-1 font-medium">{errorsStep2.riesgos}</p>}
                    </div>

                    <div id="error-container-costoEstimado">
                      <label className="block text-sm font-semibold text-slate-700 mb-1">Costo o inversión estimada <span className="text-red-500">*</span></label>
                      <p className="text-xs text-slate-400 mb-1.5">Indique si la iniciativa implica costo y cuál sería: suscripción, compra, desarrollo, contratación, capacitación, mantenimiento u otro. Incluya valor aproximado si lo conoce.</p>
                      <input 
                        type="text"
                        value={mainForm.costoEstimado}
                        onChange={(e) => setMainForm(prev => ({ ...prev, costoEstimado: e.target.value }))}
                        placeholder="Ej. Requiere suscripción API mensual de COP 500,000, o 'Sin costo aparente'..."
                        className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-900 transition-all"
                      />
                      {errorsStep2.costoEstimado && <p className="text-xs text-red-500 mt-1 font-medium">{errorsStep2.costoEstimado}</p>}
                    </div>


                  </div>
                </div>

                {/* SECTION G: RIESGO ESCALA INSTITUCIONAL */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm">
                  <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                    <div className="bg-slate-100 text-slate-800 p-2 rounded-lg font-bold text-xs uppercase">Sección G</div>
                    <h3 className="text-lg font-bold text-slate-900">G. Clasificación Preliminar de Riesgo — Escala Institucional</h3>
                  </div>
                  <p className="text-sm text-slate-600 mb-6">
                    Seleccione el nivel de riesgo preliminar asignado para cada dimensión (0 a 3) y escriba una justificación para su puntuación. El puntaje se sumará automáticamente para determinar el flujo institucional correspondiente.
                  </p>

                  <div className="space-y-6">
                    {/* DIMENSION D1 */}
                    <div id="error-container-justificacionD1" className={`p-4 rounded-xl border transition-all ${errorsStep2.justificacionD1 ? 'border-red-300 bg-red-50/20' : 'border-slate-100 bg-slate-50/50'}`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <span className="text-sm font-bold text-sky-950">D1. Impacto en la atención al paciente</span>
                        <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200">
                          {[0, 1, 2, 3].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setMainForm(prev => ({ ...prev, puntajeD1: val }))}
                              className={`w-8 h-8 rounded-md font-bold text-xs transition-all cursor-pointer ${
                                mainForm.puntajeD1 === val ? 'bg-sky-900 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      </div>
                      <input 
                        type="text"
                        value={mainForm.justificacionD1}
                        onChange={(e) => setMainForm(prev => ({ ...prev, justificacionD1: e.target.value }))}
                        placeholder="Justifique el puntaje asignado para el impacto en la atención clínica..."
                        className={`w-full mt-1.5 px-3 py-1.5 bg-white border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-sky-100 ${
                          errorsStep2.justificacionD1 ? 'border-red-500 bg-red-50/20' : 'border-slate-200'
                        }`}
                      />
                      {errorsStep2.justificacionD1 && <p className="text-[10px] text-red-500 mt-1 font-medium">{errorsStep2.justificacionD1}</p>}
                    </div>

                    {/* DIMENSION D2 */}
                    <div id="error-container-justificacionD2" className={`p-4 rounded-xl border transition-all ${errorsStep2.justificacionD2 ? 'border-red-300 bg-red-50/20' : 'border-slate-100 bg-slate-50/50'}`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <span className="text-sm font-bold text-sky-950">D2. Tipo de dato involucrado</span>
                        <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200">
                          {[0, 1, 2, 3].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setMainForm(prev => ({ ...prev, puntajeD2: val }))}
                              className={`w-8 h-8 rounded-md font-bold text-xs transition-all cursor-pointer ${
                                mainForm.puntajeD2 === val ? 'bg-sky-900 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      </div>
                      <input 
                        type="text"
                        value={mainForm.justificacionD2}
                        onChange={(e) => setMainForm(prev => ({ ...prev, justificacionD2: e.target.value }))}
                        placeholder="Justifique el puntaje asignado según el tipo de datos procesados..."
                        className={`w-full mt-1.5 px-3 py-1.5 bg-white border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-sky-100 ${
                          errorsStep2.justificacionD2 ? 'border-red-500 bg-red-50/20' : 'border-slate-200'
                        }`}
                      />
                      {errorsStep2.justificacionD2 && <p className="text-[10px] text-red-500 mt-1 font-medium">{errorsStep2.justificacionD2}</p>}
                    </div>

                    {/* DIMENSION D3 */}
                    <div id="error-container-justificacionD3" className={`p-4 rounded-xl border transition-all ${errorsStep2.justificacionD3 ? 'border-red-300 bg-red-50/20' : 'border-slate-100 bg-slate-50/50'}`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <span className="text-sm font-bold text-sky-950">D3. Alcance institucional</span>
                        <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200">
                          {[0, 1, 2, 3].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setMainForm(prev => ({ ...prev, puntajeD3: val }))}
                              className={`w-8 h-8 rounded-md font-bold text-xs transition-all cursor-pointer ${
                                mainForm.puntajeD3 === val ? 'bg-sky-900 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      </div>
                      <input 
                        type="text"
                        value={mainForm.justificacionD3}
                        onChange={(e) => setMainForm(prev => ({ ...prev, justificacionD3: e.target.value }))}
                        placeholder="Justifique el puntaje según la cobertura o usuarios que impactará..."
                        className={`w-full mt-1.5 px-3 py-1.5 bg-white border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-sky-100 ${
                          errorsStep2.justificacionD3 ? 'border-red-500 bg-red-50/20' : 'border-slate-200'
                        }`}
                      />
                      {errorsStep2.justificacionD3 && <p className="text-[10px] text-red-500 mt-1 font-medium">{errorsStep2.justificacionD3}</p>}
                    </div>

                    {/* DIMENSION D4 */}
                    <div id="error-container-justificacionD4" className={`p-4 rounded-xl border transition-all ${errorsStep2.justificacionD4 ? 'border-red-300 bg-red-50/20' : 'border-slate-100 bg-slate-50/50'}`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <span className="text-sm font-bold text-sky-950">D4. Implicación tecnológica o contractual</span>
                        <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200">
                          {[0, 1, 2, 3].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setMainForm(prev => ({ ...prev, puntajeD4: val }))}
                              className={`w-8 h-8 rounded-md font-bold text-xs transition-all cursor-pointer ${
                                mainForm.puntajeD4 === val ? 'bg-sky-900 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      </div>
                      <input 
                        type="text"
                        value={mainForm.justificacionD4}
                        onChange={(e) => setMainForm(prev => ({ ...prev, justificacionD4: e.target.value }))}
                        placeholder="Justifique el puntaje asignado según la dificultad técnica o legal..."
                        className={`w-full mt-1.5 px-3 py-1.5 bg-white border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-sky-100 ${
                          errorsStep2.justificacionD4 ? 'border-red-500 bg-red-50/20' : 'border-slate-200'
                        }`}
                      />
                      {errorsStep2.justificacionD4 && <p className="text-[10px] text-red-500 mt-1 font-medium">{errorsStep2.justificacionD4}</p>}
                    </div>

                    {/* DIMENSION D5 */}
                    <div id="error-container-justificacionD5" className={`p-4 rounded-xl border transition-all ${errorsStep2.justificacionD5 ? 'border-red-300 bg-red-50/20' : 'border-slate-100 bg-slate-50/50'}`}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                        <span className="text-sm font-bold text-sky-950">D5. Riesgo ético, normativo o reputacional</span>
                        <div className="flex items-center gap-1.5 bg-white p-1 rounded-lg border border-slate-200">
                          {[0, 1, 2, 3].map((val) => (
                            <button
                              key={val}
                              type="button"
                              onClick={() => setMainForm(prev => ({ ...prev, puntajeD5: val }))}
                              className={`w-8 h-8 rounded-md font-bold text-xs transition-all cursor-pointer ${
                                mainForm.puntajeD5 === val ? 'bg-sky-900 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100'
                              }`}
                            >
                              {val}
                            </button>
                          ))}
                        </div>
                      </div>
                      <input 
                        type="text"
                        value={mainForm.justificacionD5}
                        onChange={(e) => setMainForm(prev => ({ ...prev, justificacionD5: e.target.value }))}
                        placeholder="Justifique el puntaje asignado para la dimensión ética y reputacional..."
                        className={`w-full mt-1.5 px-3 py-1.5 bg-white border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-sky-100 ${
                          errorsStep2.justificacionD5 ? 'border-red-500 bg-red-50/20' : 'border-slate-200'
                        }`}
                      />
                      {errorsStep2.justificacionD5 && <p className="text-[10px] text-red-500 mt-1 font-medium">{errorsStep2.justificacionD5}</p>}
                    </div>
                  </div>

                  {/* LIVE CALCULATION SHOWCASE CARD */}
                  <div className={`mt-8 p-6 rounded-2xl border transition-all ${flowType.colorText}`}>
                    <div className="flex items-start gap-4">
                      <div className="bg-white p-3 rounded-xl shadow-sm shrink-0">
                        <ShieldAlert className="h-8 w-8 text-sky-900" />
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-base font-bold text-slate-900">Resultado de la Clasificación Preliminar</h4>
                        
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-white border border-slate-200 shadow-sm text-slate-800">
                            Puntaje Total: <strong className="text-sky-950 text-sm font-black">{puntajeTotal}</strong> / 15
                          </span>
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-white border border-slate-200 shadow-sm text-slate-800">
                            Riesgo: <strong className="text-slate-950 font-bold">{flowType.level}</strong>
                          </span>
                        </div>

                        <div className="text-slate-800 mt-2 bg-white/70 p-4 rounded-xl text-xs leading-relaxed font-medium">
                          <p className="font-bold text-sky-950 mb-1">Flujo Institucional Asignado:</p>
                          <p className="font-semibold text-slate-900 mb-2">{flowType.fullName}</p>
                          <p className="font-bold text-sky-950 mb-0.5">Recomendación General:</p>
                          <p className="text-slate-600">{flowType.recommendation}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION H: DISCLAIMER PREVIO AL ENVÍO */}
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-sm">
                  <div className="flex items-start gap-3.5">
                    <Info className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-amber-950">Aviso importante del AI Product Owner (HILA)</h4>
                      <p className="text-xs text-amber-900 leading-relaxed font-semibold">
                        Antes de finalizar el registro, tenga en cuenta que el AI Product Owner revisará la información suministrada, validará la pertinencia de la iniciativa y procederá con la gestión de la solicitud según el flujo institucional correspondiente.
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ERROR SUMMARY BANNER IF VALIDATION FAILS */}
            {Object.keys(errorsStep2).length > 0 && (
              <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-5 flex items-start gap-3.5 shadow-sm">
                <AlertCircle className="h-6 w-6 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-red-950">Campos obligatorios pendientes ({Object.keys(errorsStep2).length})</h4>
                  <p className="text-xs text-red-800 font-medium">
                    No es posible continuar porque faltan campos por diligenciar. Por favor revise los siguientes campos destacados en rojo:
                  </p>
                  <ul className="mt-2 text-xs text-red-900 list-disc pl-4 space-y-0.5 font-semibold">
                    {Object.values(errorsStep2).map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Navigation buttons */}
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <button 
                type="button"
                onClick={() => setStep(1)}
                className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors inline-flex items-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" /> Datos Personales
              </button>
              <button 
                type="button"
                onClick={handleNextStep2}
                className="px-6 py-2.5 text-sm font-semibold text-white bg-sky-900 hover:bg-sky-950 rounded-xl transition-colors shadow-md inline-flex items-center gap-2 cursor-pointer"
              >
                Continuar a Documentos <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 3: DOCUMENTOS ANEXOS */}
        {step === 3 && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 space-y-6"
          >
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-100">
              <Upload className="text-sky-900 h-6 w-6" />
              <h3 className="text-lg font-bold text-slate-900">
                {isBI ? 'Documentos Soporte y Tablero de BI' : 'Documentos Soporte y Anexos'}
              </h3>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed mb-6">
              {isBI 
                ? 'Adjunte su archivo de Power BI (.pbix) o cargue otros soportes como Excel o PDFs de fuentes de datos. Se guardarán automáticamente en Google Drive.'
                : 'Adjunte los documentos soporte para el análisis de la iniciativa de Inteligencia Artificial. Cada archivo se subirá automáticamente a su carpeta de Google Drive.'
              }
              <strong> Los documentos son opcionales o recomendados; si no dispone de ellos, puede enviar el registro igualmente.</strong>
            </p>

            {/* LINK DE LA HERRAMIENTA / TABLERO (OPCIONAL) */}
            <div className="p-5 border border-slate-200 rounded-xl hover:border-sky-800 bg-slate-50/50 space-y-3 transition-colors">
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-1">
                  Enlace o Link de la Herramienta / Tablero (Opcional)
                </label>
                <p className="text-xs text-slate-400 mb-2">
                  Si la herramienta ya cuenta con una versión en línea, prototipo o tablero web (Ej. link público de Power BI Web, Sharepoint, URL de servidor), proporcione el enlace aquí.
                </p>
                <input
                  type="url"
                  value={mainForm.linkHerramienta || ''}
                  onChange={(e) => setMainForm(prev => ({ ...prev, linkHerramienta: e.target.value }))}
                  placeholder="Ej. https://app.powerbi.com/groups/me/reports/..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-900 transition-all bg-white"
                />
              </div>
            </div>

            {/* SLOT 1: FORMULACION METODOLOGICA / TABLERO BI */}
            <div className="p-5 border border-slate-200 rounded-xl hover:border-sky-800 transition-colors bg-slate-50/50 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 inline-flex items-center gap-2">
                    {isBI ? '1. Archivo o diseño del Tablero de BI (.pbix, .pdf, imágenes)' : '1. Formulación metodológica de la iniciativa de IA'}
                    <span className="text-[10px] bg-sky-100 text-sky-800 px-2 py-0.5 rounded font-bold uppercase">Sugerido</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    {isBI 
                      ? 'Adjunte el archivo original del tablero de BI o capturas de su diseño propuesto.' 
                      : 'Adjunte la formulación metodológica de la iniciativa, proyecto, idea o invención con Inteligencia Artificial.'
                    }
                  </p>
                </div>
                {attachedNames.metodologia && (
                  <button 
                    onClick={() => handleFileChange('metodologia', null)}
                    className="text-xs text-red-500 hover:underline font-semibold cursor-pointer"
                  >
                    Quitar
                  </button>
                )}
              </div>

              {!attachedNames.metodologia ? (
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer bg-white hover:bg-slate-50 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-6 h-6 text-slate-400 mb-1" />
                      <p className="text-xs text-slate-500 font-semibold">Haga clic o arrastre aquí para cargar archivo</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">PBIX, PDF, Excel, Word, Imágenes (Máx. 10MB)</p>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      onChange={(e) => handleFileChange('metodologia', e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 bg-sky-50 text-sky-950 p-3 rounded-lg border border-sky-200 text-xs font-semibold">
                  <FileText className="h-5 w-5 text-sky-900" />
                  <span className="truncate">{attachedNames.metodologia}</span>
                </div>
              )}
            </div>

            {/* SLOT 2: EVIDENCIA DE FUNCIONALIDAD / ESPECIFICACION FUENTES */}
            <div className="p-5 border border-slate-200 rounded-xl hover:border-sky-800 transition-colors bg-slate-50/50 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 inline-flex items-center gap-2">
                    {isBI ? '2. Estructura de fuentes de datos o diccionario de datos' : '2. Evidencia de funcionalidad de la invención'}
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold uppercase">Opcional</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">
                    {isBI 
                      ? 'Puede adjuntar el listado de campos o diccionario de datos de origen (Excel, SQL, etc.).'
                      : 'Puede adjuntar cualquier documento, presentación o video que demuestre la funcionalidad.'
                    }
                  </p>
                </div>
                {attachedNames.funcionalidad && (
                  <button 
                    onClick={() => handleFileChange('funcionalidad', null)}
                    className="text-xs text-red-500 hover:underline font-semibold cursor-pointer"
                  >
                    Quitar
                  </button>
                )}
              </div>

              {!attachedNames.funcionalidad ? (
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer bg-white hover:bg-slate-50 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-6 h-6 text-slate-400 mb-1" />
                      <p className="text-xs text-slate-500 font-semibold">Haga clic o arrastre aquí para cargar archivo</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">PDF, Excel, comprimido o imagen</p>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      onChange={(e) => handleFileChange('funcionalidad', e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 bg-sky-50 text-sky-950 p-3 rounded-lg border border-sky-200 text-xs font-semibold">
                  <FileText className="h-5 w-5 text-sky-900" />
                  <span className="truncate">{attachedNames.funcionalidad}</span>
                </div>
              )}
            </div>

            {/* SLOT 3: OTROS SOPORTES */}
            <div className="p-5 border border-slate-200 rounded-xl hover:border-sky-800 transition-colors bg-slate-50/50 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="text-sm font-bold text-slate-900 inline-flex items-center gap-2">
                    {isBI ? '3. Soportes adicionales (Ej. Aprobación jefe de área)' : '3. Soportes técnicos o administrativos'}
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold uppercase">Opcional</span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-1">Cualquier otro anexo de interés o contexto institucional.</p>
                </div>
                {attachedNames.soportes && (
                  <button 
                    onClick={() => handleFileChange('soportes', null)}
                    className="text-xs text-red-500 hover:underline font-semibold cursor-pointer"
                  >
                    Quitar
                  </button>
                )}
              </div>

              {!attachedNames.soportes ? (
                <div className="flex items-center justify-center w-full">
                  <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer bg-white hover:bg-slate-50 transition-colors">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-6 h-6 text-slate-400 mb-1" />
                      <p className="text-xs text-slate-500 font-semibold">Haga clic o arrastre aquí para cargar archivo</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Cualquier formato permitido por Google Drive</p>
                    </div>
                    <input 
                      type="file" 
                      className="hidden" 
                      onChange={(e) => handleFileChange('soportes', e.target.files?.[0] || null)}
                    />
                  </label>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 bg-sky-50 text-sky-950 p-3 rounded-lg border border-sky-200 text-xs font-semibold">
                  <FileText className="h-5 w-5 text-sky-900" />
                  <span className="truncate">{attachedNames.soportes}</span>
                </div>
              )}
            </div>

            {/* CONFIRMATION BEFORE SUBMIT */}
            <div className="bg-sky-50 border border-sky-100 p-5 rounded-2xl text-xs space-y-3 leading-relaxed">
              <h4 className="font-bold text-sky-950 text-sm">Declaración de Envío de Solicitud</h4>
              <p className="text-slate-700 font-semibold">
                {isBI 
                  ? '¿Confirma que desea enviar esta iniciativa de BI para revisión de Calidad y Tecnología?'
                  : '¿Confirma que desea enviar esta iniciativa de Inteligencia Artificial para revisión del AI Product Owner?'
                }
              </p>
              <ul className="list-disc pl-4 space-y-1 text-slate-600 font-medium">
                <li>Los datos de registro se guardarán automáticamente en Google Sheets de manera segura.</li>
                <li>Se creará una carpeta en Google Drive llamada <span className="font-semibold text-slate-900">"{personalData.nombreCompleto} - {personalData.cedula}"</span> para archivar sus anexos.</li>
                <li>Se le asignará de forma automática e instantánea el radicado institucional <span className="font-bold text-slate-900">{nextRadicado}</span>.</li>
              </ul>
            </div>

            {/* Navigation buttons */}
            <div className="flex justify-between items-center pt-6 border-t border-slate-100">
              <button 
                type="button"
                onClick={() => setStep(2)}
                className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors inline-flex items-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" /> Ficha de Solicitud
              </button>
              <button 
                type="button"
                onClick={handleFormSubmit}
                className="px-8 py-3 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-xl transition-colors shadow-md inline-flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle className="h-5 w-5" /> {isBI ? 'Enviar iniciativa de BI' : 'Enviar iniciativa con IA'}
              </button>
            </div>
          </motion.div>
        )}

        {/* STEP 4: SUCCESS SUMMARY MESSAGE */}
        {step === 4 && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-lg border border-green-100 p-8 text-center space-y-6"
          >
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600 shadow-md">
              <CheckCircle className="h-10 w-10" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-black text-slate-900">¡Registro Exitoso de Iniciativa!</h3>
              <p className="text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
                {isBI 
                  ? 'Gracias por registrar su iniciativa de BI (Business Intelligence). Su propuesta ha sido recibida correctamente por el Hospital Infantil Los Ángeles. El equipo de Calidad y Tecnología revisará los requisitos indicados.'
                  : 'Gracias por registrar su iniciativa o invención con Inteligencia Artificial. Su propuesta ha sido recibida correctamente por el Hospital Infantil Los Ángeles. El AI Product Owner revisará la información suministrada.'
                }
              </p>
            </div>

            {/* Ticket of Radicación */}
            <div className="max-w-md mx-auto bg-slate-50 border border-slate-200 rounded-2xl p-6 text-left space-y-4">
              <div className="border-b border-slate-200 pb-3 mb-2 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tique de Radicación</span>
                <span className="text-[10px] bg-green-100 text-green-800 font-black px-2.5 py-0.5 rounded-full uppercase">Recibido</span>
              </div>

              <div className="grid grid-cols-2 gap-y-3.5 gap-x-4 text-xs font-semibold">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Nº Radicado:</span>
                  <span className="text-sky-950 font-black text-sm">{nextRadicado}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Fecha Registro:</span>
                  <span className="text-slate-800">{isBI ? "17/01/2026" : formatDateSpanish(personalData.fechaRegistro)}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Nombre de Iniciativa:</span>
                  <span className="text-slate-800 text-[11px] font-bold line-clamp-1">{mainForm.nombreIniciativa}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Flujo Asignado:</span>
                  <span className="text-slate-900 font-bold block">{isBI ? 'Flujo Especial BI - Calidad y Tecnología' : flowType.fullName}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Correo Registrado:</span>
                  <span className="text-slate-800 block truncate">{personalData.correo}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-medium">Cédula:</span>
                  <span className="text-slate-800 block">{personalData.cedula}</span>
                </div>
              </div>

              {Object.values(attachedNames).some(n => n !== '') && (
                <div className="border-t border-slate-200 pt-3.5 mt-2">
                  <span className="text-[10px] text-slate-400 block uppercase font-medium mb-1.5">Documentos Anexos Cargados en Drive:</span>
                  <div className="space-y-1">
                    {attachedNames.metodologia && (
                      <p className="text-[10px] text-slate-600 flex items-center gap-1.5 font-bold">
                        <FileText className="h-3.5 w-3.5 text-sky-900" /> {attachedNames.metodologia}
                      </p>
                    )}
                    {attachedNames.funcionalidad && (
                      <p className="text-[10px] text-slate-600 flex items-center gap-1.5 font-bold">
                        <FileText className="h-3.5 w-3.5 text-sky-900" /> {attachedNames.funcionalidad}
                      </p>
                    )}
                    {attachedNames.soportes && (
                      <p className="text-[10px] text-slate-600 flex items-center gap-1.5 font-bold">
                        <FileText className="h-3.5 w-3.5 text-sky-900" /> {attachedNames.soportes}
                      </p>
                    )}
                  </div>
                  <p className="text-[9px] text-green-700 mt-2 font-semibold">✓ Carpetas y enlaces de Drive creados correctamente en la base de datos.</p>
                </div>
              )}
            </div>

            <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
              <button 
                type="button"
                onClick={handleDownloadReceiptPDF}
                className="px-6 py-3 text-sm font-bold text-white bg-rose-700 hover:bg-rose-800 rounded-xl transition-all shadow-md inline-flex items-center gap-2 cursor-pointer"
              >
                <Download className="h-4 w-4" /> Descargar Comprobante PDF
              </button>
              <button 
                type="button"
                onClick={onBackToHome}
                className="px-8 py-3 text-sm font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all shadow-xs cursor-pointer"
              >
                Volver a la Pantalla Principal
              </button>
            </div>
          </motion.div>
        )}

      </div>
    </div>
  );
}
