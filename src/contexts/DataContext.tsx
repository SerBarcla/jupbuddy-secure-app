import React, { useState, useEffect, useMemo, useCallback, createContext, useContext } from 'react';
import type { FC, ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
// FIX: Changed to a type-only import
import type { UserProfile, Plod, Definition, LogEntry, BaseItem } from '../types';

// --- DATA CONTEXT ---
type DataCollections = {
  users: UserProfile[];
  plods: Plod[];
  definitions: Definition[];
  logs: LogEntry[];
};
// FIX: Added 'export' so this type can be imported by other files
export type CollectionName = keyof DataCollections;

interface DataContextType {
  users: { get: UserProfile[]; set: React.Dispatch<React.SetStateAction<UserProfile[]>> };
  plods: { get: Plod[]; set: React.Dispatch<React.SetStateAction<Plod[]>> };
  definitions: { get: Definition[]; set: React.Dispatch<React.SetStateAction<Definition[]>> };
  logs: { get: LogEntry[]; set: React.Dispatch<React.SetStateAction<LogEntry[]>> };
  updateItem: (collectionName: CollectionName, item: Partial<BaseItem> & { name?: string }) => void;
  deleteItem: (collectionName: CollectionName, id: string) => void;
  handleSync: () => Promise<void>;
  isSyncing: boolean;
  lastSync: string | null;
}

const DataContext = createContext<DataContextType | null>(null);

export const useData = () => {
    const context = useContext(DataContext);
    if (!context) throw new Error("useData must be used within a DataProvider");
    return context;
};

export const DataProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const [users, setUsers] = useLocalStorage<UserProfile[]>('jupbuddy_users', []);
    const [plods, setPlods] = useLocalStorage<Plod[]>('jupbuddy_plods', []);
    const [definitions, setDefinitions] = useLocalStorage<Definition[]>('jupbuddy_definitions', []);
    const [logs, setLogs] = useLocalStorage<LogEntry[]>('jupbuddy_logs', []);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSync, setLastSync] = useLocalStorage<string | null>('jupbuddy_lastSync', null);

    const collections = useMemo(() => ({
        users: { get: users, set: setUsers },
        plods: { get: plods, set: setPlods },
        definitions: { get: definitions, set: setDefinitions },
        logs: { get: logs, set: setLogs },
    }), [users, plods, definitions, logs, setUsers, setPlods, setDefinitions, setLogs]);

    const updateItem = useCallback((collectionName: CollectionName, item: Partial<BaseItem>) => {
        const coll = collections[collectionName];
        if (!coll) return;
        const timestamp = new Date().toISOString();
        if (item.id && !item.id.startsWith('local_')) {
            (coll.set as React.Dispatch<React.SetStateAction<BaseItem[]>>)(prev =>
                prev.map(i => i.id === item.id ? { ...i, ...item, dirty: true, updatedAt: timestamp } : i)
            );
        } else {
            const localId = item.id || `local_${Date.now()}`;
            const existing = coll.get.find(i => i.id === localId);
            if (existing) {
                 (coll.set as React.Dispatch<React.SetStateAction<BaseItem[]>>)(prev =>
                    prev.map(i => i.id === localId ? { ...i, ...item, dirty: true, updatedAt: timestamp } : i)
                );
            } else {
                 (coll.set as React.Dispatch<React.SetStateAction<BaseItem[]>>)(prev => [...prev, { ...item, id: localId, dirty: true, updatedAt: timestamp }]);
            }
        }
    }, [collections]);

    const deleteItem = useCallback((collectionName: CollectionName, id: string) => {
        const coll = collections[collectionName];
        if (!coll) return;
        (coll.set as React.Dispatch<React.SetStateAction<BaseItem[]>>)(prev =>
            prev.map(i => i.id === id ? { ...i, deleted: true, dirty: true, updatedAt: new Date().toISOString() } : i)
        );
    }, [collections]);

    const handleSync = async () => { /* ... Full sync logic ... */ console.log("Syncing data..."); };

    const value = { ...collections, updateItem, deleteItem, handleSync, isSyncing, lastSync };
    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
