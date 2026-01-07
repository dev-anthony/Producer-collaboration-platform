import React, { useState } from 'react';
import { X, Link as LinkIcon, FolderOpen, Users, Github, Loader } from 'lucide-react';

function JoinProjectModal({ toggleModal, jwtToken }) {
  const [shareLink, setShareLink] = useState('');
  const [projectInfo, setProjectInfo] = useState(null);
  const [localPath, setLocalPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Enter link, 2: Choose folder, 3: Confirm

  const extractTokenFromLink = (link) => {
    // Extract token from URL like: http://localhost:3000/join/abc123...
    const match = link.match(/\/join\/([a-f0-9]+)/i);
    return match ? match[1] : link;
  };

  const handleFetchProject = async () => {
    if (!shareLink.trim()) {
      alert('Please enter a share link');
      return;
    }

    setLoading(true);

    try {
      const shareToken = extractTokenFromLink(shareLink);
      
      const response = await fetch(`http://localhost:5000/api/projects/share/${shareToken}`, {
        headers: {
          'Authorization': `Bearer ${jwtToken}`
        }
      });

      const data = await response.json();

      if (response.ok) {
        setProjectInfo(data);
        setStep(2);
      } else {
        alert(data.error || 'Invalid share link');
      }
    } catch (error) {
      console.error('Error fetching project:', error);
      alert('Failed to fetch project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleChooseFolder = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.webkitdirectory = true;
    
    input.onchange = (e) => {
      const files = Array.from(e.target.files);
      if (files.length > 0) {
        // Get the folder path from the first file
        const firstFile = files[0];
        const fullPath = firstFile.webkitRelativePath;
        const folderName = fullPath.split('/')[0];
        setLocalPath(folderName);
        setStep(3);
      }
    };
    
    input.click();
  };

  const handleJoinProject = async () => {
    setLoading(true);

    try {
      const shareToken = extractTokenFromLink(shareLink);
      
      const response = await fetch('http://localhost:5000/api/projects/join', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwtToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          shareToken,
          localPath
        })
      });

      const data = await response.json();

      if (response.ok) {
        alert(`Successfully joined "${projectInfo.name}"!\n\nFiles will be synced to: ${localPath}`);
        toggleModal();
        window.location.reload();
      } else {
        alert(data.error || 'Failed to join project');
      }
    } catch (error) {
      console.error('Error joining project:', error);
      alert('Failed to join project. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl">
        {/* Header */}
        <div className="bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Join Project</h2>
              <p className="text-sm text-gray-400">
                {step === 1 && 'Enter collaboration link'}
                {step === 2 && 'Choose local folder'}
                {step === 3 && 'Confirm and join'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleModal}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Step 1: Enter Share Link */}
          {step === 1 && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Project Share Link <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={shareLink}
                    onChange={(e) => setShareLink(e.target.value)}
                    placeholder="Paste the share link here..."
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg pl-11 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  The project owner will share a link with you
                </p>
              </div>

              <button
                onClick={handleFetchProject}
                disabled={loading || !shareLink.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    Continue
                  </>
                )}
              </button>
            </>
          )}

          {/* Step 2: Project Info & Choose Folder */}
          {step === 2 && projectInfo && (
            <>
              {/* Project Preview */}
              <div className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-start gap-4">
                  <div className="bg-purple-600 p-3 rounded-lg">
                    <Github className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-white mb-1">
                      {projectInfo.name}
                    </h3>
                    <p className="text-sm text-gray-400 mb-2">
                      {projectInfo.description || 'No description'}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-300">
                      <span className="flex items-center gap-1">
                        <img 
                          src={projectInfo.owner.avatar} 
                          alt={projectInfo.owner.username}
                          className="w-4 h-4 rounded-full"
                        />
                        {projectInfo.owner.username}
                      </span>
                      <span>•</span>
                      <span>{projectInfo.fileCount} files</span>
                      <span>•</span>
                      <span className="capitalize">{projectInfo.visibility}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Choose Local Folder <span className="text-red-400">*</span>
                </label>
                <button
                  onClick={handleChooseFolder}
                  className="w-full bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg px-4 py-3 text-white flex items-center justify-center gap-2"
                >
                  <FolderOpen className="w-5 h-5" />
                  {localPath ? localPath : 'Select Folder'}
                </button>
                <p className="text-xs text-gray-400 mt-2">
                  ⚠️ Choose an empty folder or your FL Studio project folder for easy tracking
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-lg font-medium"
                >
                  Back
                </button>
                <button
                  onClick={handleJoinProject}
                  disabled={!localPath}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Join Project
                </button>
              </div>
            </>
          )}

          {/* Step 3: Confirmation (handled by join success) */}
        </div>
      </div>
    </div>
  );
}

export default JoinProjectModal;