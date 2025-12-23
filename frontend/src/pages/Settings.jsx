import React, { useState } from 'react';
import { User, Bell, Shield, Database, Github, Save } from 'lucide-react';

function Settings() {
  const [activeTab, setActiveTab] = useState('profile');
  const [settings, setSettings] = useState({
    // Profile
    displayName: 'Dev Anthony',
    email: 'anthonyachibi@gmail.com',
    bio: 'Music producer and beat maker',
    
    // Notifications
    emailNotifications: true,
    pushNotifications: true,
    collaboratorActivity: true,
    fileUpdates: true,
    
    // Storage
    autoSync: true,
    cacheSize: '2.5 GB',
    maxFileSize: '100 MB',
    
    // GitHub
    githubUsername: 'dev-anthony',
    defaultPrivate: true,
    autoCommitMessage: 'Update files',
  });

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'storage', label: 'Storage', icon: Database },
    { id: 'github', label: 'GitHub', icon: Github },
    { id: 'security', label: 'Security', icon: Shield },
  ];

  const handleSave = () => {
    // TODO: Implement save functionality
    console.log('Saving settings:', settings);
    alert('Settings saved successfully!');
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Manage your account and application preferences</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-64 flex-shrink-0">
          <nav className="bg-white rounded-lg shadow-sm border border-gray-200 p-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-purple-50 text-purple-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="font-medium">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Profile Information</h2>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={settings.displayName}
                        onChange={(e) => setSettings({ ...settings, displayName: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={settings.email}
                        onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Bio
                      </label>
                      <textarea
                        value={settings.bio}
                        onChange={(e) => setSettings({ ...settings, bio: e.target.value })}
                        rows="3"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Notification Preferences</h2>
                
                <div className="space-y-4">
                  <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div>
                      <p className="font-medium text-gray-900">Email Notifications</p>
                      <p className="text-sm text-gray-600">Receive updates via email</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.emailNotifications}
                      onChange={(e) => setSettings({ ...settings, emailNotifications: e.target.checked })}
                      className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div>
                      <p className="font-medium text-gray-900">Push Notifications</p>
                      <p className="text-sm text-gray-600">Desktop notifications for updates</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.pushNotifications}
                      onChange={(e) => setSettings({ ...settings, pushNotifications: e.target.checked })}
                      className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div>
                      <p className="font-medium text-gray-900">Collaborator Activity</p>
                      <p className="text-sm text-gray-600">Notify when collaborators make changes</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.collaboratorActivity}
                      onChange={(e) => setSettings({ ...settings, collaboratorActivity: e.target.checked })}
                      className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div>
                      <p className="font-medium text-gray-900">File Updates</p>
                      <p className="text-sm text-gray-600">Notify when files are uploaded or modified</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.fileUpdates}
                      onChange={(e) => setSettings({ ...settings, fileUpdates: e.target.checked })}
                      className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                  </label>
                </div>
              </div>
            )}

            {/* Storage Tab */}
            {activeTab === 'storage' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Storage Settings</h2>
                
                <div className="space-y-4">
                  <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div>
                      <p className="font-medium text-gray-900">Auto-Sync</p>
                      <p className="text-sm text-gray-600">Automatically sync changes to GitHub</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.autoSync}
                      onChange={(e) => setSettings({ ...settings, autoSync: e.target.checked })}
                      className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                  </label>

                  <div className="p-4 border border-gray-200 rounded-lg">
                    <p className="font-medium text-gray-900 mb-2">Cache Size</p>
                    <p className="text-sm text-gray-600 mb-2">Current cache: {settings.cacheSize}</p>
                    <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                      Clear Cache
                    </button>
                  </div>

                  <div className="p-4 border border-gray-200 rounded-lg">
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Maximum File Size for Upload
                    </label>
                    <select
                      value={settings.maxFileSize}
                      onChange={(e) => setSettings({ ...settings, maxFileSize: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="50 MB">50 MB</option>
                      <option value="100 MB">100 MB</option>
                      <option value="250 MB">250 MB</option>
                      <option value="500 MB">500 MB</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* GitHub Tab */}
            {activeTab === 'github' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">GitHub Integration</h2>
                
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <p className="font-medium text-green-900">Connected</p>
                    </div>
                    <p className="text-sm text-green-700">@{settings.githubUsername}</p>
                  </div>

                  <label className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div>
                      <p className="font-medium text-gray-900">Default to Private</p>
                      <p className="text-sm text-gray-600">New projects are private by default</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.defaultPrivate}
                      onChange={(e) => setSettings({ ...settings, defaultPrivate: e.target.checked })}
                      className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                  </label>

                  <div className="p-4 border border-gray-200 rounded-lg">
                    <label className="block text-sm font-medium text-gray-900 mb-2">
                      Auto-Commit Message Template
                    </label>
                    <input
                      type="text"
                      value={settings.autoCommitMessage}
                      onChange={(e) => setSettings({ ...settings, autoCommitMessage: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>

                  <button className="w-full px-4 py-3 border-2 border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-50 transition-colors">
                    Disconnect GitHub Account
                  </button>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Security Settings</h2>
                
                <div className="space-y-4">
                  <div className="p-4 border border-gray-200 rounded-lg">
                    <p className="font-medium text-gray-900 mb-2">Password</p>
                    <p className="text-sm text-gray-600 mb-4">
                      Managed through your GitHub account
                    </p>
                    <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                      Change on GitHub
                    </button>
                  </div>

                  <div className="p-4 border border-gray-200 rounded-lg">
                    <p className="font-medium text-gray-900 mb-2">Two-Factor Authentication</p>
                    <p className="text-sm text-gray-600 mb-4">
                      Add an extra layer of security
                    </p>
                    <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                      Configure on GitHub
                    </button>
                  </div>

                  <div className="p-4 border border-gray-200 rounded-lg">
                    <p className="font-medium text-gray-900 mb-2">Active Sessions</p>
                    <p className="text-sm text-gray-600 mb-4">
                      View and manage your active sessions
                    </p>
                    <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                      View Sessions
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <button
                onClick={handleSave}
                className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors shadow-md"
              >
                <Save className="w-5 h-5" />
                <span>Save Changes</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;