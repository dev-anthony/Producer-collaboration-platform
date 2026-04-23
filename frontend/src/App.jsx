
// import React, { useEffect, useState } from 'react';
// import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
// import LoginPage from './pages/Login.jsx';
// import Dashboard from './pages/Dashboard.jsx';
// import LoadingSpinner from './components/LoadingSpinner.jsx';
// import Toast from './components/Toast.jsx';
// import Collaboration from './pages/Collaboration.jsx';
// import Projects from './pages/Projects.jsx';

// const productionClientId = process.env.GITHUB_CLIENT_ID;
// // Helper function to refresh token
// const refreshAccessToken = async (refreshToken) => {
//   try {
//     const response = await fetch('http://localhost:5000/api/auth/refresh', {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json'
//       },
//       body: JSON.stringify({ refreshToken })
//     });

//     if (!response.ok) {
//       throw new Error('Token refresh failed');
//     }

//     const data = await response.json();
//     return data.token; // Return new access token
//   } catch (error) {
//     console.error('Token refresh error:', error);
//     return null;
//   }
// };

// function App() {
//   const [isAuthenticated, setIsAuthenticated] = useState(false);
//   const [jwtToken, setJwtToken] = useState(null);
//   const [refreshToken, setRefreshToken] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [toast, setToast] = useState(null);

//   useEffect(() => {
//     checkAuth();
    
//     // Listen for OAuth code from protocol handler (production)
//     const cleanup = window.electronAPI?.onOAuthCode?.((code) => {
//       console.log('[APP] OAuth code from protocol:', code);
//       handleOAuthCallback(code);
//     });

//     return () => {
//       if (cleanup) cleanup();
//     };
//   }, []);

//   const checkAuth = async () => {
//     const savedToken = localStorage.getItem('jwtToken');
//     const savedRefreshToken = localStorage.getItem('refreshToken');
    
//     if (savedToken && savedRefreshToken) {
//       setJwtToken(savedToken);
//       setRefreshToken(savedRefreshToken);
//       setIsAuthenticated(true);
//       setIsLoading(false);
//       return;
//     }

//     // Development: Check URL params
//     const urlParams = new URLSearchParams(window.location.search);
//     const code = urlParams.get('code');

//     if (code) {
//       console.log('[APP] OAuth code from URL:', code);
//       await handleOAuthCallback(code);
//     } else {
//       setIsLoading(false);
//     }
//   };

//   const handleOAuthCallback = async (code) => {
//     try {
//       setIsLoading(true);

//       const response = await fetch(
//         `http://localhost:5000/api/auth/getAccessToken?code=${code}`
//       );
      
//       if (!response.ok) {
//         throw new Error(`HTTP ${response.status}: ${response.statusText}`);
//       }

//       const data = await response.json();

//       if (data.token && data.refreshToken) {
//         localStorage.setItem('jwtToken', data.token);
//         localStorage.setItem('refreshToken', data.refreshToken);
//         setJwtToken(data.token);
//         setRefreshToken(data.refreshToken);
//         setIsAuthenticated(true);
//         if (data.user) {
//           localStorage.setItem('userInfo', JSON.stringify(data.user));
//         }
//         window.history.replaceState({}, document.title, window.location.pathname);
        
