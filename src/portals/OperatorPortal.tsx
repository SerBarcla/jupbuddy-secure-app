import React, { useState } from 'react';
import type { FC } from 'react'; // <-- FIX: Changed to a type-only import
import styled from 'styled-components';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';

// --- TYPE DEFINITIONS ---
interface UserProfile {
  id: string; // This is the document ID from Firestore
  userId: string;
  name: string;
  systemRole: 'Operator';
  operationalRole: string;
  pin: string;
}
// ... other types like LogEntry, etc.

// --- STYLED COMPONENTS (Similar to Admin portal) ---
const LoginContainer = styled.div`
  min-height: 100vh;
  background-color: #1c1917; /* A slightly different background for operators */
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
        // FIX: Combine the document ID with the rest of the data
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
                 <h1 style={{ fontSize: '2.25rem', fontWeight: 'bold', color: 'white' }}>JUP<span style={{ color: '#34d399' }}>Buddy</span></h1>
                 <p style={{color: '#a8a29e'}}>Operator Portal</p>
            </div>
            <LoginBox>
                <Form onSubmit={handleLogin}>
                    <StyledInput type="text" value={operatorId} onChange={(e) => setOperatorId(e.target.value)} placeholder="Operator ID" required />
                    <StyledInput type="password" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="5-Digit PIN" maxLength={5} required />
                    {error && <p style={{ color: '#f43f5e', fontSize: '0.875rem', textAlign: 'center' }}>{error}</p>}
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
        <div>
            <h1>Welcome Operator, {operator.name}</h1>
            <p>Your role: {operator.operationalRole}</p>
            <hr />
            <h2>Live Plod Tracker</h2>
            {/* <LivePlodTracker user={operator} /> */}
            <p>(Plod Tracker Component Goes Here)</p>
            <hr />
            <button onClick={onLogout}>Logout</button>
        </div>
    );
};


// --- OPERATOR PORTAL ---
export const OperatorPortal = () => {
    const [loggedInOperator, setLoggedInOperator] = useState<UserProfile | null>(null);

    if (loggedInOperator) {
        return <OperatorDashboard operator={loggedInOperator} onLogout={() => setLoggedInOperator(null)} />;
    }

    return <OperatorLoginPage onLoginSuccess={setLoggedInOperator} />;
};
