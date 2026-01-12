// // components/StatsCard.jsx
// import React from 'react';

// function StatsCard({ icon, title, value, color = 'blue' }) {
//   const colorClasses = {
//     blue: 'from-blue-500 to-blue-600',
//     purple: 'from-purple-500 to-purple-600',
//     green: 'from-green-500 to-green-600',
//     pink: 'from-pink-500 to-pink-600',
//     yellow: 'from-yellow-500 to-yellow-600',
//     red: 'from-red-500 to-red-600',
//   };

//   return (
//     <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 hover:border-gray-600 transition-colors">
//       <div className="flex items-center justify-between mb-4">
//         <div className={`w-12 h-12 bg-gradient-to-br ${colorClasses[color]} rounded-lg flex items-center justify-center text-white`}>
//           {icon}
//         </div>
//       </div>
//       <h3 className="text-gray-400 text-sm font-medium mb-1">{title}</h3>
//       <p className="text-3xl font-bold text-white">
//   {typeof value === 'number' ? value.toLocaleString() : '0'}
// </p>

//     </div>
//   );
// }

// export default StatsCard;
import React from 'react';

function StatsCard({ icon, title, value, color = 'primary' }) {
  const colorStyles = {
    primary: 'from-primary/20 to-primary/5 text-primary border-primary/20',
    secondary: 'from-secondary/20 to-secondary/5 text-secondary border-secondary/20',
  };

  return (
    <div className="group glass rounded-2xl p-6 border border-border hover:border-primary/30 transition-all duration-300 hover:scale-[1.02]">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colorStyles[color]} flex items-center justify-center transition-transform duration-300 group-hover:scale-110`}>
          {icon}
        </div>
        <div className="w-2 h-2 rounded-full bg-primary/50 animate-pulse"></div>
      </div>
      <p className="text-muted-foreground text-sm font-medium mb-1 uppercase tracking-wider">{title}</p>
      <p className="text-4xl font-bold text-foreground tracking-tight">
        {typeof value === 'number' ? value.toLocaleString() : '0'}
      </p>
    </div>
  );
}

export default StatsCard;