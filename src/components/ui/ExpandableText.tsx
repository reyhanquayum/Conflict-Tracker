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
    return <p className="mt-1 text-zinc-400 whitespace-pre-wrap break-words">{text}</p>;
  }

  return (
    <div className="mt-1 text-zinc-400">
      <p className="whitespace-pre-wrap break-words">
        {isExpanded ? text : `${text.substring(0, maxLength)}...`}
      </p>
      <span 
        onClick={toggleExpanded} 
        className="text-amber-500 hover:text-amber-400 hover:underline text-xs mt-1 cursor-pointer"
      >
        {isExpanded ? 'Read Less' : 'Read More'}
      </span>
    </div>
  );
};

export default ExpandableText;
