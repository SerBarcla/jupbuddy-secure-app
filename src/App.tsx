import React, { useState, useEffect, useMemo, useCallback, createContext, useContext, useRef, FC, ReactNode } from 'react';
import styled, { css } from 'styled-components';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, Auth } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, doc, setDoc, onSnapshot, addDoc, updateDoc, deleteDoc, writeBatch, enableNetwork, disableNetwork, Firestore } from 'firebase/firestore';
import { LogOut, User, Lock, Settings, PlusCircle, Filter, Sun, Moon, Home, List, Users as UsersIcon, Briefcase, ChevronDown, X, Play, Square, Clock, PackagePlus, Edit, Trash2, Search, Printer, Save, Wifi, WifiOff, CloudCog, Zap, ClipboardList, ShieldCheck, FileSpreadsheet, Building, Upload, PenTool, Eraser, Menu } from 'lucide-react';
import { auth, db } from './firebase'; // Import from our new firebase.ts file

// --- Type Definitions ---
// (All your existing type definitions: BaseItem, UserProfile, Plod, etc. remain here)
interface BaseItem {
  id: string;
  deleted?: boolean;
  dirty?: boolean;
  updatedAt?: string;
}

interface UserProfile extends BaseItem {
  docId?: string;
  userId?: string;
  name: string;
  systemRole: 'Admin' | 'Operator' | 'Super Admin';
  operationalRole: string;
  allowedPlods: string[];
  isSuperAdmin?: boolean;
  signature?: string;
}

interface Plod extends BaseItem {
  name: string;
}

interface Definition extends BaseItem {
  name: string;
  unit: string;
  linkedPlods: string[];
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

interface LoggedDataItem {
  definitionId: string;
  name: string;
  value: string;
  unit: string;
}


// --- Local Storage & Other Utilities ---
// (Your useLocalStorage, loadScript utilities remain here)
const useLocalStorage = <T,>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] => {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(error);
            return initialValue;
        }
    });

    const setValue = (value: T | ((val: T) => T)) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            console.error(error);
        }
    };
    return [storedValue, setValue];
};

// --- Data Context for Offline-First ---
// (Your DataProvider, DataContext, and useData hooks remain largely the same, but no longer need the FirebaseProvider wrapper)
type DataCollections = {
  users: UserProfile[];
  plods: Plod[];
  definitions: Definition[];
  logs: LogEntry[];
};
type CollectionName = keyof DataCollections;

interface DataContextType {
  users: {
    get: UserProfile[];
    set: React.Dispatch<React.SetStateAction<UserProfile[]>>;
    path: string;
  };
  plods: {
    get: Plod[];
    set: React.Dispatch<React.SetStateAction<Plod[]>>;
    path: string;
  };
  definitions: {
    get: Definition[];
    set: React.Dispatch<React.SetStateAction<Definition[]>>;
    path: string;
  };
  logs: {
    get: LogEntry[];
    set: React.Dispatch<React.SetStateAction<LogEntry[]>>;
    path: string;
  };
  updateItem: (collectionName: CollectionName, item: any) => void;
  deleteItem: (collectionName: CollectionName, id: string) => void;
  handleSync: () => Promise<void>;
  isSyncing: boolean;
  lastSync: string | null;
  needsSync: boolean;
}

const DataContext = createContext<DataContextType | null>(null);

const DataProvider: FC<{ children: ReactNode }> = ({ children }) => {
    // All the state for DataProvider remains the same
    const [users, setUsers] = useLocalStorage<UserProfile[]>("jupbuddy_users", []);
    const [plods, setPlods] = useLocalStorage<Plod[]>("jupbuddy_plods", []);
    const [definitions, setDefinitions] = useLocalStorage<Definition[]>("jupbuddy_definitions", []);
    const [logs, setLogs] = useLocalStorage<LogEntry[]>("jupbuddy_logs", []);
    const [isSyncing, setIsSyncing] = useState(false);
    const [lastSync, setLastSync] = useLocalStorage<string | null>("jupbuddy_lastSync", null);
    const [needsSync, setNeedsSync] = useState(false);

    // All the logic (collections, updateItem, deleteItem, handleSync) for DataProvider remains here...
    const collections = useMemo(
        () => ({
            users: { get: users, set: setUsers, path: "users" },
            plods: { get: plods, set: setPlods, path: "plods" },
            definitions: { get: definitions, set: setDefinitions, path: "definitions" },
            logs: { get: logs, set: setLogs, path: "logs" },
        }),
        [users, plods, definitions, logs, setUsers, setPlods, setDefinitions, setLogs]
    );

    const updateItem = useCallback(/* ...your existing updateItem logic... */);
    const deleteItem = useCallback(/* ...your existing deleteItem logic... */);
    const handleSync = useCallback(async () => { /* ...your existing sync logic... */}, []);
    useEffect(() => { /* ...your existing needsSync effect... */}, [collections]);

    const value = useMemo(() => ({
        ...collections,
        updateItem,
        deleteItem,
        handleSync,
        isSyncing,
        lastSync,
        needsSync,
    }), [collections, updateItem, deleteItem, handleSync, isSyncing, lastSync, needsSync]);


    return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};
