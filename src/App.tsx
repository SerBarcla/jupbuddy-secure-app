import { useState } from 'react';
import { AdminPortal } from './portals/AdminPortal';
import { OperatorPortal } from './portals/OperatorPortal';

export default function App() {
  const [portal, setPortal] = useState<'admin' | 'operator' | null>(null);

  if (portal === 'admin') {
    return <AdminPortal />;
  }

  if (portal === 'operator') {
    return <OperatorPortal />;
  }

  // Initial portal selection screen
  return (
    <div>
      <h1>Welcome to JUPBuddy</h1>
      <button onClick={() => setPortal('admin')}>Admin Portal</button>
      <button onClick={() => setPortal('operator')}>Operator Portal</button>
    </div>
  );
}