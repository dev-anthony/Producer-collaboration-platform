
import React, { useEffect, useState } from 'react';
import LoginPage from './pages/Login';
import Dashboard from './pages/Dashboard';

const Client_Id = "Ov23li5uzPwPHy58STiN";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [jwtToken, setJwtToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      // Check for existing token in localStorage first
      const savedToken = localStorage.getItem('jwtToken');
      
      if (savedToken) {
        console.log('✅ Found saved JWT token in localStorage');
        setJwtToken(savedToken);
        setIsAuthenticated(true);
        setIsLoading(false);
        return;
      }

      // Check for OAuth code in URL
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");

      if (code) {
        console.log('🎯 OAuth code found, processing...');
        await handleOAuthCallback(code);
      } else {
        console.log('❌ No token or OAuth code, showing login');
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  const handleOAuthCallback = async (code) => {
    try {
      setIsLoading(true);
      console.log('📡 Exchanging code for JWT token...');

      const response = await fetch(
        `http://localhost:5000/api/auth/getAccessToken?code=${code}`
      );
      const data = await response.json();

      console.log('📦 Backend response:', data);

      if (data.token) {
        console.log('✅ JWT token received');
        
        // Save to localStorage AND state
        localStorage.setItem('jwtToken', data.token);
        setJwtToken(data.token);
        setIsAuthenticated(true);

        // Also save user info if provided
        if (data.user) {
          localStorage.setItem('userInfo', JSON.stringify(data.user));
        }

        // Clean URL - keep current path, just remove query params
        const currentPath = window.location.pathname;
        window.history.replaceState({}, document.title, currentPath);
        console.log('🧹 URL cleaned to:', currentPath);
        console.log('💾 Token saved to localStorage');
      } else {
        const errorMsg = data.error || "Failed to get token from server";
        console.error('❌ OAuth error:', errorMsg);
        setError(errorMsg);
      }
    } catch (err) {
      console.error('❌ Network error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    console.log('👋 Logging out...');
    
    // Clear localStorage
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('userInfo');
    
    // Clear state
    setIsAuthenticated(false);
    setJwtToken(null);
    
    console.log('✅ Logged out and cleared localStorage');
  };

  if (isLoading) {
    return (
      <div className="bg-gray-900 h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-white text-xl">⏳ Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-900 h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-red-500 bg-opacity-10 border border-red-500 rounded-xl p-8 text-center">
          <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
          </svg>
          <h2 className="text-2xl font-bold text-red-500 mb-2">Authentication Error</h2>
          <p className="text-gray-300 mb-6">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setIsLoading(false);
            }}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return isAuthenticated ? (
    <Dashboard onLogout={handleLogout} jwtToken={jwtToken} />
  ) : (
    <LoginPage clientId={Client_Id} />
  );
}

export default App;