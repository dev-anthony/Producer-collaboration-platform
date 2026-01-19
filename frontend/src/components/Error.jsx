import React, { useEffect, useState } from 'react';

const Error = ({ errorMessage }) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (errorMessage) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  if (!visible || !errorMessage) return null;

  return (
    <div style={{
      position: 'fixed',
      backgroundColor: '#f44336',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      padding: '16px',
      borderRadius: '4px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
      zIndex: 1000,
    }}>
      {errorMessage}
    </div>
  );
};

export default Error;