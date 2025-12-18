export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-700 mb-4">Page Not Found</h2>
        <p className="text-gray-600 mb-8">The page you are looking for does not exist.</p>
        <a
          href="/"
          className="inline-block bg-[#800000] text-white px-6 py-3 rounded-md hover:bg-[#600000] transition-colors"
        >
          Go Back Home
        </a>
      </div>
    </div>
  );
}

