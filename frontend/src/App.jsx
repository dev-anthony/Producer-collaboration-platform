
// import React, { useEffect, useState } from 'react';
// import LoginPage from './pages/Login';
// import Dashboard from './pages/Dashboard';

// const Client_Id = "Ov23li5uzPwPHy58STiN";

// function App() {
//   const [isAuthenticated, setIsAuthenticated] = useState(false);
//   const [jwtToken, setJwtToken] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     const checkAuth = async () => {
//       // Check for existing token in localStorage first
//       const savedToken = localStorage.getItem('jwtToken');
      
//       if (savedToken) {
//         console.log('✅ Found saved JWT token in localStorage');
//         setJwtToken(savedToken);
//         setIsAuthenticated(true);
//         setIsLoading(false);
//         return;
//       }

//       // Check for OAuth code in URL
//       const urlParams = new URLSearchParams(window.location.search);
//       const code = urlParams.get("code");

//       if (code) {
//         console.log('🎯 OAuth code found, processing...');
//         await handleOAuthCallback(code);
//       } else {
//         console.log('❌ No token or OAuth code, showing login');
//         setIsLoading(false);
//       }
//     };
//     checkAuth();
//   }, []);

//   const handleOAuthCallback = async (code) => {
//     try {
//       setIsLoading(true);
//       console.log('📡 Exchanging code for JWT token...');

//       const response = await fetch(
//         `http://localhost:5000/api/auth/getAccessToken?code=${code}`
//       );
//       const data = await response.json();

//       console.log('📦 Backend response:', data);

//       if (data.token) {
//         console.log('✅ JWT token received');
        
//         // Save to localStorage AND state
//         localStorage.setItem('jwtToken', data.token);
//         setJwtToken(data.token);
//         setIsAuthenticated(true);

//         // Also save user info if provided
//         if (data.user) {
//           localStorage.setItem('userInfo', JSON.stringify(data.user));
//         }

//         // Clean URL - keep current path, just remove query params
//         const currentPath = window.location.pathname;
//         window.history.replaceState({}, document.title, currentPath);
//         console.log('🧹 URL cleaned to:', currentPath);
//         console.log('💾 Token saved to localStorage');
//       } else {
//         const errorMsg = data.error || "Failed to get token from server";
//         console.error('❌ OAuth error:', errorMsg);
//         setError(errorMsg);
//       }
//     } catch (err) {
//       console.error('❌ Network error:', err);
//       setError(err.message);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   // const handleLogout = () => {
//   //   console.log('👋 Logging out...');
    
//   //   // Clear localStorage
//   //   localStorage.removeItem('jwtToken');
//   //   localStorage.removeItem('userInfo');
    
//   //   // Clear state
//   //   setIsAuthenticated(false);
//   //   setJwtToken(null);
    
//   //   console.log('✅ Logged out and cleared localStorage');
//   // };
//  const handleLogout = async () => {
//   console.log('👋 Logging out...');
  
//   try {
//     // Get token before clearing
//     const token = localStorage.getItem('jwtToken');
    
//     if (token) {
//       // Call backend to revoke GitHub OAuth token
//       const response = await fetch('http://localhost:5000/api/auth/logout', {
//         method: 'POST',
//         headers: {
//           'Authorization': `Bearer ${token}`
//         }
//       });

//       if (response.ok) {
//         console.log('✅ GitHub authorization revoked');
//       } else {
//         console.warn('⚠️ Failed to revoke GitHub token on server');
//       }
//     }
//   } catch (error) {
//     console.error('❌ Logout error:', error);
//     // Continue with logout even if revoke fails
//   } finally {
//     // Always clear local data
//     localStorage.clear();
//     sessionStorage.clear();
    
//     // Update state
//     setIsAuthenticated(false);
//     setJwtToken(null);
    
//     console.log('✅ Logged out - GitHub session revoked');
    
//     // Optional: Show success message
//     alert('Logged out successfully. You will need to login again with GitHub.');
//   }
// };

