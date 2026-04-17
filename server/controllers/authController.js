// // // controllers/authController.js
// // const jwt = require('jsonwebtoken');
// // const pool = require('../config/db');

// // const fetch = (...args) =>
// //   import('node-fetch').then(({ default: fetch }) => fetch(...args));


// // exports.getAccessToken = async (req, res) => {
// //   const code = req.query.code;
// //   console.log('Received OAuth code:', code);

// //   if (!code) {
// //     return res.status(400).json({ error: 'No code provided' });
// //   }

// //   const params = `?client_id=${process.env.CLIENT_ID}&client_secret=${process.env.GITHUB_CLIENT_SECRET}&code=${code}`;

// //   try {
// //     // Exchange code for GitHub access token
// //     const response = await fetch('https://github.com/login/oauth/access_token' + params, {
// //       method: 'POST',
// //       headers: {
// //         Accept: 'application/json',
// //       },
// //     });

// //     const data = await response.json();
// //     console.log('GitHub token response:', data);

// //     if (!data.access_token) {
// //       return res.status(400).json({ 
// //         error: 'Failed to get access token',
// //         details: data 
// //       });
// //     }

// //     // Get GitHub user info
// //     const userResponse = await fetch('https://api.github.com/user', {
// //       method: 'GET',
// //       headers: {
// //         Authorization: `Bearer ${data.access_token}`,
// //         'User-Agent': 'Electron-App',
// //       },
// //     });

// //     const userData = await userResponse.json();
// //     console.log('GitHub user data:', userData);

// //     // Save/Update user and token in database
// //     const connection = await pool.promise().getConnection();
    
// //     try {
// //       await connection.beginTransaction();

// //       // Check if user exists
// //       const [existingUser] = await connection.execute(
// //         'SELECT id FROM users WHERE github_id = ?',
// //         [userData.id]
// //       );

// //       let userId;

// //       if (existingUser.length > 0) {
// //         // Update existing user
// //         userId = existingUser[0].id;
// //         await connection.execute(
// //           `UPDATE users 
// //            SET username = ?, email = ?, avatar_url = ?, bio = ?, 
// //                public_repos = ?, updated_at = NOW() 
// //            WHERE github_id = ?`,
// //           [
// //             userData.login,
// //             userData.email,
// //             userData.avatar_url,
// //             userData.bio,
// //             userData.public_repos,
// //             userData.id,
// //           ]
// //         );
// //         console.log('Updated existing user:', userId);
// //       } else {
// //         // Insert new user
// //         const [result] = await connection.execute(
// //           `INSERT INTO users 
// //            (github_id, username, email, avatar_url, bio, public_repos, created_at, updated_at) 
// //            VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
// //           [
// //             userData.id,
// //             userData.login,
// //             userData.email,
// //             userData.avatar_url,
// //             userData.bio,
// //             userData.public_repos,
// //           ]
// //         );
// //         userId = result.insertId;
// //         console.log('Created new user:', userId);
// //       }

// //       // Save/Update GitHub token
// //       const [existingToken] = await connection.execute(
// //         'SELECT id FROM github_tokens WHERE user_id = ?',
// //         [userId]
// //       );

// //       if (existingToken.length > 0) {
// //         // Update existing token
// //         await connection.execute(
// //           `UPDATE github_tokens 
// //            SET access_token = ?, token_type = ?, scope = ?, updated_at = NOW() 
// //            WHERE user_id = ?`,
// //           [data.access_token, data.token_type, data.scope, userId]
// //         );
// //         console.log('Updated GitHub token for user:', userId);
// //       } else {
// //         // Insert new token
// //         await connection.execute(
// //           `INSERT INTO github_tokens 
// //            (user_id, access_token, token_type, scope, created_at, updated_at) 
// //            VALUES (?, ?, ?, ?, NOW(), NOW())`,
// //           [userId, data.access_token, data.token_type, data.scope]
// //         );
// //         console.log('Saved new GitHub token for user:', userId);
// //       }

// //       await connection.commit();

