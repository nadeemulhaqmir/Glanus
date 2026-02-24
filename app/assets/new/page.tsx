'use client';

import Link from 'next/link';
import { ArrowLeft, Monitor, Cloud } from 'lucide-react';

export default function AssetTypeSelectionPage() {
    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            <div className="mb-8">
                <Link href="/assets" className="inline-flex items-center gap-2 text-nerve hover:text-nerve mb-4">
                    <ArrowLeft size={20} />
                    Back to Assets
                </Link>
                <h1 className="text-3xl font-bold text-white">Create New Asset</h1>
                <p className="text-slate-400 mt-2">Choose the type of asset you want to create</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Physical Asset Option */}
                <Link
                    href="/assets/new/physical"
                    className="group block p-8 bg-slate-900/50 backdrop-blur-sm border-2 border-slate-800 rounded-lg hover:border-nerve hover:shadow-lg transition-all"
                >
                    <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-nerve/10 rounded-full flex items-center justify-center mb-4 group-hover:bg-nerve/50 transition-colors">
                            <Monitor className="w-8 h-8 text-nerve group-hover:text-white transition-colors" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Physical Asset</h2>
                        <p className="text-slate-400 mb-4">
                            Tangible hardware and equipment
                        </p>
                        <ul className="text-sm text-slate-500 text-left space-y-1">
                            <li>• Laptops & Desktops</li>
                            <li>• Servers & Networking Equipment</li>
                            <li>• Printers & Peripherals</li>
                            <li>• Mobile Devices</li>
                        </ul>
                    </div>
                </Link>

                {/* Digital Asset Option */}
                <Link
                    href="/assets/new/digital"
                    className="group block p-8 bg-slate-900/50 backdrop-blur-sm border-2 border-slate-800 rounded-lg hover:border-cortex hover:shadow-lg transition-all"
                >
                    <div className="flex flex-col items-center text-center">
                        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-purple-500 transition-colors">
                            <Cloud className="w-8 h-8 text-purple-600 group-hover:text-white transition-colors" />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">Digital Asset</h2>
                        <p className="text-slate-400 mb-4">
                            Software, licenses, and cloud services
                        </p>
                        <ul className="text-sm text-slate-500 text-left space-y-1">
                            <li>• Software Licenses</li>
                            <li>• SaaS Subscriptions</li>
                            <li>• Cloud Services</li>
                            <li>• Domain Names & SSL Certificates</li>
                        </ul>
                    </div>
                </Link>
            </div>

            {/* Info Box */}
            <div className="mt-8 p-6 bg-nerve/5 border border-nerve/20 rounded-lg">
                <h3 className="text-sm font-semibold text-nerve mb-2">💡 Need help choosing?</h3>
                <p className="text-sm text-nerve">
                    <strong>Physical assets</strong> are items you can physically touch, like computers and servers.
                    <strong className="ml-1">Digital assets</strong> are intangible resources like software and online services.
                </p>
            </div>
        </div>
    );
}
