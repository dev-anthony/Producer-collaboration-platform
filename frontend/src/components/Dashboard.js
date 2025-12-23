// src/components/Dashboard.js
import React from 'react';
import useAuth from '../hooks/useAuth';

export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Dashboard</h1>
        <div className="user-info">
          <span>Welcome, <strong>{user?.username}</strong></span>
          <button onClick={logout} className="logout-btn">
            Logout
          </button>
        </div>
      </header>

      <main className="dashboard-main">
        <div className="welcome-card">
          <h2>Hello, {user?.username}!</h2>
          <p>You have successfully logged in with GitHub OAuth.</p>
          <p>This is your secure dashboard.</p>
        </div>
      </main>
    </div>
  );
}