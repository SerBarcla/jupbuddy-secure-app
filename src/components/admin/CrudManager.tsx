import { useState } from 'react';
import type { FC, ReactNode } from 'react';
import { PlusCircle, Edit, Trash2, } from 'lucide-react';
import { useData } from '../../contexts/DataContext';
import type { CollectionName } from '../../contexts/DataContext';
import type { BaseItem } from '../../types';

 

const Button: FC<any> = ({ children, icon: Icon, variant = 'primary', ...props }) => {
    const variants: { [key: string]: string } = {
        primary: 'bg-emerald-600 text-white hover:bg-emerald-700',
        secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
        danger: 'bg-rose-600 text-white hover:bg-rose-700',
    };
    return (
        <button {...props} className={`font-bold py-2 px-4 rounded-lg transition flex items-center justify-center gap-2 ${variants[variant]}`}>
            {Icon && <Icon className="w-5 h-5" />}
            {children}
        </button>
    );
};

// --- CRUD MANAGER COMPONENT ---
interface CrudManagerProps<T extends BaseItem> {
  title: string;
  collectionName: CollectionName;
  formComponent: FC<{ isOpen: boolean; onClose: () => void; currentItem: T | null; }>;
  columns: { key: keyof T | "actions"; header: string; render?: (item: T) => ReactNode; }[];
}

export const CrudManager = <T extends BaseItem>({ title, collectionName, formComponent: FormComponent, columns }: CrudManagerProps<T>) => {
  const { [collectionName]: collectionData, deleteItem } = useData();
  const data = (collectionData as any).get as T[];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentItem, setCurrentItem] = useState<T | null>(null);

  const handleAddNew = () => { setCurrentItem(null); setIsModalOpen(true); };
  const handleEdit = (item: T) => { setCurrentItem(item); setIsModalOpen(true); };
  const handleDelete = (id: string) => { if (window.confirm("Are you sure?")) { deleteItem(collectionName, id); } };

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