// //       // Create JWT token with user info
// //       const jwtToken = jwt.sign(
// //         {
// //           userId: userId,
// //           githubId: userData.id,
// //           username: userData.login,
// //         },
// //         process.env.JWT_SECRET,
// //         { expiresIn: '7d' }
// //       );

// //       // Send JWT token to frontend (NOT the GitHub token)
// //       res.json({
// //         token: jwtToken,
// //         user: {
// //           id: userId,
// //           githubId: userData.id,
// //           username: userData.login,
// //           email: userData.email,
// //           avatar_url: userData.avatar_url,
// //           bio: userData.bio,
// //           public_repos: userData.public_repos,
// //         },
// //       });
// //     } catch (dbError) {
// //       await connection.rollback();
// //       throw dbError;
// //     } finally {
// //       connection.release();
// //     }
// //   } catch (error) {
// //     console.error('Error in getAccessToken:', error);
// //     res.status(500).json({ 
// //       error: 'Failed to exchange code for token',
// //       message: error.message 
// //     });
// //   }
// // };

// // // Get GitHub user data
// // exports.getUserData = async (req, res) => {
// //   try {
// //     const userId = req.userId;
// //     const connection = await pool.promise().getConnection();

// //     try {
// //       const [users] = await connection.execute(
// //         `SELECT u.*, gt.access_token 
// //          FROM users u
// //          LEFT JOIN github_tokens gt ON u.id = gt.user_id
// //          WHERE u.id = ?`,
// //         [userId]
// //       );

// //       if (users.length === 0) {
// //         return res.status(404).json({ error: 'User not found' });
// //       }

// //       const user = users[0];

// //       let githubData;

// //       // Fetch fresh data from GitHub API
// //       if (user.access_token) {
// //         const response = await fetch('https://api.github.com/user', {
// //           method: 'GET',
// //           headers: {
// //             Authorization: `Bearer ${user.access_token}`,
// //             'User-Agent': 'Electron-App',
// //           },
// //         });

// //         githubData = await response.json();
// //         console.log('Fresh GitHub user data:', githubData);
// //       } else {
// //         githubData = {
// //           login: user.username,
// //           email: user.email,
// //           avatar_url: user.avatar_url,
// //           bio: user.bio,
// //           public_repos: user.public_repos,
// //         };
// //       }

// //       // Normalize keys for frontend
// //       const normalizedData = {
// //         id: githubData.id || user.github_id,
// //         username: githubData.login,
// //         email: githubData.email,
// //         avatar_url: githubData.avatar_url,
// //         bio: githubData.bio,
// //         public_repos: githubData.public_repos ?? 0,
// //         followers: githubData.followers ?? 0,
// //         following: githubData.following ?? 0,
// //       };

// //       res.json(normalizedData);

// //     } finally {
// //       connection.release();
// //     }
// //   } catch (error) {
// //     console.error('Error fetching user data:', error);
// //     res.status(500).json({
// //       error: 'Failed to fetch user data',
// //       message: error.message,
// //     });
// //   }
// // };

// // exports.revokeGitHubToken = async (req, res) => {
// //   try {
// //     const userId = req.userId; // From authMiddleware
// //     const connection = await pool.promise().getConnection();

// //     try {
// //       // Get user's GitHub token
// //       const [tokens] = await connection.execute(
// //         'SELECT access_token FROM github_tokens WHERE user_id = ?',
// //         [userId]
// //       );

// //       let githubRevoked = false;

// //       if (tokens.length > 0 && tokens[0].access_token) {
// //         const token = tokens[0].access_token;

// //         try {
// //           // Revoke the token on GitHub using the correct API endpoint
// //           const revokeResponse = await fetch(
// //             `https://api.github.com/applications/${process.env.CLIENT_ID}/token`,
// //             {
// //               method: 'DELETE',
// //               headers: {
// //                 'Authorization': `Basic ${Buffer.from(
// //                   `${process.env.CLIENT_ID}:${process.env.GITHUB_CLIENT_SECRET}`
// //                 ).toString('base64')}`,
// //                 'Accept': 'application/vnd.github+json',
// //                 'X-GitHub-Api-Version': '2022-11-28',
// //                 'User-Agent': 'ProdCollab-App'
// //               },
// //               body: JSON.stringify({
// //                 access_token: token
// //               })
// //             }
// //           );