//       } else {
//         throw new Error(data.error || 'No token received from server');
//       }
//     } catch (err) {
//       setToast({
//         type: 'error',
//         message: "Authentication failed. Please try again."
//       })
//       setError(err.message || 'Authentication failed');
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleLogout = async () => {
//     try {
//       const token = localStorage.getItem('jwtToken');

//       if (token) {
//         try {
//           await fetch('http://localhost:5000/api/auth/logout', {
//             method: 'POST',
//             headers: {
//               'Authorization': `Bearer ${token}`,
//               'Content-Type': 'application/json'
//             }
//           });
//         } catch (error) {
//           console.error('Server logout error:', error);
//         }
//       }

//       if (window.electronAPI?.clearOAuthSession) {
//         await window.electronAPI.clearOAuthSession();
//       }

//     } catch (error) {
//       console.error('Logout error:', error);
//     } finally {
//       localStorage.clear();
//       sessionStorage.clear();
//       setJwtToken(null);
//       setIsAuthenticated(false);
      
//       setToast({
//         type: 'success',
//         message: "Logged out successfully"
//       });
//     }
//   };

//   // Protected Route wrapper
//   const ProtectedRoute = ({ children }) => {
//     if (!isAuthenticated) {
//       return <Navigate to="/login" replace />;
//     }
//     return children;
//   };

//   // Loading state
//   if (isLoading) {
//     return <LoadingSpinner />;
//   }

//   if (error) {
//     return (
//       <div className="min-h-screen bg-background flex items-center justify-center p-4">
//         <div className="max-w-md w-full glass rounded-2xl p-8 text-center animate-scale-in border border-destructive/30">
//           {toast && (
//             <Toast
//               message={toast.message}
//               type={toast.type}
//               duration={5000}
//               onClose={() => setToast(null)}
//             />
//           )}
//           <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-destructive/10 flex items-center justify-center">
//             <svg className="w-8 h-8 text-destructive" fill="currentColor" viewBox="0 0 20 20">
//               <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
//             </svg>
//           </div>
//           <h2 className="text-2xl font-bold text-foreground mb-2">Authentication Error</h2>
//           <p className="text-muted-foreground mb-8">{error}</p>
//           <button
//             onClick={() => {
//               setError(null);
//               setIsLoading(false);
//             }}
//             className="w-full py-3 px-6 rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
//           >
//             Try Again
//           </button>
//         </div>
//       </div>
//     );
//   }

//   return (
//     <HashRouter>
//       {toast && (
//         <Toast
//           message={toast.message}
//           type={toast.type}
//           duration={3000}
//           onClose={() => setToast(null)}
//         />
//       )}
//       <Routes>
//         {/* Public route */}
//         <Route 
//           path="/login" 
//           element={
//             isAuthenticated ? (
//               <Navigate to="/dashboard" replace />
//             ) : (
//               <LoginPage clientId={productionClientId} />
//             )
//           } 
//         />

//         {/* Protected routes */}
//         <Route
//           path="/dashboard"
//           element={
//             <ProtectedRoute>
//               <Dashboard onLogout={handleLogout} jwtToken={jwtToken} />
//             </ProtectedRoute>
//           }
//         />
        
//         <Route
//           path="/collaboration"
//           element={
//             <ProtectedRoute>
//               <Collaboration onLogout={handleLogout} jwtToken={jwtToken} />
//             </ProtectedRoute>
//           }
//         />
        
//         <Route
//           path="/projects"
//           element={
//             <ProtectedRoute>
//               <Projects onLogout={handleLogout} jwtToken={jwtToken} />
//             </ProtectedRoute>
//           }
//         />

//         {/* Redirect root to appropriate page */}
//         <Route 
//           path="/" 
//           element={
//             <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />
//           } 
//         />

//         {/* Catch-all redirect */}
//         <Route 
//           path="*" 
//           element={
//             <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />
//           } 
//         />
//       </Routes>
//     </HashRouter>
//   );
// }

// export default App;
import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import LoadingSpinner from './components/LoadingSpinner.jsx';
import Toast from './components/Toast.jsx';
import Collaboration from './pages/Collaboration.jsx';
import Projects from './pages/Projects.jsx';

const productionClientId = process.env.CLIENT_ID;

// Helper function to refresh token
const refreshAccessToken = async (refreshToken) => {
  try {
    const response = await fetch('http://localhost:5000/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refreshToken })
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error('Token refresh error:', error);
    return null;
  }
};

// ✅ Check if token is expired or about to expire
const isTokenExpired = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 < Date.now() + 60_000;
  } catch {
    return true;
  }
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [jwtToken, setJwtToken] = useState(null);
  const [refreshToken, setRefreshToken] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    checkAuth();

    const cleanup = window.electronAPI?.onOAuthCode?.((code) => {
      console.log('[APP] OAuth code from protocol:', code);
      handleOAuthCallback(code);
    });

    // ✅ Proactive refresh every 10 minutes
    const refreshInterval = setInterval(async () => {
      const currentToken = localStorage.getItem('jwtToken');
      const currentRefresh = localStorage.getItem('refreshToken');
      if (currentToken && currentRefresh && isTokenExpired(currentToken)) {
        console.log('[AUTH] Proactive token refresh...');
        const newToken = await refreshAccessToken(currentRefresh);
        if (newToken) {
          localStorage.setItem('jwtToken', newToken);
          setJwtToken(newToken);
        } else {
          handleLogout();
        }
      }
    }, 10 * 60 * 1000);

    return () => {
      if (cleanup) cleanup();
      clearInterval(refreshInterval);
    };
  }, []);

  const checkAuth = async () => {
    const savedToken = localStorage.getItem('jwtToken');
    const savedRefreshToken = localStorage.getItem('refreshToken');

    if (savedToken && savedRefreshToken) {
      // ✅ Refresh if expired instead of blindly trusting saved token
      if (isTokenExpired(savedToken)) {
        console.log('[AUTH] Saved token expired, refreshing...');
        const newToken = await refreshAccessToken(savedRefreshToken);
        if (newToken) {
          localStorage.setItem('jwtToken', newToken);
          setJwtToken(newToken);
          setRefreshToken(savedRefreshToken);
          setIsAuthenticated(true);
        } else {
          console.warn('[AUTH] Refresh failed, clearing session');
          localStorage.clear();
          setIsAuthenticated(false);
        }
      } else {
        setJwtToken(savedToken);
        setRefreshToken(savedRefreshToken);
        setIsAuthenticated(true);
      }
      setIsLoading(false);
      return;
    }

    // Check URL params for OAuth code
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');

    if (code) {
      console.log('[APP] OAuth code from URL:', code);
      await handleOAuthCallback(code);
    } else {
      setIsLoading(false);
    }
  };

  const handleOAuthCallback = async (code) => {
    try {
      setIsLoading(true);

      const response = await fetch(
        `http://localhost:5000/api/auth/getAccessToken?code=${code}`
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.token && data.refreshToken) {
        localStorage.setItem('jwtToken', data.token);
        localStorage.setItem('refreshToken', data.refreshToken);
        setJwtToken(data.token);
        setRefreshToken(data.refreshToken);
        setIsAuthenticated(true);
        if (data.user) {
          localStorage.setItem('userInfo', JSON.stringify(data.user));
        }
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        throw new Error(data.error || 'No token received from server');
      }
    } catch (err) {
      setToast({
        type: 'error',
        message: "Authentication failed. Please try again."
      });
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      const token = localStorage.getItem('jwtToken');

      if (token) {
        try {
          await fetch('http://localhost:5000/api/auth/logout', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
        } catch (error) {
          console.error('Server logout error:', error);
        }
      }

      if (window.electronAPI?.clearOAuthSession) {
        await window.electronAPI.clearOAuthSession();
      }

    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      setJwtToken(null);
      setRefreshToken(null);
      setIsAuthenticated(false);

      setToast({
        type: 'success',
        message: "Logged out successfully"
      });
    }
  };

  const ProtectedRoute = ({ children }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    return children;
  };

  if (isLoading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full glass rounded-2xl p-8 text-center animate-scale-in border border-destructive/30">
          {toast && (
            <Toast
              message={toast.message}
              type={toast.type}
              duration={5000}
              onClose={() => setToast(null)}
            />
          )}
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

  return (
    <HashRouter>
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          duration={3000}
          onClose={() => setToast(null)}
        />
      )}
      <Routes>
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/dashboard" replace />
            ) : (
              <LoginPage clientId={productionClientId} />
            )
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard onLogout={handleLogout} jwtToken={jwtToken} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/collaboration"
          element={
            <ProtectedRoute>
              <Collaboration onLogout={handleLogout} jwtToken={jwtToken} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <Projects onLogout={handleLogout} jwtToken={jwtToken} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/"
          element={
            <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />
          }
        />
        <Route
          path="*"
          element={
            <Navigate to={isAuthenticated ? "/dashboard" : "/login"} replace />
          }
        />
      </Routes>
    </HashRouter>
  );
}

export default App;