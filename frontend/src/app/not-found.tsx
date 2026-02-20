import Link from 'next/link';

export default function NotFound() {
    return (
        <div className="min-h-screen flex items-center justify-center px-6">
            <div className="text-center">
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-indigo-500/20 to-cyan-500/20 flex items-center justify-center mx-auto mb-6">
                    <span className="text-5xl">🔍</span>
                </div>
                <h1 className="text-6xl font-black gradient-text mb-4">404</h1>
                <p className="text-lg text-gray-400 mb-2">Page not found</p>
                <p className="text-sm text-gray-600 mb-8">The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
                <Link href="/" className="btn-primary inline-block">
                    Back to Home
                </Link>
            </div>
        </div>
    );
}
