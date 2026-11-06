/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, ShieldCheck, Database, FolderOpen, ArrowRight, UserCheck, ArrowLeft, 
  Lock, AlertCircle, FileText, CheckCircle, Trash2, LayoutDashboard, BarChart2
} from 'lucide-react';
import { IniciativaRecord, FormConfigField, AuditLog } from './types';
import { MOCK_RECORDS, INITIAL_FORM_CONFIG, INITIAL_AUDIT_LOGS } from './data/initialConfig';
import { ADMIN_USERS, AdminUser } from './data/adminUsers';
import FormRegistrador from './components/FormRegistrador';
import AdminPanel from './components/AdminPanel';
import { ErrorBoundary } from './components/ErrorBoundary';

import { 
  getDbRecords, 
  saveDbRecord, 
  deleteDbRecord, 
  getDbAuditLogs, 
  saveDbAuditLog,
  subscribeToDbRecords,
  subscribeToDbAuditLogs
} from './lib/firebase';

export default function App() {
  // Navigation State: 'home' | 'registrador' | 'admin_login' | 'admin_panel'
  const [currentView, setCurrentView] = useState<'home' | 'registrador' | 'admin_login' | 'admin_panel'>('home');
  const [isFormBI, setIsFormBI] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  // Persistence State
  const [records, setRecords] = useState<IniciativaRecord[]>([]);
  const [formConfig, setFormConfig] = useState<FormConfigField[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Current logged in administrator user
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);

  // Admin login credentials state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Subscribe to real-time data from Firestore
  useEffect(() => {
    setIsLoading(true);

    // 1. Real-time subscriber for records
    const unsubscribeRecords = subscribeToDbRecords(
      async (fetchedRecords) => {
        if (fetchedRecords && fetchedRecords.length > 0) {
          setRecords(fetchedRecords);
          localStorage.setItem('hila_records', JSON.stringify(fetchedRecords));
        } else {
          // If Firestore is empty, seed it with mock records once so the app is populated
          console.log("Seeding empty Firestore database with mock records...");
          for (const rec of MOCK_RECORDS) {
            await saveDbRecord(rec);
          }
          setRecords(MOCK_RECORDS);
          localStorage.setItem('hila_records', JSON.stringify(MOCK_RECORDS));
        }
        setIsLoading(false);
      },
      (err) => {
        console.error("Error subscribing to Firestore records:", err);
        const cachedRecs = localStorage.getItem('hila_records');
        if (cachedRecs) {
          try {
            setRecords(JSON.parse(cachedRecs));
          } catch (e) {
            setRecords(MOCK_RECORDS);
          }
        } else {
          setRecords(MOCK_RECORDS);
        }
        setIsLoading(false);
      }
    );

    // 2. Real-time subscriber for audit logs
    const unsubscribeLogs = subscribeToDbAuditLogs(
      async (fetchedLogs) => {
        if (fetchedLogs && fetchedLogs.length > 0) {
          setAuditLogs(fetchedLogs);
          localStorage.setItem('hila_audit_logs', JSON.stringify(fetchedLogs));
        } else {
          console.log("Seeding empty Firestore database with initial audit logs...");
          for (const log of INITIAL_AUDIT_LOGS) {
            await saveDbAuditLog(log);
          }
          setAuditLogs(INITIAL_AUDIT_LOGS);
          localStorage.setItem('hila_audit_logs', JSON.stringify(INITIAL_AUDIT_LOGS));
        }
      },
      (err) => {
        console.error("Error subscribing to Firestore audit logs:", err);
        const cachedLogs = localStorage.getItem('hila_audit_logs');
        if (cachedLogs) {
          try {
            setAuditLogs(JSON.parse(cachedLogs));
          } catch (e) {
            setAuditLogs(INITIAL_AUDIT_LOGS);
          }
        } else {
          setAuditLogs(INITIAL_AUDIT_LOGS);
        }
      }
    );

    // 3. Form Config Field definitions
    const cachedConfig = localStorage.getItem('hila_form_config');
    if (cachedConfig) {
      setFormConfig(JSON.parse(cachedConfig));
    } else {
      setFormConfig(INITIAL_FORM_CONFIG);
      localStorage.setItem('hila_form_config', JSON.stringify(INITIAL_FORM_CONFIG));
    }

    return () => {
      unsubscribeRecords();
      unsubscribeLogs();
    };
  }, []);

  // Manual trigger to force re-fetch from Firestore
  const handleSyncFromDb = async () => {
    setIsSyncing(true);
    try {
      const dbRecs = await getDbRecords();
      if (dbRecs && dbRecs.length > 0) {
        setRecords(dbRecs);
        localStorage.setItem('hila_records', JSON.stringify(dbRecs));
      }
      const dbLogs = await getDbAuditLogs();
      if (dbLogs && dbLogs.length > 0) {
        setAuditLogs(dbLogs);
        localStorage.setItem('hila_audit_logs', JSON.stringify(dbLogs));
      }
    } catch (e) {
      console.error("Manual sync error:", e);
    } finally {
      setIsSyncing(false);
    }
  };

  // Log action writer
  const writeAuditLog = async (
    user: string, 
    role: 'Administrador' | 'Registrador', 
    action: string, 
    radicado: string, 
    detail: string, 
    email: string, 
    area: string
  ) => {
    const log: AuditLog = {
      timestamp: new Date().toISOString(),
      usuario: user,
      rol: role,
      accionRealizada: action,
      radicadoRelacionado: radicado,
      detalleAccion: detail,
      correo: email,
      areaServicio: area
    };

    // Save to Firestore
    await saveDbAuditLog(log);

    // Sync in state
    setAuditLogs(prev => [log, ...prev]);
  };

  // Generate continuous consecutive radicado code depending on IA or BI type
  const getNextRadicado = (isBI: boolean) => {
    const currentYear = 2026;
    const prefix = isBI ? `BI-HILA-${currentYear}-` : `IA-HILA-${currentYear}-`;
    
    let lastSeq = 0;
    records.forEach(r => {
      if (r.radicado.startsWith(prefix)) {
        const parts = r.radicado.split('-');
        const seq = parseInt(parts[parts.length - 1]);
        if (!isNaN(seq) && seq > lastSeq) lastSeq = seq;
      }
    });

    const nextSeqStr = String(lastSeq + 1).padStart(4, '0');
    return `${prefix}${nextSeqStr}`;
  };

  // Submit Registrador innovation handler
  const handleAddNewRecord = async (newRecord: IniciativaRecord) => {
    // 1. Save to Firestore
    const success = await saveDbRecord(newRecord);
    if (!success) {
      console.warn("No se pudo guardar directamente en el servidor principal, los datos se guardarán en caché local.");
    }

    // 2. Update React State
    setRecords(prev => [newRecord, ...prev]);

    // 3. Save to Local Storage Cache
    const currentCached = localStorage.getItem('hila_records');
    const list = currentCached ? JSON.parse(currentCached) : [];
    localStorage.setItem('hila_records', JSON.stringify([newRecord, ...list]));
    
    // 4. Auto add log
    const detailMsg = newRecord.tipoIniciativa === 'BI'
      ? `Se registró la propuesta de BI "${newRecord.nombreIniciativa}" para tableros analíticos.`
      : `Se registró la propuesta de IA "${newRecord.nombreIniciativa}" asignada al flujo preliminar.`;

    await writeAuditLog(
      newRecord.nombreCompleto,
      'Registrador',
      'Registro de iniciativa',
      newRecord.radicado,
      detailMsg,
      newRecord.correo,
      newRecord.areaServicio
    );
  };

  // Update administrative reviewer comments/state handler
  const handleUpdateRecord = async (updatedRecord: IniciativaRecord) => {
    // 1. Save to Firestore
    const success = await saveDbRecord(updatedRecord);
    if (!success) {
      console.warn("No se pudo guardar la actualización en Firestore.");
    }

    // 2. Update state and cache
    setRecords(prev => {
      const next = prev.map(r => r.radicado === updatedRecord.radicado ? updatedRecord : r);
      localStorage.setItem('hila_records', JSON.stringify(next));
      return next;
    });

    // 3. Auto add log
    const actorName = currentUser ? `${currentUser.name} (${currentUser.username})` : 'Administrador';
    const actorEmail = currentUser ? currentUser.email : 'admin@hila.org.co';
    const actorDept = currentUser ? currentUser.department : 'Tecnología y Gestión';

    await writeAuditLog(
      actorName,
      'Administrador',
      'Actualización de registro',
      updatedRecord.radicado,
      `Se actualizó el registro "${updatedRecord.nombreIniciativa}" (Estado: "${updatedRecord.estadoRevision}").`,
      actorEmail,
      actorDept
    );
  };

  // Delete record handler
  const handleDeleteRecord = async (radicado: string) => {
    const targetRecord = records.find(r => r.radicado === radicado);
    const label = targetRecord ? targetRecord.nombreIniciativa : 'Registro';

    // 1. Delete from Firestore
    const success = await deleteDbRecord(radicado);

    // 2. ALWAYS update React State and localStorage so it is removed from the UI immediately
    setRecords(prev => {
      const next = prev.filter(r => r.radicado !== radicado);
      localStorage.setItem('hila_records', JSON.stringify(next));
      return next;
    });

    // 3. Write audit log
    const actorName = currentUser ? `${currentUser.name} (${currentUser.username})` : 'Administrador';
    const actorEmail = currentUser ? currentUser.email : 'admin@hila.org.co';
    const actorDept = currentUser ? currentUser.department : 'Tecnología y Gestión';

    await writeAuditLog(
      actorName,
      'Administrador',
      'Eliminación de registro',
      radicado,
      `Se eliminó de forma permanente la iniciativa "${label}" de la base de datos institucional.`,
      actorEmail,
      actorDept
    );

    if (success) {
      alert("✓ El registro ha sido eliminado exitosamente del servidor Firestore.");
    } else {
      alert("✓ El registro ha sido eliminado localmente (hubo un inconveniente al sincronizar con Firestore).");
    }
  };

  // Save modified form configuration questions
  const handleUpdateFormConfig = (updatedConfig: FormConfigField[]) => {
    setFormConfig(updatedConfig);
    localStorage.setItem('hila_form_config', JSON.stringify(updatedConfig));
    const actorName = currentUser ? `${currentUser.name} (${currentUser.username})` : 'Administrador';
    const actorEmail = currentUser ? currentUser.email : 'admin@hila.org.co';
    const actorDept = currentUser ? currentUser.department : 'Tecnología y Gestión';

    writeAuditLog(
      actorName,
      'Administrador',
      'Modificación Configuración',
      '-',
      'Se modificó la configuración dinámica de preguntas en la hoja de Configuración Formulario.',
      actorEmail,
      actorDept
    );
  };

  // Login action for all 5 authorized admin profiles
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = username.trim().toLowerCase();
    const matched = ADMIN_USERS.find(
      u => u.username.toLowerCase() === cleanUser && u.password === password
    );

    if (matched) {
      setCurrentUser(matched);
      setCurrentView('admin_panel');
      setLoginError('');
      await writeAuditLog(
        `${matched.name} (${matched.username})`,
        'Administrador',
        'Ingreso al sistema',
        '-',
        `El usuario ${matched.name} (${matched.roleTitle}) inició sesión con credenciales autorizadas.`,
        matched.email,
        matched.department
      );
      // clean form
      setUsername('');
      setPassword('');
    } else {
      setLoginError('Credenciales incorrectas. Verifique el usuario y la contraseña provistos por la institución.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      
      {/* Top Main Navigation Header */}
      <header className="bg-sky-950 text-white py-4 px-6 shadow-md border-b border-sky-900/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setCurrentView('home')} 
            className="flex items-center gap-2 font-black text-sm tracking-tight bg-white/5 border border-white/10 hover:bg-white/10 px-3.5 py-1.5 rounded-xl transition-all cursor-pointer text-left"
          >
            <Activity className="h-5 w-5 text-emerald-400" />
            <span>HILA • Banco de Iniciativas de IA y BI</span>
          </button>
        </div>

        {/* Removed Code Apps Script button completely as requested */}
        <div className="flex items-center gap-2">
          {currentView !== 'home' && (
            <button
              onClick={() => setCurrentView('home')}
              className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" /> Volver al Inicio
            </button>
          )}
        </div>
      </header>

      {/* Main Screen Layout Container */}
      <main className="flex-grow">
        
        {/* Loader Screen */}
        {isLoading ? (
          <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-sky-900 border-t-transparent shadow-sm"></div>
            <p className="text-xs font-semibold text-slate-500">Conectando con base de datos en la nube Firestore...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            
            {/* 1. HOME SCREEN */}
            {currentView === 'home' && (
              <motion.div 
                key="home"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="max-w-4xl mx-auto py-12 px-4 sm:px-6 text-center space-y-12"
              >
                {/* Custom Institutional Hospital Logo at the very top of Home Page */}
                <div className="flex justify-center mb-2">
                  <div className="bg-white p-2.5 rounded-2xl shadow-md border border-slate-200/60 flex items-center justify-center overflow-hidden w-28 h-28 shrink-0 transition-transform hover:scale-105 duration-300">
                    <img 
                      src="https://lh3.googleusercontent.com/d/1JhYNFWl0CkW_4_HKkR1ziY-HBk2YGUm6" 
                      alt="Logo Hospital Infantil Los Ángeles" 
                      className="w-full h-full object-contain"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const nextSibling = e.currentTarget.nextElementSibling;
                        if (nextSibling) (nextSibling as HTMLElement).style.display = 'block';
                      }}
                    />
                    <div style={{ display: 'none' }} className="text-sky-900">
                      <Activity className="h-16 w-16" />
                    </div>
                  </div>
                </div>

                {/* Institutional Hero Banner */}
                <div className="space-y-4">
                  <div className="inline-flex bg-sky-50 border border-sky-100 px-4 py-2 rounded-full text-[11px] font-black text-sky-900 uppercase tracking-widest">
                    Hospital Infantil Los Ángeles
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight max-w-3xl mx-auto">
                    Banco de Iniciativas de IA y BI – HILA
                  </h1>
                  <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
                    Este sistema permite registrar, consultar y gestionar las iniciativas innovadoras con Inteligencia Artificial y tableros de BI (Power BI o Data Studio) propuestas por los colaboradores del Hospital Infantil Los Ángeles.
                  </p>
                </div>

                {/* Major Action Buttons - Expanded to support the brand-new yellow BI button! */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl mx-auto pt-4">
                  
                  {/* IA Registrador flow button */}
                  <button
                    id="btn-registrador-flow"
                    onClick={() => {
                      setIsFormBI(false);
                      setCurrentView('registrador');
                    }}
                    className="p-8 bg-sky-900 hover:bg-sky-950 text-white rounded-2xl shadow-lg hover:shadow-xl transition-all border border-sky-900 flex flex-col items-center text-center space-y-4 group cursor-pointer"
                  >
                    <div className="bg-white/10 p-4 rounded-2xl group-hover:scale-105 transition-all shadow-inner">
                      <FileText className="h-8 w-8 text-emerald-300" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-slate-300 block uppercase font-black tracking-wider">Colaboradores IA</span>
                      <h3 className="text-lg font-black block leading-tight">Registrar Iniciativa de IA</h3>
                      <p className="text-xs text-slate-200/80 max-w-xs leading-normal font-medium">Complete el instrumento F-IA-001 y adjunte soportes para la evaluación preliminar.</p>
                    </div>
                    <div className="pt-2 font-bold text-xs text-emerald-300 inline-flex items-center gap-1 mt-auto">
                      Comenzar registro IA <ArrowRight className="h-4 w-4" />
                    </div>
                  </button>

                  {/* BI Registrador flow button - YELLOW AND BLACK TEXT AS REQUESTED */}
                  <button
                    id="btn-registrador-bi"
                    onClick={() => {
                      setIsFormBI(true);
                      setCurrentView('registrador');
                    }}
                    className="p-8 bg-yellow-400 hover:bg-yellow-500 text-slate-950 rounded-2xl shadow-lg hover:shadow-xl transition-all border border-yellow-400 flex flex-col items-center text-center space-y-4 group cursor-pointer font-bold"
                  >
                    <div className="bg-slate-950/10 p-4 rounded-2xl group-hover:scale-105 transition-all shadow-inner">
                      <BarChart2 className="h-8 w-8 text-slate-950" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-yellow-950 block uppercase font-black tracking-wider">Colaboradores BI</span>
                      <h3 className="text-lg font-black block text-slate-950 leading-tight">Registrar Tableros BI (Power BI o Data Studio)</h3>
                      <p className="text-xs text-slate-900/80 max-w-xs leading-normal font-medium">Identificación del solicitante, especificaciones del tablero, alcance, fuentes de datos y criterios de éxito.</p>
                    </div>
                    <div className="pt-2 font-black text-xs text-slate-950 inline-flex items-center gap-1 mt-auto">
                      Comenzar registro BI <ArrowRight className="h-4 w-4" />
                    </div>
                  </button>

                  {/* Administrator flow button */}
                  <button
                    id="btn-admin-flow"
                    onClick={() => {
                      setUsername('');
                      setPassword('');
                      setLoginError('');
                      setCurrentView('admin_login');
                    }}
                    className="p-8 bg-white hover:bg-slate-50 text-slate-800 rounded-2xl shadow-lg hover:shadow-xl transition-all border border-slate-200 flex flex-col items-center text-center space-y-4 group cursor-pointer"
                  >
                    <div className="bg-sky-50 p-4 rounded-2xl group-hover:scale-105 transition-all shadow-inner">
                      <UserCheck className="h-8 w-8 text-sky-900" />
                    </div>
                    <div className="space-y-1">
                      <span className="text-xs text-slate-400 block uppercase font-black tracking-wider">Gestión Administrativa</span>
                      <h3 className="text-lg font-black text-sky-950 block leading-tight">Ingresar como Administrador</h3>
                      <p className="text-xs text-slate-500 max-w-xs leading-normal font-medium">Acceda al panel de control, gestione estados, revise dictámenes técnicos y elimine registros.</p>
                    </div>
                    <div className="pt-2 font-bold text-xs text-sky-900 inline-flex items-center gap-1 mt-auto">
                      Acceder al Panel <ArrowRight className="h-4 w-4" />
                    </div>
                  </button>

                </div>

                {/* Beautiful Institutional Info Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-10 border-t border-slate-200 text-left max-w-3xl mx-auto text-xs">
                  <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1.5 font-semibold">
                    <div className="flex items-center gap-2 text-sky-900">
                      <ShieldCheck className="h-5 w-5" />
                      <h4 className="font-bold">Análisis de Riesgo</h4>
                    </div>
                    <p className="text-slate-500 font-medium leading-relaxed">Ponderación automática del riesgo en 5 dimensiones clínicas, éticas, y técnicas para asignar el flujo de aprobación.</p>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1.5 font-semibold">
                    <div className="flex items-center gap-2 text-sky-900">
                      <Database className="h-5 w-5" />
                      <h4 className="font-bold">Google Workspace</h4>
                    </div>
                    <p className="text-slate-500 font-medium leading-relaxed">Conexión con Google Sheets para el guardado de datos y Google Drive para la catalogación automatizada de anexos.</p>
                  </div>

                  <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-1.5 font-semibold">
                    <div className="flex items-center gap-2 text-sky-900">
                      <CheckCircle className="h-5 w-5" />
                      <h4 className="font-bold">Trazabilidad Total</h4>
                    </div>
                    <p className="text-slate-500 font-medium leading-relaxed">Bitácora de auditoría incorporada en Firestore para registrar ingresos de usuarios y actualización de dictámenes del AI Product Owner.</p>
                  </div>
                </div>

                {/* Hospital address and copyright footer */}
                <footer className="pt-8 text-center text-[11px] text-slate-400 font-medium space-y-1">
                  <p>Hospital Infantil Los Ángeles — HILA • Pasto, Nariño, Colombia</p>
                  <p>Oficina de Desarrollo de Tecnología, Innovación y Calidad • © 2026 Todos los derechos reservados</p>
                </footer>
              </motion.div>
            )}

            {/* 2. REGISTRADOR FORM WIZARD */}
            {currentView === 'registrador' && (
              <motion.div 
                key="registrador"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <FormRegistrador 
                  onBackToHome={() => setCurrentView('home')}
                  onSubmitRecord={handleAddNewRecord}
                  nextRadicado={getNextRadicado(isFormBI)}
                  isBI={isFormBI}
                />
              </motion.div>
            )}

            {/* 3. ADMIN LOGIN SCREEN */}
            {currentView === 'admin_login' && (
              <motion.div 
                key="admin_login"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-md mx-auto py-20 px-4"
              >
                <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-8 space-y-6">
                  <div className="text-center space-y-2">
                    <div className="bg-sky-50 text-sky-900 p-3 rounded-2xl w-14 h-14 flex items-center justify-center mx-auto border border-sky-100">
                      <Lock className="h-7 w-7 animate-pulse" />
                    </div>
                    <h2 className="text-xl font-bold text-slate-900">Ingreso Administrativo</h2>
                    <p className="text-xs text-slate-500 font-medium">Ingrese sus credenciales autorizadas del hospital</p>
                  </div>

                  <form onSubmit={handleAdminLogin} className="space-y-4 font-semibold text-slate-700">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Usuario de Acceso</label>
                      <input 
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        autoComplete="off"
                        className="w-full px-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-900 transition-all text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">Contraseña</label>
                      <input 
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        autoComplete="new-password"
                        className="w-full px-4 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-sky-100 focus:border-sky-900 transition-all text-slate-800"
                      />
                    </div>

                    {loginError && (
                      <div className="bg-red-50 border border-red-100 text-red-700 p-3.5 rounded-xl text-xs flex items-start gap-2">
                        <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                        <span className="font-medium leading-normal">{loginError}</span>
                      </div>
                    )}

                    <div className="pt-2 flex gap-3">
                      <button 
                        type="button"
                        onClick={() => setCurrentView('home')}
                        className="w-1/3 py-2.5 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition-all text-center cursor-pointer"
                      >
                        Volver
                      </button>
                      <button 
                        type="submit"
                        className="flex-1 py-2.5 text-xs text-white bg-sky-900 hover:bg-sky-950 rounded-xl font-bold transition-all text-center shadow-md shadow-sky-900/15 cursor-pointer"
                      >
                        Iniciar Sesión
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}

            {/* 4. ADMIN PANEL (FULL INSTRUMENTS) */}
            {currentView === 'admin_panel' && (
              <motion.div 
                key="admin_panel"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <ErrorBoundary fallbackTitle="Error al renderizar el Panel Administrativo">
                  <AdminPanel 
                    records={records}
                    currentUser={currentUser}
                    onSwitchUser={(user) => {
                      setCurrentUser(user);
                      writeAuditLog(
                        `${user.name} (${user.username})`,
                        'Administrador',
                        'Cambio de perfil activo',
                        '-',
                        `El administrador cambió de perfil activo a ${user.name} (${user.roleTitle}).`,
                        user.email,
                        user.department
                      );
                    }}
                    onUpdateRecord={handleUpdateRecord}
                    onDeleteRecord={handleDeleteRecord}
                    auditLogs={auditLogs}
                    formConfig={formConfig}
                    onUpdateFormConfig={handleUpdateFormConfig}
                    onSyncFromDb={handleSyncFromDb}
                    isSyncing={isSyncing}
                    onLogout={async () => {
                      if (currentUser) {
                        await writeAuditLog(
                          `${currentUser.name} (${currentUser.username})`,
                          'Administrador',
                          'Cierre de sesión',
                          '-',
                          `El usuario ${currentUser.name} cerró sesión en el panel administrativo.`,
                          currentUser.email,
                          currentUser.department
                        );
                      }
                      setCurrentUser(null);
                      setCurrentView('home');
                    }}
                  />
                </ErrorBoundary>
              </motion.div>
            )}

          </AnimatePresence>
        )}
      </main>
    </div>
  );
}
