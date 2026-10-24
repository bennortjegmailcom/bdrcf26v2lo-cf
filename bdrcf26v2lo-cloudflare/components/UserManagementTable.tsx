
import React, { useState, useMemo } from 'react';
import { User, Role } from '../types';
import { getUserDiscipline } from '../utils';

interface UserManagementTableProps {
    users: User[];
    onEdit: (user: User) => void;
    onDelete: (userId: string) => void;
    currentUser: User;
    restricted?: boolean;
    onResetPassword?: (user: User) => void;
}

type SortField = 'name' | 'username' | 'role' | 'workGroup' | 'shift';

const UserManagementTable: React.FC<UserManagementTableProps> = ({ users, onEdit, onDelete, currentUser, restricted = false, onResetPassword }) => {
    const [sortField, setSortField] = useState<SortField>('name');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [searchQuery, setSearchQuery] = useState('');

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const filteredUsers = useMemo(() => {
        if (!searchQuery.trim()) return users;
        const terms = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
        return users.filter(user => {
            return terms.every(term => {
                return (
                    user.name?.toLowerCase().includes(term) ||
                    user.username?.toLowerCase().includes(term) ||
                    user.email?.toLowerCase().includes(term) ||
                    user.role?.toLowerCase().includes(term) ||
                    user.workGroup?.toLowerCase().includes(term) ||
                    user.discipline?.toLowerCase().includes(term) ||
                    user.employeeNumber?.toLowerCase().includes(term) ||
                    user.shift?.toLowerCase().includes(term)
                );
            });
        });
    }, [users, searchQuery]);

    const sortedUsers = useMemo(() => {
        return [...filteredUsers].sort((a, b) => {
            let aVal = '';
            let bVal = '';

            if (sortField === 'name') {
                aVal = a.name || '';
                bVal = b.name || '';
            } else if (sortField === 'username') {
                aVal = a.username || a.email || a.name || '';
                bVal = b.username || b.email || b.name || '';
            } else if (sortField === 'role') {
                aVal = a.role || '';
                bVal = b.role || '';
            } else if (sortField === 'workGroup') {
                aVal = a.workGroup || '';
                bVal = b.workGroup || '';
            } else if (sortField === 'shift') {
                aVal = a.shift || '';
                bVal = b.shift || '';
            }

            return sortDirection === 'asc'
                ? aVal.localeCompare(bVal, undefined, { sensitivity: 'base', numeric: true })
                : bVal.localeCompare(aVal, undefined, { sensitivity: 'base', numeric: true });
        });
    }, [filteredUsers, sortField, sortDirection]);

    return (
        <div className="flex flex-col space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                <div className="relative w-full sm:w-80">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <svg className="h-4 w-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Search by name, role, area, shift..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-8 py-1.5 bg-gray-900 border border-gray-700 rounded-md text-sm text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-white transition-colors"
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
                <div className="text-xs text-gray-400 bg-gray-900/40 px-3 py-1.5 rounded-lg border border-gray-700/50">
                    Showing <span className="text-blue-400 font-bold">{filteredUsers.length}</span> of <span className="text-white font-bold">{users.length}</span> Users
                </div>
            </div>

            <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700">
                <div className="overflow-x-auto">
                    <table className="min-w-full text-sm text-left text-gray-300">
                        <thead className="bg-gray-700 text-xs text-gray-300 uppercase tracking-wider select-none">
                            <tr>
                                <th scope="col" className="px-4 py-3 cursor-pointer hover:bg-gray-650 transition-colors" onClick={() => handleSort('name')}>
                                    <div className="flex items-center gap-1">
                                        Name
                                        <span className="text-[10px] text-gray-400 inline-block w-3 text-center">
                                            {sortField === 'name' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                                        </span>
                                    </div>
                                </th>
                                <th scope="col" className="px-4 py-3 cursor-pointer hover:bg-gray-650 transition-colors" onClick={() => handleSort('username')}>
                                    <div className="flex items-center gap-1">
                                        Email / Username
                                        <span className="text-[10px] text-gray-400 inline-block w-3 text-center">
                                            {sortField === 'username' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                                        </span>
                                    </div>
                                </th>
                                <th scope="col" className="px-4 py-3 cursor-pointer hover:bg-gray-650 transition-colors" onClick={() => handleSort('role')}>
                                    <div className="flex items-center gap-1">
                                        Role
                                        <span className="text-[10px] text-gray-400 inline-block w-3 text-center">
                                            {sortField === 'role' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                                        </span>
                                    </div>
                                </th>
                                <th scope="col" className="px-4 py-3 cursor-pointer hover:bg-gray-650 transition-colors" onClick={() => handleSort('workGroup')}>
                                    <div className="flex items-center gap-1">
                                        Area
                                        <span className="text-[10px] text-gray-400 inline-block w-3 text-center">
                                            {sortField === 'workGroup' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                                        </span>
                                    </div>
                                </th>
                                <th scope="col" className="px-4 py-3">Emp No</th>
                                <th scope="col" className="px-4 py-3 cursor-pointer hover:bg-gray-650 transition-colors" onClick={() => handleSort('shift')}>
                                    <div className="flex items-center gap-1">
                                        Shift
                                        <span className="text-[10px] text-gray-400 inline-block w-3 text-center">
                                            {sortField === 'shift' ? (sortDirection === 'asc' ? '▲' : '▼') : '↕'}
                                        </span>
                                    </div>
                                </th>
                                <th scope="col" className="px-4 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {sortedUsers.length > 0 ? (
                                sortedUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-700/50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-white">{user.name}</td>
                                        <td className="px-4 py-3 text-gray-400 font-mono text-xs">{user.email || user.username || '-'}</td>
                                        <td className="px-4 py-3 text-white">
                                            <div className="flex flex-col">
                                                <span className="font-semibold">{user.role}</span>
                                                {(user.discipline || getUserDiscipline(user)) && (
                                                    <span className="text-[9px] bg-purple-900/40 text-purple-300 border border-purple-800/40 px-1 py-0.5 rounded w-fit mt-0.5 font-bold uppercase tracking-wider">
                                                        {user.discipline || getUserDiscipline(user)}
                                                    </span>
                                                )}
                                                {user.roles && user.roles.length > 1 && (
                                                    <span className="text-[9px] text-blue-400/70 font-bold uppercase tracking-tighter mt-0.5">
                                                        Alt: {user.roles.filter(r => r !== user.role).join(', ')}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-300">{user.workGroup || '-'}</td>
                                        <td className="px-4 py-3 font-mono text-gray-400">{user.employeeNumber || '-'}</td>
                                        <td className="px-4 py-3 text-blue-400 font-bold">{user.shift || '-'}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex space-x-4">
                                                {restricted ? (
                                                    <button onClick={() => onResetPassword?.(user)} className="text-amber-400 hover:text-amber-300 font-semibold transition-colors">
                                                        Reset Password
                                                    </button>
                                                ) : (
                                                    <>
                                                        <button onClick={() => onEdit(user)} className="text-blue-400 hover:text-blue-300 font-semibold transition-colors">Edit</button>
                                                        {user.id !== currentUser.id && (
                                                            <button onClick={() => {
                                                                if (window.confirm(`Are you sure you want to delete user ${user.name}?`)) {
                                                                    onDelete(user.id);
                                                                }
                                                            }} className="text-red-500 hover:text-red-400 font-semibold transition-colors">Delete</button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                                        <div className="flex flex-col items-center justify-center space-y-2">
                                            <svg className="h-8 w-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                            </svg>
                                            <p className="font-semibold text-sm text-gray-300">No matching users found</p>
                                            <p className="text-xs text-gray-500">Try checking your spelling or search terms.</p>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default UserManagementTable;
