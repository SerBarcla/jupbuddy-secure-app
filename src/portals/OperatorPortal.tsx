import React, { useState, useEffect, useMemo, createContext, useContext } from 'react';
import type { FC, ReactNode } from 'react';
import styled from 'styled-components';
import { collection, getDocs, query, where, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
// FIX: Removed all unused icons, keeping only the ones in use
import { LogOut, Users as UsersIcon, PackagePlus, Square, X, Play } from 'lucide-react';


// --- TYPE DEFINITIONS ---
interface BaseItem {
  id: string;
  deleted?: boolean;
}
interface UserProfile extends BaseItem {
  userId: string;
  name: string;
  systemRole: 'Admin' | 'Operator';
  operationalRole: string;
  allowedPlods: string[];
  pin?: string;
}
interface Plod extends BaseItem {
  name: string;
}
interface Definition extends BaseItem {
  name: string;
  unit: string;
  linkedPlods: string[];
}
interface LoggedDataItem {
  definitionId: string;
  name: string;
  value: string;
  unit: string;
}
interface LogEntry extends BaseItem {
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

// --- DATA PROVIDER ---
interface DataContextType {
  users: { get: UserProfile[] };
  plods: { get: Plod[] };
  definitions: { get: Definition[] };
  addLogEntry: (logEntry: Omit<LogEntry, 'id'>) => Promise<void>;
}

const DataContext = createContext<DataContextType | null>(null);
const useData = () => {
    const context = useContext(DataContext);
    if (!context) throw new Error("useData must be used within a DataProvider");
    return context;
};

const DataProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [plods, setPlods] = useState<Plod[]>([]);
    const [definitions, setDefinitions] = useState<Definition[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const usersSnap = await getDocs(collection(db, 'users'));
                setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile)));

                const plodsSnap = await getDocs(collection(db, 'plods'));
                setPlods(plodsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Plod)));

                const definitionsSnap = await getDocs(collection(db, 'definitions'));
                setDefinitions(definitionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Definition)));
            } catch (error) {
                console.error("Error fetching initial data for operator:", error);
            }
        };
        fetchData();
    }, []);

    const addLogEntry = async (logEntry: Omit<LogEntry, 'id'>) => {
        try {
            await addDoc(collection(db, 'logs'), logEntry);
            alert("Plod logged successfully!");
        } catch (error) {
            console.error("Error adding log entry:", error);
            alert("Failed to log plod.");
        }
    };

    const value = {
        users: { get: users },
        plods: { get: plods },
        definitions: { get: definitions },
        addLogEntry,
    };

    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};


// --- STYLED COMPONENTS & HELPER COMPONENTS ---
const LoginContainer = styled.div` /* ... */ `;
const LoginBox = styled.div` /* ... */ `;
const Form = styled.form` /* ... */ `;
const StyledInput = styled.input` /* ... */ `;
const StyledButton = styled.button` /* ... */ `;
const ModalContainer = styled.div`
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;
`;
const ModalContent = styled.div`
  background: white; padding: 2rem; border-radius: 0.5rem; width: 90%; max-width: 500px;
`;
const Modal: FC<{ children: ReactNode, isOpen: boolean, title: string, onClose: () => void }> = ({ children, isOpen, title, onClose }) => {
    if (!isOpen) return null;
    return (
        <ModalContainer onClick={onClose}>
            <ModalContent onClick={e => e.stopPropagation()}>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                    <h2 style={{fontSize: '1.25rem', fontWeight: 'bold'}}>{title}</h2>
                    <button onClick={onClose}><X /></button>
                </div>
                {children}
            </ModalContent>
        </ModalContainer>
    );
}

const Button: FC<any> = ({ children, ...props }) => <button {...props}>{children}</button>;
const Input: FC<any> = (props) => <input {...props} />;

