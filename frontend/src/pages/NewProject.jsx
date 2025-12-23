import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, FolderGit2, Music, Package, Album, Layers } from 'lucide-react';

function NewProject() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    template: 'beat-pack',
    isPrivate: true,
  });

  const templates = [
    {
      id: 'beat-pack',
      name: 'Beat Pack',
      description: 'Collection of beats with organized stems',
      icon: Music,
      folders: ['Beats', 'Stems', 'Samples', 'Notes'],
    },
    {
      id: 'full-track',
      name: 'Full Track',
      description: 'Complete song project with all elements',
      icon: Package,
      folders: ['Stems', 'Vocals', 'Instruments', 'Exports', 'Notes'],
    },
    {
      id: 'album',
      name: 'Album',
      description: 'Multi-track album project',
      icon: Album,
      folders: ['Tracks', 'Masters', 'Artwork', 'Notes'],
    },
    {
      id: 'samples',
      name: 'Sample Library',
      description: 'Organized collection of samples',
      icon: Layers,
      folders: ['Drums', 'Bass', 'Melodic', 'FX', 'Vocals'],
    },
  ];

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Implement actual project creation
    console.log('Creating project:', formData);
    navigate('/projects');
  };

  const selectedTemplate = templates.find(t => t.id === formData.template);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          to="/projects"
          className="inline-flex items-center space-x-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm font-medium">Back to Projects</span>
        </Link>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Project</h1>
        <p className="text-gray-600">Set up a new music project with version control</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Project Information</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Project Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Summer Vibes EP"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your project..."
                rows="3"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              />
            </div>

            <div>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={formData.isPrivate}
                  onChange={(e) => setFormData({ ...formData, isPrivate: e.target.checked })}
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Private Repository</span>
                  <p className="text-xs text-gray-500">Only you and collaborators can access</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Template Selection */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Choose Template</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => setFormData({ ...formData, template: template.id })}
                className={`p-4 rounded-lg border-2 text-left transition-all ${
                  formData.template === template.id
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-gray-200 hover:border-purple-300'
                }`}
              >
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${
                    formData.template === template.id ? 'bg-purple-600' : 'bg-gray-100'
                  }`}>
                    <template.icon className={`w-5 h-5 ${
                      formData.template === template.id ? 'text-white' : 'text-gray-600'
                    }`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{template.name}</h3>
                    <p className="text-sm text-gray-600">{template.description}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Preview */}
          {selectedTemplate && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">Template Structure:</h3>
              <div className="space-y-2">
                {selectedTemplate.folders.map((folder, index) => (
                  <div key={index} className="flex items-center space-x-2 text-sm text-gray-700">
                    <FolderGit2 className="w-4 h-4 text-gray-500" />
                    <span>{folder}/</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end space-x-4">
          <Link
            to="/projects"
            className="px-6 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold transition-colors shadow-md"
          >
            Create Project
          </button>
        </div>
      </form>
    </div>
  );
}

export default NewProject;