
import React, { useState } from 'react';
import { WorkGroup, User } from '../types';
import { getSectionColor } from '../constants';

interface WorkGroupManagementTableProps {
    workGroups: WorkGroup[];
    users: User[];
    onEdit: (workGroup: WorkGroup) => void;
    onDelete: (workGroupId: string) => void;
}

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!text) return;

    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => console.error('Failed to copy:', err));
  };

  return (
    <button
      onClick={handleCopy}
      className="ml-2 p-0.5 text-gray-400 hover:text-white hover:bg-gray-600 rounded transition-colors focus:outline-none"
      title="Copy to clipboard"
    >
      {copied ? (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-green-500" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
        </svg>
      )}
    </button>
  );
};

const WorkGroupManagementTable: React.FC<WorkGroupManagementTableProps> = ({ workGroups, users, onEdit, onDelete }) => {
    return (
        <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left text-gray-300">
                    <thead className="bg-gray-700 text-xs text-gray-300 uppercase tracking-wider">
                        <tr>
                            <th scope="col" className="px-4 py-3">Work Group Name</th>
                            <th scope="col" className="px-4 py-3">Members</th>
                            <th scope="col" className="px-4 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {[...workGroups].sort((a,b) => a.name.localeCompare(b.name)).map((wg, i) => {
                            const groupUsers = users.filter(u => u.workGroup === wg.name).sort((a,b) => a.name.localeCompare(b.name));
                            return (
                                <tr key={`${wg.id}-${i}`} className="hover:bg-gray-700/50">
                                    <td className="px-4 py-3 font-medium text-white align-top">
                                        <span className="inline-flex items-center gap-2">
                                            <span
                                                className="h-3 w-3 rounded-full border border-white/30 shrink-0"
                                                style={{ backgroundColor: getSectionColor(wg.name, wg.color) }}
                                            />
                                            {wg.name}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 align-top">
                                        {groupUsers.length > 0 ? (
                                            <div className="flex flex-col space-y-2">
                                                {groupUsers.map(user => (
                                                    <div key={user.id} className="text-sm bg-gray-900/30 p-2 rounded border border-gray-700/50">
                                                        <div className="flex items-center">
                                                            <span className="text-white font-medium">{user.name}</span>
                                                            <CopyButton text={user.name} />
                                                        </div>
                                                        {user.employeeNumber && (
                                                            <div className="flex items-center text-gray-400 text-xs mt-1">
                                                                <span className="mr-1">Emp#: {user.employeeNumber}</span>
                                                                <CopyButton text={user.employeeNumber} />
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-gray-500 italic text-xs">No members</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 align-top">
                                        <div className="flex space-x-4">
                                            <button onClick={() => onEdit(wg)} className="text-blue-400 hover:text-blue-300 font-semibold">Edit</button>
                                            <button onClick={() => {
                                                if (window.confirm(`Are you sure you want to delete work group "${wg.name}"? This cannot be undone.`)) {
                                                    onDelete(wg.id);
                                                }
                                            }} className="text-red-500 hover:text-red-400 font-semibold">Delete</button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default WorkGroupManagementTable;