const useData = () => {
    const context = useContext(DataContext);
    if (!context) throw new Error("useData must be used within a DataProvider");
    return context;
};

// --- Helper Components & Styled Components ---
// (Your Modal, Input, Button, and other components would be converted to styled-components here)
const Modal: FC<{
    children: ReactNode;
    isOpen: boolean;
    onClose?: () => void;
    title: string;
    size?: "md" | "lg" | "xl" | "2xl";
}> = ({ children, isOpen, onClose, title, size = "lg" }) => { /* ... your existing Modal JSX, converted to styled-components */ };

// --- Main Application Components ---

// NEW SECURE LOGIN PAGE
const LoginContainer = styled.div`
  min-height: 100vh;
  background-color: #292524;
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

const LoginPage: FC<{ onLoginSuccess: () => void }> = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [isSigningUp, setIsSigningUp] = useState(false);

    const handleAuthAction = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            if (isSigningUp) {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                // After signup, you might want to create a user profile document in Firestore
                // This is a crucial step for role-based access control.
                const userProfile: Omit<UserProfile, 'id'> = {
                    name: email.split('@')[0], // a default name
                    systemRole: 'Operator', // default role
                    operationalRole: 'New User',
                    allowedPlods: [],
                    userId: userCredential.user.uid,
                };
                await setDoc(doc(db, "users", userCredential.user.uid), userProfile);
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
            // onLoginSuccess is handled by the onAuthStateChanged listener now.
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <LoginContainer>
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                 <h1 style={{ fontSize: '2.25rem', fontWeight: 'bold', color: 'white' }}>JUP<span style={{ color: '#34d399' }}>Buddy</span></h1>
            </div>
            <LoginBox>
                <Form onSubmit={handleAuthAction}>
                   <StyledInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
                   <StyledInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
                    {error && <p style={{ color: '#f43f5e', fontSize: '0.875rem', textAlign: 'center' }}>{error}</p>}
                    <StyledButton type="submit" disabled={loading}>
                        {loading ? 'Processing...' : (isSigningUp ? 'Sign Up' : 'Login')}
                    </StyledButton>
                </Form>
                <button onClick={() => setIsSigningUp(!isSigningUp)} style={{ width: '100%', textAlign: 'center', fontSize: '0.875rem', color: '#a8a29e', marginTop: '1rem', background: 'none', border: 'none', cursor: 'pointer' }}>
                    {isSigningUp ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
                </button>
            </LoginBox>
        </LoginContainer>
    );
};


// Your other components (MainLayout, Dashboard, PlodLog, AdminSettings, etc.) remain here
const MainLayout: FC<{ user: UserProfile; onLogout: () => void }> = ({ user, onLogout }) => { /* ...your existing MainLayout logic... */ };
const Dashboard: FC<{ user: UserProfile }> = ({ user }) => { /* ... */ };
const PlodLog: FC = () => { /* ... */ };
// etc...

// --- Main App Component ---
function AppContent() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true); // To show a loading state

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // User is signed in, fetch their profile from Firestore
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDocs(query(collection(db, "users"), where("userId", "==", user.uid)));

        if (!userDoc.empty) {
            const userProfile = userDoc.docs[0].data() as UserProfile;
            setCurrentUser(userProfile);
        } else {
            // This case might happen if the user profile wasn't created on signup
            // Or if you want to handle a "profile creation" step
            console.log("No user profile found for UID:", user.uid);
            setCurrentUser(null); // Or handle as an incomplete profile
        }
      } else {
        // User is signed out
        setCurrentUser(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = () => {
    auth.signOut();
  };

  if (authLoading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#292524', color: 'white' }}>
        <p>Initializing...</p>
      </div>
    );
  }

  return currentUser ? (
    <MainLayout user={currentUser} onLogout={handleLogout} />
  ) : (
    <LoginPage onLoginSuccess={() => { /* Logic is now handled by onAuthStateChanged */}} />
  );
}

export default function App() {
  return (
    <DataProvider>
      <AppContent />
    </DataProvider>
  );
}