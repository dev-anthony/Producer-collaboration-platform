import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, FolderGit2, Users, Clock, Filter } from 'lucide-react';

function Projects() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');

  // Dummy data
  const projects = [
    {
      id: 1,
      name: 'Summer Vibes EP',
      description: 'Collection of chill summer tracks',
      type: 'Full Track',
      files: 45,
      size: '2.3 GB',
      collaborators: 3,
      lastUpdated: '2 hours ago',
      status: 'active',
    },
    {
      id: 2,
      name: 'Dark Trap Beats',
      description: 'Hard-hitting trap instrumentals',
      type: 'Beat Pack',
      files: 32,
      size: '1.8 GB',
      collaborators: 2,
      lastUpdated: '5 hours ago',
      status: 'active',
    },
    {
      id: 3,
      name: 'Lo-Fi Study Pack',
      description: 'Relaxing beats for concentration',
      type: 'Beat Pack',
      files: 28,
      size: '1.2 GB',
      collaborators: 1,
      lastUpdated: '1 day ago',
      status: 'active',
    },
    {
      id: 4,
      name: 'Album Mastering',
      description: 'Final album masters and stems',
      type: 'Album',
      files: 67,
      size: '4.5 GB',
      collaborators: 5,
      lastUpdated: '3 days ago',
      status: 'archived',
    },
  ];

  const filteredProjects = projects.filter(project => {
    const matchesSearch = project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         project.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || project.type === filterType;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Projects</h1>
            <p className="text-gray-600">Manage all your music projects in one place</p>
          </div>
          <Link
            to="/projects/new"
            className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors shadow-md"
          >
            <Plus className="w-5 h-5" />
            <span>New Project</span>
          </Link>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="pl-10 pr-8 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none bg-white"
            >
              <option value="all">All Types</option>
              <option value="Beat Pack">Beat Pack</option>
              <option value="Full Track">Full Track</option>
              <option value="Album">Album</option>
              <option value="Samples">Samples</option>
            </select>
          </div>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map((project) => (
          <Link
            key={project.id}
            to={`/projects/${project.id}`}
            className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-lg hover:border-purple-300 transition-all p-6 group"
          >
            {/* Project Icon */}
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                <FolderGit2 className="w-6 h-6 text-purple-600" />
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                project.status === 'active' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-gray-100 text-gray-600'
              }`}>
                {project.status}
              </span>
            </div>

            {/* Project Info */}
            <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-purple-600 transition-colors">
              {project.name}
            </h3>
            <p className="text-sm text-gray-600 mb-4 line-clamp-2">{project.description}</p>

            {/* Project Stats */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Type</span>
                <span className="font-medium text-gray-900">{project.type}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Files</span>
                <span className="font-medium text-gray-900">{project.files}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Size</span>
                <span className="font-medium text-gray-900">{project.size}</span>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="flex items-center space-x-1 text-gray-600">
                <Users className="w-4 h-4" />
                <span className="text-sm">{project.collaborators}</span>
              </div>
              <div className="flex items-center space-x-1 text-gray-500 text-xs">
                <Clock className="w-3 h-3" />
                <span>{project.lastUpdated}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Empty State */}
      {filteredProjects.length === 0 && (
        <div className="text-center py-12">
          <FolderGit2 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No projects found</h3>
          <p className="text-gray-600 mb-6">Try adjusting your search or create a new project</p>
          <Link
            to="/projects/new"
            className="inline-flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Create Project</span>
          </Link>
        </div>
      )}
    </div>
  );
}

export default Projects;