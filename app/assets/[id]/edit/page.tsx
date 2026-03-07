'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { csrfFetch } from '@/lib/api/csrfFetch';
import { PageSpinner } from '@/components/ui/Spinner';
import { useToast } from '@/lib/toast';

interface FieldDefinition {
    id: string;
    name: string;
    label: string;
    fieldType: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'JSON';
    required: boolean;
    defaultValue?: string;
}

interface AssetCategory {
    id: string;
    name: string;
    description: string | null;
    icon: string;
    fieldDefinitions: FieldDefinition[];
}

export default function EditAssetPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { success, error: toastError } = useToast();

    const [id, setId] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Engine State
    const [category, setCategory] = useState<AssetCategory | null>(null);
    const [categoriesList, setCategoriesList] = useState<AssetCategory[]>([]); // needed if they want to change classes? (Usually prohibited but supported in backend)

    const [formData, setFormData] = useState({
        name: '',
        categoryId: '',
        status: 'AVAILABLE',
    });

    const [customFields, setCustomFields] = useState<Record<string, any>>({});

    // Unwrap params and fetch asset data
    useEffect(() => {
        params.then(({ id: assetId }) => {
            setId(assetId);
            fetchAsset(assetId);
        });
    }, [params]);

    const fetchAsset = async (assetId: string) => {
        try {
            // 1. Fetch Engine Schemas just in case they change the Class type
            const catRes = await csrfFetch(`/api/assets/categories`);
            if (catRes.ok) {
                const catData = await catRes.json();
                setCategoriesList(catData.data || []);
            }

            // 2. Fetch the specific Node
            const response = await csrfFetch(`/api/assets/${assetId}`);
            if (!response.ok) throw new Error('Failed to load asset');

            const result = await response.json();
            const asset = result.data || result; // Backend inconsistency guard

            setCategory(asset.category || null);

            // 3. Pre-fill core form
            setFormData({
                name: asset.name || '',
                categoryId: asset.categoryId || '',
                status: asset.status || 'AVAILABLE',
            });

            // 4. Pre-fill Custom Mapping Data
            const existingCustomState: Record<string, any> = {};

            // Map the arrays (AssetFieldValue[]) out into dictionary mappings aligned against field definition 'names'.
            if (asset.category?.fieldDefinitions && asset.fieldValues) {
                asset.category.fieldDefinitions.forEach((def: FieldDefinition) => {
                    // Find existing value in database array
                    const record = asset.fieldValues.find((fv: any) => fv.fieldDefinitionId === def.id);
                    if (record) {
                        // Hydrate cast
                        if (def.fieldType === 'BOOLEAN') existingCustomState[def.name] = record.value === 'true';
                        else existingCustomState[def.name] = record.value;
                    } else {
                        // Fallbacks
                        existingCustomState[def.name] = def.fieldType === 'BOOLEAN' ? false : '';
                    }
                });
            }
            setCustomFields(existingCustomState);
            setLoading(false);

        } catch (err: any) {
            toastError('Failed to load Editor', err.message);
            setLoading(false);
        }
    };

    const handleCategoryChange = (newCategoryId: string) => {
        const newCat = categoriesList.find(c => c.id === newCategoryId);
        if (!newCat) return;

        setCategory(newCat);
        setFormData(prev => ({ ...prev, categoryId: newCategoryId }));

        // Reset and map variables for the new class schema
        const initialCustom: Record<string, any> = {};
        newCat.fieldDefinitions.forEach(def => {
            initialCustom[def.name] = def.defaultValue || '';
            if (def.fieldType === 'BOOLEAN') initialCustom[def.name] = def.defaultValue === 'true';
        });
        setCustomFields(initialCustom);
    }

    const handleCustomFieldChange = (fieldName: string, value: any) => {
        setCustomFields(prev => ({
            ...prev,
            [fieldName]: value
        }));
    };

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            const payload = {
                ...formData,
                customFields: customFields
            };

            const response = await csrfFetch(`/api/assets/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to update asset node');
            }

            success('Changes Saved', 'Asset parameters updated successfully.');
            router.push(`/assets/${id}`);
            router.refresh(); // Forcing a server cache reload downstream

        } catch (err: any) {
            toastError('Update Failed', err.message);
            setSubmitting(false);
        }
    };

    const updateField = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    if (loading) return <PageSpinner text="Booting Dynamic Editor..." />;

    return (
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex items-center gap-4 mb-8">
                <Link href={`/assets/${id}`} className="text-slate-400 hover:text-white transition-colors">
                    <svg className="w-6 h-6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M15 19l-7-7 7-7" />
                    </svg>
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-white">Edit Parameters</h1>
                    <p className="text-slate-400 mt-1">Configure asset node details and custom tracking variables.</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* 1. Core Platform Configuration */}
                <div className="card">
                    <h2 className="text-xl font-bold text-white mb-6 border-b border-border pb-4">1. Core Configuration</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-slate-300 mb-2">Asset Name *</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={(e) => updateField('name', e.target.value)}
                                className="input w-full"
                                placeholder="Device name..."
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">Node Status</label>
                            <select
                                value={formData.status}
                                onChange={(e) => updateField('status', e.target.value)}
                                className="input w-full"
                            >
                                <option value="AVAILABLE">✅ Available</option>
                                <option value="ASSIGNED">👤 Assigned</option>
                                <option value="MAINTENANCE">🔧 In Maintenance</option>
                                <option value="RETIRED">🛑 Retired</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-nerve mb-2">Engine Class</label>
                            <select
                                value={formData.categoryId}
                                onChange={(e) => handleCategoryChange(e.target.value)}
                                className="input w-full border-nerve/30 focus:border-nerve"
                            >
                                {categoriesList.map(cat => (
                                    <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                                ))}
                            </select>
                            <p className="text-xs text-slate-500 mt-1">Warning: Changing the Class will erase existing custom variables on Save.</p>
                        </div>
                    </div>
                </div>

                {/* 2. Dynamic Schema UI */}
                {category && (
                    <div className="card border-nerve/30">
                        <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3 border-b border-border pb-4">
                            <span>2. Custom Matrix Data</span>
                            <span className="text-sm px-3 py-1 bg-nerve/20 text-nerve rounded-full">{category.icon} {category.name}</span>
                        </h2>

                        {category.fieldDefinitions.length === 0 ? (
                            <p className="text-slate-500 italic">No custom tracking fields required for this Class.</p>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {category.fieldDefinitions.map((def) => (
                                    <div key={def.id} className={def.fieldType === 'JSON' ? 'md:col-span-2' : ''}>
                                        <label className="block text-sm font-medium text-slate-300 mb-2">
                                            {def.label} {def.required && <span className="text-red-400">*</span>}
                                        </label>

                                        {def.fieldType === 'BOOLEAN' ? (
                                            <div className="flex items-center gap-3 mt-3">
                                                <input
                                                    type="checkbox"
                                                    className="w-5 h-5 rounded border-slate-700 text-nerve focus:ring-nerve"
                                                    checked={customFields[def.name] === true || customFields[def.name] === 'true'}
                                                    onChange={e => handleCustomFieldChange(def.name, e.target.checked)}
                                                />
                                                <span className="text-sm text-slate-400">Enable</span>
                                            </div>
                                        ) : def.fieldType === 'DATE' ? (
                                            <input
                                                type="date"
                                                required={def.required}
                                                className="input w-full"
                                                value={customFields[def.name] || ''}
                                                onChange={e => handleCustomFieldChange(def.name, e.target.value)}
                                            />
                                        ) : def.fieldType === 'JSON' ? (
                                            <textarea
                                                required={def.required}
                                                className="input w-full h-32 font-mono text-xs"
                                                placeholder='{"key": "value"}'
                                                value={customFields[def.name] || ''}
                                                onChange={e => handleCustomFieldChange(def.name, e.target.value)}
                                            />
                                        ) : (
                                            <input
                                                type={def.fieldType === 'NUMBER' ? 'number' : 'text'}
                                                required={def.required}
                                                className="input w-full"
                                                placeholder={`Enter ${def.label}...`}
                                                value={customFields[def.name] || ''}
                                                onChange={e => handleCustomFieldChange(def.name, e.target.value)}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-4">
                    <Link href={`/assets/${id}`} className="btn-secondary">
                        Discard
                    </Link>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="btn-primary flex items-center gap-2"
                    >
                        {submitting ? <PageSpinner /> : 'Save Parameters'}
                    </button>
                </div>
            </form>
        </div>
    );
}
