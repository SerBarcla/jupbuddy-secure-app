import React from 'react';
import type { FC } from 'react';
import { useLocalStorage } from '../../hooks/useLocalStorage';
import { Save } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';


// --- COMPANY SETTINGS VIEW ---
export const CompanySettings: FC = () => {
    const [settings, setSettings] = useLocalStorage("companySettings", {
        name: "JUPBuddy Report",
        logo: "",
    });

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSettings(s => ({ ...s, name: e.target.value }));
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.size > 1024 * 100) { // 100KB limit
            alert("Logo image is too large. Please use an image under 100KB.");
            return;
        }
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setSettings(s => ({ ...s, logo: reader.result as string }));
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div>
            <h3 className="text-2xl font-bold text-gray-700 mb-4">Company Settings</h3>
            <div className="bg-white p-8 rounded-xl shadow-md space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Name for Reports</label>
                    <Input
                        type="text"
                        value={settings.name}
                        onChange={handleNameChange}
                        placeholder="Enter your company's name"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Logo</label>
                    {settings.logo && (
                        <img
                            src={settings.logo}
                            alt="Company Logo Preview"
                            className="h-20 mb-4 border p-2 rounded-md bg-gray-50"
                        />
                    )}
                    <Input
                        type="file"
                        accept="image/png, image/jpeg, image/svg+xml"
                        onChange={handleLogoChange}
                    />
                    <p className="text-xs text-gray-500 mt-1">
                        Recommended: PNG or SVG with transparent background, under 100KB.
                    </p>
                </div>
                 <div className="flex justify-end pt-4">
                    <Button onClick={() => alert("Company settings saved!")} icon={Save}>Save Settings</Button>
                </div>
            </div>
        </div>
    );
};