// //           if (revokeResponse.ok || revokeResponse.status === 204) {
// //             console.log('GitHub token revoked successfully');
// //             githubRevoked = true;
// //           } else {
// //             const errorText = await revokeResponse.text();
// //             console.warn(' Failed to revoke GitHub token:', revokeResponse.status, errorText);
// //           }
// //         } catch (revokeError) {
// //           console.error(' Error revoking GitHub token:', revokeError);
// //           // Continue even if GitHub revoke fails
// //         }
// //       }

// //       // Delete token from database regardless of GitHub API result
// //       await connection.execute(
// //         'DELETE FROM github_tokens WHERE user_id = ?',
// //         [userId]
// //       );

// //       console.log(' Token deleted from database');

// //       res.json({ 
// //         message: 'Logged out successfully',
// //         githubRevoked: githubRevoked,
// //         tokenDeleted: true
// //       });

// //     } finally {
// //       connection.release();
// //     }
// //   } catch (error) {
// //     console.error('Error in logout:', error);
// //     res.status(500).json({
// //       error: 'Logout failed',
// //       message: error.message
// //     });
// //   }
// // };


// // module.exports = {
// //   getAccessToken: exports.getAccessToken,
// //   getUserData: exports.getUserData,
// //   revokeGitHubToken: exports.revokeGitHubToken
// // };
// // controllers/authController.js
// const jwt = require('jsonwebtoken');
// const pool = require('../config/db');
// const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// exports.getAccessToken = async (req, res) => {
//   const code = req.query.code;
//   console.log('Received OAuth code:', code);

//   if (!code) {
//     return res.status(400).json({ error: 'No code provided' });
//   }

//   const params = `?client_id=${process.env.CLIENT_ID}&client_secret=${process.env.GITHUB_CLIENT_SECRET}&code=${code}`;

//   try {
//     // Exchange code for GitHub access token
//     const response = await fetch('https://github.com/login/oauth/access_token' + params, {
//       method: 'POST',
//       headers: {
//         Accept: 'application/json',
//       },
//     });

//     const data = await response.json();
//     console.log('GitHub token response:', data);

//     if (!data.access_token) {
//       return res.status(400).json({
//         error: 'Failed to get access token',
//         details: data
//       });
//     }

//     // Get GitHub user info
//     const userResponse = await fetch('https://api.github.com/user', {
//       method: 'GET',
//       headers: {
//         Authorization: `Bearer ${data.access_token}`,
//         'User-Agent': 'Electron-App',
//       },
//     });

//     const userData = await userResponse.json();
//     console.log('GitHub user data:', userData);

//     // Save/Update user and token in database
//     const connection = await pool.promise().getConnection();
//     try {
//       await connection.beginTransaction();

//       // Check if user exists
//       const [existingUser] = await connection.execute(
//         'SELECT id FROM users WHERE github_id = ?',
//         [userData.id]
//       );

//       let userId;
//       if (existingUser.length > 0) {
//         // Update existing user
//         userId = existingUser[0].id;
//         await connection.execute(
//           `UPDATE users 
//            SET username = ?, email = ?, avatar_url = ?, bio = ?, 
//                public_repos = ?, updated_at = NOW() 
//            WHERE github_id = ?`,
//           [
//             userData.login,
//             userData.email,
//             userData.avatar_url,
//             userData.bio,
//             userData.public_repos,
//             userData.id,
//           ]
//         );
//         console.log('Updated existing user:', userId);
//       } else {
//         // Insert new user
//         const [result] = await connection.execute(
//           `INSERT INTO users 
//            (github_id, username, email, avatar_url, bio, public_repos, created_at, updated_at) 
//            VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
//           [
//             userData.id,
//             userData.login,
//             userData.email,
//             userData.avatar_url,
//             userData.bio,
//             userData.public_repos,
//           ]
//         );
//         userId = result.insertId;
//         console.log('Created new user:', userId);
//       }

