
import type { FC, ReactNode } from 'react';
import type { UserProfile} from '../../types';
import { useData } from '../../contexts/DataContext';
import { Users, List, ClipboardList } from 'lucide-react';

// A reusable component for displaying key metrics on the dashboard
const StatCard: FC<{ title: string; value: string | number; icon: ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-white p-6 rounded-xl shadow-md flex items-center space-x-4">
        <div className="bg-emerald-100 text-emerald-600 p-3 rounded-full">
            {icon}
        </div>
        <div>
            <p className="text-sm text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
        </div>
    </div>
);

export const Dashboard: FC<{ user: UserProfile }> = ({ user }) => {
    // Fetch data from the context to calculate stats
    const { users: { get: users }, logs: { get: logs }, plods: { get: plods } } = useData();

    // Calculate key statistics
    const totalOperators = users.filter(u => u.systemRole === 'Operator' && !u.deleted).length;
    const totalPlods = plods.filter(p => !p.deleted).length;
    
    const today = new Date().toDateString();
    const logsToday = logs.filter(log => new Date(log.startTime).toDateString() === today).length;

    // Get the 5 most recent plod logs to display
    const recentLogs = [...logs]
        .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
        .slice(0, 5);

    // Helper function to format duration
    const formatDuration = (s: number) => `${Math.floor(s/3600)}h ${Math.floor(s%3600/60)}m`;

    return (
        <div>
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
                Welcome, {user.name}!
            </h2>
            <p className="text-gray-600 mb-8">Here's a summary of your application's activity.</p>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <StatCard title="Total Operators" value={totalOperators} icon={<Users size={24} />} />
                <StatCard title="Total Plod Types" value={totalPlods} icon={<List size={24} />} />
                <StatCard title="Plods Logged Today" value={logsToday} icon={<ClipboardList size={24} />} />
            </div>

            {/* Recent Activity Section */}
            <div>
                <h3 className="text-2xl font-bold text-gray-700 mb-4">Recent Activity</h3>
                <div className="bg-white rounded-xl shadow-md">
                    <ul className="divide-y divide-gray-200">
                        {recentLogs.length > 0 ? (
                            recentLogs.map(log => (
                                <li key={log.id} className="p-4 flex justify-between items-center">
                                    <div>
                                        <p className="font-semibold text-gray-800">{log.plodName}</p>
                                        <p className="text-sm text-gray-500">by {log.userName} on {new Date(log.startTime).toLocaleDateString()}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="font-mono text-gray-700">{formatDuration(log.duration)}</p>
                                        <p className={`text-sm font-semibold ${log.shift === 'DS' ? 'text-amber-600' : 'text-blue-600'}`}>{log.shift}</p>
                                    </div>
                                </li>
                            ))
                        ) : (
                            <p className="p-4 text-gray-500">No recent activity to display.</p>
                        )}
                    </ul>
                </div>
            </div>
        </div>
    );
};