//   if (isLoading) {
//     return (
//       <div className="bg-gray-900 h-screen flex items-center justify-center">
//         <div className="text-center">
//           <div className="inline-block w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-4"></div>
//           <p className="text-white text-xl">⏳ Loading...</p>
//         </div>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="bg-gray-900 h-screen flex items-center justify-center p-4">
//         <div className="max-w-md w-full bg-red-500 bg-opacity-10 border border-red-500 rounded-xl p-8 text-center">
//           <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
//             <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
//           </svg>
//           <h2 className="text-2xl font-bold text-red-500 mb-2">Authentication Error</h2>
//           <p className="text-gray-300 mb-6">{error}</p>
//           <button
//             onClick={() => {
//               setError(null);
//               setIsLoading(false);
//             }}
//             className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition-colors"
//           >
//             Try Again
//           </button>
//         </div>
//       </div>
//     );
//   }

//   return isAuthenticated ? (
//     <Dashboard onLogout={handleLogout} jwtToken={jwtToken} />
//   ) : (
//     <LoginPage clientId={Client_Id} />
//   );
// }

// export default App;
// import React, { useEffect, useState } from 'react';
// import LoginPage from './pages/Login';
// import Dashboard from './pages/Dashboard';

// const Client_Id = "Ov23li5uzPwPHy58STiN";

// function App() {
//   const [isAuthenticated, setIsAuthenticated] = useState(false);
//   const [jwtToken, setJwtToken] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     const checkAuth = async () => {
//       // Check for existing token in localStorage first
//       const savedToken = localStorage.getItem('jwtToken');
      
//       if (savedToken) {
//         console.log('✅ Found saved JWT token in localStorage');
//         setJwtToken(savedToken);
//         setIsAuthenticated(true);
//         setIsLoading(false);
//         return;
//       }

//       // Check for OAuth code in URL
//       const urlParams = new URLSearchParams(window.location.search);
//       const code = urlParams.get("code");

//       if (code) {
//         console.log('🎯 OAuth code found, processing...');
//         await handleOAuthCallback(code);
//       } else {
//         console.log('❌ No token or OAuth code, showing login');
//         setIsLoading(false);
//       }
//     };
//     checkAuth();
//   }, []);

//   const handleOAuthCallback = async (code) => {
//     try {
//       setIsLoading(true);
//       console.log('📡 Exchanging code for JWT token...');

//       const response = await fetch(
//         `http://localhost:5000/api/auth/getAccessToken?code=${code}`
//       );
//       const data = await response.json();

//       console.log('📦 Backend response:', data);

//       if (data.token) {
//         console.log('✅ JWT token received');
        
//         // Save to localStorage AND state
//         localStorage.setItem('jwtToken', data.token);
//         setJwtToken(data.token);
//         setIsAuthenticated(true);

//         // Also save user info if provided
//         if (data.user) {
//           localStorage.setItem('userInfo', JSON.stringify(data.user));
//         }

