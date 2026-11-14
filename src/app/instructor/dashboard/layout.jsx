"use client";

import { InstructorProvider } from './InstructorProvider';
import InstructorShell from './InstructorShell';

export default function InstructorLayout({ children }) {
  return (
    <InstructorProvider>
      <InstructorShell>{children}</InstructorShell>
    </InstructorProvider>
  );
}