//       // Save/Update GitHub token
//       const [existingToken] = await connection.execute(
//         'SELECT access_token FROM github_tokens WHERE user_id = ?',
//         [userId]
//       );

//       if (existingToken.length > 0) {
//         // Compare tokens and update only if different
//         if (existingToken[0].access_token !== data.access_token) {
//           await connection.execute(
//             `UPDATE github_tokens 
//              SET access_token = ?, token_type = ?, scope = ?, updated_at = NOW() 
//              WHERE user_id = ?`,
//             [data.access_token, data.token_type, data.scope, userId]
//           );
//           console.log('Updated GitHub token (different) for user:', userId);
//         } else {
//           // Same token: just update timestamp
//           await connection.execute(
//             'UPDATE github_tokens SET updated_at = NOW() WHERE user_id = ?',
//             [userId]
//           );
//           console.log('GitHub token unchanged for user:', userId);
//         }
//       } else {
//         // Insert new token
//         await connection.execute(
//           `INSERT INTO github_tokens 
//            (user_id, access_token, token_type, scope, created_at, updated_at) 
//            VALUES (?, ?, ?, ?, NOW(), NOW())`,
//           [userId, data.access_token, data.token_type, data.scope]
//         );
//         console.log('Saved new GitHub token for user:', userId);
//       }

//       await connection.commit();

//       // Create JWT token with user info
//       const jwtToken = jwt.sign(
//         {
//           userId: userId,
//           githubId: userData.id,
//           username: userData.login,
//         },
//         process.env.JWT_SECRET,
//         { expiresIn: '7d' }
//       );

//       // Send JWT token to frontend (NOT the GitHub token)
//       res.json({
//         token: jwtToken,
//         user: {
//           id: userId,
//           githubId: userData.id,
//           username: userData.login,
//           email: userData.email,
//           avatar_url: userData.avatar_url,
//           bio: userData.bio,
//           public_repos: userData.public_repos,
//         },
//       });
//     } catch (dbError) {
//       await connection.rollback();
//       throw dbError;
//     } finally {
//       connection.release();
//     }
//   } catch (error) {
//     console.error('Error in getAccessToken:', error);
//     res.status(500).json({
//       error: 'Failed to exchange code for token',
//       message: error.message
//     });
//   }
// };

// // Get GitHub user data
// exports.getUserData = async (req, res) => {
//   try {
//     const userId = req.userId;
//     const connection = await pool.promise().getConnection();

//     try {
//       const [users] = await connection.execute(
//         `SELECT u.*, gt.access_token 
//          FROM users u 
//          LEFT JOIN github_tokens gt ON u.id = gt.user_id 
//          WHERE u.id = ?`,
//         [userId]
//       );

//       if (users.length === 0) {
//         return res.status(404).json({ error: 'User not found' });
//       }

//       const user = users[0];

//       let githubData;
//       // Fetch fresh data from GitHub API
//       if (user.access_token) {
//         const response = await fetch('https://api.github.com/user', {
//           method: 'GET',
//           headers: {
//             Authorization: `Bearer ${user.access_token}`,
//             'User-Agent': 'Electron-App',
//           },
//         });

//         githubData = await response.json();
//         console.log('Fresh GitHub user data:', githubData);
//       } else {
//         githubData = {
//           login: user.username,
//           email: user.email,
//           avatar_url: user.avatar_url,
//           bio: user.bio,
//           public_repos: user.public_repos,
//         };
//       }

//       // Normalize keys for frontend
//       const normalizedData = {
//         id: githubData.id || user.github_id,
//         username: githubData.login,
//         email: githubData.email,
//         avatar_url: githubData.avatar_url,
//         bio: githubData.bio,
//         public_repos: githubData.public_repos ?? 0,
//         followers: githubData.followers ?? 0,
//         following: githubData.following ?? 0,
//       };

//       res.json(normalizedData);

//     } finally {
//       connection.release();
//     }
//   } catch (error) {
//     console.error('Error fetching user data:', error);
//     res.status(500).json({
//       error: 'Failed to fetch user data',
//       message: error.message,
//     });
//   }
// };

