import React from 'react';

export default function AudioAlert({ alert }) {
  if (!alert) return null;
  return (
    <div className="bg-red-100 text-red-700 p-2 rounded shadow text-sm fixed top-4 right-4 z-50 animate-pulse">
      {alert.message}
    </div>
  );
} 