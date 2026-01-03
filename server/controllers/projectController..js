const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));
//send a post request here on the backend to gihub api to create a rrepop fpr that particular user
//cpmtaining you token

exports.createProjectRepo = async (req, res) =>{
   try {
    const body = req.body
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

      
      if (user.access_token) {
        const response = await fetch('https://api.github.com/createRepo', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${user.access_token}`,
            'User-Agent': 'Electron-App',
          },
          body: body
        });

        githubData = await response.json();
        console.log('Fresh GitHub user data:', githubData);
      }} finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({
      error: 'Failed to fetch user data',
      message: error.message,
    });
  }
}