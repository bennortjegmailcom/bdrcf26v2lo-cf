
import React, { useState, useMemo } from 'react';
import { Artisan } from '../types';

interface ArtisanManagementTableProps {
    artisans: Artisan[];
    onEdit: (artisan: Artisan) => void;
    onDelete: (artisanId: string) => void;
}

type SortField = 'name' | 'responsibility' | 'shift' | 'employeeNumber' | null;
type SortDirection = 'asc' | 'desc';

const ArtisanManagementTable: React.FC<ArtisanManagementTableProps> = ({ artisans, onEdit, onDelete }) => {
    const [sortField, setSortField] = useState<SortField>('name'); // Default sort by name
    const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    const sortedArtisans = useMemo(() => {
        if (!sortField) return artisans;

        return [...artisans].sort((a, b) => {
            const aValue = String(a[sortField as keyof Artisan] || '').toLowerCase();
            const bValue = String(b[sortField as keyof Artisan] || '').toLowerCase();

            if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    }, [artisans, sortField, sortDirection]);

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return null;
        return (
            <span className="ml-1 text-blue-400">
                {sortDirection === 'asc' ? '↑' : '↓'}
            </span>
        );
    };

    return (
        <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden border border-gray-700">
            <div className="overflow-x-auto">
                <table className="min-w-full text-sm text-left text-gray-300">
                    <thead className="bg-gray-700 text-xs text-gray-300 uppercase tracking-wider">
                        <tr>
                            <th 
                                scope="col" 
                                className="px-4 py-3 cursor-pointer hover:bg-gray-600 transition-colors select-none"
                                onClick={() => handleSort('name')}
                            >
                                <div className="flex items-center">
                                    Name
                                    <SortIcon field="name" />
                                </div>
                            </th>
                            <th 
                                scope="col" 
                                className="px-4 py-3 cursor-pointer hover:bg-gray-600 transition-colors select-none"
                                onClick={() => handleSort('employeeNumber')}
                            >
                                <div className="flex items-center">
                                    Employee #
                                    <SortIcon field="employeeNumber" />
                                </div>
                            </th>
                            <th 
                                scope="col" 
                                className="px-4 py-3 cursor-pointer hover:bg-gray-600 transition-colors select-none"
                                onClick={() => handleSort('responsibility')}
                            >
                                <div className="flex items-center">
                                    Responsibility / Trade
                                    <SortIcon field="responsibility" />
                                </div>
                            </th>
                            <th 
                                scope="col" 
                                className="px-4 py-3 cursor-pointer hover:bg-gray-600 transition-colors select-none"
                                onClick={() => handleSort('shift')}
                            >
                                <div className="flex items-center">
                                    Shift
                                    <SortIcon field="shift" />
                                </div>
                            </th>
                            <th scope="col" className="px-4 py-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {sortedArtisans.length > 0 ? (
                            sortedArtisans.map((artisan) => (
                                <tr key={artisan.id} className="hover:bg-gray-700/50 transition-colors">
                                    <td className="px-4 py-3 font-medium text-white">{artisan.name}</td>
                                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">{artisan.employeeNumber || '-'}</td>
                                    <td className="px-4 py-3">
                                        <span className="bg-gray-900/50 px-2 py-1 rounded text-xs border border-gray-700">
                                            {artisan.responsibility}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold text-xs shadow-sm ${
                                            artisan.shift === 'A' ? 'bg-blue-600 text-white' :
                                            artisan.shift === 'B' ? 'bg-green-600 text-white' :
                                            artisan.shift === 'C' ? 'bg-purple-600 text-white' :
                                            'bg-yellow-600 text-gray-900'
                                        }`}>
                                            {artisan.shift}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex space-x-4">
                                            <button 
                                                onClick={() => onEdit(artisan)} 
                                                className="text-blue-400 hover:text-blue-300 font-semibold transition-colors flex items-center"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                </svg>
                                                Edit
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    if (window.confirm(`Are you sure you want to delete artisan ${artisan.name}?`)) {
                                                        onDelete(artisan.id);
                                                    }
                                                }} 
                                                className="text-red-500 hover:text-red-400 font-semibold transition-colors flex items-center"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                </svg>
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={5} className="px-4 py-10 text-center text-gray-500 italic">
                                    No artisans found. Click "New Artisan" to get started.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default ArtisanManagementTable;
