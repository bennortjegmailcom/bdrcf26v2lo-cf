
import React from 'react';
import { Status } from '../../types';

interface BadgeProps {
  status: Status;
}

const statusColors: Record<Status, string> = {
  [Status.DRAFT]: 'bg-amber-500 text-gray-950 font-bold border border-amber-400',
  [Status.ACTIVE]: 'bg-red-500 text-white',
  [Status.ASSIGNED]: 'bg-yellow-500 text-gray-900',
  [Status.RESOLVED]: 'bg-blue-500 text-white',
  [Status.COMPLETED]: 'bg-green-500 text-white',
};

const Badge: React.FC<BadgeProps> = ({ status }) => {
  return (
    <span
      className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[status]}`}
    >
      {status}
    </span>
  );
};

export default Badge;
   