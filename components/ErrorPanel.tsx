export default function ErrorPanel({ title, details }: { title: string; details?: string }) {
  return (
    <div className="dark:text-gray-100 mx-auto my-12 max-w-xl rounded-lg border border-red-200 bg-red-50 p-4 dark:bg-red-950/30 dark:border-red-900">
      <h2 className="dark:text-gray-100 text-red-700 dark:text-red-300 font-semibold mb-2">{title}</h2>
      {details && (
        <pre className="dark:text-gray-100 whitespace-pre-wrap text-xs text-red-800 dark:text-red-200">{details}</pre>
      )}
    </div>
  );
}
