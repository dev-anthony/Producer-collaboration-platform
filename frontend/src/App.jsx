

import React, { useEffect, useState } from 'react';
import LoginPage from './pages/Login';
import Dashboard from './pages/Dashboard';
import LoadingSpinner from './components/LoadingSpinner';

const Client_Id = "Ov23li5uzPwPHy58STiN";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [jwtToken, setJwtToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    // console.log(' Checking authentication...');
    
    // 1. Check for existing token
    const savedToken = localStorage.getItem('jwtToken');
    if (savedToken) {
      // console.log(' Found saved token');
      setJwtToken(savedToken);
      setIsAuthenticated(true);
      setIsLoading(false);
      return;
    }

    // 2. Check URL for OAuth code
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    
    console.log('[APP] Current URL:', window.location.href);
    // console.log('[APP] OAuth code in URL:', code);

    if (code) {
      // console.log('[APP] Processing OAuth code...');
      await handleOAuthCallback(code);
    } else {
      console.log('[APP] No token or code found, showing login');
      setIsLoading(false);
    }
  };

  const handleOAuthCallback = async (code) => {
    try {
      setIsLoading(true);
      console.log('[APP] 📡 Exchanging OAuth code for JWT...');

      const response = await fetch(
        `http://localhost:5000/api/auth/getAccessToken?code=${code}`
      );
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[APP] 📦 Backend response:', data);

      if (data.token) {
        console.log('[APP] ✅ JWT received, saving...');
        
        // Save token
        localStorage.setItem('jwtToken', data.token);
        setJwtToken(data.token);
        setIsAuthenticated(true);

        // Save user info if provided
        if (data.user) {
          localStorage.setItem('userInfo', JSON.stringify(data.user));
        }

        // Clean URL (remove ?code=...)
        window.history.replaceState({}, document.title, window.location.pathname);
        console.log('[APP] ✅ Authentication complete!');
      } else {
        throw new Error(data.error || 'No token received from server');
      }
    } catch (err) {
      console.error('[APP] ❌ OAuth error:', err);
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    console.log('[APP] 👋 Logging out...');
    
    try {
      const token = localStorage.getItem('jwtToken');
      
      if (token) {
        const response = await fetch('http://localhost:5000/api/auth/logout', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          console.log('[APP] ✅ Server session revoked');
        } else {
          console.warn('[APP] ⚠️ Server logout failed, continuing anyway');
        }
      }
    } catch (error) {
      console.error('[APP] ❌ Logout error:', error);
    } finally {
      // Always clear local data
      localStorage.clear();
      sessionStorage.clear();
      
      // Clear cookies
      document.cookie.split(";").forEach((c) => {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      
      setIsAuthenticated(false);
      setJwtToken(null);
      
      console.log('[APP] ✅ Logged out successfully');
    }
  };

  // Loading state
  if (isLoading) {
    return (
      // <div className="min-h-screen bg-background flex items-center justify-center">
      //   <div className="text-center animate-fade-in">
      //     <div className="relative w-20 h-20 mx-auto mb-6">
      //       <div className="absolute inset-0 rounded-full border-2 border-muted"></div>
      //       <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
      //       <div className="absolute inset-2 rounded-full border-2 border-secondary/50 border-b-transparent animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
      //     </div>
      //     <p className="text-foreground text-lg font-medium tracking-wide">Initializing...</p>
      //     <p className="text-muted-foreground text-sm mt-1">Setting up your session</p>
      //   </div>
      // </div>
      <LoadingSpinner/>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full glass rounded-2xl p-8 text-center animate-scale-in border border-destructive/30">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-destructive" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-foreground mb-2">Authentication Error</h2>
          <p className="text-muted-foreground mb-8">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setIsLoading(false);
            }}
            className="w-full py-3 px-6 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Main app
  return isAuthenticated ? (
    <Dashboard onLogout={handleLogout} jwtToken={jwtToken} />
  ) : (
    <LoginPage clientId={Client_Id} />
  );
}

export default App;