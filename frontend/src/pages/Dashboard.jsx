import React from 'react';

function Dashboard({ user, onLogout }) {
  return (
    <div className='min-h-screen bg-gray-900 text-white'>
      <div className='max-w-7xl mx-auto px-4 py-8'>
        {/* Header */}
        <div className='flex justify-between items-center mb-8 pb-4 border-b border-gray-700'>
          <h1 className='text-3xl font-bold'>Dashboard</h1>
          <button 
            onClick={onLogout}
            className='bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors'
          >
            Logout
          </button>
        </div>

        {/* User Info Card */}
        <div className='bg-gray-800 rounded-lg p-6 shadow-xl'>
          <div className='flex items-center gap-6'>
            <img 
              src={user.avatarUrl} 
              alt={user.username}
              className='w-24 h-24 rounded-full border-4 border-purple-500'
            />
            <div>
              <h2 className='text-2xl font-bold mb-2'>Welcome back, {user.username}!</h2>
              <p className='text-gray-400'>User ID: {user.id}</p>
              <p className='text-gray-400'>GitHub ID: {user.githubId}</p>
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className='mt-8 grid grid-cols-1 md:grid-cols-3 gap-6'>
          <div className='bg-gray-800 rounded-lg p-6'>
            <h3 className='text-xl font-semibold mb-2'>Projects</h3>
            <p className='text-gray-400'>Your projects will appear here</p>
          </div>
          <div className='bg-gray-800 rounded-lg p-6'>
            <h3 className='text-xl font-semibold mb-2'>Activity</h3>
            <p className='text-gray-400'>Recent activity</p>
          </div>
          <div className='bg-gray-800 rounded-lg p-6'>
            <h3 className='text-xl font-semibold mb-2'>Settings</h3>
            <p className='text-gray-400'>Manage your account</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;