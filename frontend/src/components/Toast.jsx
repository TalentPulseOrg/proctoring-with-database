import React from 'react';

export const Toast = ({ message, type = 'info', onClose }) => {
  const getTypeStyles = () => {
    switch (type) {
      case 'error':
        return 'bg-red-500 text-white';
      case 'warning':
        return 'bg-amber-500 text-white';
      case 'success':
        return 'bg-green-500 text-white';
      case 'info':
      default:
        return 'bg-blue-500 text-white';
    }
  };
  
  return (
    <div className={`flex items-center justify-between px-4 py-3 rounded-md shadow-md ${getTypeStyles()}`}>
      <span>{message}</span>
      <button
        onClick={onClose}
        className="ml-3 text-white hover:text-gray-100"
        aria-label="Close"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
  );
};

export const ToastContainer = ({ children }) => {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col space-y-2 max-w-md">
      {children}
    </div>
  );
}; 