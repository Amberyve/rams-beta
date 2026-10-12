import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 text-center">
      <p className="font-display text-6xl font-extrabold text-navy-200">404</p>
      <h1 className="mt-2 font-display text-xl font-bold text-slate-900 dark:text-white">Page not found</h1>
      <p className="mt-1 text-sm text-slate-500">The record may have been moved or deleted.</p>
      <Link href="/" className="mt-6 rounded-lg bg-navy-700 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800">Back to dashboard</Link>
    </div>
  );
}
