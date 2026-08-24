import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';

function Settings({ onLogout }) {
  const [autoPull, setAutoPull] = useState(
    () => window.localStorage.getItem('prodcollab_auto_pull') === 'true'
  );
  const [autoPushDelay, setAutoPushDelay] = useState(
    () => window.localStorage.getItem('prodcollab_auto_push_delay') || '10'
  );
  const [desktopNotifications, setDesktopNotifications] = useState(
    () => window.localStorage.getItem('prodcollab_desktop_notifications') !== 'false'
  );

  const handleChange = (event) => {
    const enabled = event.target.checked;
    setAutoPull(enabled);
    window.localStorage.setItem('prodcollab_auto_pull', String(enabled));
  };

  const updatePreference = (key, value) => window.localStorage.setItem(key, value);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar onLogout={onLogout} />
      <main className="flex-1 p-6 md:p-10">
        <div className="mb-8"><p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Preferences</p><h1 className="mt-2 text-2xl font-semibold">Settings</h1></div>
        <section className="max-w-2xl border border-border bg-card p-6">
          <h2 className="text-lg font-semibold">Collaboration sync</h2>
          <label className="mt-6 flex items-center justify-between gap-4 border-b border-border pb-5 text-sm">
            <span>Pull collaborator changes automatically</span>
            <input type="checkbox" checked={autoPull} onChange={handleChange} />
          </label>
          <div className="border-b border-border py-5"><p className="text-sm">Automatic push delay</p><p className="mt-1 text-xs text-muted-foreground">Choose how long ProdCollab waits after your last change.</p><div className="mt-3 flex flex-wrap gap-2">{['5', '10', '30', 'manual'].map((delay) => <button key={delay} onClick={() => { setAutoPushDelay(delay); updatePreference('prodcollab_auto_push_delay', delay); window.electronAPI?.setAutoPushDelay(delay); }} className={`rounded-md border px-3 py-2 text-xs ${autoPushDelay === delay ? 'border-primary bg-primary/10 text-primary' : 'border-border text-muted-foreground hover:text-foreground'}`}>{delay === 'manual' ? 'Manual' : `${delay} min`}</button>)}</div></div>
          <label className="flex items-center justify-between gap-4 pt-5 text-sm"><span>Desktop notifications</span><input type="checkbox" checked={desktopNotifications} onChange={(event) => { setDesktopNotifications(event.target.checked); updatePreference('prodcollab_desktop_notifications', String(event.target.checked)); }} /></label>
        </section>
      </main>
    </div>
  );
}

export default Settings;
