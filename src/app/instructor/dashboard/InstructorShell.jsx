"use client";

import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { DEMO_SESSION_KEY } from '@/app/utils/demoSession';
import { maskRoute } from '@/app/utils/routeHasher';

export default function InstructorShell({ children }) {
  const router = useRouter();
  const currentPath = usePathname();

  const handleLogout = () => {
    window.sessionStorage.removeItem(DEMO_SESSION_KEY);
    router.replace(maskRoute('/login'));
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <Navbar
        role="instructor"
        currentPath={currentPath}
        onLogout={handleLogout}
      />
      {children}
    </div>
  );
}
