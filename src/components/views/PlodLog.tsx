import React, { useState, useMemo } from 'react';
import type { FC, ReactNode } from 'react';
import { Printer, FileSpreadsheet, X } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import type { LogEntry, UserProfile } from '../../types';
import { useLocalStorage } from '../../hooks/useLocalStorage';

// --- DYNAMIC SCRIPT LOADER (for Excel export) ---
const loadedScripts: { [url: string]: 'loading' | 'loaded' } = {};
function loadScript(url: string): Promise<void> {
    if (loadedScripts[url] === 'loaded') return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
        if (loadedScripts[url] === 'loading') {
            const interval = setInterval(() => {
                if (loadedScripts[url] === 'loaded') {
                    clearInterval(interval);
                    resolve();
                }
            }, 100);
            return;
        }
        loadedScripts[url] = 'loading';
        const script = document.createElement("script");
        script.src = url;
        script.type = "module";
        script.async = true;
        script.onload = () => {
            loadedScripts[url] = 'loaded';
            resolve();
        };
        script.onerror = () => {
            reject(new Error(`Failed to load script: ${url}`));
            delete loadedScripts[url];
        };
        document.body.appendChild(script);
    });
}


// --- HELPER UI COMPONENTS ---
const Modal: FC<{ children: ReactNode, isOpen: boolean, title: string, onClose: () => void }> = ({ children, isOpen, title, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl">
                <div className="flex justify-between items-center p-5 border-b">
                    <h3 className="text-xl font-bold">{title}</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100"><X /></button>
                </div>
                <div className="p-6 max-h-[70vh] overflow-y-auto">{children}</div>
            </div>
        </div>
    );
};

const Button: FC<any> = ({ children, icon: Icon, variant = 'primary', ...props }) => {
    const variants: { [key: string]: string } = {
        primary: 'bg-emerald-600 text-white hover:bg-emerald-700',
        secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
    };
    return (
        <button {...props} className={`font-bold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2 ${variants[variant]}`}>
            {Icon && <Icon className="w-5 h-5" />}
            {children}
        </button>
    );
};

const Input: FC<any> = (props) => <input {...props} className="w-full p-2 border border-gray-300 rounded-lg" />;

const PlodDetailModal: FC<{ log: LogEntry; onClose: () => void; users: UserProfile[]; }> = ({ log, onClose, users }) => {
    const formatDuration = (s: number) => `${Math.floor(s/3600)}h ${Math.floor(s%3600/60)}m ${s%60}s`;
    const operator = users.find(u => u.userId === log.userId || u.id === log.userId);
    const coworkers = (log.coworkers || []).map(id => users.find(u => u.id === id)?.name).filter(Boolean).join(", ");

    return (
        <Modal isOpen={true} onClose={onClose} title="Plod Details">
            <div className="space-y-4">
                <h2 className="text-2xl font-bold">{log.plodName}</h2>
                <p>{new Date(log.startTime).toLocaleString()}</p>
                <div className="grid grid-cols-2 gap-4 border-t pt-4">
                    <div><strong>User:</strong> {log.userName} ({log.operationalRole})</div>
                    <div><strong>Shift:</strong> {log.shift}</div>
                    <div><strong>Duration:</strong> {formatDuration(log.duration)}</div>
                    <div><strong>Time:</strong> {new Date(log.startTime).toLocaleTimeString()} - {new Date(log.endTime).toLocaleTimeString()}</div>
                    {coworkers && <div className="col-span-2"><strong>Co-workers:</strong> {coworkers}</div>}
                </div>
                {log.data && log.data.length > 0 && (
                    <div>
                        <h3 className="font-bold mt-4 border-t pt-4">Logged Data</h3>
                        <ul className="list-disc pl-5 space-y-1">
                            {log.data.map((d, i) => <li key={i}>{d.name}: <strong>{d.value} {d.unit}</strong></li>)}
                        </ul>
                    </div>
                )}
                {operator?.signature && (
                    <div className="mt-4 border-t pt-4 text-right">
                        <img src={operator.signature} alt="Signature" className="h-16 inline-block border p-1" />
                        <p className="text-sm text-gray-500">Operator Signature</p>
                    </div>
                )}
            </div>
        </Modal>
    );
};