// exports.revokeGitHubToken = async (req, res) => {
//   try {
//     // No longer revoke on GitHub or delete from DB.
//     // Token persists for collaborators to use via API.
//     // Client-side can handle logout (e.g., clear JWT).
//     res.json({
//       message: 'Logged out successfully'
//     });
//   } catch (error) {
//     console.error('Error in logout:', error);
//     res.status(500).json({
//       error: 'Logout failed',
//       message: error.message
//     });
//   }
// };

// module.exports = {
//   getAccessToken: exports.getAccessToken,
//   getUserData: exports.getUserData,
//   revokeGitHubToken: exports.revokeGitHubToken
// };
// controllers/authController.js
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

// Helper function to generate JWT tokens
const generateTokens = (userId, githubId, username) => {
  const accessToken = jwt.sign(
    { userId, githubId, username },
    process.env.JWT_SECRET,
    { expiresIn: '15m' } // Short-lived access token
  );

  const refreshToken = jwt.sign(
    { userId, githubId, username },
    process.env.JWT_SECRET,
    { expiresIn: '7d' } // Long-lived refresh token
  );

  return { accessToken, refreshToken };
};

exports.getAccessToken = async (req, res) => {
  const code = req.query.code;
  console.log('Received OAuth code:', code);

  if (!code) {
    return res.status(400).json({ error: 'No code provided' });
  }

  const params = `?client_id=${process.env.CLIENT_ID}&client_secret=${process.env.GITHUB_CLIENT_SECRET}&code=${code}`;

  try {
    // Exchange code for GitHub access token
    const response = await fetch('https://github.com/login/oauth/access_token' + params, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`GitHub OAuth failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    // console.log('GitHub token response:', data);

    if (!data.access_token) {
      return res.status(400).json({
        error: 'Failed to get access token',
        details: data
      });
    }

    // Get GitHub user info
    const userResponse = await fetch('https://api.github.com/user', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${data.access_token}`,
        'User-Agent': 'ProdCollab-App',
      },
    });

    if (!userResponse.ok) {
      throw new Error(`Failed to fetch GitHub user data: ${userResponse.status}`);
    }

    const userData = await userResponse.json();
    // console.log('GitHub user data:', userData);

    // Save/Update user and token in database
    const connection = await pool.promise().getConnection();
    try {
      await connection.beginTransaction();

      // Check if user exists
      const [existingUser] = await connection.execute(
        'SELECT id FROM users WHERE github_id = ?',
        [userData.id]
      );

      let userId;
      if (existingUser.length > 0) {
        // Update existing user
        userId = existingUser[0].id;
        await connection.execute(
          `UPDATE users 
           SET username = ?, email = ?, avatar_url = ?, bio = ?, 
               public_repos = ?, updated_at = NOW() 
           WHERE github_id = ?`,
          [
            userData.login,
            userData.email,
            userData.avatar_url,
            userData.bio,
            userData.public_repos,
            userData.id,
          ]
        );
        // console.log('Updated existing user:', userId);
      } else {
        // Insert new user
        const [result] = await connection.execute(
          `INSERT INTO users 
           (github_id, username, email, avatar_url, bio, public_repos, created_at, updated_at) 
           VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            userData.id,
            userData.login,
            userData.email,
            userData.avatar_url,
            userData.bio,
            userData.public_repos,
          ]
        );
        userId = result.insertId;
        // console.log('Created new user:', userId);
      }

      // Save/Update GitHub token
      const [existingToken] = await connection.execute(
        'SELECT access_token FROM github_tokens WHERE user_id = ?',
        [userId]
      );

      if (existingToken.length > 0) {
        await connection.execute(
          `UPDATE github_tokens 
           SET access_token = ?, token_type = ?, scope = ?, updated_at = NOW() 
           WHERE user_id = ?`,
          [data.access_token, data.token_type, data.scope, userId]
        );
        // console.log('Updated GitHub token for user:', userId);
      } else {
        await connection.execute(
          `INSERT INTO github_tokens 
           (user_id, access_token, token_type, scope, created_at, updated_at) 
           VALUES (?, ?, ?, ?, NOW(), NOW())`,
          [userId, data.access_token, data.token_type, data.scope]
        );
        // console.log('Saved new GitHub token for user:', userId);
      }

      await connection.commit();

      // Generate JWT tokens
      const { accessToken, refreshToken } = generateTokens(
        userId,
        userData.id,
        userData.login
      );

      // Send both tokens to frontend
      res.json({
        token: accessToken,
        refreshToken: refreshToken,
        user: {
          id: userId,
          githubId: userData.id,
          username: userData.login,
          email: userData.email,
          avatar_url: userData.avatar_url,
          bio: userData.bio,
          public_repos: userData.public_repos,
        },
      });
    } catch (dbError) {
      await connection.rollback();
      throw dbError;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error in getAccessToken:', error);
    
    // Check if it's a network error
    if (error.code === 'ENOTFOUND' || error.type === 'system') {
      return res.status(503).json({
        error: 'Network connectivity issue',
        message: 'Unable to connect to GitHub. Please check your internet connection.',
        debug: error.message
      });
    }

    res.status(500).json({
      error: 'Failed to exchange code for token',
      message: error.message
    });
  }
};

// NEW: Refresh token endpoint
exports.refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({ error: 'Refresh token is required' });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET);

    // Generate new access token
    const newAccessToken = jwt.sign(
      {
        userId: decoded.userId,
        githubId: decoded.githubId,
        username: decoded.username
      },
      process.env.JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.json({
      token: newAccessToken,
      message: 'Token refreshed successfully'
    });
  } catch (error) {
    console.error('Token refresh error:', error);

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Refresh token expired',
        message: 'Please log in again',
        requiresLogin: true
      });
    }

    res.status(401).json({
      error: 'Invalid refresh token',
      message: 'Please log in again',
      requiresLogin: true
    });
  }
};

// Get GitHub user data
exports.getUserData = async (req, res) => {
  try {
    const userId = req.userId;
    const connection = await pool.promise().getConnection();

    try {
      const [users] = await connection.execute(
        `SELECT u.*, gt.access_token 
         FROM users u 
         LEFT JOIN github_tokens gt ON u.id = gt.user_id 
         WHERE u.id = ?`,
        [userId]
      );

      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = users[0];

      let githubData;
      // Fetch fresh data from GitHub API
      if (user.access_token) {
        try {
          const response = await fetch('https://api.github.com/user', {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${user.access_token}`,
              'User-Agent': 'ProdCollab-App',
            },
          });

          if (response.ok) {
            githubData = await response.json();
            console.log('Fresh GitHub user data:', githubData);
          } else {
            throw new Error('GitHub API request failed');
          }
        } catch (fetchError) {
          console.warn('Failed to fetch fresh GitHub data, using cached:', fetchError.message);
          // Fallback to cached data
          githubData = {
            login: user.username,
            email: user.email,
            avatar_url: user.avatar_url,
            bio: user.bio,
            public_repos: user.public_repos,
          };
        }
      } else {
        githubData = {
          login: user.username,
          email: user.email,
          avatar_url: user.avatar_url,
          bio: user.bio,
          public_repos: user.public_repos,
        };
      }

      // Normalize keys for frontend
      const normalizedData = {
        id: githubData.id || user.github_id,
        username: githubData.login,
        email: githubData.email,
        avatar_url: githubData.avatar_url,
        bio: githubData.bio,
        public_repos: githubData.public_repos ?? 0,
        followers: githubData.followers ?? 0,
        following: githubData.following ?? 0,
      };

      res.json(normalizedData);

    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({
      error: 'Failed to fetch user data',
      message: error.message,
    });
  }
};

exports.revokeGitHubToken = async (req, res) => {
  try {
    // Just acknowledge logout - token persists for collaborators
    res.json({
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Error in logout:', error);
    res.status(500).json({
      error: 'Logout failed',
      message: error.message
    });
  }
};

module.exports = {
  getAccessToken: exports.getAccessToken,
  refreshToken: exports.refreshToken,
  getUserData: exports.getUserData,
  revokeGitHubToken: exports.revokeGitHubToken
};