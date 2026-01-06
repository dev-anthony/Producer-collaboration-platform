// import React from 'react';
// import {
//   Github,
//   Trash2,
//   UploadCloud,
//   AlertTriangle,
//   Lock,
//   Globe
// } from 'lucide-react';

// function ProjectCard({
//   project,
//   hasUnpushedChanges = false,
//   onDelete,
//   onPushChanges,
// }) {
//   return (
//     <div
//       className={`relative bg-gray-800 border rounded-xl p-5 transition-all
//         ${
//           hasUnpushedChanges
//             ? 'border-yellow-400 shadow-yellow-400/20 shadow-lg'
//             : 'border-gray-700 hover:border-purple-500'
//         }`}
//     >
//       {/* Change Indicator */}
//       {hasUnpushedChanges && (
//         <div className="absolute -top-3 -right-3 bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1">
//           <AlertTriangle className="w-4 h-4" />
//           Changes detected
//         </div>
//       )}

//       {/* Header */}
//       <div className="flex items-start justify-between mb-4">
//         <div className="flex items-center gap-3">
//           <div className="bg-purple-600 p-2 rounded-lg">
//             <Github className="w-5 h-5 text-white" />
//           </div>

//           <div>
//             <h3 className="text-lg font-semibold text-white truncate">
//               {project.name}
//             </h3>
//             <p className="text-sm text-gray-400 line-clamp-1">
//               {project.description || 'No description'}
//             </p>
//           </div>
//         </div>

//         {/* Visibility */}
//         <div className="flex items-center gap-1 text-xs text-gray-300">
//           {project.visibility === 'private' ? (
//             <>
//               <Lock className="w-4 h-4" /> Private
//             </>
//           ) : (
//             <>
//               <Globe className="w-4 h-4" /> Public
//             </>
//           )}
//         </div>
//       </div>

//       {/* Meta */}
//       <div className="text-xs text-gray-400 mb-4">
//         <span>{project.fileCount ?? 0} files</span>
//         <span className="mx-2">•</span>
//         <span>Last updated: {project.updatedAt || 'Just now'}</span>
//       </div>

//       {/* Actions */}
//       <div className="flex gap-2">
//         <button
//           onClick={onPushChanges}
//           disabled={!hasUnpushedChanges}
//           className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition
//             ${
//               hasUnpushedChanges
//                 ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
//                 : 'bg-gray-700 text-gray-400 cursor-not-allowed'
//             }`}
//         >
//           <UploadCloud className="w-4 h-4" />
//           Push Changes
//         </button>

//         <button
//           onClick={onDelete}
//           className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-2 rounded-lg transition"
//         >
//           <Trash2 className="w-4 h-4" />
//         </button>
//       </div>
//     </div>
//   );
// }

// export default ProjectCard;
import React, { useState } from 'react';
import {
  Github,
  Trash2,
  UploadCloud,
  AlertTriangle,
  Lock,
  Globe,
  RefreshCw
} from 'lucide-react';

function ProjectCard({
  project,
  hasUnpushedChanges = false,
  onDelete,
  onPushChanges,
  onCheckChanges,
}) {
  const [isChecking, setIsChecking] = useState(false);

  const handleCheckForChanges = async () => {
    setIsChecking(true);
    try {
      await onCheckChanges(project.id);
    } finally {
      setIsChecking(false);
    }
  };

  return (
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

      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="bg-purple-600 p-2 rounded-lg">
            <Github className="w-5 h-5 text-white" />
          </div>

          <div>
            <h3 className="text-lg font-semibold text-white truncate">
              {project.name}
            </h3>
            <p className="text-sm text-gray-400 line-clamp-1">
              {project.description || 'No description'}
            </p>
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
      </div>

      {/* Actions */}
      <div className="flex gap-2">
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

        <button
          onClick={onDelete}
          className="bg-red-500/10 hover:bg-red-500/20 text-red-400 p-2 rounded-lg transition"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default ProjectCard;