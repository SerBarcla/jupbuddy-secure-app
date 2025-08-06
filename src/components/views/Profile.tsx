import { useMemo } from 'react';
import type { FC } from 'react';
import { useData } from '../../contexts/DataContext';
import type { UserProfile } from '../../types';

export const Profile: FC<{ user: UserProfile }> = ({ user }) => {
    const { plods: { get: allPlods } } = useData();

    // This memoized value calculates the names of the plods assigned to the user.
    const userPlods = useMemo(() => {
        if (!user.allowedPlods || user.allowedPlods.length === 0) {
            return "None Assigned";
        }
        return allPlods
            .filter(plod => user.allowedPlods.includes(plod.id))
            .map(plod => plod.name)
            .join(", ");
    }, [user, allPlods]);

    return (
        <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-6">Your Profile</h2>
            <div className="bg-white p-8 rounded-xl shadow-md max-w-2xl mx-auto">
                <h3 className="text-xl font-bold text-gray-800 border-b pb-3 mb-4">
                    Administrator Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div>
                        <span className="font-semibold text-gray-500 text-sm">Full Name</span>
                        <p className="text-gray-800 text-lg">{user.name}</p>
                    </div>
                    <div>
                        <span className="font-semibold text-gray-500 text-sm">User ID (UID)</span>
                        <p className="text-gray-800 text-lg font-mono text-sm">{user.userId}</p>
                    </div>
                    <div>
                        <span className="font-semibold text-gray-500 text-sm">System Role</span>
                        <p className="text-gray-800 text-lg">{user.systemRole}</p>
                    </div>
                    <div>
                        <span className="font-semibold text-gray-500 text-sm">Operational Role</span>
                        <p className="text-gray-800 text-lg">{user.operationalRole}</p>
                    </div>
                    <div className="col-span-1 md:col-span-2">
                        <span className="font-semibold text-gray-500 text-sm">Assigned Plods</span>
                        <p className="text-gray-800 text-lg">{userPlods}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};
