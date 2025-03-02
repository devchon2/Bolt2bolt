import React from 'react';

interface IconButtonProps {
  icon: string;
  onClick?: () => void;
  className?: string;
  title?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({ icon, onClick, className = '', title }) => {
  return (
    <button
      className={`p-2 hover:bg-bolt-elements-background-depth-3 rounded-lg ${className}`}
      onClick={onClick}
      title={title}
    >
      <div className={`${icon} w-4 h-4`} />
    </button>
  );
};