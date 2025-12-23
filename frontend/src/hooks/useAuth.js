// // src/hooks/useAuth.js
// import { useState, useEffect } from 'react';

// export default function useAuth() {
//   const [user, setUser] = useState(null);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     fetch('http://localhost:5000/user', {
//       credentials: 'include',
//     })
//       .then((res) => {
//         if (res.ok) return res.json();
//         throw new Error('Unauthorized');
//       })
//       .then((data) => {
//         setUser({ username: data.username });
//       })
//       .catch(() => {
//         setUser(null);
//       })
//       .finally(() => {
//         setLoading(false);
//       });
//   }, []);

//   const login = () => {
//     window.location.href = 'http://localhost:5000/auth/github';
//   };

//   const logout = () => {
//     fetch('http://localhost:5000/logout', {
//       credentials: 'include',
//     }).then(() => {
//       setUser(null);
//       window.location.href = '/';
//     });
//   };

//   return { user, loading, login, logout };
// }
import { useState, useEffect } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export default function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch(`${API_URL}/user`, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const login = () => {
    // Open GitHub OAuth in external browser
    if (window.electronAPI) {
      window.electronAPI.openExternal(`${API_URL}/auth/github`);
      
      // Poll for authentication
      const pollInterval = setInterval(async () => {
        try {
          const response = await fetch(`${API_URL}/user`, {
            credentials: 'include'
          });
          
          if (response.ok) {
            const data = await response.json();
            setUser(data);
            clearInterval(pollInterval);
          }
        } catch (err) {
          // Still waiting for auth
        }
      }, 2000);

      // Stop polling after 5 minutes
      setTimeout(() => clearInterval(pollInterval), 300000);
    } else {
      // Fallback for browser
      window.location.href = `${API_URL}/auth/github`;
    }
  };

  const logout = async () => {
    try {
      await fetch(`${API_URL}/logout`, {
        credentials: 'include'
      });
      setUser(null);
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return { user, loading, login, logout };
}