import React, { useState, useEffect, useMemo, createContext, useContext, useRef } from 'react';
import type { FC, ReactNode } from 'react';
import styled from 'styled-components';
import { collection, getDocs, query, where, writeBatch, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { LogOut, Users as UsersIcon, PackagePlus, Square, X, Play, Wifi, Zap, Eraser, Save } from 'lucide-react';
import type { UserProfile, Plod, Definition, LogEntry, LoggedDataItem, } from '../types';

// --- OPERATOR DATA CONTEXT (with Offline Sync) ---
interface OperatorDataContextType {
  logs: { get: LogEntry[]; set: React.Dispatch<React.SetStateAction<LogEntry[]>> };
  addLogEntry: (logEntry: Omit<LogEntry, 'id' | 'updatedAt' | 'dirty' | 'deleted'>) => void;
  handleSync: () => Promise<void>;
  isSyncing: boolean;
  needsSync: boolean;
}

const OperatorDataContext = createContext<OperatorDataContextType | null>(null);
const useOperatorData = () => {
    const context = useContext(OperatorDataContext);
    if (!context) throw new Error("useOperatorData must be used within an OperatorDataProvider");
    return context;
};

const OperatorDataProvider: FC<{ children: ReactNode; operator: UserProfile }> = ({ children, operator }) => {
    const [logs, setLogs] = useLocalStorage<LogEntry[]>(`jupbuddy_logs_${operator.userId}`, []);
    const [isSyncing, setIsSyncing] = useState(false);
    const [needsSync, setNeedsSync] = useState(false);

    useEffect(() => {
        setNeedsSync(logs.some(log => (log as any).dirty));
    }, [logs]);

    const addLogEntry = (logEntry: Omit<LogEntry, 'id' | 'updatedAt' | 'dirty' | 'deleted'>) => {
        const newLog: LogEntry = {
            ...logEntry,
            id: `local_${Date.now()}`,
            updatedAt: new Date().toISOString(),
            dirty: true,
        };
        setLogs(prev => [...prev, newLog]);
    };

    const handleSync = async () => {
        if (!navigator.onLine) {
            alert("Cannot sync. You are offline.");
            return;
        }
        setIsSyncing(true);
        const batch = writeBatch(db);
        const dirtyLogs = logs.filter(log => (log as any).dirty);

        try {
            for (const log of dirtyLogs) {
                const { id, dirty, ...logData } = log as any;
                const docRef = doc(collection(db, 'logs'));
                batch.set(docRef, logData);
            }
            await batch.commit();
            setLogs(prev => prev.filter(log => !(log as any).dirty));
            alert("Sync successful!");
        } catch (error) {
            console.error("Operator sync failed:", error);
            if (window.confirm(`Sync failed: ${(error as Error).message}\nWould you like to retry?`)) {
                handleSync();
            }
        } finally {
            setIsSyncing(false);
        }
    };

    const value = { logs: { get: logs, set: setLogs }, addLogEntry, handleSync, isSyncing, needsSync };

    return <OperatorDataContext.Provider value={value}>{children}</OperatorDataContext.Provider>;
};


// --- STYLED COMPONENTS & HELPER COMPONENTS ---
const LoginContainer = styled.div`
  min-height: 100vh;
  background-color: #1c1917;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 1rem;
`;
const LoginBox = styled.div`
  background-color: #44403c;
  border: 1px solid #57534e;
  border-radius: 1rem;
  padding: 2rem;
  width: 100%;
  max-width: 28rem;
`;
const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
`;
const StyledInput = styled.input`
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    border: none;
    background-color: #f5f5f4;
    color: #292524;
`;
const StyledButton = styled.button`
    padding: 0.75rem;
    border-radius: 0.5rem;
    border: none;
    background-color: #059669;
    color: white;
    font-weight: bold;
    cursor: pointer;
    &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;
const ModalContainer = styled.div`
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;
`;
const ModalContent = styled.div`
  background: white; padding: 2rem; border-radius: 0.5rem; width: 90%; max-width: 500px;
`;
const Modal: FC<{ children: ReactNode, isOpen: boolean, title: string, onClose?: () => void }> = ({ children, isOpen, title, onClose }) => {
    if (!isOpen) return null;
    return (
        <ModalContainer>
            <ModalContent>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem'}}>
                    <h2 style={{fontSize: '1.25rem', fontWeight: 'bold'}}>{title}</h2>
                    {onClose && <button onClick={onClose}><X /></button>}
                </div>
                {children}
            </ModalContent>
        </ModalContainer>
    );
}

const Button: FC<any> = ({ children, icon: Icon, ...props }) => <button {...props} style={{display: 'flex', gap: '0.5rem', alignItems: 'center'}}>{Icon && <Icon />} {children}</button>;
const Input: FC<any> = (props) => <input {...props} />;

// --- SIGNATURE CAPTURE COMPONENTS (Restored) ---
const SignaturePad: FC<{ onSave: (signature: string) => void }> = ({ onSave }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const getCoords = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e && e.touches.length > 0) {
      return [e.touches[0].clientX - rect.left, e.touches[0].clientY - rect.top];
    }
    return [(e as React.MouseEvent).clientX - rect.left, (e as React.MouseEvent).clientY - rect.top];
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    const ctx = canvasRef.current!.getContext("2d");
    if (!ctx) return;
    const [x, y] = getCoords(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    e.preventDefault();
    const ctx = canvasRef.current!.getContext("2d");
    if (!ctx) return;
    const [x, y] = getCoords(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);
  const clearCanvas = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleSave = () => {
    const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        // Check if canvas is blank
        const blank = document.createElement('canvas');
        blank.width = canvas.width;
        blank.height = canvas.height;
        if (canvas.toDataURL() === blank.toDataURL()) {
            alert('Please provide a signature before saving.');
            return;
        }
        const dataUrl = canvas.toDataURL();
        onSave(dataUrl);
  };

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
  }, []);

  return (
    <div className="space-y-4">
      <canvas
        ref={canvasRef}
        width="400"
        height="200"
        className="bg-stone-100 border border-stone-300 rounded-lg cursor-crosshair w-full"
        onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
        onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
      ></canvas>
      <div className="flex justify-end gap-3">
        <Button onClick={clearCanvas} icon={Eraser}>Clear</Button>
        <Button onClick={handleSave} icon={Save}>Save Signature</Button>
      </div>
    </div>
  );
};

