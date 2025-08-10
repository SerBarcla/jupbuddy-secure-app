
import React, { useState, useEffect } from 'react';
import type { FC, ReactNode } from 'react';
import { PlusCircle, Edit, Trash2, Save } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import type { CollectionName } from '../../contexts/DataContext';
import type { UserProfile, Plod, Definition, BaseItem } from '../../types';
import { CompanySettings } from './CompanySettings';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';


// --- GENERIC CRUD MANAGER ---
interface CrudManagerProps<T extends BaseItem> {
  title: string;
  collectionName: CollectionName;
  formComponent: FC<{ isOpen: boolean; onClose: () => void; currentItem: T | null; }>;
  columns: { key: keyof T | "actions"; header: string; render?: (item: T) => ReactNode; }[];
}

const CrudManager = <T extends BaseItem>({ title, collectionName, formComponent: FormComponent, columns }: CrudManagerProps<T>) => {
  const { [collectionName]: collectionData, deleteItem } = useData();
  const data = (collectionData as any).get as T[];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<T | null>(null);

  const handleAddNew = () => { setCurrentItem(null); setIsModalOpen(true); };
  const handleEdit = (item: T) => { setCurrentItem(item); setIsModalOpen(true); };
  const handleDelete = (id: string) => { if (window.confirm("Are you sure you want to delete this? This action cannot be undone.")) { deleteItem(collectionName, id); } };

  const visibleData = data.filter((item) => !item.deleted);

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-2xl font-bold text-gray-700">{title}</h3>
        <Button onClick={handleAddNew} icon={PlusCircle}>Add New</Button>
      </div>
      <div className="bg-white rounded-xl shadow-md overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map(col => <th key={col.key as string} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{col.header}</th>)}
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {visibleData.map(item => (
              <tr key={item.id}>
                {columns.map(col => <td key={col.key as string} className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{col.render ? col.render(item) : (item as any)[col.key]}</td>)}
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => handleEdit(item)} className="text-emerald-600 hover:text-emerald-900 mr-4"><Edit /></button>
                  <button onClick={() => handleDelete(item.id)} className="text-rose-600 hover:text-rose-900"><Trash2 /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isModalOpen && <FormComponent isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} currentItem={currentItem} />}
    </div>
  );
};

