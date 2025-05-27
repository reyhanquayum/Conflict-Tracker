import React, { useState } from 'react';

interface ExpandableTextProps {
  text: string;
  maxLength?: number;
}

const ExpandableText: React.FC<ExpandableTextProps> = ({ text, maxLength = 100 }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!text) {
    return null;
  }

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  if (text.length <= maxLength) {
    return <p className="mt-1 text-slate-400 whitespace-pre-wrap break-words">{text}</p>;
  }

  return (
    <div className="mt-1 text-slate-400">
      <p className="whitespace-pre-wrap break-words">
        {isExpanded ? text : `${text.substring(0, maxLength)}...`}
      </p>
      <button 
        onClick={toggleExpanded} 
        className="text-sky-400 hover:text-sky-300 text-xs mt-1"
      >
        {isExpanded ? 'Read Less' : 'Read More'}
      </button>
    </div>
  );
};

export default ExpandableText;
