import React, { useState, useMemo } from 'react';
import Modal from '../ui/Modal';
import { Operator, Shift, WorkGroup, User } from '../../types';
import CreateOperatorModal from './CreateOperatorModal';
import EditOperatorModal from './EditOperatorModal';
import BulkUploadModal from './BulkUploadModal';

interface ManageOperatorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  operators: Operator[];
  addOperator: (name: string, shift: Shift, workGroup?: string, employeeNumber?: string) => void;
  updateOperator: (id: string, updates: Partial<Operator>) => void;
  deleteOperator: (id: string) => void;
  workGroups?: WorkGroup[];
  user?: User;
  onBulkUpload?: (type: 'users' | 'artisans' | 'operators', data: any[]) => Promise<void>;
}

type SortField = 'name' | 'employeeNumber' | 'workGroup' | 'shift';

const ManageOperatorsModal: React.FC<ManageOperatorsModalProps> = ({ isOpen, onClose, operators, addOperator, updateOperator, deleteOperator, workGroups = [], user, onBulkUpload }) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isBulkUploadOpen, setIsBulkUploadOpen] = useState(false);
  const [operatorToEdit, setOperatorToEdit] = useState<Operator | null>(null);
  
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleEdit = (op: Operator) => {
    setOperatorToEdit(op);
    setIsEditOpen(true);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedOperators = useMemo(() => {
    return [...operators].sort((a, b) => {
      let aVal = a[sortField] || '';
      let bVal = b[sortField] || '';
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
      }
      return 0;
    });
  }, [operators, sortField, sortDirection]);

  const exportTeamCSV = () => {
    if (!sortedOperators || sortedOperators.length === 0) {
      alert("No team members to export.");
      return;
    }
    const headers = ["Name", "Area", "Shift", "Employee Number"];
    const rows = sortedOperators.map(op => [
      `"${(op.name || '').replace(/"/g, '""')}"`,
      `"${(op.workGroup || '').replace(/"/g, '""')}"`,
      `"${(op.shift || '').replace(/"/g, '""')}"`,
      `"${(op.employeeNumber || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "\uFEFF" 
      + headers.join(",") + "\n" 
      + rows.map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `team_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Manage Team">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-white">Team Members</h3>
              <div className="flex space-x-2">
                <button 
                  onClick={exportTeamCSV}
                  className="bg-gray-700 hover:bg-gray-600 text-white px-3 py-1 rounded shadow text-sm font-bold flex items-center"
                  title="Download team list as CSV"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Export CSV
                </button>
                {onBulkUpload && (
                  <button 
                    onClick={() => setIsBulkUploadOpen(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded shadow text-sm font-bold flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    Upload Multiple
                  </button>
                )}
                <button 
                  onClick={() => setIsCreateOpen(true)} 
                  className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded shadow text-sm font-bold"
                >
                    + Add Team Member
                </button>
              </div>
          </div>
          <div className="bg-gray-800 rounded shadow max-h-[60vh] overflow-y-auto">
            <table className="min-w-full text-sm text-left text-gray-300">
              <thead className="bg-gray-700 text-xs text-gray-300 uppercase sticky top-0">
                <tr>
                  <th className="px-4 py-2 cursor-pointer hover:bg-gray-600" onClick={() => handleSort('name')}>
                    Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-2 cursor-pointer hover:bg-gray-600" onClick={() => handleSort('employeeNumber')}>
                    Emp # {sortField === 'employeeNumber' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-2 cursor-pointer hover:bg-gray-600" onClick={() => handleSort('workGroup')}>
                    Area {sortField === 'workGroup' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-2 text-blue-400 cursor-pointer hover:bg-gray-600" onClick={() => handleSort('shift')}>
                    Shift {sortField === 'shift' && (sortDirection === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-4 py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {sortedOperators.map(op => (
                  <tr key={op.id} className="hover:bg-gray-700/50">
                    <td className="px-4 py-2 font-medium text-white">{op.name}</td>
                    <td className="px-4 py-2 text-gray-500 font-mono text-[10px]">{op.employeeNumber || 'N/A'}</td>
                    <td className="px-4 py-2 text-gray-400">{op.workGroup || '-'}</td>
                    <td className="px-4 py-2 font-bold text-blue-400">Shift {op.shift}</td>
                    <td className="px-4 py-2 text-right space-x-2">
                      <button onClick={() => handleEdit(op)} className="text-blue-400 hover:text-blue-300 font-semibold">Edit</button>
                      <button onClick={() => {
                        if (window.confirm(`Are you sure you want to delete "${op.name}"?`)) {
                          deleteOperator(op.id);
                        }
                      }} className="text-red-500 hover:text-red-400 font-semibold">Delete</button>
                    </td>
                  </tr>
                ))}
                {operators.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-2 text-center text-gray-500 italic">No team members found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end pt-2">
              <button onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded-md font-bold">Close</button>
          </div>
        </div>
      </Modal>
      <CreateOperatorModal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} onSubmit={addOperator} workGroups={workGroups} currentUser={user} />
      <EditOperatorModal isOpen={isEditOpen} onClose={() => { setIsEditOpen(false); setOperatorToEdit(null); }} operator={operatorToEdit} onSubmit={updateOperator} workGroups={workGroups} />
      {onBulkUpload && (
        <BulkUploadModal isOpen={isBulkUploadOpen} onClose={() => setIsBulkUploadOpen(false)} onUpload={onBulkUpload} fixedTarget="operators" />
      )}
    </>
  );
};

export default ManageOperatorsModal;