// --- FORM COMPONENTS ---
const UserForm: FC<{ isOpen: boolean; onClose: () => void; currentItem: UserProfile | null; }> = ({ isOpen, onClose, currentItem }) => {
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
        if (formData.pin.length !== 5) {
            alert("PIN must be exactly 5 digits.");
            return;
        }
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
                    <div className="max-h-48 overflow-y-auto border rounded-lg p-2 grid grid-cols-2 gap-2">
                        {plods.filter(p => !p.deleted).map(plod => (
                            <label key={plod.id} className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-md">
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

const PlodForm: FC<{ isOpen: boolean; onClose: () => void; currentItem: Plod | null; }> = ({ isOpen, onClose, currentItem }) => {
    const { updateItem } = useData();
    const [name, setName] = useState('');
    useEffect(() => { setName(currentItem?.name || '') }, [currentItem]);
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateItem('plods', { id: currentItem?.id, name });
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={currentItem ? "Edit Plod" : "Add Plod"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <Input name="name" value={name} onChange={(e: any) => setName(e.target.value)} placeholder="Plod Name (e.g., Jumbo Drilling)" required />
                <div className="flex justify-end gap-4 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit" icon={Save}>Save Plod</Button>
                </div>
            </form>
        </Modal>
    );
};

const DefinitionForm: FC<{ isOpen: boolean; onClose: () => void; currentItem: Definition | null; }> = ({ isOpen, onClose, currentItem }) => {
    const { updateItem, plods: { get: plods } } = useData();
    const [formData, setFormData] = useState({ name: '', unit: '', linkedPlods: [] as string[] });

    useEffect(() => {
        if (currentItem) {
            setFormData({ name: currentItem.name, unit: currentItem.unit, linkedPlods: currentItem.linkedPlods || [] });
        } else {
            setFormData({ name: '', unit: '', linkedPlods: [] });
        }
    }, [currentItem]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handlePlodToggle = (plodId: string) => setFormData(prev => ({ ...prev, linkedPlods: prev.linkedPlods.includes(plodId) ? prev.linkedPlods.filter(id => id !== plodId) : [...prev.linkedPlods, plodId] }));

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        updateItem('definitions', { id: currentItem?.id, ...formData });
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={currentItem ? "Edit Definition" : "Add Definition"}>
             <form onSubmit={handleSubmit} className="space-y-4">
                <Input name="name" value={formData.name} onChange={handleChange} placeholder="Definition Name (e.g., Holes Drilled)" required />
                <Input name="unit" value={formData.unit} onChange={handleChange} placeholder="Unit (e.g., meters, kg)" required />
                <div>
                    <h4>Link to Plods</h4>
                    <div className="max-h-48 overflow-y-auto border rounded-lg p-2 grid grid-cols-2 gap-2">
                        {plods.filter(p => !p.deleted).map(plod => (
                            <label key={plod.id} className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-md">
                                <input type="checkbox" checked={formData.linkedPlods.includes(plod.id)} onChange={() => handlePlodToggle(plod.id)} />
                                {plod.name}
                            </label>
                        ))}
                    </div>
                </div>
                <div className="flex justify-end gap-4 pt-4">
                    <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
                    <Button type="submit" icon={Save}>Save Definition</Button>
                </div>
            </form>
        </Modal>
    );
};


// --- ADMIN SETTINGS VIEW ---
export const AdminSettings: FC = () => {
    const [activeTab, setActiveTab] = useState("Users");

    return (
        <div>
            <h2 className="text-3xl font-bold mb-6">Admin Settings</h2>
            <div className="border-b mb-6">
                <nav className="flex space-x-4">
                    <button onClick={() => setActiveTab('Users')} className={`py-2 px-4 font-semibold ${activeTab === 'Users' ? 'border-b-2 border-emerald-600 text-emerald-600' : ''}`}>Operators</button>
                    <button onClick={() => setActiveTab('Plods')} className={`py-2 px-4 font-semibold ${activeTab === 'Plods' ? 'border-b-2 border-emerald-600 text-emerald-600' : ''}`}>Plods</button>
                    <button onClick={() => setActiveTab('Definitions')} className={`py-2 px-4 font-semibold ${activeTab === 'Definitions' ? 'border-b-2 border-emerald-600 text-emerald-600' : ''}`}>Definitions</button>
                    {/* ADDED COMPANY TAB */}
                    <button onClick={() => setActiveTab('Company')} className={`py-2 px-4 font-semibold ${activeTab === 'Company' ? 'border-b-2 border-emerald-600 text-emerald-600' : ''}`}>Company</button>
                </nav>
            </div>
            <div>
                {activeTab === "Users" && <CrudManager<UserProfile> title="Manage Operators" collectionName="users" formComponent={UserForm} columns={[{ key: "name", header: "Name" }, { key: "userId", header: "Operator ID" }, { key: "operationalRole", header: "Operational Role" }]} />}
                {activeTab === "Plods" && <CrudManager<Plod> title="Manage Plods" collectionName="plods" formComponent={PlodForm} columns={[{ key: "name", header: "Plod Name" }]} />}
                {activeTab === "Definitions" && <CrudManager<Definition> title="Manage Definitions" collectionName="definitions" formComponent={DefinitionForm} columns={[{ key: "name", header: "Definition Name" }, { key: "unit", header: "Unit" }]} />}
                {/* RENDER COMPANY SETTINGS VIEW */}
                {activeTab === "Company" && <CompanySettings />}
            </div>
        </div>
    );
};
