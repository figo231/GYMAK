export function Spinner({ className = "" }: { className?: string }) {
  return (
    <div
      className={`h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-brand-500 dark:border-gray-700 ${className}`}
      role="status"
      aria-label="جاري التحميل"
    />
  );
}
