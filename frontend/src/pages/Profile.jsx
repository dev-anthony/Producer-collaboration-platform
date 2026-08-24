import React, { useEffect, useState } from 'react';
import { CircleUserRound, Mail, UserRound } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import PageHeader from '../components/PageHeader';

function Profile({ onLogout }) {
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch('http://localhost:5000/api/auth/me', { credentials: 'include' })
      .then((response) => response.ok ? response.json() : null)
      .then(setUser)
      .catch((error) => console.error('[PROFILE] Could not load profile:', error));
  }, []);

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar onLogout={onLogout} user={user} />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <PageHeader eyebrow="Account" title="Producer profile" description="The identity attached to your pushes and version history." />
        <section className="m-6 max-w-2xl border border-border bg-card p-6 md:m-8">
          <div className="flex items-center gap-4 border-b border-border pb-6">
            {user?.avatar_url ? <img src={user.avatar_url} alt="Profile" className="h-16 w-16 rounded-full" /> : <CircleUserRound className="h-16 w-16 text-primary" />}
            <div className="min-w-0"><h2 className="truncate text-xl font-semibold">{user?.username || 'Producer'}</h2><p className="mt-1 text-sm text-muted-foreground">ProdCollab account</p></div>
          </div>
          <dl className="divide-y divide-border">
            <div className="flex items-center gap-3 py-5"><UserRound className="h-4 w-4 text-primary" /><div><dt className="text-xs text-muted-foreground">Username</dt><dd className="mt-1 text-sm">{user?.username || 'Not available'}</dd></div></div>
            <div className="flex items-center gap-3 py-5"><Mail className="h-4 w-4 text-primary" /><div><dt className="text-xs text-muted-foreground">Email</dt><dd className="mt-1 text-sm">{user?.email || 'Not available'}</dd></div></div>
          </dl>
          <p className="text-xs leading-5 text-muted-foreground">Your username and email are used to identify new versions you push. Public producer profiles and discovery are planned after V1.</p>
        </section>
      </main>
    </div>
  );
}

export default Profile;
