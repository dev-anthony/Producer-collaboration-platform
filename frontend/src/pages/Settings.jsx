import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';

function Settings({ onLogout }) {
  const [autoPull, setAutoPull] = useState(
    () => window.localStorage.getItem('prodcollab_auto_pull') === 'true'
  );

  const handleChange = (event) => {
    const enabled = event.target.checked;
    setAutoPull(enabled);
    window.localStorage.setItem('prodcollab_auto_pull', String(enabled));
  };

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <Sidebar onLogout={onLogout} />
      <main className="flex-1 p-8">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>
        <section className="max-w-xl glass rounded-xl p-6">
          <h2 className="text-lg font-semibold">Collaboration sync</h2>
          <label className="mt-5 flex items-center justify-between gap-4">
            <span>Pull collaborator changes automatically</span>
            <input type="checkbox" checked={autoPull} onChange={handleChange} />
          </label>
        </section>
      </main>
    </div>
  );
}

export default Settings;
