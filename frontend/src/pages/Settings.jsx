import React, { useEffect, useState } from 'react';
import Sidebar from '../components/Sidebar';
import PageHeader from '../components/PageHeader';
import Toggle from '../components/Toggle';

function Settings({ onLogout }) {
  const [user, setUser] = useState(null);
  const [autoPull, setAutoPull] = useState(
    () => window.localStorage.getItem('prodcollab_auto_pull') === 'true'
  );
  const [autoPushDelay, setAutoPushDelay] = useState(
    () => window.localStorage.getItem('prodcollab_auto_push_delay') || '10'
  );
  const [desktopNotifications, setDesktopNotifications] = useState(
    () => window.localStorage.getItem('prodcollab_desktop_notifications') !== 'false'
  );

  const handleAutoPullChange = (enabled) => {
    setAutoPull(enabled);
    window.localStorage.setItem('prodcollab_auto_pull', String(enabled));
    if (enabled) window.dispatchEvent(new CustomEvent('prodcollab:auto-pull-enabled'));
  };

  const updatePreference = (key, value) => window.localStorage.setItem(key, value);

  useEffect(() => {
    fetch('http://localhost:5000/api/auth/me', { credentials: 'include' })
      .then((response) => response.ok ? response.json() : null)
      .then(setUser)
      .catch((error) => console.error('[SETTINGS] Could not load profile:', error));
  }, []);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar onLogout={onLogout} user={user} />
      <main className="min-w-0 flex-1 overflow-y-auto">
        <PageHeader eyebrow="Preferences" title="Settings" description="Control how ProdCollab protects your work and notifies you." />
        <section className="m-6 max-w-2xl border border-border bg-card p-6 md:m-8">
          <h2 className="text-lg font-semibold">Project protection</h2>
          <label className="mt-6 flex items-center justify-between gap-4 border-b border-border pb-5 text-sm">
            <span>Get collaborator updates automatically</span>
            <Toggle checked={autoPull} label="Automatic updates" onChange={handleAutoPullChange} />
          </label>
          <div className="border-b border-border py-5"><p className="text-sm">Automatic backup delay</p><p className="mt-1 text-xs text-muted-foreground">Choose how long ProdCollab waits after your last change.</p><div className="mt-3 flex flex-wrap gap-2">{['1', '2', '5', '10', '30', 'manual'].map((delay) => <button key={delay} onClick={() => { setAutoPushDelay(delay); updatePreference('prodcollab_auto_push_delay', delay); window.electronAPI?.setAutoPushDelay(delay); window.dispatchEvent(new CustomEvent('prodcollab:auto-push-delay-changed', { detail: { delay } })); }} className={`rounded-md border px-3 py-2 text-xs transition-colors ${autoPushDelay === delay ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground'}`}>{delay === 'manual' ? 'Manual' : `${delay} min`}</button>)}</div></div>
          <label className="flex items-center justify-between gap-4 pt-5 text-sm"><span>Desktop notifications</span><Toggle checked={desktopNotifications} label="Desktop notifications" onChange={(enabled) => { setDesktopNotifications(enabled); updatePreference('prodcollab_desktop_notifications', String(enabled)); }} /></label>
        </section>
      </main>
    </div>
  );
}

export default Settings;
