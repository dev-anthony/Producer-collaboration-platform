import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft, Upload, Download, FolderOpen, FileAudio, FileText,
  Image as ImageIcon, Clock, GitBranch, Users, MoreVertical, Trash2
} from 'lucide-react';

function ProjectDetail() {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('files');

  // Dummy project data
  const project = {
    id,
    name: 'Summer Vibes EP',
    description: 'Collection of chill summer tracks',
    type: 'Full Track',
    files: 45,
    size: '2.3 GB',
    collaborators: 3,
    lastUpdated: '2 hours ago',
    created: '2 weeks ago',
  };

  const files = [
    { name: 'Stems', type: 'folder', size: '1.2 GB', modified: '2 hours ago', files: 15 },
    { name: 'Samples', type: 'folder', size: '450 MB', modified: '1 day ago', files: 8 },
    { name: 'Exports', type: 'folder', size: '320 MB', modified: '3 days ago', files: 4 },
    { name: 'final_mix_v3.wav', type: 'audio', size: '45 MB', modified: '2 hours ago' },
    { name: 'master_final.wav', type: 'audio', size: '42 MB', modified: '5 hours ago' },
    { name: 'project_notes.txt', type: 'text', size: '2 KB', modified: '1 day ago' },
    { name: 'cover_art.png', type: 'image', size: '8 MB', modified: '3 days ago' },
  ];

  const commits = [
    { id: 1, message: 'Updated final mix', author: 'You', time: '2 hours ago', changes: '1 file' },
    { id: 2, message: 'Added mastered version', author: 'Sarah M.', time: '5 hours ago', changes: '1 file' },
    { id: 3, message: 'Updated stems folder', author: 'John D.', time: '1 day ago', changes: '3 files' },
    { id: 4, message: 'Initial commit', author: 'You', time: '2 weeks ago', changes: '12 files' },
  ];

  const collaborators = [
    { name: 'Dev Anthony', role: 'Owner', avatar: 'DA', email: 'anthonyachibi@gmail.com' },
    { name: 'Sarah Martinez', role: 'Collaborator', avatar: 'SM', email: 'sarah@example.com' },
    { name: 'John Doe', role: 'Collaborator', avatar: 'JD', email: 'john@example.com' },
  ];

  const getFileIcon = (type) => {
    switch (type) {
      case 'folder': return <FolderOpen className="w-5 h-5 text-blue-500" />;
      case 'audio': return <FileAudio className="w-5 h-5 text-purple-500" />;
      case 'text': return <FileText className="w-5 h-5 text-gray-500" />;
      case 'image': return <ImageIcon className="w-5 h-5 text-green-500" />;
      default: return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/projects"
          className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Projects</span>
        </Link>
        
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{project.name}</h1>
            <p className="text-gray-600">{project.description}</p>
          </div>
          <div className="flex items-center space-x-3">
            <button className="flex items-center space-x-2 bg-white border border-gray-300 hover:bg-gray-50 px-4 py-2 rounded-lg font-medium transition-colors">
              <Download className="w-4 h-4" />
              <span>Pull</span>
            </button>
            <button className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors">
              <Upload className="w-4 h-4" />
              <span>Push</span>
            </button>
          </div>
        </div>

        {/* Project Stats */}
        <div className="flex items-center space-x-6 mt-4 text-sm text-gray-600">
          <div className="flex items-center space-x-2">
            <FolderOpen className="w-4 h-4" />
            <span>{project.files} files</span>
          </div>
          <div className="flex items-center space-x-2">
            <Users className="w-4 h-4" />
            <span>{project.collaborators} collaborators</span>
          </div>
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4" />
            <span>Updated {project.lastUpdated}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {['files', 'history', 'collaborators'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'files' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Upload Area */}
          <div className="p-6 border-b border-gray-200">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 transition-colors cursor-pointer">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-700 font-medium mb-1">Drop files here or click to upload</p>
              <p className="text-sm text-gray-500">Supports audio files, images, and documents</p>
            </div>
          </div>

          {/* Files List */}
          <div className="divide-y divide-gray-200">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center space-x-3 flex-1">
                  {getFileIcon(file.type)}
                  <div>
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500">
                      {file.files ? `${file.files} files • ` : ''}{file.size} • Modified {file.modified}
                    </p>
                  </div>
                </div>
                <button className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-gray-200 rounded">
                  <MoreVertical className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Commit History</h3>
          </div>
          <div className="divide-y divide-gray-200">
            {commits.map((commit) => (
              <div key={commit.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start space-x-3">
                  <GitBranch className="w-5 h-5 text-purple-600 mt-1" />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 mb-1">{commit.message}</p>
                    <div className="flex items-center space-x-3 text-sm text-gray-600">
                      <span className="font-medium">{commit.author}</span>
                      <span>•</span>
                      <span>{commit.time}</span>
                      <span>•</span>
                      <span>{commit.changes}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'collaborators' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Collaborators</h3>
            <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
              Add Collaborator
            </button>
          </div>
          <div className="divide-y divide-gray-200">
            {collaborators.map((collab, index) => (
              <div key={index} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                    <span className="text-sm font-bold text-purple-600">{collab.avatar}</span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{collab.name}</p>
                    <p className="text-sm text-gray-600">{collab.email}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-medium">
                    {collab.role}
                  </span>
                  {collab.role !== 'Owner' && (
                    <button className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default ProjectDetail;