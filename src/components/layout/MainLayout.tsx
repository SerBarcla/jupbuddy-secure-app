import React, { useState } from 'react';
import type { FC } from 'react';
import { Home, List, Settings, Wifi, Zap, LogOut, User as UserIcon } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import type { UserProfile } from '../../types';
import { Dashboard } from '../views/Dashboard';
import { PlodLog } from '../views/PlodLog';
import { AdminSettings } from '../views/AdminSettings';
import { Profile } from '../views/Profile';

export const MainLayout: FC<{ user: UserProfile; onLogout: () => void }> = ({ user, onLogout }) => {
    const [currentView, setCurrentView] = useState("dashboard");
    const { handleSync, isSyncing } = useData();

    const SidebarItem: FC<{icon: React.ElementType; text: string; view: string; active: boolean}> = ({ icon: Icon, text, view, active }) => (
        <li onClick={() => setCurrentView(view)} className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${active ? "bg-emerald-700 text-white" : "text-gray-300 hover:bg-gray-700"}`}>
            <Icon />
            <span>{text}</span>
        </li>
    );

    return (
        <div className="flex h-screen bg-gray-100 font-sans">
            <aside className="w-64 bg-gray-800 text-white p-4 flex flex-col">
                <h1 className="text-2xl font-bold text-center py-4">JUP<span className="text-emerald-400">Buddy</span></h1>
                <nav className="flex-grow">
                    <ul className="space-y-2">
                        <SidebarItem icon={Home} text="Dashboard" view="dashboard" active={currentView === 'dashboard'} />
                        <SidebarItem icon={List} text="Plod Log" view="log" active={currentView === 'log'} />
                        <SidebarItem icon={Settings} text="Admin Settings" view="admin" active={currentView === 'admin'} />
                    </ul>
                </nav>
                <div className="mt-auto">
                    <button onClick={handleSync} className="flex items-center space-x-3 p-3 rounded-lg w-full hover:bg-gray-700">
                        {isSyncing ? <Zap className="animate-spin"/> : <Wifi />}
                        <span>{isSyncing ? 'Syncing...' : 'Sync with Cloud'}</span>
                    </button>
                    <div className="p-4 mt-4 bg-gray-700 rounded-lg">
                        <p className="font-bold">{user.name}</p>
                        <p className="text-sm text-gray-400">{user.operationalRole}</p>
                    </div>
                    <SidebarItem icon={UserIcon} text="Profile" view="profile" active={currentView === 'profile'} />
                    <button onClick={onLogout} className="flex items-center space-x-3 p-3 mt-2 rounded-lg w-full text-rose-400 hover:bg-rose-500 hover:text-white">
                        <LogOut />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>
            <main className="flex-1 p-8 overflow-y-auto">
                {currentView === "dashboard" && <Dashboard user={user} />}
                {currentView === "log" && <PlodLog />}
                {currentView === "admin" && <AdminSettings />}
                {currentView === "profile" && <Profile user={user} />}
            </main>
        </div>
    );
};
