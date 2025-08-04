import type { FC } from 'react';
import { UserProfile } from '../../types';

export const Dashboard: FC<{ user: UserProfile }> = ({ user }) => (
    <div>
        <h2 className="text-3xl font-bold text-stone-800 mb-2">
            Welcome, {user.name}!
        </h2>
        <p>Full dashboard content goes here.</p>
    </div>
);
