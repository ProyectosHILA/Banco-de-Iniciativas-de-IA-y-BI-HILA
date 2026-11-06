/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { IniciativaRecord, EvaluacionEstado, EvaluacionesComite, EvaluacionItem } from '../types';
import { AdminUser } from '../data/adminUsers';

export interface WorkflowStatus {
  // Step 1
  step1State: EvaluacionEstado;
  isStep1Valid: boolean;
  isStep1Rejected: boolean;

  // Step 2
  isStep2Unlocked: boolean;
  step2SistemasState: EvaluacionEstado;
  step2EstadisticaState: EvaluacionEstado;
  isStep2Valid: boolean;
  isStep2Rejected: boolean;

  // Step 3
  isStep3Unlocked: boolean;
  step3GerenciaState: EvaluacionEstado;
  step3PlaneacionState: EvaluacionEstado;
  step3AdminState: EvaluacionEstado;
  isStep3Valid: boolean;
  isStep3Rejected: boolean;

  // Global
  validatedCount: number;
  totalRequired: number;
  isAllApproved: boolean;
  isAnyRejected: boolean;
  overallStatus: 'Aprobado' | 'Rechazado' | 'En Proceso' | 'Pendiente';
}

export function getWorkflowStatus(record: IniciativaRecord): WorkflowStatus {
  const ev = record.evaluaciones || {};

  const step1State: EvaluacionEstado = ev.proteccionDato?.estado || 'Pendiente';
  const isStep1Valid = step1State === 'Validado';
  const isStep1Rejected = step1State === 'Rechazado';

  // Step 2 is unlocked ONLY when Step 1 is Validado
  const isStep2Unlocked = isStep1Valid;
  const step2SistemasState: EvaluacionEstado = ev.gobiernoSistemas?.estado || 'Pendiente';
  const step2EstadisticaState: EvaluacionEstado = ev.gobiernoEstadistica?.estado || 'Pendiente';
  
  const isStep2Valid = isStep2Unlocked && (step2SistemasState === 'Validado') && (step2EstadisticaState === 'Validado');
  const isStep2Rejected = isStep2Unlocked && (step2SistemasState === 'Rechazado' || step2EstadisticaState === 'Rechazado');

  // Step 3 is unlocked ONLY when Step 2 is fully Validado
  const isStep3Unlocked = isStep2Valid;
  const step3GerenciaState: EvaluacionEstado = ev.validacionGerencia?.estado || 'Pendiente';
  const step3PlaneacionState: EvaluacionEstado = ev.validacionPlaneacion?.estado || 'Pendiente';
  const step3AdminState: EvaluacionEstado = ev.validacionAdmin?.estado || 'Pendiente';

  const isStep3Valid = isStep3Unlocked && 
    (step3GerenciaState === 'Validado') && 
    (step3PlaneacionState === 'Validado') && 
    (step3AdminState === 'Validado');
  const isStep3Rejected = isStep3Unlocked && 
    (step3GerenciaState === 'Rechazado' || step3PlaneacionState === 'Rechazado' || step3AdminState === 'Rechazado');

  // Validated count (out of 6 total approvals)
  const items: EvaluacionEstado[] = [
    step1State,
    step2SistemasState,
    step2EstadisticaState,
    step3GerenciaState,
    step3PlaneacionState,
    step3AdminState
  ];

  const validatedCount = items.filter(s => s === 'Validado').length;
  const totalRequired = 6;
  const isAllApproved = validatedCount === totalRequired;
  const isAnyRejected = isStep1Rejected || isStep2Rejected || isStep3Rejected;

  let overallStatus: 'Aprobado' | 'Rechazado' | 'En Proceso' | 'Pendiente' = 'Pendiente';
  if (isAllApproved) {
    overallStatus = 'Aprobado';
  } else if (isAnyRejected) {
    overallStatus = 'Rechazado';
  } else if (validatedCount > 0) {
    overallStatus = 'En Proceso';
  }

  return {
    step1State,
    isStep1Valid,
    isStep1Rejected,
    isStep2Unlocked,
    step2SistemasState,
    step2EstadisticaState,
    isStep2Valid,
    isStep2Rejected,
    isStep3Unlocked,
    step3GerenciaState,
    step3PlaneacionState,
    step3AdminState,
    isStep3Valid,
    isStep3Rejected,
    validatedCount,
    totalRequired,
    isAllApproved,
    isAnyRejected,
    overallStatus
  };
}

/**
 * Determine if a specific user can evaluate a given step field
 */
export function canUserEvaluateField(
  user: AdminUser | null,
  fieldKey: 'proteccionDato' | 'gobiernoSistemas' | 'gobiernoEstadistica' | 'validacionGerencia' | 'validacionPlaneacion' | 'validacionAdmin',
  workflow: WorkflowStatus
): { canEdit: boolean; reason?: string } {
  if (!user) {
    return { canEdit: false, reason: 'Debe iniciar sesión' };
  }

  // Master admin can edit or assist all, or user can edit their specific field
  const isMasterAdmin = user.role === 'admin';

  switch (fieldKey) {
    case 'proteccionDato':
      if (user.role === 'adminsistem' || isMasterAdmin) {
        return { canEdit: true };
      }
      return { canEdit: false, reason: 'Reservado para adminsistem (Protección de Datos)' };

    case 'gobiernoSistemas':
      if (!workflow.isStep2Unlocked) {
        return { canEdit: false, reason: 'Bloqueado: Requiere validación previa de Protección de Dato' };
      }
      if (user.role === 'adminsistem' || isMasterAdmin) {
        return { canEdit: true };
      }
      return { canEdit: false, reason: 'Reservado para adminsistem (Gobierno)' };

    case 'gobiernoEstadistica':
      if (!workflow.isStep2Unlocked) {
        return { canEdit: false, reason: 'Bloqueado: Requiere validación previa de Protección de Dato' };
      }
      if (user.role === 'estadmin' || isMasterAdmin) {
        return { canEdit: true };
      }
      return { canEdit: false, reason: 'Reservado para estadmin (Calidad del Dato)' };

    case 'validacionGerencia':
      if (!workflow.isStep3Unlocked) {
        return { canEdit: false, reason: 'Bloqueado: Requiere validación previa de Gobierno y Calidad del Dato' };
      }
      if (user.role === 'geradmin' || isMasterAdmin) {
        return { canEdit: true };
      }
      return { canEdit: false, reason: 'Reservado para geradmin (Gerencia)' };

    case 'validacionPlaneacion':
      if (!workflow.isStep3Unlocked) {
        return { canEdit: false, reason: 'Bloqueado: Requiere validación previa de Gobierno y Calidad del Dato' };
      }
      if (user.role === 'planadmin' || isMasterAdmin) {
        return { canEdit: true };
      }
      return { canEdit: false, reason: 'Reservado para planadmin (Planeación)' };

    case 'validacionAdmin':
      if (!workflow.isStep3Unlocked) {
        return { canEdit: false, reason: 'Bloqueado: Requiere validación previa de Gobierno y Calidad del Dato' };
      }
      if (user.role === 'admin') {
        return { canEdit: true };
      }
      return { canEdit: false, reason: 'Reservado para admin (Admin General)' };

    default:
      return { canEdit: false };
  }
}