// --- HELPER MODALS ---
const AddDataModal: FC<{
  isOpen: boolean; onClose: () => void; onSave: (data: LoggedDataItem) => void; definitions: Definition[];
}> = ({ isOpen, onClose, onSave, definitions }) => {
  const [definitionId, setDefinitionId] = useState("");
  const [value, setValue] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const definition = definitions.find(d => d.id === definitionId);
    if (!definition || !value) return;
    onSave({ definitionId: definition.id, name: definition.name, value: value, unit: definition.unit || "" });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Data / Consumable">
      <form onSubmit={handleSubmit} style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
        <select value={definitionId} onChange={(e) => setDefinitionId(e.target.value)} required>
          <option value="">-- Select Item --</option>
          {definitions.map(def => (<option key={def.id} value={def.id}>{def.name}</option>))}
        </select>
        <Input type="number" value={value} onChange={(e: any) => setValue(e.target.value)} placeholder="Value / Quantity" required />
        <div style={{display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem'}}>
            <Button type="button" onClick={onClose}>Cancel</Button>
            <Button type="submit">Save</Button>
        </div>
      </form>
    </Modal>
  );
};

const CoworkerModal: FC<{
  isOpen: boolean; onClose: () => void; onSave: (selected: string[]) => void;
  currentUser: UserProfile; selectedCoworkers: string[];
}> = ({ isOpen, onClose, onSave, currentUser, selectedCoworkers }) => {
  const { users: { get: allUsers } } = useData();
  const [selected, setSelected] = useState<string[]>(selectedCoworkers);

  useEffect(() => { setSelected(selectedCoworkers); }, [selectedCoworkers, isOpen]);

  const handleToggle = (userId: string) => {
    setSelected(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  const handleSave = () => { onSave(selected); onClose(); };
  const availableUsers = allUsers.filter(u => u.id !== currentUser.id && !u.deleted);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Co-workers">
      <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
        <div style={{maxHeight: '300px', overflowY: 'auto', border: '1px solid #ccc', padding: '1rem', borderRadius: '0.5rem'}}>
            {availableUsers.map(user => (
                <label key={user.id} style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>
                    <input type="checkbox" checked={selected.includes(user.id)} onChange={() => handleToggle(user.id)} />
                    <span>{user.name} ({user.operationalRole})</span>
                </label>
            ))}
        </div>
        <div style={{display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem'}}>
            <Button type="button" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave}>Save</Button>
        </div>
      </div>
    </Modal>
  );
};

// --- LIVE PLOD TRACKER ---
const LivePlodTracker: FC<{ user: UserProfile }> = ({ user }) => {
    const { plods: { get: allPlods }, definitions: { get: allDefinitions }, addLogEntry } = useData();
    const [selectedPlod, setSelectedPlod] = useState("");
    const [isActive, setIsActive] = useState(false);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [isDataModalOpen, setDataModalOpen] = useState(false);
    const [isCoworkerModalOpen, setCoworkerModalOpen] = useState(false);
    const [loggedData, setLoggedData] = useState<LoggedDataItem[]>([]);
    const [coworkers, setCoworkers] = useState<string[]>([]);

    const allowedPlods = useMemo(() => {
        return allPlods.filter(p => user.allowedPlods?.includes(p.id) && !p.deleted);
    }, [allPlods, user]);
    
    const currentPlodDefinitions = useMemo(() => {
        if (!selectedPlod) return [];
        return allDefinitions.filter(def => def.linkedPlods?.includes(selectedPlod) && !def.deleted);
    }, [allDefinitions, selectedPlod]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isActive && startTime) {
            interval = setInterval(() => setElapsedTime(Math.floor((Date.now() - startTime) / 1000)), 1000);
        }
        return () => clearInterval(interval);
    }, [isActive, startTime]);

    const formatTime = (totalSeconds: number) => {
        const h = Math.floor(totalSeconds / 3600).toString().padStart(2, "0");
        const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, "0");
        const s = (totalSeconds % 60).toString().padStart(2, "0");
        return `${h}:${m}:${s}`;
    };

    const handleStart = () => {
        if (!selectedPlod) return;
        setIsActive(true);
        setStartTime(Date.now());
        setElapsedTime(0);
        setLoggedData([]);
        setCoworkers([]);
    };
    
    const handleStop = async () => {
        if (!startTime) return;
        const endTime = new Date();
        const durationSeconds = Math.floor((endTime.getTime() - startTime) / 1000);
        const shift: 'DS' | 'NS' = endTime.getHours() >= 6 && endTime.getHours() < 18 ? "DS" : "NS";
        const plodDetails = allPlods.find(a => a.id === selectedPlod);

        const logEntry: Omit<LogEntry, 'id'> = {
            plodId: selectedPlod,
            plodName: plodDetails?.name || "Unknown",
            userId: user.userId,
            userName: user.name,
            operationalRole: user.operationalRole,
            startTime: new Date(startTime).toISOString(),
            endTime: endTime.toISOString(),
            duration: durationSeconds,
            shift: shift,
            data: loggedData,
            coworkers: coworkers,
            disclaimerSigned: true,
        };

        await addLogEntry(logEntry);
        setIsActive(false);
        setSelectedPlod("");
        setStartTime(null);
    };
    
    return (
        <div style={{ background: 'white', padding: '2rem', borderRadius: '1rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <h3>Live Plod Tracker</h3>
            {!isActive ? (
                <div>
                    <select value={selectedPlod} onChange={(e) => setSelectedPlod(e.target.value)}>
                        <option value="">-- Select a Plod --</option>
                        {allowedPlods.map(act => (<option key={act.id} value={act.id}>{act.name}</option>))}
                    </select>
                    <Button onClick={handleStart} disabled={!selectedPlod}><Play /> Start</Button>
                </div>
            ) : (
                <div>
                    <p>Current Plod: {allPlods.find(a => a.id === selectedPlod)?.name}</p>
                    <p>Time Elapsed: {formatTime(elapsedTime)}</p>
                    <Button onClick={() => setDataModalOpen(true)}><PackagePlus /> Add Data</Button>
                    <Button onClick={() => setCoworkerModalOpen(true)}><UsersIcon /> Add Co-workers</Button>
                    <Button onClick={handleStop}><Square /> Stop & Log Plod</Button>
                </div>
            )}
            <AddDataModal 
                isOpen={isDataModalOpen}
                onClose={() => setDataModalOpen(false)}
                onSave={(data) => setLoggedData(prev => [...prev, data])}
                definitions={currentPlodDefinitions}
            />
            <CoworkerModal 
                isOpen={isCoworkerModalOpen}
                onClose={() => setCoworkerModalOpen(false)}
                onSave={setCoworkers}
                currentUser={user}
                selectedCoworkers={coworkers}
            />
        </div>
    );
};

// --- OPERATOR LOGIN COMPONENT ---
const OperatorLoginPage = ({ onLoginSuccess }: { onLoginSuccess: (operatorData: UserProfile) => void }) => {
    const [operatorId, setOperatorId] = useState('');
    const [pin, setPin] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('userId', '==', operatorId));
        const querySnapshot = await getDocs(q);
        setLoading(false);
        if (querySnapshot.empty) {
            setError('Invalid Operator ID.');
            return;
        }
        const operatorDoc = querySnapshot.docs[0];
        const operatorData = { id: operatorDoc.id, ...operatorDoc.data() } as UserProfile;
        if (operatorData.pin === pin) {
            onLoginSuccess(operatorData);
        } else {
            setError('Invalid PIN.');
        }
    };

     return (
        <LoginContainer>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                 <h1>JUPBuddy</h1>
                 <p>Operator Portal</p>
            </div>
            <LoginBox>
                <Form onSubmit={handleLogin}>
                    <StyledInput type="text" value={operatorId} onChange={(e) => setOperatorId(e.target.value)} placeholder="Operator ID" required />
                    <StyledInput type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="5-Digit PIN" maxLength={5} required />
                    {error && <p>{error}</p>}
                    <StyledButton type="submit" disabled={loading}>
                        {loading ? 'Logging In...' : 'Login'}
                    </StyledButton>
                </Form>
            </LoginBox>
        </LoginContainer>
    );
};

// --- OPERATOR DASHBOARD ---
const OperatorDashboard: FC<{ operator: UserProfile; onLogout: () => void }> = ({ operator, onLogout }) => {
    return (
        <div style={{ padding: '2rem' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1>Welcome Operator, {operator.name}</h1>
                <Button onClick={onLogout}><LogOut /> Logout</Button>
            </header>
            <LivePlodTracker user={operator} />
        </div>
    );
};

// --- OPERATOR PORTAL ---
export const OperatorPortal = () => {
    const [loggedInOperator, setLoggedInOperator] = useState<UserProfile | null>(null);

    if (loggedInOperator) {
        return (
            <DataProvider>
                <OperatorDashboard operator={loggedInOperator} onLogout={() => setLoggedInOperator(null)} />
            </DataProvider>
        );
    }

    return <OperatorLoginPage onLoginSuccess={setLoggedInOperator} />;
};
