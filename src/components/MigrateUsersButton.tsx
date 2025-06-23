import { useState } from 'react';
import { RefreshCw } from 'lucide-react';

interface MigrationResults {
  total: number;
  success: number;
  failed: number;
  skipped: number;
  failedUsers?: string[];
}

export default function MigrateUsersButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<MigrationResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleMigration = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setResults(null);

      const response = await fetch('/api/migrateUsers', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to migrate users');
      }

      setResults(data.results);
      // Dispatch a custom event to signal that users should be reloaded
      window.dispatchEvent(new Event('users-migrated'));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to migrate users');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={handleMigration}
        disabled={isLoading}
        className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#800000] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        title="Sync Users with Clerk"
      >
        <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
      </button>

      {error && (
        <div className="absolute right-0 mt-2 w-64 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 shadow-lg z-50">
          {error}
        </div>
      )}

      {results && (
        <div className="absolute right-0 mt-2 w-64 p-4 bg-gray-50 border border-gray-200 rounded-lg shadow-lg z-50">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Sync Results</h3>
          <div className="space-y-1 text-sm">
            <p>Total: {results.total}</p>
            <p className="text-green-600">Success: {results.success}</p>
            <p className="text-red-600">Failed: {results.failed}</p>
            <p className="text-yellow-600">Skipped: {results.skipped}</p>
            {results.failedUsers && results.failedUsers.length > 0 && (
              <div>
                <p className="font-medium text-red-600">Failed IDs:</p>
                <ul className="list-disc list-inside text-xs text-red-600">
                  {results.failedUsers.map((userId) => (
                    <li key={userId}>{userId}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
} 