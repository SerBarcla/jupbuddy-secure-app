import { useState, useEffect } from 'react';
import styled, { ThemeProvider } from 'styled-components';
import { AdminPortal } from './portals/AdminPortal';
import { OperatorPortal } from './portals/OperatorPortal';
import { User, Briefcase } from 'lucide-react';

// --- THEME DEFINITION ---
const theme = {
  colors: {
    primary: '#059669', // emerald-600
    primaryHover: '#047857', // emerald-700
    background: '#f5f5f4', // stone-100
    surface: '#ffffff',
    text: '#292524', // stone-800
    textSecondary: '#a8a29e', // stone-400
    dark: {
      background: '#292524', // stone-800
      surface: '#44403c', // stone-700
      border: '#57534e', // stone-600
      text: '#ffffff',
    },
    accent: '#34d399', // emerald-400
    danger: '#dc2626', // rose-600
  },
  fonts: {
    body: 'Inter, sans-serif',
  },
  radii: {
    sm: '0.5rem',
    md: '1rem',
  }
};

// --- FIX: DECLARE THEME TYPE FOR STYLED-COMPONENTS ---
// This tells TypeScript what our theme object looks like.
type AppTheme = typeof theme;
declare module 'styled-components' {
  export interface DefaultTheme extends AppTheme {}
}


// --- STYLED COMPONENTS FOR PORTAL SELECTION ---
const SelectionContainer = styled.div`
  min-height: 100vh;
  background-color: ${props => props.theme.colors.dark.background};
  color: ${props => props.theme.colors.dark.text};
  font-family: ${props => props.theme.fonts.body};
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  padding: 1rem;
`;

const SelectionBox = styled.div`
  background-color: ${props => props.theme.colors.dark.surface};
  border: 1px solid ${props => props.theme.colors.dark.border};
  border-radius: ${props => props.theme.radii.md};
  padding: 3rem;
  width: 100%;
  max-width: 40rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
  text-align: center;
`;

const PortalButton = styled.button`
  background-color: ${props => props.theme.colors.primary};
  color: white;
  font-size: 1.25rem;
  font-weight: bold;
  border: none;
  border-radius: ${props => props.theme.radii.sm};
  padding: 1.5rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  transition: background-color 0.2s ease-in-out;

  &:hover {
    background-color: ${props => props.theme.colors.primaryHover};
  }
`;

const App = () => {
  const [portal, setPortal] = useState<'admin' | 'operator' | null>(null);

  if (portal === 'admin') {
    return <AdminPortal />;
  }

  if (portal === 'operator') {
    return <OperatorPortal />;
  }

  return (
    <SelectionContainer>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '2.25rem', fontWeight: 'bold' }}>JUP<span style={{ color: theme.colors.accent }}>Buddy</span></h1>
            <p style={{color: theme.colors.textSecondary}}>Please select your portal to continue</p>
        </div>
        <SelectionBox>
            {/* FIX: Changed 'mine control' to 'admin' to match the state type */}
            <PortalButton onClick={() => setPortal('admin')}>
                <User size={28} />
                Admin Portal
            </PortalButton>
            <PortalButton onClick={() => setPortal('operator')}>
                <Briefcase size={28} />
                Operator Portal
            </PortalButton>
        </SelectionBox>
    </SelectionContainer>
  );
}

// --- ANIMATED LOADING SCREEN ---
const LoadingScreen = () => (
  <div style={{
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    background: '#292524',
    color: '#34d399',
    fontFamily: 'Inter, sans-serif',
  }}>
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="40" cy="40" r="36" stroke="#34d399" strokeWidth="8" opacity="0.2" />
      <circle cx="40" cy="40" r="36" stroke="#34d399" strokeWidth="8" strokeDasharray="56 100" strokeDashoffset="0">
        <animateTransform attributeName="transform" type="rotate" from="0 40 40" to="360 40 40" dur="1s" repeatCount="indefinite" />
      </circle>
    </svg>
    <h2 style={{ marginTop: '2rem', fontSize: '2rem', fontWeight: 'bold' }}>JUP<span style={{ color: '#fff' }}>Buddy</span></h2>
    <p style={{ color: '#a8a29e', marginTop: '1rem' }}>Loading...</p>
  </div>
);

const ThemedApp = () => {
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    // Simulate loading for 1.5s or until app is ready
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);
  return (
    <ThemeProvider theme={theme}>
      {loading ? <LoadingScreen /> : <App />}
    </ThemeProvider>
  );
};

export default ThemedApp;
