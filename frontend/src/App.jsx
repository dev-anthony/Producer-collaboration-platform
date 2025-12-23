import React, { useEffect, useState } from 'react';

const Client_Id = "Ov23li5uzPwPHy58STiN";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log('🚀 App mounted');
    console.log('📍 Current URL:', window.location.href);
    console.log('📍 Search params:', window.location.search);
    
    const checkAuth = async () => {
      // Check for existing token
      const token = localStorage.getItem("accessToken");
      console.log('🔑 Checking localStorage for token...');
      console.log('🔑 Token found:', token ? 'YES' : 'NO');
      
      if (token) {
        console.log('✅ Token exists:', token.substring(0, 20) + '...');
        setIsAuthenticated(true);
        setIsLoading(false);
        return;
      }

      // Check for OAuth code in URL
      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");
      console.log('🔍 OAuth code from URL:', code);
      
      if (code) {
        console.log('🎯 Processing OAuth code...');
        await handleOAuthCallback(code);
      } else {
        console.log('❌ No code found, user needs to login');
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const handleOAuthCallback = async (code) => {
    try {
      setIsLoading(true);
      console.log('📡 Fetching access token from backend...');
      
      const response = await fetch(`http://localhost:5000/getAccessToken?code=${code}`);
      const data = await response.json();
      
      console.log('📦 Backend response:', data);
      
      if (data.access_token) {
        console.log('✅ Access token received:', data.access_token.substring(0, 20) + '...');
        console.log('💾 Saving to localStorage...');
        
        localStorage.setItem("accessToken", data.access_token);
        
        console.log('🔍 Verifying localStorage save...');
        const savedToken = localStorage.getItem("accessToken");
        console.log('✓ Token in localStorage:', savedToken ? 'YES' : 'NO');
        
        if (savedToken) {
          console.log('✅ Token successfully saved!');
          setIsAuthenticated(true);
          setError(null);
          
          // Clean URL
          window.history.replaceState({}, document.title, '/');
        } else {
          console.error('❌ Failed to save token to localStorage!');
          setError('Failed to save authentication token');
        }
      } else {
        const errorMsg = data.error_description || data.error || 'No access token received';
        console.error('❌ OAuth error:', errorMsg);
        setError(errorMsg);
      }
    } catch (err) {
      console.error('❌ Network error:', err);
      setError('Network error: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getUserData = async () => {
    const token = localStorage.getItem("accessToken");
    console.log('👤 Getting user data...');
    console.log('🔑 Token:', token ? 'Present' : 'Missing');
    
    if (!token) {
      setError('No access token found');
      return;
    }

    try {
      console.log('📡 Fetching user data from backend...');
      const response = await fetch("http://localhost:5000/getUserData", {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      console.log('👤 User data received:', data);
      
      if (data.message || data.error) {
        setError(data.message || data.error);
      } else {
        setUser(data);
        setError(null);
      }
    } catch (err) {
      console.error('❌ Error fetching user data:', err);
      setError('Failed to fetch user data: ' + err.message);
    }
  };

  const loginWithGithub = () => {
    const redirectUri = 'http://localhost:3000';
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${Client_Id}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user`;
    
    console.log('🔐 Redirecting to GitHub OAuth...');
    console.log('🔗 URL:', authUrl);
    window.location.href = authUrl;
  };

  const logout = () => {
    console.log('👋 Logging out...');
    localStorage.removeItem("accessToken");
    setIsAuthenticated(false);
    setUser(null);
    setError(null);
    console.log('✅ Logged out');
  };

  if (isLoading) {
    return (
      <div className='bg-black h-screen flex items-center justify-center'>
        <div className="text-white text-xl">⏳ Loading...</div>
      </div>
    );
  }

  return (
    <div className='bg-black h-screen flex items-center justify-center'>
      <div className="text-white text-center max-w-md p-8">
        {error && (
          <div className="bg-red-500 text-white p-4 rounded mb-4">
            ❌ {error}
          </div>
        )}
        
        {isAuthenticated ? (
          <div>
            <h1 className="text-2xl font-bold mb-4">✅ Logged In!</h1>
            <p className="text-sm text-gray-400 mb-4">Token stored in localStorage</p>
            
            <button 
              onClick={logout}
              className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-6 rounded mb-6"
            >
              Logout
            </button>
            
            <div className="border-t border-gray-700 pt-6">
              <h3 className="text-xl mb-4">User Data</h3>
              <button 
                onClick={getUserData}
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded mb-4"
              >
                Get User Data
              </button>
              
              {user && (
                <div className="mt-4 bg-gray-800 p-4 rounded">
                  <h2 className="text-2xl mb-2">Hey {user.login}! 👋</h2>
                  {user.avatar_url && (
                    <img 
                      src={user.avatar_url} 
                      alt="Avatar" 
                      className="w-24 h-24 rounded-full mx-auto my-4"
                    />
                  )}
                  {user.name && <p className="text-lg">{user.name}</p>}
                  {user.bio && <p className="text-sm text-gray-400 mt-2">{user.bio}</p>}
                  {user.public_repos !== undefined && (
                    <p className="mt-2">📦 {user.public_repos} public repos</p>
                  )}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div>
            <h3 className="text-2xl mb-6">🔒 Not Logged In</h3>
            <button 
              onClick={loginWithGithub}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded text-lg"
            >
              Login with GitHub
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
