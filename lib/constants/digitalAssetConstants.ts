export const DIGITAL_ASSET_CATEGORIES = {
    WEB_APPLICATION: 'WEB_APPLICATION',
    MOBILE_APP: 'MOBILE_APP',
    DESKTOP_APP: 'DESKTOP_APP',
    SAAS_SUBSCRIPTION: 'SAAS_SUBSCRIPTION',
    DATABASE: 'DATABASE',
    DEVELOPMENT_TOOL: 'DEVELOPMENT_TOOL',
    SECURITY_DIGITAL: 'SECURITY_DIGITAL',
    LICENSE: 'LICENSE',
    API_SERVICE: 'API_SERVICE',
    CLOUD_STORAGE: 'CLOUD_STORAGE',
    VIRTUAL_MACHINE: 'VIRTUAL_MACHINE',
    LLM: 'LLM',
    OTHER: 'OTHER',
} as const;

export const LICENSE_TYPES = {
    PERPETUAL: 'PERPETUAL',
    SUBSCRIPTION: 'SUBSCRIPTION',
    TRIAL: 'TRIAL',
    OPEN_SOURCE: 'OPEN_SOURCE',
    FREEMIUM: 'FREEMIUM',
    ENTERPRISE: 'ENTERPRISE',
} as const;

export const HOST_TYPES = {
    ASSET: 'ASSET',
    PROVIDER: 'PROVIDER',
    HYBRID: 'HYBRID',
    ON_PREMISE: 'ON_PREMISE',
} as const;

// UI labels with emojis
export const getDigitalAssetCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
        WEB_APPLICATION: '🌐 Web Application',
        MOBILE_APP: '📱 Mobile App',
        DESKTOP_APP: '💻 Desktop Application',
        SAAS_SUBSCRIPTION: '☁️ SaaS Subscription',
        DATABASE: '🗄️ Database',
        DEVELOPMENT_TOOL: '🛠️ Development Tool',
        SECURITY_DIGITAL: '🔒 Security Software',
        LICENSE: '🔑 License',
        API_SERVICE: '🔌 API Service',
        CLOUD_STORAGE: '📦 Cloud Storage',
        VIRTUAL_MACHINE: '🖥️ Virtual Machine',
        LLM: '🤖 Large Language Model',
        OTHER: '📦 Other',
    };
    return labels[category] || category;
};

export const getDigitalAssetCategoryOptions = () => {
    return Object.keys(DIGITAL_ASSET_CATEGORIES).map((key) => ({
        value: key,
        label: getDigitalAssetCategoryLabel(key),
    }));
};

export const getLicenseTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
        PERPETUAL: '♾️ Perpetual',
        SUBSCRIPTION: '📅 Subscription',
        TRIAL: '⏱️ Trial',
        OPEN_SOURCE: '🆓 Open Source',
        FREEMIUM: '🎁 Freemium',
        ENTERPRISE: '🏢 Enterprise',
    };
    return labels[type] || type;
};

export const getLicenseTypeOptions = () => {
    return Object.keys(LICENSE_TYPES).map((key) => ({
        value: key,
        label: getLicenseTypeLabel(key),
    }));
};

export const getHostTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
        ASSET: '🖥️ Company Asset',
        PROVIDER: '☁️ Cloud Provider',
        HYBRID: '🔄 Hybrid',
        ON_PREMISE: '🏢 On-Premise',
    };
    return labels[type] || type;
};

export const getHostTypeOptions = () => {
    return Object.keys(HOST_TYPES).map((key) => ({
        value: key,
        label: getHostTypeLabel(key),
    }));
};

// Check if host is required for a category
export const isHostRequired = (category: string): boolean => {
    const requiresHost = [
        'VIRTUAL_MACHINE',
        'DATABASE',
        'WEB_APPLICATION',
        'API_SERVICE',
    ];
    return requiresHost.includes(category);
};

// Check if installedOn is relevant for a category
export const isInstalledOnRelevant = (category: string): boolean => {
    const relevant = [
        'DESKTOP_APP',
        'MOBILE_APP',
        'SECURITY_DIGITAL',
    ];
    return relevant.includes(category);
};
