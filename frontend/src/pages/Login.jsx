import React from 'react';
import { Github, Music } from 'lucide-react';
import { authAPI } from '../utils/api';

function Login({ onLogin }) {
  const handleGitHubLogin = () => {
    authAPI.loginWithGitHub();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 via-purple-700 to-indigo-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-600 rounded-full mb-4">
            <Music className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">ProdCollab</h1>
          <p className="text-gray-600">Producer Collaboration Platform</p>
        </div>

        {/* Description */}
        <div className="mb-8 text-center">
          <p className="text-gray-700 mb-2">
            Collaborate on music projects with version control powered by GitHub
          </p>
          <p className="text-sm text-gray-500">
            Track changes, share stems, and work together seamlessly
          </p>
        </div>

        {/* Login Button */}
        <button
          onClick={handleGitHubLogin}
          className="w-full flex items-center justify-center space-x-3 bg-gray-900 hover:bg-gray-800 text-white font-semibold py-4 px-6 rounded-lg transition-colors shadow-lg hover:shadow-xl"
        >
          <Github className="w-5 h-5" />
          <span>Continue with GitHub</span>
        </button>

        {/* Features */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center mb-4">What you get:</p>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-center">
              <span className="w-1.5 h-1.5 bg-purple-600 rounded-full mr-2"></span>
              Version control for audio projects
            </li>
            <li className="flex items-center">
              <span className="w-1.5 h-1.5 bg-purple-600 rounded-full mr-2"></span>
              Collaborate with other producers
            </li>
            <li className="flex items-center">
              <span className="w-1.5 h-1.5 bg-purple-600 rounded-full mr-2"></span>
              Track changes and rollback easily
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Login;