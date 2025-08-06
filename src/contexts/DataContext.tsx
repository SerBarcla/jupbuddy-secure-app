import React, { useState, useEffect, useMemo, useCallback, createContext, useContext } from 'react';
import type { FC, ReactNode } from 'react';
import { useLocalStorage } from '../hooks/useLocalStorage';
import type { UserProfile, Plod, Definition, LogEntry, BaseItem } from '../types';
import { db } from '../firebase';
import { collection, getDocs, doc, writeBatch, query, where } from 'firebase/firestore';

// --- DATA CONTEXT ---
type DataCollections = {
  users: UserProfile[];
  plods: Plod[];
  definitions: Definition[];
  logs: LogEntry[];
};
export type CollectionName = keyof DataCollections;

interface DataContextType {
  users: { get: UserProfile[]; set: React.Dispatch<React.SetStateAction<UserProfile[]>> };
  plods: { get: Plod[]; set: React.Dispatch<React.SetStateAction<Plod[]>> };
  definitions: { get: Definition[]; set: React.Dispatch<React.SetStateAction<Definition[]>> };
  logs: { get: LogEntry[]; set: React.Dispatch<React.SetStateAction<LogEntry[]>> };
  updateItem: (collectionName: CollectionName, item: any) => void;
  deleteItem: (collectionName: CollectionName, id: string) => void;
  handleSync: () => Promise<void>;
  isSyncing: boolean;
  lastSync: string | null;
  needsSync: boolean;
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
    const [needsSync, setNeedsSync] = useState(false);

    const collections = useMemo(() => ({
        users: { get: users, set: setUsers, path: 'users' },
        plods: { get: plods, set: setPlods, path: 'plods' },
        definitions: { get: definitions, set: setDefinitions, path: 'definitions' },
        logs: { get: logs, set: setLogs, path: 'logs' },
    }), [users, plods, definitions, logs, setUsers, setPlods, setDefinitions, setLogs]);
    
    // Set needsSync if any item is dirty
    useEffect(() => {
        const anyDirty = Object.values(collections).some(c => c.get.some(item => (item as any).dirty));
        setNeedsSync(anyDirty);
    }, [collections]);

    const updateItem = useCallback((collectionName: CollectionName, item: any) => {
        const coll = collections[collectionName];
        if (!coll) return;
        const timestamp = new Date().toISOString();
        const existing = coll.get.find(i => i.id === item.id);

        if (existing) {
            (coll.set as React.Dispatch<React.SetStateAction<any[]>>)(prev =>
                prev.map(i => i.id === item.id ? { ...i, ...item, dirty: true, updatedAt: timestamp } : i)
            );
        } else {
            const newItem = { ...item, id: `local_${Date.now()}`, dirty: true, updatedAt: timestamp };
            (coll.set as React.Dispatch<React.SetStateAction<any[]>>)(prev => [...prev, newItem]);
        }
    }, [collections]);

    const deleteItem = useCallback((collectionName: CollectionName, id: string) => {
        const coll = collections[collectionName];
        if (!coll) return;
        (coll.set as React.Dispatch<React.SetStateAction<any[]>>)(prev =>
            prev.map(i => i.id === id ? { ...i, deleted: true, dirty: true, updatedAt: new Date().toISOString() } : i)
        );
    }, [collections]);

    const handleSync = useCallback(async () => {
        if (!navigator.onLine) {
            alert("Cannot sync. You are offline.");
            return;
        }
        setIsSyncing(true);
        const syncTimestamp = new Date().toISOString();
        const batch = writeBatch(db);
        const idUpdates: { oldId: string; newId: string; collKey: CollectionName }[] = [];

        try {
            // --- PUSH LOCAL CHANGES ---
            for (const key in collections) {
                const collKey = key as CollectionName;
                const coll = collections[collKey];
                const dirtyItems = coll.get.filter(item => (item as any).dirty);

                for (const item of dirtyItems) {
                    let docId = item.id;
                    const { dirty, ...dataToSave } = item;
                    (dataToSave as any).updatedAt = syncTimestamp;

                    if (item.id.startsWith('local_')) {
                        const newDocRef = doc(collection(db, coll.path));
                        docId = newDocRef.id;
                        idUpdates.push({ oldId: item.id, newId: docId, collKey });
                        batch.set(newDocRef, { ...dataToSave, id: docId });
                    } else if ((item as any).deleted) {
                        batch.delete(doc(db, coll.path, docId));
                    } else {
                        batch.update(doc(db, coll.path, docId), dataToSave);
                    }
                }
            }
            await batch.commit();

            // --- PULL REMOTE CHANGES ---
            for (const key in collections) {
                const collKey = key as CollectionName;
                const coll = collections[collKey];
                const q = lastSync
                    ? query(collection(db, coll.path), where("updatedAt", ">", lastSync))
                    : collection(db, coll.path);
                
                const snapshot = await getDocs(q);
                const remoteChanges = snapshot.docs.map(d => ({ ...d.data(), id: d.id })) as BaseItem[];

                (coll.set as React.Dispatch<React.SetStateAction<BaseItem[]>>)(currentLocalData => {
                    const localDataMap = new Map(currentLocalData.map(item => [item.id, item]));
                    
                    remoteChanges.forEach(remoteItem => {
                        const localItem = localDataMap.get(remoteItem.id);
                        if (!localItem || new Date(remoteItem.updatedAt!) > new Date(localItem.updatedAt!)) {
                            localDataMap.set(remoteItem.id, remoteItem);
                        }
                    });

                    let mergedData = Array.from(localDataMap.values());
                    
                    // Update local IDs that were created in this sync
                    const idUpdatesForThisColl = idUpdates.filter(u => u.collKey === collKey);
                    if (idUpdatesForThisColl.length > 0) {
                        const oldIdToNewIdMap = new Map(idUpdatesForThisColl.map(u => [u.oldId, u.newId]));
                        mergedData = mergedData.map(item => {
                            if (oldIdToNewIdMap.has(item.id)) {
                                return { ...item, id: oldIdToNewIdMap.get(item.id)!, dirty: false };
                            }
                            return item;
                        });
                    }

                    // Clean up dirty flags and deleted items
                    return mergedData
                        .map(item => ({ ...item, dirty: false }))
                        .filter(item => !item.deleted);
                });
            }

            setLastSync(syncTimestamp);
            alert("Sync successful!");
        } catch (error) {
            console.error("Sync failed:", error);
            alert(`Sync failed: ${(error as Error).message}`);
        } finally {
            setIsSyncing(false);
        }
    }, [collections, lastSync]);


    const value = { ...collections, updateItem, deleteItem, handleSync, isSyncing, lastSync, needsSync };
    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
