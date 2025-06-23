import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton } from '@clerk/clerk-react';

const Navigation = () => {
  const pathname = usePathname();

  return (
    <nav className="bg-[#800000] text-white p-4">
      <div className="container mx-auto">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-2xl font-bold">
              HRMS
            </Link>
            <div className="hidden md:flex space-x-4">
              <Link
                href="/dashboard"
                className={`hover:text-gray-300 ${
                  pathname === '/dashboard' ? 'font-bold' : ''
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/employees"
                className={`hover:text-gray-300 ${
                  pathname === '/employees' ? 'font-bold' : ''
                }`}
              >
                Employees
              </Link>
              <Link
                href="/departments"
                className={`hover:text-gray-300 ${
                  pathname === '/departments' ? 'font-bold' : ''
                }`}
              >
                Departments
              </Link>
              <Link
                href="/reports"
                className={`hover:text-gray-300 ${
                  pathname === '/reports' ? 'font-bold' : ''
                }`}
              >
                Reports
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <UserButton afterSignOutUrl="/" />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation; 