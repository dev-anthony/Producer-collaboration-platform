
// import React from 'react';

// function LoginPage({ clientId }) {
//   const loginWithGithub = () => {
//     const redirectUri = 'http://localhost:3000';
//     const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user repo`;
    
//     console.log('🔐 Redirecting to GitHub OAuth...');
//     window.location.href = authUrl;
//   };

//   return (
//     <div className='bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 min-h-screen flex items-center justify-center p-4'>
//       <div className="max-w-md w-full">
//         {/* Logo/Brand Section */}
//         <div className="text-center mb-8">
//           <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-600 rounded-full mb-4">
//             <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
//               <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
//             </svg>
//           </div>
//           <h1 className="text-4xl font-bold text-white mb-2">ProdCollab</h1>
//           <p className="text-gray-400">Collaborate seamlessly with your team</p>
//         </div>

//         {/* Login Card */}
//         <div className="bg-gray-800 bg-opacity-50 backdrop-blur-lg rounded-2xl shadow-2xl p-8 border border-gray-700">
//           <h2 className="text-2xl font-semibold text-white mb-6 text-center">
//             Welcome Back
//           </h2>
          
//           <p className="text-gray-400 text-center mb-8">
//             Sign in with your GitHub account to continue collaborating on your projects
//           </p>

//           {/* GitHub Login Button */}
//           <button 
//             onClick={loginWithGithub}
//             className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 transform hover:scale-105 flex items-center justify-center gap-3 shadow-lg"
//           >
//             <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
//               <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
//             </svg>
//             Continue with GitHub
//           </button>

//           {/* Features */}
//           <div className="mt-8 space-y-3">
//             <div className="flex items-center gap-3 text-gray-400 text-sm">
//               <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
//               </svg>
//               <span>Secure authentication with GitHub OAuth</span>
//             </div>
//             <div className="flex items-center gap-3 text-gray-400 text-sm">
//               <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
//               </svg>
//               <span>Access your repositories and projects</span>
//             </div>
//             <div className="flex items-center gap-3 text-gray-400 text-sm">
//               <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"/>
//               </svg>
//               <span>Collaborate with your team in real-time</span>
//             </div>
//           </div>
//         </div>

//         {/* Footer */}
//         <p className="text-center text-gray-500 text-sm mt-6">
//           By signing in, you agree to our Terms of Service and Privacy Policy
//         </p>
//       </div>
//     </div>
//   );
// }

// export default LoginPage;


//ui redesign
import React from 'react';

function LoginPage({ clientId }) {
  const loginWithGithub = () => {
    const redirectUri = 'http://localhost:3000';
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=user repo`;
    
    console.log('🔐 Redirecting to GitHub OAuth...');
    window.location.href = authUrl;
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-4">
      {/* Animated background grid */}
      <div className="absolute inset-0 bg-grid-pattern bg-[size:50px_50px] opacity-30"></div>
      
      {/* Gradient orbs */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      
      <div className="relative z-10 max-w-md w-full animate-fade-in">
        {/* Logo Section */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/60 mb-6 glow-primary">
            <svg className="w-10 h-10 text-primary-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18V5l12-2v13" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="6" cy="18" r="3"/>
              <circle cx="18" cy="16" r="3"/>
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight">ProdCollab</h1>
          <p className="text-muted-foreground text-lg">Where producers create together</p>
        </div>

        {/* Login Card */}
        <div className="glass-strong rounded-3xl p-8 shadow-2xl">
          <h2 className="text-2xl font-semibold text-foreground mb-2 text-center">
            Welcome Back
          </h2>
          <p className="text-muted-foreground text-center mb-8">
            Sign in to access your studio workspace
          </p>

          {/* GitHub Login Button */}
          <button 
            onClick={loginWithGithub}
            className="group w-full relative overflow-hidden rounded-xl py-4 px-6 font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
          >
            {/* Button gradient background */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary to-primary opacity-100 group-hover:opacity-90 transition-opacity"></div>
            
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000"></div>
            
            <span className="relative flex items-center justify-center gap-3 text-primary-foreground">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              Continue with GitHub
            </span>
          </button>

          {/* Features */}
          <div className="mt-10 space-y-4">
            {[
              { icon: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z', text: 'Secure GitHub OAuth authentication' },
              { icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10', text: 'Access your project repositories' },
              { icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z', text: 'Real-time collaboration with your team' }
            ].map((feature, i) => (
              <div key={i} className="flex items-center gap-4 text-muted-foreground group hover:text-foreground transition-colors duration-200">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={feature.icon}/>
                  </svg>
                </div>
                <span className="text-sm">{feature.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-muted-foreground/60 text-sm mt-8">
          By signing in, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}

export default LoginPage;




// import React from 'react';
// import { Github } from 'lucide-react';

// function Login({ clientId }) {
//   const handleGitHubLogin = () => {
//     // IMPORTANT: Add these parameters to force re-authentication
//     const params = new URLSearchParams({
//       client_id: clientId,
//       redirect_uri: window.location.origin, // Your app URL
//       scope: 'read:user user:email repo', // Permissions needed
//       // THESE ARE THE KEY PARAMETERS:
//       prompt: 'login', // Force login screen
//       allow_signup: 'true'
//     });

//     // Redirect to GitHub OAuth with forced login
//     window.location.href = `https://github.com/login/oauth/authorize?${params.toString()}`;
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 flex items-center justify-center p-4">
//       <div className="max-w-md w-full">
//         {/* Logo/Header */}
//         <div className="text-center mb-8">
//           <div className="inline-flex items-center justify-center w-20 h-20 bg-purple-600 rounded-full mb-4">
//             <Github className="w-12 h-12 text-white" />
//           </div>
//           <h1 className="text-4xl font-bold text-white mb-2">GitSyncr</h1>
//           <p className="text-gray-400">Collaborate on music production with GitHub</p>
//         </div>

//         {/* Login Card */}
//         <div className="bg-gray-800 rounded-xl shadow-2xl p-8 border border-gray-700">
//           <h2 className="text-2xl font-bold text-white mb-2 text-center">Welcome Back</h2>
//           <p className="text-gray-400 text-center mb-6">Sign in to continue</p>

//           {/* GitHub Login Button */}
//           <button
//             onClick={handleGitHubLogin}
//             className="w-full bg-gray-900 hover:bg-gray-950 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-3 transition-all border border-gray-700 hover:border-purple-500"
//           >
//             <Github className="w-6 h-6" />
//             Sign in with GitHub
//           </button>

//           {/* Info */}
//           <div className="mt-6 text-center">
//             <p className="text-xs text-gray-500">
//               By signing in, you agree to our Terms of Service and Privacy Policy
//             </p>
//           </div>
//         </div>

//         {/* Features */}
//         <div className="mt-8 text-center space-y-2">
//           <p className="text-gray-400 text-sm">✨ Version Control for Audio Files</p>
//           <p className="text-gray-400 text-sm">🤝 Real-time Collaboration</p>
//           <p className="text-gray-400 text-sm">🔒 Secure GitHub Integration</p>
//         </div>
//       </div>
//     </div>
//   );
// }

// export default Login;