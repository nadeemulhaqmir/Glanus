'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { csrfFetch } from '@/lib/api/csrfFetch';
import { useToast } from '@/lib/toast';
import { useWorkspace } from '@/lib/workspace/context';
import { PageSpinner } from '@/components/ui/Spinner';

interface FieldDefinition {
    id: string;
    name: string;
    label: string;
    fieldType: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'DATE' | 'JSON';
    required: boolean;
    defaultValue?: string;
    options?: any;
}

interface AssetCategory {
    id: string;
    name: string;
    description: string | null;
    icon: string;
    fieldDefinitions: FieldDefinition[];
}

export default function DynamicAssetCreatePage() {
    const router = useRouter();
    const { workspace } = useWorkspace();
    const { success, error: toastError } = useToast();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [categories, setCategories] = useState<AssetCategory[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<AssetCategory | null>(null);

    // Form State
    const [assetName, setAssetName] = useState('');
    const [assetStatus, setAssetStatus] = useState('AVAILABLE');
    const [customFields, setCustomFields] = useState<Record<string, any>>({});

    useEffect(() => {
        const fetchCategories = async () => {
            if (!workspace?.id) return;
            try {
                const res = await csrfFetch(`/api/assets/categories?workspaceId=${workspace.id}`);
                if (!res.ok) throw new Error('Failed to load classes');
                const data = await res.json();
                setCategories(data.data || []);
            } catch (err) {
                toastError('Error Loading Schemas', 'Please try again later.');
            } finally {
                setLoading(false);
            }
        };

        fetchCategories();
    }, [workspace?.id]);

    const handleCategorySelect = (categoryId: string) => {
        const category = categories.find(c => c.id === categoryId) || null;
        setSelectedCategory(category);

        // Reset dynamic state on switch
        const initialCustom: Record<string, any> = {};
        if (category) {
            category.fieldDefinitions.forEach(def => {
                initialCustom[def.name] = def.defaultValue || '';
                if (def.fieldType === 'BOOLEAN') initialCustom[def.name] = def.defaultValue === 'true';
            });
        }
        setCustomFields(initialCustom);
    };

    const handleCustomFieldChange = (fieldName: string, value: any) => {
        setCustomFields(prev => ({
            ...prev,
            [fieldName]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCategory || !workspace?.id) return;

        setSubmitting(true);
        try {
            // Package for backend
            const payload = {
                workspaceId: workspace.id,
                name: assetName,
                categoryId: selectedCategory.id,
                status: assetStatus,
                assetType: 'DYNAMIC',
                customFields: customFields
            };

            const response = await csrfFetch('/api/assets', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Failed to create asset');
            }

            const newAsset = await response.json();
            success('Asset Created', `${assetName} has been successfully provisioned.`);
            router.push(`/assets/${newAsset.data?.id || newAsset.id}`);

        } catch (err: any) {
            toastError('Creation Failed', err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <PageSpinner text="Loading Engine Definitions..." />;

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <div className="mb-8 flex justify-between items-center">
                <div>
                    <Link href="/assets" className="inline-flex items-center gap-2 text-nerve hover:text-nerve mb-4">
                        <ArrowLeft size={20} />
                        Back to Assets
                    </Link>
                    <h1 className="text-3xl font-bold text-foreground">Create Asset</h1>
                    <p className="text-slate-400 mt-2">Provision a new tracked resource in this Workspace.</p>
                </div>
                <Link href="/settings/classes" className="btn-secondary text-sm flex items-center gap-2">
                    <ExternalLink size={16} /> Manage Categories
                </Link>
            </div>

            <div className="grid grid-cols-1 gap-8">
                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Step 1: Core Configuration */}
                    <div className="card">
                        <h2 className="text-xl font-bold text-foreground mb-6 border-b border-border pb-4">1. Core Configuration</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Asset Name *</label>
                                <input
                                    type="text"
                                    required
                                    className="input w-full"
                                    placeholder="e.g. Primary Edge Router"
                                    value={assetName}
                                    onChange={e => setAssetName(e.target.value)}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">Initial Status *</label>
                                <select
                                    required
                                    className="input w-full"
                                    value={assetStatus}
                                    onChange={e => setAssetStatus(e.target.value)}
                                >
                                    <option value="AVAILABLE">✅ Available</option>
                                    <option value="ASSIGNED">👤 Assigned</option>
                                    <option value="MAINTENANCE">🔧 Maintenance</option>
                                </select>
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-nerve mb-2">Asset Category Class *</label>
                                <select
                                    required
                                    className="input w-full border-nerve/50 focus:border-nerve"
                                    value={selectedCategory?.id || ''}
                                    onChange={e => handleCategorySelect(e.target.value)}
                                >
                                    <option value="" disabled>Select a pre-defined Engine Class...</option>
                                    {categories.map(cat => (
                                        <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-slate-500 mt-2">
                                    Selecting a class determines which dynamically tracking fields apply to this asset.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Step 2: Dynamic Fields UI */}
                    {selectedCategory && (
                        <div className="card border-nerve/30">
                            <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-3 border-b border-border pb-4">
                                <span>2. Custom Matrix Data</span>
                                <span className="text-sm px-3 py-1 bg-nerve/20 text-nerve rounded-full">{selectedCategory.icon} {selectedCategory.name}</span>
                            </h2>

                            {selectedCategory.fieldDefinitions.length === 0 ? (
                                <p className="text-slate-500 italic">No custom tracking fields required for this Class.</p>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {selectedCategory.fieldDefinitions.map((def) => (
                                        <div key={def.id} className={def.fieldType === 'JSON' ? 'md:col-span-2' : ''}>
                                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                                {def.label} {def.required && <span className="text-red-400">*</span>}
                                            </label>

                                            {def.fieldType === 'BOOLEAN' ? (
                                                <div className="flex items-center gap-3 mt-3">
                                                    <input
                                                        type="checkbox"
                                                        className="w-5 h-5 rounded border-slate-700 text-nerve focus:ring-nerve"
                                                        checked={customFields[def.name] || false}
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

                    {/* Submit Matrix */}
                    {selectedCategory && (
                        <div className="flex justify-end gap-4 mt-8 pt-6 border-t border-slate-800">
                            <Link href="/assets" className="btn-secondary">Cancel</Link>
                            <button type="submit" disabled={submitting} className="btn-primary flex items-center gap-2">
                                {submitting ? <PageSpinner /> : 'Provision Asset Node'}
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
