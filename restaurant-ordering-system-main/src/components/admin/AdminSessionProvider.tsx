'use client';

import React, { createContext, useContext } from 'react';
import { useRouter } from 'next/navigation';

export interface AdminSessionInfo {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'MANAGER' | 'STAFF';
}

interface AdminSessionContextValue extends AdminSessionInfo {
  logout: () => Promise<void>;
}

const AdminSessionContext = createContext<AdminSessionContextValue | null>(null);

export function AdminSessionProvider({
  session,
  children,
}: {
  session: AdminSessionInfo;
  children: React.ReactNode;
}) {
  const router = useRouter();

  async function logout() {
    await fetch('/api/admin/auth/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <AdminSessionContext.Provider value={{ ...session, logout }}>
      {children}
    </AdminSessionContext.Provider>
  );
}

export function useAdminSession(): AdminSessionContextValue {
  const ctx = useContext(AdminSessionContext);
  if (!ctx) throw new Error('useAdminSession must be used within AdminSessionProvider');
  return ctx;
}
