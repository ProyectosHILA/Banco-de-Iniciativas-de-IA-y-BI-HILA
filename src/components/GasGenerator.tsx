/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  FileCode, Terminal, HelpCircle, Copy, Check, CheckCircle, Info, ExternalLink, Settings, ShieldCheck, Database, FolderOpen, ChevronRight
} from 'lucide-react';

export default function GasGenerator() {
  const [activeFile, setActiveFile] = useState<'code' | 'index' | 'styles' | 'script' | 'instructions'>('instructions');
  const [copied, setCopied] = useState(false);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const codeGsContent = `/**
 * BANCO INSTITUCIONAL DE INICIATIVAS E INVENCIONES CON IA - HILA
 * Código de backend de Google Apps Script (Code.gs)
 * Hospital Infantil Los Ángeles - Pasto, Nariño
 * v1.0 / 2026
 */

// URL de la hoja de cálculo institucional y ID de carpeta principal de Drive
const SPREADSHEET_URL = "https://docs.google.com/spreadsheets/d/1IrN5tyLa2sVoCaeCv8wIxBLUyEtbHJSbENiLE9l6TWE/edit?usp=sharing";
const DRIVE_PARENT_FOLDER_ID = "1dQ3LYezaW-GaRQSkFTenmlXTQk-Lg1-i"; // Extraído del enlace de Drive compartido

// Función principal para servir la aplicación web
function doGet(e) {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Banco de Iniciativas de IA - HILA')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// Función auxiliar para incluir archivos HTML (CSS/JS) inline
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// Obtener hoja de cálculo principal
function getSpreadsheet() {
  return SpreadsheetApp.openByUrl(SPREADSHEET_URL);
}

// Inicializar hojas si no existen
function checkAndInitSheets() {
  const ss = getSpreadsheet();
  
  // 1. Hoja Registros IA
  let sheetRegistros = ss.getSheetByName("Registros IA");
  if (!sheetRegistros) {
    sheetRegistros = ss.insertSheet("Registros IA");
    const headers = [
      "Timestamp", "Radicado", "Nombre completo", "Cédula", "Correo electrónico", "Área o servicio", 
      "Fecha de registro", "Nombre de la iniciativa de IA", "Área solicitante", "Líder responsable / Data Owner", 
      "Fecha de solicitud", "Problema o necesidad", "Objetivo del proyecto", "Proceso o servicio impactado", 
      "Tipo de IA propuesta", "Otro tipo de IA propuesta", "Herramienta o proveedor sugerido", 
      "Estado herramienta: nueva, autorizada o en evaluación", "Descripción del estado de evaluación", 
      "Soportes anexos disponibles", "Datos que utilizaría la herramienta", "Incluye datos de pacientes", 
      "Incluye datos sensibles Ley 1581", "Requiere integración tecnológica", "Sistemas con los que se integraría", 
      "Usuarios que la usarían", "Beneficios esperados", "Indicadores de éxito propuestos", 
      "Riesgos identificados", "Costo o inversión estimada", "Propuesta de plan piloto", 
      "Justificación D1", "Puntaje D1", "Justificación D2", "Puntaje D2", "Justificación D3", "Puntaje D3", 
      "Justificación D4", "Puntaje D4", "Justificación D5", "Puntaje D5", "Puntaje total", 
      "Nivel preliminar de riesgo", "Flujo asignado", "Mensaje de revisión AI Product Owner mostrado", 
      "URL carpeta anexos", "URLs documentos anexos", "Estado de revisión", "Responsable de revisión", 
      "Observaciones administrador", "Última actualización"
    ];
    sheetRegistros.appendRow(headers);
    sheetRegistros.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#0f4c81").setFontColor("white");
  }

  // 2. Hoja Configuración Formulario
  let sheetConfig = ss.getSheetByName("Configuración Formulario");
  if (!sheetConfig) {
    sheetConfig = ss.insertSheet("Configuración Formulario");
    const headers = ["ID pregunta", "Sección", "Nombre del campo", "Texto de ayuda", "Tipo de campo", "Opciones", "Obligatorio", "Activo", "Orden", "Última actualización"];
    sheetConfig.appendRow(headers);
    sheetConfig.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#0f4c81").setFontColor("white");
    
    // Insertar preguntas por defecto
    const defaultConfig = [
      ["nombreIniciativa", "A. Identificación de la iniciativa", "Nombre de la iniciativa de IA", "Escriba el nombre claro y descriptivo de la herramienta.", "text", "", "true", "true", "1", new Date().toISOString()],
      ["areaSolicitante", "A. Identificación de la iniciativa", "Área solicitante", "Nombre del área, servicio o unidad que origina la solicitud.", "text", "", "true", "true", "2", new Date().toISOString()],
      ["liderResponsable", "A. Identificación de la iniciativa", "Líder responsable / Data Owner", "Nombre, cargo y correo del profesional responsable.", "text", "", "true", "true", "3", new Date().toISOString()]
    ];
    defaultConfig.forEach(row => sheetConfig.appendRow(row));
  }

  // 3. Hoja Auditoría Sistema
  let sheetAuditoria = ss.getSheetByName("Auditoría Sistema");
  if (!sheetAuditoria) {
    sheetAuditoria = ss.insertSheet("Auditoría Sistema");
    const headers = ["Timestamp", "Usuario", "Rol", "Acción realizada", "Radicado relacionado", "Detalle de la acción", "Correo electrónico", "Área o servicio"];
    sheetAuditoria.appendRow(headers);
    sheetAuditoria.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#0f4c81").setFontColor("white");
  }
}

// Generador de Radicado Secuencial Automático
function generateRadicado() {
  checkAndInitSheets();
  const sheet = getSpreadsheet().getSheetByName("Registros IA");
  const numRows = sheet.getLastRow();
  const year = new Date().getFullYear();
  if (numRows <= 1) {
    return "IA-HILA-" + year + "-0001";
  }
  
  // Buscar último consecutivo del año actual
  let lastNum = 0;
  const values = sheet.getRange(2, 2, numRows - 1, 1).getValues();
  for (let i = 0; i < values.length; i++) {
    const rad = values[i][0];
    if (rad && rad.indexOf("IA-HILA-" + year) === 0) {
      const parts = rad.split("-");
      const num = parseInt(parts[parts.length - 1]);
      if (num > lastNum) lastNum = num;
    }
  }
  
  const nextNum = lastNum + 1;
  const seqStr = ("0000" + nextNum).slice(-4);
  return "IA-HILA-" + year + "-" + seqStr;
}

// Guardar nueva iniciativa con IA y subir archivos anexos
function saveInnovationRecord(data, files) {
  try {
    checkAndInitSheets();
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName("Registros IA");
    
    const radicado = generateRadicado();
    const timestamp = new Date();
    
    // Crear carpeta individual en Drive
    let folderUrl = "";
    let fileUrls = [];
    
    try {
      if (DRIVE_PARENT_FOLDER_ID) {
        const parentFolder = DriveApp.getFolderById(DRIVE_PARENT_FOLDER_ID);
        const folderName = data.nombreCompleto + " - " + data.cedula;
        
        // Verificar si la carpeta ya existe o crearla
        let userFolder;
        const folders = parentFolder.getFoldersByName(folderName);
        if (folders.hasNext()) {
          userFolder = folders.next();
        } else {
          userFolder = parentFolder.createFolder(folderName);
        }
        folderUrl = userFolder.getUrl();
        
        // Procesar archivos cargados (enviados como base64)
        if (files && files.length > 0) {
          files.forEach(function(f) {
            if (f && f.dataBase64) {
              const fileData = Utilities.base64Decode(f.dataBase64);
              const blob = Utilities.newBlob(fileData, f.mimeType, f.fileName);
              const driveFile = userFolder.createFile(blob);
              fileUrls.push(driveFile.getUrl());
            }
          });
        }
      }
    } catch (err) {
      Logger.log("Error creando carpeta de Drive: " + err.toString());
    }

    // Calcular Flujo e Impacto
    const puntajeTotal = parseInt(data.puntajeD1) + parseInt(data.puntajeD2) + parseInt(data.puntajeD3) + parseInt(data.puntajeD4) + parseInt(data.puntajeD5);
    const nivelRiesgo = puntajeTotal >= 9 ? "Alto impacto" : "Impacto bajo/moderado";
    const flujoAsignado = puntajeTotal >= 9 
      ? "Flujo A — IAI: Alto impacto, aprobación Comité + Gerencia" 
      : "Flujo B — CUIA: Impacto bajo/moderado, validación Data Owner";

    const row = [
      timestamp,                         // Column 1: Timestamp
      radicado,                          // Column 2: Radicado
      data.nombreCompleto,               // Column 3: Nombre
      data.cedula,                       // Column 4: Cédula
      data.correo,                       // Column 5: Correo
      data.areaServicio,                 // Column 6: Área
      data.fechaRegistro,                // Column 7: Fecha Registro
      data.nombreIniciativa,             // Column 8: Nombre Iniciativa
      data.areaSolicitante,              // Column 9: Área Solicitante
      data.liderResponsable,             // Column 10: Líder responsable
      data.fechaSolicitud,               // Column 11: Fecha Solicitud
      data.problema,                     // Column 12: Problema
      data.objetivo,                     // Column 13: Objetivo
      data.procesoImpactado,             // Column 14: Proceso
      JSON.stringify(data.tipoIa),       // Column 15: Tipo IA
      data.otroTipoIa || "",             // Column 16: Otro Tipo IA
      data.herramientaSugerida,          // Column 17: Herramienta
      data.estadoHerramienta,            // Column 18: Estado Herramienta
      data.descripcionEvaluacion || "",  // Column 19: Descripción Eval
      data.soportesAnexos || "",         // Column 20: Soportes Anexos
      data.datosUtilizados,              // Column 21: Datos Utilizados
      data.incluyeDatosPacientes,        // Column 22: Datos Pacientes
      data.incluyeDatosSensibles,        // Column 23: Datos Sensibles
      data.requiereIntegracion,          // Column 24: Integración
      data.sistemasIntegracion || "",    // Column 25: Sistemas Integración
      data.usuarios,                     // Column 26: Usuarios
      data.beneficios,                   // Column 27: Beneficios
      data.indicadores,                  // Column 28: Indicadores
      data.riesgos,                      // Column 29: Riesgos
      data.costoEstimado,                // Column 30: Costos
      data.propuestaPlanPiloto,          // Column 31: Piloto
      data.justificacionD1,              // Column 32: Justificación D1
      data.puntajeD1,                    // Column 33: Puntaje D1
      data.justificacionD2,              // Column 34: Justificación D2
      data.puntajeD2,                    // Column 35: Puntaje D2
      data.justificacionD3,              // Column 36: Justificación D3
      data.puntajeD3,                    // Column 37: Puntaje D3
      data.justificacionD4,              // Column 38: Justificación D4
      data.puntajeD4,                    // Column 39: Puntaje D4
      data.justificacionD5,              // Column 40: Justificación D5
      data.puntajeD5,                    // Column 41: Puntaje D5
      puntajeTotal,                      // Column 42: Puntaje total
      nivelRiesgo,                       // Column 43: Nivel riesgo
      flujoAsignado,                     // Column 44: Flujo asignado
      "Sí",                              // Column 45: Mensaje revisión mostrado
      folderUrl,                         // Column 46: URL carpeta Drive
      fileUrls.join(", "),               // Column 47: URL documentos Drive
      "Recibido",                        // Column 48: Estado revisión admin
      "AI Product Owner",                // Column 49: Responsable revisión
      "",                                // Column 50: Observaciones admin
      timestamp                          // Column 51: Última actualización
    ];
    
    sheet.appendRow(row);
    
    // Registrar auditoría
    saveAuditLog(data.nombreCompleto, "Registrador", "Registro de iniciativa", radicado, "Iniciativa registrada con éxito.", data.correo, data.areaServicio);
    
    return {
      success: true,
      radicado: radicado,
      flujo: flujoAsignado,
      fecha: data.fechaRegistro
    };
  } catch (e) {
    return { success: false, error: e.toString() };
  }
}

// Obtener todos los registros para la vista de administrador
function getAllRecords() {
  try {
    checkAndInitSheets();
    const sheet = getSpreadsheet().getSheetByName("Registros IA");
    const numRows = sheet.getLastRow();
    if (numRows <= 1) return [];
    
    const values = sheet.getRange(2, 1, numRows - 1, sheet.getLastColumn()).getValues();
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    return values.map(function(row) {
      let record = {};
      headers.forEach(function(header, idx) {
        // Mapear encabezado al formato correspondiente
        record[header] = row[idx];
      });
      return record;
    });
  } catch (e) {
    return [];
  }
}

// Actualizar dictamen administrativo
function updateAdminFields(radicado, data) {
  try {
    checkAndInitSheets();
    const sheet = getSpreadsheet().getSheetByName("Registros IA");
    const numRows = sheet.getLastRow();
    if (numRows <= 1) return false;
    
    const values = sheet.getRange(2, 2, numRows - 1, 1).getValues();
    let rowIdx = -1;
    for (let i = 0; i < values.length; i++) {
      if (values[i][0] === radicado) {
        rowIdx = i + 2;
        break;
      }
    }
    
    if (rowIdx !== -1) {
      // Columnas correspondientes en Sheets
      sheet.getRange(rowIdx, 48).setValue(data.estadoRevision);       // Col 48: Estado revisión
      sheet.getRange(rowIdx, 49).setValue(data.responsableRevision); // Col 49: Responsable
      sheet.getRange(rowIdx, 50).setValue(data.observacionesAdministrador); // Col 50: Observaciones
      sheet.getRange(rowIdx, 51).setValue(new Date());              // Col 51: Última actualización
      
      saveAuditLog("Administrador", "Administrador", "Actualización de registro", radicado, "Se actualizó el estado a: " + data.estadoRevision, "admin@hila.org.co", "Tecnología");
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

// Validar credenciales de Administrador
function validateAdminLogin(user, password) {
  return (user === "admin" && password === "HILA2026IA");
}

// Guardar bitácora en Auditoría
function saveAuditLog(user, role, action, radicado, detail, email, area) {
  try {
    checkAndInitSheets();
    const sheet = getSpreadsheet().getSheetByName("Auditoría Sistema");
    sheet.appendRow([new Date(), user, role, action, radicado, detail, email, area]);
  } catch (e) {
    Logger.log("Error guardando auditoría: " + e.toString());
  }
}
`;

  const indexHtmlContent = `<!DOCTYPE html>
<html>
  <head>
    <base target="_top">
    <!-- Tailwind CSS v3 para desarrollo en GAS -->
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <?!= include('Styles'); ?>
  </head>
  <body class="bg-slate-50 text-slate-800 font-sans min-h-screen">
    <div id="app" class="max-w-4xl mx-auto py-8 px-4 sm:px-6">
      
      <!-- HEADER INSTITUCIONAL -->
      <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
        <div class="flex items-center gap-3">
          <div class="bg-sky-900 text-white p-3 rounded-xl">
            <svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <div>
            <h1 class="text-xl font-bold text-sky-950">Hospital Infantil Los Ángeles</h1>
            <p class="text-xs text-slate-500 font-medium">Pasto, Nariño • Banco de Iniciativas de Inteligencia Artificial</p>
          </div>
        </div>
        <div class="text-right">
          <span class="bg-slate-100 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200">
            F-IA-001 • v1.0
          </span>
        </div>
      </div>

      <!-- PANTALLA INICIAL -->
      <div id="homeView" class="space-y-6 text-center py-8">
        <div class="max-w-xl mx-auto space-y-4">
          <h2 class="text-2xl font-extrabold text-slate-900 leading-tight">Banco Institucional de Iniciativas e Invenciones con IA – HILA</h2>
          <p class="text-sm text-slate-600 leading-relaxed">
            Este sistema permite registrar, consultar y gestionar las iniciativas, ideas o invenciones innovadoras con Inteligencia Artificial propuestas por los colaboradores del Hospital Infantil Los Ángeles.
          </p>
        </div>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg mx-auto pt-4">
          <button onclick="showRegistrador()" class="p-6 bg-sky-900 hover:bg-sky-950 text-white rounded-2xl shadow-md font-bold text-sm flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors">
            <svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
            Registrar nueva invención con IA
          </button>
          <button onclick="showLogin()" class="p-6 bg-white hover:bg-slate-50 border border-slate-200 rounded-2xl shadow-md text-slate-800 font-bold text-sm flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors">
            <svg class="h-6 w-6 text-sky-900" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" /></svg>
            Ingresar como Administrador
          </button>
        </div>
      </div>

      <!-- FORMULARIO REGISTRADOR (SIMPLIFICADO PARA ESTE EJEMPLO) -->
      <div id="registradorView" class="hidden bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <h3 class="text-lg font-bold text-slate-900 border-b pb-2">Registrar Propuesta con IA</h3>
        <!-- Contenedores e inputs se enlazan con Script.html -->
        <p class="text-xs text-slate-500">Por favor, utilice el formulario paso a paso provisto en la aplicación final.</p>
      </div>

    </div>

    <?!= include('Script'); ?>
  </body>
</html>
`;

  const stylesHtmlContent = `<!-- Estilos de soporte para Google Apps Script -->
<style>
  body {
    font-family: 'Inter', sans-serif;
  }
  
  /* Clases personalizadas de apoyo hospitalario */
  .bg-hospital-blue {
    background-color: #0f4c81;
  }
  .text-hospital-blue {
    color: #0f4c81;
  }
  .border-hospital-blue {
    border-color: #0f4c81;
  }
  
  /* Animaciones micro-interactivas */
  .transition-all-custom {
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }
</style>
`;

  const scriptHtmlContent = `<script>
  /**
   * BANCO INSTITUCIONAL DE INICIATIVAS E INVENCIONES CON IA - HILA
   * Lógica interactiva del cliente (Script.html)
   */

  function showRegistrador() {
    document.getElementById("homeView").classList.add("hidden");
    document.getElementById("registradorView").classList.remove("hidden");
  }

  function showLogin() {
    // Desencadena el login
    const pass = prompt("Contraseña de Administrador HILA:");
    if (pass === "HILA2026IA") {
      alert("¡Acceso concedido exitosamente!");
      // Aquí se carga la vista administrativa consultando 'getAllRecords' vía google.script.run
    } else {
      alert("Contraseña incorrecta.");
    }
  }

  // Ejemplo de envío de formulario a Apps Script
  function submitRecordData(formData, filesList) {
    google.script.run
      .withSuccessHandler(function(response) {
        if (response.success) {
          alert("Radicado generado con éxito: " + response.radicado);
        } else {
          alert("Ocurrió un error al procesar el registro.");
        }
      })
      .withFailureHandler(function(err) {
        console.error(err);
      })
      .saveInnovationRecord(formData, filesList);
  }
</script>
`;

  const instructionsContent = `### Instrucciones de Despliegue en Google Apps Script (HILA)

Siga este paso a paso detallado para configurar, desplegar y autorizar la aplicación web institucional en la infraestructura de Google de su organización:

#### Paso 1: Crear el Archivo en Google Sheets
1. Ingrese a su cuenta institucional de Google Workspace.
2. Ingrese a la hoja de cálculo de registros creada para el hospital:
   [https://docs.google.com/spreadsheets/d/1IrN5tyLa2sVoCaeCv8wIxBLUyEtbHJSbENiLE9l6TWE/edit](https://docs.google.com/spreadsheets/d/1IrN5tyLa2sVoCaeCv8wIxBLUyEtbHJSbENiLE9l6TWE/edit)
3. Si desea utilizar una copia propia para pruebas, créela y copie la **URL completa**. Deberá reemplazarla en la constante \`SPREADSHEET_URL\` en la línea 8 del archivo \`Code.gs\`.

#### Paso 2: Crear el Proyecto de Google Apps Script
1. Desde la hoja de cálculo, vaya al menú superior y seleccione **Extensiones** > **Apps Script**.
2. Esto abrirá el editor de código del proyecto en una nueva pestaña de su navegador.
3. Cambie el título por defecto del proyecto a: 
   \`Banco de Iniciativas de IA - HILA\`

#### Paso 3: Pegar los Archivos del Código
Deberá crear 4 archivos dentro del editor de Apps Script con los nombres exactos:

1. **\`Code.gs\`** (Archivo de guion):
   - Seleccione el archivo por defecto \`Código.gs\` en la barra lateral.
   - Borre todo su contenido y pegue el código de la pestaña **Code.gs** de este panel.
2. **\`Index.html\`** (Archivo HTML):
   - Haga clic en el botón **"+"** (Añadir archivo) en el editor de Apps Script > Seleccione **HTML**.
   - Nombre el archivo exactamente: \`Index\`.
   - Reemplace todo el contenido por el código de la pestaña **Index.html**.
3. **\`Styles.html\`** (Archivo HTML):
   - Haga clic en **"+"** > Seleccione **HTML**.
   - Nombre el archivo exactamente: \`Styles\`.
   - Pegue el contenido de la pestaña **Styles.html**.
4. **\`Script.html\`** (Archivo HTML):
   - Haga clic en **"+"** > Seleccione **HTML**.
   - Nombre el archivo exactamente: \`Script\`.
   - Pegue el contenido de la pestaña **Script.html**.

#### Paso 4: Autorizar Permisos e Inicialización
1. En el editor de Apps Script, seleccione la función \`checkAndInitSheets\` en la barra de herramientas superior de ejecución.
2. Haga clic en **Ejecutar**.
3. Google le mostrará un cuadro de diálogo requiriendo la autorización de su cuenta ("Se necesita autorización").
4. Haga clic en **Revisar permisos**, elija su correo del hospital, haga clic en **Avanzado** (abajo a la izquierda) y luego seleccione **Ir a Banco de Iniciativas de IA (no seguro)**.
5. Conceda todos los accesos solicitados para permitir que Apps Script lea/escriba en su hoja de cálculo y administre archivos en Google Drive.
6. Al finalizar la ejecución, vaya a su archivo de Google Sheets: verá que se han creado de forma totalmente automática las tres hojas de cálculo estructuradas:
   - **"Registros IA"** (con las 51 columnas necesarias)
   - **"Configuración Formulario"**
   - **"Auditoría Sistema"**

#### Paso 5: Implementar como Aplicación Web
1. En la esquina superior derecha del editor de Apps Script, haga clic en el botón azul **Implementar** > Seleccione **Nueva implementación**.
2. Haga clic en el engranaje de tipo de implementación y elija **Aplicación web**.
3. En la configuración:
   - **Descripción**: \`Versión Inicial v1.0 - Producción\`
   - **Ejecutar como**: \`Yo (tu_correo@hila.org.co)\` (Esto garantiza que la app pueda crear carpetas de Drive en la ruta principal).
   - **Quién tiene acceso**: \`Cualquier usuario con cuenta de Google\` o \`Cualquier persona\` (Dependiendo de la política institucional de TI del Hospital).
4. Haga clic en **Implementar**.
5. Copie la **URL de la aplicación web** generada. ¡Ese es el enlace oficial de acceso para los colaboradores!
`;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row h-[78vh]">
      
      {/* File sidebar selector */}
      <div className="w-full md:w-1/4 bg-slate-50 border-r border-slate-200 flex flex-col font-semibold">
        <div className="p-4 border-b border-slate-200 bg-slate-100/60">
          <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Despliegue Institucional</span>
          <h4 className="text-xs font-black text-slate-900 inline-flex items-center gap-1.5 mt-0.5">
            <Terminal className="h-4 w-4 text-sky-900" /> Archivos Google Apps Script
          </h4>
        </div>
        
        <div className="flex-1 p-2 space-y-1 overflow-y-auto">
          {[
            { id: 'instructions', label: 'Instrucciones Despliegue', icon: HelpCircle, ext: 'Guía PDF' },
            { id: 'code', label: 'Code.gs', icon: FileCode, ext: 'Apps Script' },
            { id: 'index', label: 'Index.html', icon: FileCode, ext: 'Layout' },
            { id: 'styles', label: 'Styles.html', icon: FileCode, ext: 'CSS Rules' },
            { id: 'script', label: 'Script.html', icon: FileCode, ext: 'Client JS' }
          ].map((file) => {
            const Icon = file.icon;
            return (
              <button
                key={file.id}
                onClick={() => setActiveFile(file.id as any)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-xs transition-all flex items-center justify-between cursor-pointer ${
                  activeFile === file.id 
                    ? 'bg-sky-900 text-white shadow-md' 
                    : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span>{file.label}</span>
                </span>
                <ChevronRight className="h-3 w-3 opacity-50" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Code / Content viewer area */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between sticky top-0 z-10 shrink-0">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
            {activeFile === 'instructions' ? 'Guía de Configuración' : `Código Fuente: ${activeFile === 'code' ? 'Code.gs' : activeFile + '.html'}`}
          </span>
          {activeFile !== 'instructions' && (
            <button
              onClick={() => {
                const text = activeFile === 'code' ? codeGsContent : activeFile === 'index' ? indexHtmlContent : activeFile === 'styles' ? stylesHtmlContent : scriptHtmlContent;
                handleCopy(text);
              }}
              className="px-3 py-1.5 bg-sky-900 hover:bg-sky-950 text-white font-bold text-xs rounded-lg inline-flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? '¡Copiado!' : 'Copiar Código'}
            </button>
          )}
        </div>

        {/* Content detail */}
        <div className="flex-1 p-6 md:p-8 overflow-y-auto font-medium text-xs leading-relaxed text-slate-700 bg-slate-50">
          {activeFile === 'instructions' && (
            <div className="max-w-2xl mx-auto space-y-4 markdown-body text-slate-800">
              <h3 className="text-base font-black text-sky-950 mb-2">Paso a Paso de Despliegue</h3>
              <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                Siga estos sencillos pasos para implementar esta aplicación en el Google Workspace del hospital. La base de datos y carpetas ya se encuentran enlazadas con los directorios correspondientes compartidos.
              </p>
              
              <div className="space-y-4 pt-2">
                {[
                  { title: '1. Configuración de Hoja', text: 'Acceda a la hoja Registros IA del hospital en Google Sheets. Desde el menú superior, haga clic en Extensiones > Apps Script para abrir el panel de desarrollo.' },
                  { title: '2. Creación de Archivos', text: 'Cree los archivos Code.gs, Index.html, Styles.html y Script.html usando el botón "+" en la barra izquierda del editor de Google Apps Script.' },
                  { title: '3. Copiar e Inicializar', text: 'Copie los contenidos de cada pestaña de este panel y péguelos en sus respectivos archivos. Ejecute por primera vez la función checkAndInitSheets para inicializar automáticamente las hojas con sus 51 columnas necesarias.' },
                  { title: '4. Publicar Aplicación Web', text: 'Haga clic en Implementar > Nueva implementación. Seleccione "Aplicación web", configure para ejecutar como "Yo" (su cuenta) y permita el acceso a "Cualquier persona". Copie la URL de producción y compártala institucionalmente.' }
                ].map((ins, i) => (
                  <div key={i} className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm flex gap-3.5 items-start">
                    <span className="w-6 h-6 bg-sky-100 text-sky-900 font-extrabold text-xs rounded-full flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-900 text-xs">{ins.title}</h4>
                      <p className="text-slate-600 leading-relaxed text-xs">{ins.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeFile === 'code' && (
            <pre className="p-4 bg-slate-900 text-slate-200 rounded-xl overflow-x-auto font-mono text-[11px] whitespace-pre select-all shadow-inner leading-relaxed">
              <code>{codeGsContent}</code>
            </pre>
          )}

          {activeFile === 'index' && (
            <pre className="p-4 bg-slate-900 text-slate-200 rounded-xl overflow-x-auto font-mono text-[11px] whitespace-pre select-all shadow-inner leading-relaxed">
              <code>{indexHtmlContent}</code>
            </pre>
          )}

          {activeFile === 'styles' && (
            <pre className="p-4 bg-slate-900 text-slate-200 rounded-xl overflow-x-auto font-mono text-[11px] whitespace-pre select-all shadow-inner leading-relaxed">
              <code>{stylesHtmlContent}</code>
            </pre>
          )}

          {activeFile === 'script' && (
            <pre className="p-4 bg-slate-900 text-slate-200 rounded-xl overflow-x-auto font-mono text-[11px] whitespace-pre select-all shadow-inner leading-relaxed">
              <code>{scriptHtmlContent}</code>
            </pre>
          )}
        </div>

      </div>
    </div>
  );
}
