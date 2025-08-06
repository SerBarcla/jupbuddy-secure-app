import React, { useState, useEffect } from 'react';
import type { FC, ReactNode } from 'react';
import { Save, X } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import type { UserProfile } from '../../types';

// --- HELPER UI COMPONENTS (Also needed by the form) ---
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


// --- USER FORM COMPONENT ---
export const UserForm: FC<{ isOpen: boolean; onClose: () => void; currentItem: UserProfile | null; }> = ({ isOpen, onClose, currentItem }) => {
    const { updateItem, plods: { get: plods } } = useData();
    const [formData, setFormData] = useState({ name: '', userId: '', pin: '', operationalRole: '', allowedPlods: [] as string[] });

    useEffect(() => {
        if (currentItem) {
            setFormData({ name: currentItem.name, userId: currentItem.userId, pin: currentItem.pin || '', operationalRole: currentItem.operationalRole, allowedPlods: currentItem.allowedPlods || [] });
        } else {
            setFormData({ name: '', userId: '', pin: '00000', operationalRole: '', allowedPlods: [] });
        }
    }, [currentItem]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handlePlodToggle = (plodId: string) => setFormData(prev => ({ ...prev, allowedPlods: prev.allowedPlods.includes(plodId) ? prev.allowedPlods.filter(id => id !== plodId) : [...prev.allowedPlods, plodId] }));
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateItem('users', { id: currentItem?.id, ...formData, systemRole: 'Operator' });
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={currentItem ? "Edit Operator" : "Add Operator"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input name="name" value={formData.name} onChange={handleChange} placeholder="Full Name" required />
                <Input name="userId" value={formData.userId} onChange={handleChange} placeholder="Operator ID" required />
                <Input name="pin" value={formData.pin} onChange={handleChange} placeholder="5-Digit PIN" maxLength={5} required />
                <Input name="operationalRole" value={formData.operationalRole} onChange={handleChange} placeholder="Operational Role" required />
                <div>
                    <h4>Allowed Plods</h4>
                    <div className="max-h-48 overflow-y-auto border rounded-lg p-2">
                        {plods.map(plod => (
                            <label key={plod.id} className="flex items-center gap-2">
                                <input type="checkbox" checked={formData.allowedPlods.includes(plod.id)} onChange={() => handlePlodToggle(plod.id)} />
                                {plod.name}
                            </label>
                        ))}
                    </div>
                </div>
                <div className="flex justify-end gap-4 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit" icon={Save}>Save Operator</Button>
                </div>
            </form>
        </Modal>
    );
};
