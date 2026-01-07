
import React, { useState } from 'react';
import {
  Github,
  Trash2,
  UploadCloud,
  X,
  AlertTriangle,
  Lock,
  Globe,
  RefreshCw,
  Share2,
  Copy,
  Check
} from 'lucide-react';

function ProjectCard({
  project,
  hasUnpushedChanges = false,
  onDelete,
  onPushChanges,
  onCheckChanges,
  jwtToken,
  isCollaborator = false
}) {
  const [isChecking, setIsChecking] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [loadingShare, setLoadingShare] = useState(false);

  const handleCheckForChanges = async () => {
    setIsChecking(true);
    try {
      await onCheckChanges(project.id);
    } finally {
      setIsChecking(false);
    }
  };

  const handleGenerateShareLink = async () => {
    setLoadingShare(true);
    try {
      const response = await fetch(`http://localhost:5000/api/projects/${project.id}/share`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setShareLink(data.shareLink);
        setShowShareModal(true);
      } else {
        alert(data.error || 'Failed to generate share link');
      }
    } catch (error) {
      console.error('Error generating share link:', error);
      alert('Failed to generate share link');
    } finally {
      setLoadingShare(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div
        className={`relative bg-gray-800 border rounded-xl p-5 transition-all
          ${
            hasUnpushedChanges
              ? 'border-yellow-400 shadow-yellow-400/20 shadow-lg'
              : 'border-gray-700 hover:border-purple-500'
          }`}
      >
        {/* Change Indicator */}
        {hasUnpushedChanges && (
          <div className="absolute -top-3 -right-3 bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
            <AlertTriangle className="w-4 h-4" />
            Changes detected
          </div>
        )}

        {/* Collaborator Badge */}
        {isCollaborator && (
          <div className="absolute -top-3 -left-3 bg-blue-500 text-white px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
            <Share2 className="w-3 h-3" />
            Collaborator
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={`${isCollaborator ? 'bg-blue-600' : 'bg-purple-600'} p-2 rounded-lg`}>
              <Github className="w-5 h-5 text-white" />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white truncate">
                {project.name}
              </h3>
              <p className="text-sm text-gray-400 line-clamp-1">
                {project.description || 'No description'}
              </p>
              {isCollaborator && project.owner && (
                <p className="text-xs text-gray-500 mt-1">
                  Owner: {project.owner.username}
                </p>
              )}
            </div>
          </div>

          {/* Visibility */}
          <div className="flex items-center gap-1 text-xs text-gray-300">
            {project.visibility === 'private' ? (
              <>
                <Lock className="w-4 h-4" /> Private
              </>
            ) : (
              <>
                <Globe className="w-4 h-4" /> Public
              </>
            )}
          </div>
        </div>

        {/* Meta */}
        <div className="text-xs text-gray-400 mb-4">
          <span>{project.fileCount ?? 0} files</span>
          <span className="mx-2">•</span>
          <span>Last updated: {project.updatedAt || 'Just now'}</span>
          {isCollaborator && project.localPath && (
            <>
              <span className="mx-2">•</span>
              <span className="text-blue-400">Synced to: {project.localPath}</span>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 mb-2">
          <button
            onClick={handleCheckForChanges}
            disabled={isChecking}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? 'Checking...' : 'Check Changes'}
          </button>

          <button
            onClick={onPushChanges}
            disabled={!hasUnpushedChanges}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition
              ${
                hasUnpushedChanges
                  ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              }`}
          >
            <UploadCloud className="w-4 h-4" />
            Push Changes
          </button>
        </div>

        {/* Secondary Actions */}
        <div className="flex gap-2">
          {!isCollaborator && (
            <button
              onClick={handleGenerateShareLink}
              disabled={loadingShare}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition disabled:opacity-50"
            >
              <Share2 className="w-4 h-4" />
              Share
            </button>
          )}

          <button
            onClick={onDelete}
            className="bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-2 rounded-lg transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Share Link Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Share Project</h3>
                <button
                  onClick={() => setShowShareModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-gray-400 text-sm mb-4">
                Share this link with collaborators to let them join your project
              </p>

              <div className="bg-gray-700 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={shareLink}
                    readOnly
                    className="flex-1 bg-transparent text-white text-sm focus:outline-none"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                <p className="text-blue-300 text-xs">
                  💡 Anyone with this link can join as a collaborator and make changes to the project
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ProjectCard;