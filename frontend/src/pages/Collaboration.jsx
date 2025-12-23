import React, { useState } from 'react';
import { Search, Plus, Mail, FolderGit2, Clock, UserPlus } from 'lucide-react';

function Collaborators() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');

  // Dummy data
  const collaborators = [
    {
      id: 1,
      name: 'Sarah Martinez',
      username: 'sarahbeats',
      email: 'sarah@example.com',
      avatar: 'SM',
      projects: 5,
      lastActive: '2 hours ago',
      role: 'Producer',
    },
    {
      id: 2,
      name: 'John Doe',
      username: 'johndmusic',
      email: 'john@example.com',
      avatar: 'JD',
      projects: 3,
      lastActive: '1 day ago',
      role: 'Mixing Engineer',
    },
    {
      id: 3,
      name: 'Mike Roberts',
      username: 'mikeroberts',
      email: 'mike@example.com',
      avatar: 'MR',
      projects: 7,
      lastActive: '3 days ago',
      role: 'Beat Maker',
    },
    {
      id: 4,
      name: 'Emily Chen',
      username: 'emilychen',
      email: 'emily@example.com',
      avatar: 'EC',
      projects: 2,
      lastActive: '5 days ago',
      role: 'Vocalist',
    },
  ];

  const filteredCollaborators = collaborators.filter(collab =>
    collab.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    collab.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    collab.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleInvite = (e) => {
    e.preventDefault();
    // TODO: Implement actual invite functionality
    console.log('Inviting:', inviteEmail);
    setInviteEmail('');
    setShowInviteModal(false);
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Collaborators</h1>
            <p className="text-gray-600">Manage your production team and connections</p>
          </div>
          <button
            onClick={() => setShowInviteModal(true)}
            className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors shadow-md"
          >
            <UserPlus className="w-5 h-5" />
            <span>Invite Collaborator</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search collaborators..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Collaborators Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCollaborators.map((collab) => (
          <div
            key={collab.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow p-6"
          >
            {/* Avatar and Info */}
            <div className="flex items-start space-x-4 mb-4">
              <div className="w-16 h-16 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                <span className="text-lg font-bold text-purple-600">{collab.avatar}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 mb-1">{collab.name}</h3>
                <p className="text-sm text-gray-600 mb-1">@{collab.username}</p>
                <p className="text-xs text-gray-500">{collab.email}</p>
              </div>
            </div>

            {/* Role */}
            <div className="mb-4">
              <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                {collab.role}
              </span>
            </div>

            {/* Stats */}
            <div className="space-y-2 mb-4 pt-4 border-t border-gray-100">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2 text-gray-600">
                  <FolderGit2 className="w-4 h-4" />
                  <span>Shared Projects</span>
                </div>
                <span className="font-medium text-gray-900">{collab.projects}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2 text-gray-600">
                  <Clock className="w-4 h-4" />
                  <span>Last Active</span>
                </div>
                <span className="font-medium text-gray-900">{collab.lastActive}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2">
              <button className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors">
                View Projects
              </button>
              <button className="p-2 border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors">
                <Mail className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredCollaborators.length === 0 && (
        <div className="text-center py-12">
          <UserPlus className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No collaborators found</h3>
          <p className="text-gray-600 mb-6">Try adjusting your search or invite new collaborators</p>
        </div>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Invite Collaborator</h2>
            <form onSubmit={handleInvite}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address or GitHub Username
                </label>
                <input
                  type="text"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="email@example.com or @username"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-2">
                  They'll receive an invitation to collaborate on your projects
                </p>
              </div>
              
              <div className="flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Send Invite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Collaborators;