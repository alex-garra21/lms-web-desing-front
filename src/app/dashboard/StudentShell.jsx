"use client";

import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { DEMO_SESSION_KEY } from '@/utils/demoSession';
import { maskRoute } from '@/utils/routeHasher';

export default function StudentShell({ children, currentPath }) {
  const router = useRouter();

  const handleLogout = () => {
    window.sessionStorage.removeItem(DEMO_SESSION_KEY);
    router.replace(maskRoute('/login'));
  };

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
      <Navbar
        role="student"
        currentPath={currentPath}
        onLogout={handleLogout}
      />
      {children}
    </div>
  );
}
