/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface IniciativaRecord {
  tipoIniciativa: 'IA' | 'BI';
  timestamp: string;
  radicado: string;
  nombreCompleto: string;
  cedula: string;
  correo: string;
  areaServicio: string;
  fechaRegistro: string;
  nombreIniciativa: string;
  areaSolicitante: string;
  liderResponsable: string;
  fechaSolicitud: string;
  problema: string;
  objetivo: string;
  procesoImpactado: string;
  
  // IA specific
  tipoIa?: string[]; // administrative, clinical, image, etc.
  otroTipoIa?: string;
  herramientaSugerida?: string;
  estadoHerramienta?: string; // 'autorizada', 'nueva', 'evaluacion'
  descripcionEvaluacion?: string;
  soportesAnexos?: string;
  datosUtilizados?: string;
  incluyeDatosPacientes?: 'Sí' | 'No';
  incluyeDatosSensibles?: 'Sí' | 'No' | 'No estoy seguro/a';
  requiereIntegracion?: 'Sí' | 'No';
  sistemasIntegracion?: string;
  usuarios?: string;
  beneficios?: string;
  indicadores?: string;
  riesgos?: string;
  costoEstimado?: string;
  propuestaPlanPiloto?: string;

  // BI specific
  alcanceBI?: string;
  fuentesDatosBI?: string;
  funcionalidadesBI?: string;
  disenoVisualBI?: string;
  integracionIaBI?: string;
  criteriosExitoBI?: string;
  limitacionesRiesgosBI?: string;
  
  // Risk assessment dimensions (0-3) (mainly for IA, but can be simulated or set to 0 for BI)
  justificacionD1?: string;
  puntajeD1?: number;
  justificacionD2?: string;
  puntajeD2?: number;
  justificacionD3?: string;
  puntajeD3?: number;
  justificacionD4?: string;
  puntajeD4?: number;
  justificacionD5?: string;
  puntajeD5?: number;
  
  puntajeTotal?: number;
  nivelRiesgo?: string;
  flujoAsignado?: string;
  mensajeRevisionMostrado?: boolean;
  linkHerramienta?: string;
  
  // File attachments
  urlCarpetaAnexos: string;
  urlsDocumentosAnexos: string[]; // simulated links
  nombresDocumentosAnexos: string[]; // original names
  
  // Administrative fields
  estadoRevision: 'Recibido' | 'En revisión' | 'Requiere ajustes' | 'Aprobado para Comité de Innovación' | 'Aprobado para piloto' | 'No aprobado' | 'Cerrado';
  responsableRevision: string;
  observacionesAdministrador: string;
  ultimaActualizacion: string;

  // Committee Evaluations (Multi-User Approval Workflow)
  evaluaciones?: EvaluacionesComite;
}

export type EvaluacionEstado = 'Validado' | 'Pendiente' | 'Rechazado';

export interface EvaluacionItem {
  estado: EvaluacionEstado;
  fecha?: string;
  usuario?: string;
  observacion?: string;
}

export interface EvaluacionesComite {
  // Paso 1: Protección de Dato (evaluado por adminsistem)
  proteccionDato?: EvaluacionItem;

  // Paso 2: Gobierno y Calidad del Dato (evaluado por adminsistem y estadmin)
  gobiernoSistemas?: EvaluacionItem;
  gobiernoEstadistica?: EvaluacionItem;

  // Paso 3: Validación Final (evaluado por geradmin, planadmin y admin)
  validacionGerencia?: EvaluacionItem;
  validacionPlaneacion?: EvaluacionItem;
  validacionAdmin?: EvaluacionItem;
}

export interface FormConfigField {
  id: string;
  seccion: string;
  nombreCampo: string;
  textoAyuda: string;
  tipoCampo: 'text' | 'textarea' | 'select' | 'checkbox' | 'radio';
  opciones: string[];
  obligatorio: boolean;
  activo: boolean;
  orden: number;
  ultimaActualizacion: string;
}

export interface AuditLog {
  timestamp: string;
  usuario: string;
  rol: 'Administrador' | 'Registrador';
  accionRealizada: string;
  radicadoRelacionado: string;
  detalleAccion: string;
  correo: string;
  areaServicio: string;
}
