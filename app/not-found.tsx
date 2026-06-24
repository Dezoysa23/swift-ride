import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="flex justify-center">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-2xl">SR</span>
          </div>
        </div>
        <div className="space-y-2">
          <h1 className="text-7xl font-black text-primary">404</h1>
          <h2 className="text-2xl font-semibold text-gray-800">Page not found</h2>
          <p className="text-gray-500">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>
        <Link
          href="/"
          className="inline-block bg-primary text-white px-6 py-3 rounded-lg font-medium hover:bg-primary/90 transition-colors"
        >
          Back to Swift Ride
        </Link>
      </div>
    </div>
  )
}