const SignatureModal: FC<{ onSave: (signature: string) => void }> = ({ onSave }) => (
  <Modal isOpen={true} title="Create Your Signature">
    <p className="text-stone-700 font-semibold mb-4">
      Please provide your signature. This will be used on all plods you log.
    </p>
    <SignaturePad onSave={onSave} />
  </Modal>
);


// --- HELPER MODALS ---
const AddDataModal: FC<{
  isOpen: boolean; onClose: () => void; onSave: (data: LoggedDataItem) => void; definitions: Definition[];
}> = ({ isOpen, onClose, onSave, definitions }) => {
  const [definitionId, setDefinitionId] = useState("");
  const [value, setValue] = useState("");

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const definition = definitions.find(d => d.id === definitionId);
        if (!definition) {
            alert('Please select a valid item.');
            return;
        }
        if (!value) {
            alert('Please enter a value.');
            return;
        }
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
  const [users, setUsers] = useState<UserProfile[]>([]);
  useEffect(() => {
      const fetchUsers = async () => {
          const usersSnap = await getDocs(collection(db, 'users'));
          setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile)));
      };
      fetchUsers();
  }, []);

  const [selected, setSelected] = useState<string[]>(selectedCoworkers);

  useEffect(() => { setSelected(selectedCoworkers); }, [selectedCoworkers, isOpen]);

  const handleToggle = (userId: string) => {
    setSelected(prev => prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]);
  };

  const handleSave = () => { onSave(selected); onClose(); };
  const availableUsers = users.filter(u => u.id !== currentUser.id && !u.deleted);

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
    const { addLogEntry } = useOperatorData();
    const [plods, setPlods] = useState<Plod[]>([]);
    const [definitions, setDefinitions] = useState<Definition[]>([]);
    
    useEffect(() => {
        const fetchData = async () => {
            const plodsSnap = await getDocs(collection(db, 'plods'));
            setPlods(plodsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Plod)));
            const definitionsSnap = await getDocs(collection(db, 'definitions'));
            setDefinitions(definitionsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Definition)));
        };
        fetchData();
    }, []);

    const [selectedPlod, setSelectedPlod] = useState("");
    const [isActive, setIsActive] = useState(false);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [elapsedTime, setElapsedTime] = useState(0);
    const [isDataModalOpen, setDataModalOpen] = useState(false);
    const [isCoworkerModalOpen, setCoworkerModalOpen] = useState(false);
    const [loggedData, setLoggedData] = useState<LoggedDataItem[]>([]);
    const [coworkers, setCoworkers] = useState<string[]>([]);

    const allowedPlods = useMemo(() => {
        return plods.filter(p => user.allowedPlods?.includes(p.id) && !p.deleted);
    }, [plods, user]);
    
    const currentPlodDefinitions = useMemo(() => {
        if (!selectedPlod) return [];
        return definitions.filter(def => def.linkedPlods?.includes(selectedPlod) && !def.deleted);
    }, [definitions, selectedPlod]);

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
    
    const handleStop = () => {
        if (!startTime) return;
        const endTime = new Date();
        const durationSeconds = Math.floor((endTime.getTime() - startTime) / 1000);
        const shift: 'DS' | 'NS' = endTime.getHours() >= 6 && endTime.getHours() < 18 ? "DS" : "NS";
        const plodDetails = plods.find(a => a.id === selectedPlod);

        addLogEntry({
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
        });

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
                    <p>Current Plod: {plods.find(a => a.id === selectedPlod)?.name}</p>
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
const OperatorLoginPage: FC<{ onLoginSuccess: (operatorData: UserProfile) => void }> = ({ onLoginSuccess }) => {
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
    if (String(operatorData.pin) === String(pin)) {
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
    const { handleSync, isSyncing, needsSync } = useOperatorData();
    return (
        <div style={{ padding: '2rem' }}>
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1>Welcome Operator, {operator.name}</h1>
                <div>
                    <Button onClick={handleSync} disabled={isSyncing || !needsSync}>
                        {isSyncing ? <Zap className="animate-spin"/> : <Wifi />}
                        {isSyncing ? 'Syncing...' : 'Sync Now'}
                        {needsSync && !isSyncing && <span style={{width: '10px', height: '10px', backgroundColor: 'orange', borderRadius: '50%', marginLeft: '8px'}}></span>}
                    </Button>
                    <Button onClick={onLogout} style={{marginLeft: '1rem'}}><LogOut /> Logout</Button>
                </div>
            </header>
            <LivePlodTracker user={operator} />
        </div>
    );
};


// --- OPERATOR PORTAL ---
export const OperatorPortal = () => {
    const [loggedInOperator, setLoggedInOperator] = useState<UserProfile | null>(null);
    const [forceSignature, setForceSignature] = useState(false);

    const handleLoginSuccess = (operatorData: UserProfile) => {
        setLoggedInOperator(operatorData);
        if (!operatorData.signature) {
            setForceSignature(true);
        }
    };

    const handleSignatureSaved = async (signature: string) => {
        if (!loggedInOperator) return;
        
        try {
            const userDocRef = doc(db, 'users', loggedInOperator.id);
            await updateDoc(userDocRef, { signature: signature });

            setLoggedInOperator(prev => ({ ...prev!, signature }));
            setForceSignature(false);
            alert("Signature saved successfully!");
        } catch (error) {
            console.error("Failed to save signature:", error);
            alert("Could not save signature. Please try again.");
        }
    };

    if (forceSignature && loggedInOperator) {
        return <SignatureModal onSave={handleSignatureSaved} />;
    }

    if (loggedInOperator) {
        return (
            <OperatorDataProvider operator={loggedInOperator}>
                <OperatorDashboard operator={loggedInOperator} onLogout={() => setLoggedInOperator(null)} />
            </OperatorDataProvider>
        );
    }

    return <OperatorLoginPage onLoginSuccess={handleLoginSuccess} />;
};
