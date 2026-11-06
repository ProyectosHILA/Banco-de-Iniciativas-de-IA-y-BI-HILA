/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AdminUserRole = 'admin' | 'geradmin' | 'adminsistem' | 'estadmin' | 'planadmin';

export interface AdminUser {
  username: string;
  password: string;
  name: string;
  role: AdminUserRole;
  roleTitle: string;
  department: string;
  email: string;
  stepAssigned: string;
  color: string;
}

export const ADMIN_USERS: AdminUser[] = [
  {
    username: 'adminsistem',
    password: 'subgadmin78-',
    name: 'Ing. Sistemas / Subgerencia',
    role: 'adminsistem',
    roleTitle: 'Subgerencia y Sistemas (Protección y Gobierno)',
    department: 'Sistemas e Informática',
    email: 'sistemas@hila.org.co',
    stepAssigned: '1. Protección de Dato & 2. Gobierno del Dato',
    color: 'bg-cyan-700 text-white'
  },
  {
    username: 'estadmin',
    password: 'dataes45*',
    name: 'Líder de Estadística y Calidad',
    role: 'estadmin',
    roleTitle: 'Estadística y Calidad del Dato',
    department: 'Estadística y Gestión del Dato',
    email: 'estadistica@hila.org.co',
    stepAssigned: '2. Gobierno y Calidad del Dato',
    color: 'bg-indigo-700 text-white'
  },
  {
    username: 'geradmin',
    password: 'gerad12+',
    name: 'Gerencia General HILA',
    role: 'geradmin',
    roleTitle: 'Gerencia General',
    department: 'Dirección General',
    email: 'gerencia@hila.org.co',
    stepAssigned: '3. Validación Final',
    color: 'bg-emerald-800 text-white'
  },
  {
    username: 'planadmin',
    password: 'planeacion1+',
    name: 'Líder de Planeación',
    role: 'planadmin',
    roleTitle: 'Planeación Institucional',
    department: 'Planeación y Desarrollo Estratégico',
    email: 'planeacion@hila.org.co',
    stepAssigned: '3. Validación Final',
    color: 'bg-amber-700 text-white'
  },
  {
    username: 'admin',
    password: 'HILA2026IA',
    name: 'Administrador Principal HILA',
    role: 'admin',
    roleTitle: 'Administrador General del Sistema',
    department: 'Oficina de Tecnología e Innovación',
    email: 'admin@hila.org.co',
    stepAssigned: '3. Validación Final & Administración General',
    color: 'bg-sky-950 text-white'
  }
];
