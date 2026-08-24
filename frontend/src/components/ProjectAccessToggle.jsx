import React from 'react';
import { Lock, Users } from 'lucide-react';

function ProjectAccessToggle({ value, onChange }) {
  const options = [
    { value: 'private', label: 'Private project', detail: 'Only you and invited collaborators', icon: Lock },
    { value: 'public', label: 'Open project', detail: 'Anyone with access can view it', icon: Users },
  ];

  return (
    <div className="grid grid-cols-2 border border-border bg-background p-1">
      {options.map((option) => {
        const active = value === option.value;
        return (
          <button key={option.value} type="button" onClick={() => onChange(option.value)} className={`flex items-start gap-2 px-3 py-2 text-left transition-colors ${active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}>
            <option.icon className="mt-0.5 h-4 w-4 flex-none" />
            <span><span className="block text-xs font-medium">{option.label}</span><span className="mt-0.5 block text-[10px] opacity-70">{option.detail}</span></span>
          </button>
        );
      })}
    </div>
  );
}

export default ProjectAccessToggle;
