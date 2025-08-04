import React, { useState, useEffect } from 'react';
import type { FC } from 'react'; // <-- FIX: Changed to a type-only import
import styled from 'styled-components';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

// --- TYPE DEFINITIONS ---
interface UserProfile {
  id: string; // This is the document ID from Firestore
  userId: string;
  name: string;
  systemRole: 'Admin' | 'Operator';
  operationalRole: string;
  allowedPlods: string[];
  signature?: string;
  pin?: string;
}

// --- STYLED COMPONENTS ---
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

// --- ADMIN LOGIN COMPONENT ---
const AdminLoginPage: FC = () => {
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
                await createUserWithEmailAndPassword(auth, email, password);
                alert("Admin account created. An existing Super Admin must add your UID to the admin list to grant you access.");
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
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
                 <p style={{color: '#a8a29e'}}>Admin Portal</p>
            </div>
            <LoginBox>
                <Form onSubmit={handleAuthAction}>
                   <StyledInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Admin Email" required />
                   <StyledInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
                    {error && <p style={{ color: '#f43f5e', fontSize: '0.875rem', textAlign: 'center' }}>{error}</p>}
                    <StyledButton type="submit" disabled={loading}>
                        {loading ? 'Processing...' : (isSigningUp ? 'Register Admin Account' : 'Login')}
                    </StyledButton>
                </Form>
                 <button onClick={() => setIsSigningUp(!isSigningUp)} style={{ width: '100%', textAlign: 'center', fontSize: '0.875rem', color: '#a8a29e', marginTop: '1rem', background: 'none', border: 'none', cursor: 'pointer' }}>
                    {isSigningUp ? 'Already have an account? Login' : "Need to register a new Admin?"}
                </button>
            </LoginBox>
        </LoginContainer>
    );
};


// --- YOUR ORIGINAL APP COMPONENTS ---
const MainLayout: FC<{ user: UserProfile; onLogout: () => void }> = ({ user, onLogout }) => {
    return (
        <div>
            <h1>Welcome Admin, {user.name}</h1>
            <p>This is the full application dashboard.</p>
            <button onClick={onLogout}>Logout</button>
        </div>
    );
};


// --- ADMIN PORTAL ---
export const AdminPortal = () => {
    const [adminProfile, setAdminProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                const adminListRef = doc(db, 'admins', 'admin_list');
                const adminListSnap = await getDoc(adminListRef);

                if (adminListSnap.exists() && adminListSnap.data().uids.includes(user.uid)) {
                    const userProfileRef = doc(db, "users", user.uid);
                    const userProfileSnap = await getDoc(userProfileRef);
                    
                    if (userProfileSnap.exists()) {
                        // FIX: Combine the document ID with the rest of the data
                        const profileData = { id: userProfileSnap.id, ...userProfileSnap.data() } as UserProfile;
                        setAdminProfile(profileData);
                    } else {
                        const defaultProfile: Omit<UserProfile, 'id'> = { userId: user.uid, name: user.email!, systemRole: 'Admin', operationalRole: 'Administrator', allowedPlods: [] };
                        await setDoc(userProfileRef, defaultProfile);
                        setAdminProfile({ id: user.uid, ...defaultProfile } as UserProfile);
                    }
                } else {
                    auth.signOut();
                    setAdminProfile(null);
                }
            } else {
                setAdminProfile(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    if (loading) {
        return <div>Loading Admin Portal...</div>;
    }

    return adminProfile ? (
        <MainLayout user={adminProfile} onLogout={() => auth.signOut()} />
    ) : (
        <AdminLoginPage />
    );
};