// --- PLOD LOG VIEW COMPONENT ---
export const PlodLog: FC = () => {
    const { logs: { get: logs }, users: { get: users }, plods: { get: plods } } = useData();
    const [companySettings] = useLocalStorage("companySettings", { name: "JUPBuddy Report", logo: "" });
    const [filters, setFilters] = useState({ dateFrom: "", dateTo: "", shift: "", userId: "", plodId: "" });
    const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            if (log.deleted) return false;
            const logDate = new Date(log.startTime);
            if (filters.dateFrom && logDate < new Date(filters.dateFrom)) return false;
            if (filters.dateTo) {
                const dateTo = new Date(filters.dateTo);
                dateTo.setHours(23, 59, 59, 999);
                if (logDate > dateTo) return false;
            }
            if (filters.shift && log.shift !== filters.shift) return false;
            if (filters.userId && log.userId !== filters.userId) return false;
            if (filters.plodId && log.plodId !== filters.plodId) return false;
            return true;
        }).sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    }, [logs, filters]);

    const formatDuration = (s: number) => `${Math.floor(s/3600)}h ${Math.floor(s%3600/60)}m ${s%60}s`;
    
    // Helper function to prevent XSS attacks when generating HTML
    const escapeHtml = (unsafe: string) => {
        return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
    };

    const printReport = () => {
        const printWindow = window.open("", "_blank");
        if (!printWindow) {
            alert("Could not open print window. Please disable your pop-up blocker.");
            return;
        }

        const reportTitle = escapeHtml(companySettings.name || "JUPBuddy Plod Report");
        let reportHtml = `
            <html><head><title>${reportTitle}</title><style>
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
                body { font-family: 'Inter', sans-serif; background-color: #f3f4f6; padding: 20px; }
                .report-header { text-align: center; margin-bottom: 30px; }
                .report-header img { max-height: 60px; max-width: 150px; }
                .report-header h1 { font-size: 28px; color: #111827; margin: 0; }
                .report-header p { font-size: 14px; color: #6b7280; margin-top: 5px; }
                .card-container { display: flex; flex-wrap: wrap; gap: 20px; }
                .card { background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); padding: 20px; width: 100%; box-sizing: border-box; page-break-inside: avoid; border: 1px solid #e5e7eb; }
                .card-header h2 { font-size: 20px; font-weight: 700; color: #1f2937; margin: 0; }
                .card-header p { font-size: 14px; color: #4b5563; margin: 5px 0 0; }
                .card-body { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px; border-top: 1px solid #e5e7eb; padding-top: 15px; }
                .info-item .label { font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-bottom: 4px; }
                .info-item .value { font-size: 15px; color: #374151; }
                .data-section { grid-column: 1 / -1; }
                .data-section h3 { font-size: 16px; font-weight: 700; color: #1f2937; margin-bottom: 10px; border-top: 1px solid #e5e7eb; padding-top: 15px; }
                .data-list { list-style: none; padding: 0; margin: 0; }
                .data-list li { background-color: #f9fafb; padding: 8px 12px; border-radius: 6px; margin-bottom: 5px; display: flex; justify-content: space-between; }
                .signature-section { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: right; }
                .signature-section img { max-height: 50px; display: inline-block; }
                @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
            </style></head><body>
            <div class="report-header">
                ${companySettings.logo ? `<img src="${escapeHtml(companySettings.logo)}" alt="Company Logo">` : ''}
                <h1>${reportTitle}</h1>
                <p>Generated on: ${new Date().toLocaleString()}</p>
            </div>
            <div class="card-container">
        `;

        filteredLogs.forEach(log => {
            const operator = users.find(u => u.userId === log.userId || u.id === log.userId);
            const coworkers = (log.coworkers || []).map(id => users.find(u => u.id === id)?.name).filter(Boolean).join(", ");
            reportHtml += `
                <div class="card">
                    <div class="card-header">
                        <h2>${escapeHtml(log.plodName)}</h2>
                        <p>${new Date(log.startTime).toLocaleString()}</p>
                    </div>
                    <div class="card-body">
                        <div class="info-item"><span class="label">User</span><span class="value">${escapeHtml(log.userName)} (${escapeHtml(log.operationalRole)})</span></div>
                        <div class="info-item"><span class="label">Shift</span><span class="value">${escapeHtml(log.shift)}</span></div>
                        <div class="info-item"><span class="label">Duration</span><span class="value">${formatDuration(log.duration)}</span></div>
                        <div class="info-item"><span class="label">Time</span><span class="value">${new Date(log.startTime).toLocaleTimeString()} - ${new Date(log.endTime).toLocaleTimeString()}</span></div>
                        ${coworkers ? `<div class="info-item data-section"><span class="label">Co-workers</span><span class="value">${escapeHtml(coworkers)}</span></div>` : ''}
                        ${log.data && log.data.length > 0 ? `
                            <div class="data-section">
                                <h3>Logged Data & Consumables</h3>
                                <ul class="data-list">${log.data.map(d => `<li><span>${escapeHtml(d.name)}</span> <span>${escapeHtml(d.value)} ${escapeHtml(d.unit || '')}</span></li>`).join('')}</ul>
                            </div>` : ''
                        }
                    </div>
                    ${operator?.signature ? `<div class="signature-section"><img src="${escapeHtml(operator.signature)}" alt="Signature"></div>` : ''}
                </div>
            `;
        });

        reportHtml += `</div></body></html>`;
        printWindow.document.write(reportHtml);
        printWindow.document.close();
        printWindow.print();
    };

    const exportToExcel = async () => {
        const XLSX_URL = "https://cdn.sheetjs.com/xlsx-0.20.2/package/xlsx.mjs";
        try {
            await loadScript(XLSX_URL);
            const XLSX = (window as any).XLSX;
            if (!XLSX) throw new Error("Excel library not loaded.");

            const dataToExport = filteredLogs.map(log => ({
                "Plod Name": log.plodName,
                "User Name": log.userName,
                "Role": log.operationalRole,
                "Shift": log.shift,
                "Start Time": new Date(log.startTime).toLocaleString(),
                "End Time": new Date(log.endTime).toLocaleString(),
                "Duration (s)": log.duration,
            }));

            const ws = XLSX.utils.json_to_sheet(dataToExport);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Plod Log");
            XLSX.writeFile(wb, "JUPBuddy_Plod_Log.xlsx");
        } catch (error) {
            console.error("Failed to export to Excel", error);
            alert("Could not export to Excel.");
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-800">Plod Log</h2>
                <div>
                    <Button onClick={printReport} variant="secondary" icon={Printer} className="mr-2">Print Report</Button>
                    <Button onClick={exportToExcel} variant="secondary" icon={FileSpreadsheet}>Export to Excel</Button>
                </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-md mb-6 grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <Input type="date" name="dateFrom" value={filters.dateFrom} onChange={handleFilterChange} />
                <Input type="date" name="dateTo" value={filters.dateTo} onChange={handleFilterChange} />
                <select name="shift" value={filters.shift} onChange={handleFilterChange} className="w-full p-2 border border-gray-300 rounded-lg">
                    <option value="">All Shifts</option>
                    <option value="DS">Day Shift</option>
                    <option value="NS">Night Shift</option>
                </select>
                <select name="userId" value={filters.userId} onChange={handleFilterChange} className="w-full p-2 border border-gray-300 rounded-lg">
                    <option value="">All Users</option>
                    {users.filter(u => !u.deleted).map(u => <option key={u.id} value={u.userId}>{u.name}</option>)}
                </select>
                <select name="plodId" value={filters.plodId} onChange={handleFilterChange} className="w-full p-2 border border-gray-300 rounded-lg">
                    <option value="">All Plods</option>
                    {plods.filter(p => !p.deleted).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
            </div>
            <div className="bg-white rounded-xl shadow-md overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Start Time</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plod</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {filteredLogs.map(log => (
                            <tr key={log.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => setSelectedLog(log)}>
                                <td className="px-6 py-4 whitespace-nowrap">{new Date(log.startTime).toLocaleString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{log.userName}</td>
                                <td className="px-6 py-4 whitespace-nowrap font-semibold">{log.plodName}</td>
                                <td className="px-6 py-4 whitespace-nowrap font-mono">{formatDuration(log.duration)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {selectedLog && <PlodDetailModal log={selectedLog} onClose={() => setSelectedLog(null)} users={users} />}
        </div>
    );
};
