// src/types.ts

export interface BaseItem {
  id: string;
  deleted?: boolean;
  dirty?: boolean;
  updatedAt?: string;
}

export interface UserProfile extends BaseItem {
  userId: string;
  name: string;
  systemRole: 'Admin' | 'Operator';
  operationalRole: string;
  allowedPlods: string[];
  signature?: string;
  pin?: string;
}

export interface Plod extends BaseItem {
  name: string;
}

export interface Definition extends BaseItem {
  name: string;
  unit: string;
  linkedPlods: string[];
}

export interface LoggedDataItem {
  definitionId: string;
  name: string;
  value: string;
  unit: string;
}

export interface LogEntry extends BaseItem {
  plodId: string;
  plodName: string;
  userId: string;
  userName: string;
  operationalRole: string;
  startTime: string;
  endTime: string;
  duration: number;
  shift: 'DS' | 'NS';
  data: LoggedDataItem[];
  coworkers: string[];
  disclaimerSigned: boolean;
}
