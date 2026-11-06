/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  setDoc, 
  doc, 
  deleteDoc,
  query, 
  orderBy,
  limit,
  onSnapshot
} from 'firebase/firestore';
import { IniciativaRecord, AuditLog } from '../types';

// Real firebase configuration loaded from the generated settings
const firebaseConfig = {
  projectId: "registro-ia-y-bi",
  appId: "1:688518963354:web:c9b37a34cec09afa4fbf23",
  apiKey: "AIzaSyDGdb_H-PnJz6LGIC6wSK1Awu6nTHz5XPo",
  authDomain: "registro-ia-y-bi.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-bancodeiniciativ-041ddc12-e4a4-4b49-8605-4d6c02b1546d",
  storageBucket: "registro-ia-y-bi.firebasestorage.app",
  messagingSenderId: "688518963354"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore with the custom database ID
export const db = firebaseConfig.firestoreDatabaseId 
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Helper function to timeout Firestore promises so the app never gets stuck indefinitely
function promiseWithTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMessage));
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]).then((result) => {
    clearTimeout(timeoutId);
    return result;
  });
}

// Collection references
const RECORDS_COLLECTION = 'records';
const AUDIT_COLLECTION = 'audit_logs';

/**
 * Subscribe in real time to records from Firestore.
 */
export function subscribeToDbRecords(
  onUpdate: (records: IniciativaRecord[]) => void,
  onError?: (error: Error) => void
) {
  const colRef = collection(db, RECORDS_COLLECTION);
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list: IniciativaRecord[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as IniciativaRecord);
      });
      list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      onUpdate(list);
    },
    (error) => {
      console.error("Error in real-time records snapshot:", error);
      if (onError) onError(error);
    }
  );
}

/**
 * Subscribe in real time to audit logs from Firestore.
 */
export function subscribeToDbAuditLogs(
  onUpdate: (logs: AuditLog[]) => void,
  onError?: (error: Error) => void
) {
  const colRef = collection(db, AUDIT_COLLECTION);
  const q = query(colRef, orderBy('timestamp', 'desc'), limit(150));
  return onSnapshot(
    q,
    (snapshot) => {
      const list: AuditLog[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as AuditLog);
      });
      onUpdate(list);
    },
    (error) => {
      console.error("Error in real-time audit logs snapshot:", error);
      if (onError) onError(error);
    }
  );
}

/**
 * Fetch all records from Firestore once.
 */
export async function getDbRecords(): Promise<IniciativaRecord[]> {
  try {
    const fetchPromise = (async () => {
      const colRef = collection(db, RECORDS_COLLECTION);
      const snapshot = await getDocs(colRef);
      const list: IniciativaRecord[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as IniciativaRecord);
      });
      return list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    })();

    return await promiseWithTimeout(fetchPromise, 12000, "Timeout al conectar con Firestore (records)");
  } catch (error) {
    console.error("Error reading Firestore records, falling back:", error);
    throw error;
  }
}

// Helper function to sanitize objects before sending to Firestore (removes undefined values)
function sanitizeData<T>(obj: T): T {
  if (obj === null || obj === undefined) return '' as unknown as T;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeData).filter(item => item !== undefined) as unknown as T;
  }
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj as Record<string, any>)) {
    if (value !== undefined) {
      clean[key] = sanitizeData(value);
    }
  }
  return clean as T;
}

/**
 * Save or update a record in Firestore.
 */
export async function saveDbRecord(record: IniciativaRecord): Promise<boolean> {
  try {
    const cleanRecord = sanitizeData(record);
    const savePromise = (async () => {
      const docRef = doc(db, RECORDS_COLLECTION, record.radicado);
      await setDoc(docRef, cleanRecord, { merge: true });
      return true;
    })();
    return await promiseWithTimeout(savePromise, 12000, "Timeout al guardar registro");
  } catch (error) {
    console.error("Error saving Firestore record:", error);
    return false;
  }
}

/**
 * Delete a record from Firestore.
 */
export async function deleteDbRecord(radicado: string): Promise<boolean> {
  try {
    const deletePromise = (async () => {
      const docRef = doc(db, RECORDS_COLLECTION, radicado);
      await deleteDoc(docRef);
      return true;
    })();
    return await promiseWithTimeout(deletePromise, 12000, "Timeout al eliminar registro");
  } catch (error) {
    console.error("Error deleting Firestore record:", error);
    return false;
  }
}

/**
 * Fetch all audit logs from Firestore.
 */
export async function getDbAuditLogs(): Promise<AuditLog[]> {
  try {
    const fetchPromise = (async () => {
      const colRef = collection(db, AUDIT_COLLECTION);
      const q = query(colRef, orderBy('timestamp', 'desc'), limit(150));
      const snapshot = await getDocs(q);
      const list: AuditLog[] = [];
      snapshot.forEach((docSnap) => {
        list.push(docSnap.data() as AuditLog);
      });
      return list;
    })();
    return await promiseWithTimeout(fetchPromise, 12000, "Timeout al conectar con Firestore (audit_logs)");
  } catch (error) {
    console.error("Error reading Firestore audit logs:", error);
    throw error;
  }
}

/**
 * Add an audit log to Firestore.
 */
export async function saveDbAuditLog(log: AuditLog): Promise<boolean> {
  try {
    const cleanLog = sanitizeData(log);
    const savePromise = (async () => {
      const docId = `${log.timestamp.replace(/[^a-zA-Z0-9]/g, '')}_${log.usuario.replace(/[^a-zA-Z0-9]/g, '')}`;
      const docRef = doc(db, AUDIT_COLLECTION, docId);
      await setDoc(docRef, cleanLog);
      return true;
    })();
    return await promiseWithTimeout(savePromise, 12000, "Timeout al guardar audit_log");
  } catch (error) {
    console.error("Error saving audit log in Firestore:", error);
    return false;
  }
}