//         // Clean URL - keep current path, just remove query params
//         const currentPath = window.location.pathname;
//         window.history.replaceState({}, document.title, currentPath);
//         console.log('🧹 URL cleaned to:', currentPath);
//         console.log('💾 Token saved to localStorage');
//       } else {
//         const errorMsg = data.error || "Failed to get token from server";
//         console.error('❌ OAuth error:', errorMsg);
//         setError(errorMsg);
//       }
//     } catch (err) {
//       console.error('❌ Network error:', err);
//       setError(err.message);
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleLogout = async () => {
//     console.log('👋 Logging out...');
    
//     try {
//       // Get token before clearing
//       const token = localStorage.getItem('jwtToken');
      
//       if (token) {
//         // Call backend to revoke GitHub OAuth token
//         const response = await fetch('http://localhost:5000/api/auth/logout', {
//           method: 'POST',
//           headers: {
//             'Authorization': `Bearer ${token}`,
//             'Content-Type': 'application/json'
//           }
//         });

//         const data = await response.json();

//         if (response.ok) {
//           console.log('✅ GitHub authorization revoked:', data);
//         } else {
//           console.warn('⚠️ Failed to revoke GitHub token on server:', data);
//         }
//       }
//     } catch (error) {
//       console.error('❌ Logout error:', error);
//       // Continue with logout even if revoke fails
//     } finally {
//       // Always clear local data
//       localStorage.clear();
//       sessionStorage.clear();
      
//       // Clear cookies (if any)
//       document.cookie.split(";").forEach((c) => {
//         document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
//       });
      
//       // Update state
//       setIsAuthenticated(false);
//       setJwtToken(null);
      
//       console.log('✅ Logged out - All sessions cleared');
//     }
//   };

//   if (isLoading) {
//     return (
//       <div className="bg-gray-900 h-screen flex items-center justify-center">
//         <div className="text-center">
//           <div className="inline-block w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mb-4"></div>
//           <p className="text-white text-xl">⏳ Loading...</p>
//         </div>
//       </div>
//     );
//   }

//   if (error) {
//     return (
//       <div className="bg-gray-900 h-screen flex items-center justify-center p-4">
//         <div className="max-w-md w-full bg-red-500 bg-opacity-10 border border-red-500 rounded-xl p-8 text-center">
//           <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
//             <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/>
//           </svg>
//           <h2 className="text-2xl font-bold text-red-500 mb-2">Authentication Error</h2>
//           <p className="text-gray-300 mb-6">{error}</p>
//           <button
//             onClick={() => {
//               setError(null);
//               setIsLoading(false);
//             }}
//             className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg transition-colors"
//           >
//             Try Again
//           </button>
//         </div>
//       </div>
//     );
//   }

//   return isAuthenticated ? (
//     <Dashboard onLogout={handleLogout} jwtToken={jwtToken} />
//   ) : (
//     <LoginPage clientId={Client_Id} />
//   );
// }

// export default App;
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
      const savedToken = localStorage.getItem('jwtToken');
      
      if (savedToken) {
        // console.log('Found saved JWT token in localStorage');
        setJwtToken(savedToken);
        setIsAuthenticated(true);
        setIsLoading(false);
        return;
      }

      const urlParams = new URLSearchParams(window.location.search);
      const code = urlParams.get("code");

      if (code) {
        // console.log('OAuth code found, processing...');
        await handleOAuthCallback(code);
      } else {
        // console.log('No token or OAuth code, showing login');
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

  const handleOAuthCallback = async (code) => {
    try {
      setIsLoading(true);
      // console.log(' Exchanging code for JWT token...');

      const response = await fetch(
        `http://localhost:5000/api/auth/getAccessToken?code=${code}`
      );
      const data = await response.json();

      // console.log('Backend response:', data);

      if (data.token) {
        // console.log('JWT token received');
        
        localStorage.setItem('jwtToken', data.token);
        setJwtToken(data.token);
        setIsAuthenticated(true);

        if (data.user) {
          localStorage.setItem('userInfo', JSON.stringify(data.user));
        }

        const currentPath = window.location.pathname;
        window.history.replaceState({}, document.title, currentPath);
        // console.log('URL cleaned to:', currentPath);
        // console.log('Token saved to localStorage');
      } else {
        const errorMsg = data.error || "Failed to get token from server";
        console.error('OAuth error:', errorMsg);
        setError(errorMsg);
      }
    } catch (err) {
      console.error(' Network error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    // console.log('Logging out');
    
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

        const data = await response.json();

        if (response.ok) {
          console.log('GitHub authorization revoked:', data);
        } else {
          console.warn('Failed to revoke GitHub token on server:', data);
        }
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.clear();
      sessionStorage.clear();
      
      document.cookie.split(";").forEach((c) => {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      
      setIsAuthenticated(false);
      setJwtToken(null);
      
      // console.log(' Logged out - All sessions cleared');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center animate-fade-in">
          {/* DAW-style loading spinner */}
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-2 border-muted"></div>
            <div className="absolute inset-0 rounded-full border-2 border-primary border-t-transparent animate-spin"></div>
            <div className="absolute inset-2 rounded-full border-2 border-secondary/50 border-b-transparent animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
          <p className="text-foreground text-lg font-medium tracking-wide">Initializing...</p>
          <p className="text-muted-foreground text-sm mt-1">Setting up your session</p>
        </div>
      </div>
    );
  }

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

  return isAuthenticated ? (
    <Dashboard onLogout={handleLogout} jwtToken={jwtToken} />
  ) : (
    <LoginPage clientId={Client_Id} />
  );
}

export default App;




// import { useEffect, useState } from "react";
// import LoginPage from "@/components/LoginPage";
// import Dashboard from "@/components/Dashboard";
// // import LoadingSpinner from "@/components/LoadingSpinner";
// // import ErrorDisplay from "@/components/ErrorDisplay";

// const CLIENT_ID = "Ov23li5uzPwPHy58STiN";

// const App = () => {
//   const [isAuthenticated, setIsAuthenticated] = useState(false);
//   const [jwtToken, setJwtToken] = useState(null);
//   const [isLoading, setIsLoading] = useState(true);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     const checkAuth = async () => {
//       const savedToken = localStorage.getItem("jwtToken");
//       if (savedToken) {
//         console.log("✅ Found saved JWT token in localStorage");
//         setJwtToken(savedToken);
//         setIsAuthenticated(true);
//         setIsLoading(false);
//         return;
//       }

//       const urlParams = new URLSearchParams(window.location.search);
//       const code = urlParams.get("code");
//       if (code) {
//         console.log("🎯 OAuth code found, processing...");
//         await handleOAuthCallback(code);
//       } else {
//         console.log("❌ No token or OAuth code, showing login");
//         setIsLoading(false);
//       }
//     };

//     checkAuth();
//   }, []);

//   const handleOAuthCallback = async (code) => {
//     try {
//       setIsLoading(true);
//       console.log("📡 Exchanging code for JWT token...");
//       const response = await fetch(
//         `http://localhost:5000/api/auth/getAccessToken?code=${code}`
//       );
//       const data = await response.json();
//       console.log("📦 Backend response:", data);

//       if (data.token) {
//         console.log("✅ JWT token received");
//         localStorage.setItem("jwtToken", data.token);
//         setJwtToken(data.token);
//         setIsAuthenticated(true);
//         if (data.user) {
//           localStorage.setItem("userInfo", JSON.stringify(data.user));
//         }
//         const currentPath = window.location.pathname;
//         window.history.replaceState({}, document.title, currentPath);
//         console.log("🧹 URL cleaned to:", currentPath);
//         console.log("💾 Token saved to localStorage");
//       } else {
//         const errorMsg = data.error || "Failed to get token from server";
//         console.error("❌ OAuth error:", errorMsg);
//         setError(errorMsg);
//       }
//     } catch (err) {
//       console.error("❌ Network error:", err);
//       setError(err instanceof Error ? err.message : "Network error");
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleLogout = async () => {
//     console.log("👋 Logging out...");
//     try {
//       const token = localStorage.getItem("jwtToken");
//       if (token) {
//         const response = await fetch("http://localhost:5000/api/auth/logout", {
//           method: "POST",
//           headers: {
//             Authorization: `Bearer ${token}`,
//             "Content-Type": "application/json",
//           },
//         });
//         const data = await response.json();
//         if (response.ok) {
//           console.log("✅ GitHub authorization revoked:", data);
//         } else {
//           console.warn("⚠️ Failed to revoke GitHub token on server:", data);
//         }
//       }
//     } catch (error) {
//       console.error("❌ Logout error:", error);
//     } finally {
//       localStorage.clear();
//       sessionStorage.clear();
//       document.cookie.split(";").forEach((c) => {
//         document.cookie = c
//           .replace(/^ +/, "")
//           .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
//       });
//       setIsAuthenticated(false);
//       setJwtToken(null);
//       console.log("✅ Logged out - All sessions cleared");
//     }
//   };

//   if (isLoading) {
//     return <LoadingSpinner />;
//   }

//   if (error) {
//     return (
//       <ErrorDisplay
//         error={error}
//         onRetry={() => {
//           setError(null);
//           setIsLoading(false);
//         }}
//       />
//     );
//   }

//   return isAuthenticated && jwtToken ? (
//     <Dashboard onLogout={handleLogout} jwtToken={jwtToken} />
//   ) : (
//     <LoginPage clientId={CLIENT_ID} />
//   );
// };

// export default App;