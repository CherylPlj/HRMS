// app/faculty/page.tsx
import Sidebar from '@/components/Sidebar';
import FacultyTable from '@/components/FacultyTable';

export default function FacultyLoginPage() {
  return (
    <div className="flex">
      <Sidebar />
      <FacultyTable />
    </div>
  );
}
