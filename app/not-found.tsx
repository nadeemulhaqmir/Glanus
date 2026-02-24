import Link from 'next/link';

/**
 * 404 Not Found Page
 *
 * Displayed when a user navigates to a route that doesn't exist.
 */

export default function NotFound() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-950 text-white">
            <div className="text-center max-w-md px-6">
                {/* 404 Visual */}
                <div className="mb-6">
                    <span className="text-7xl font-bold bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">
                        404
                    </span>
                </div>

                <h1 className="text-2xl font-bold mb-3">Page not found</h1>
                <p className="text-slate-400 mb-8 text-sm leading-relaxed">
                    The page you&apos;re looking for doesn&apos;t exist or has been moved.
                </p>

                <div className="flex gap-3 justify-center">
                    <Link
                        href="/"
                        className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-medium rounded-lg transition-colors"
                    >
                        Go home
                    </Link>
                    <Link
                        href="/login"
                        className="px-6 py-2.5 border border-slate-700 hover:border-slate-600 text-slate-300 font-medium rounded-lg transition-colors"
                    >
                        Sign in
                    </Link>
                </div>
            </div>
        </div>
    );
}
