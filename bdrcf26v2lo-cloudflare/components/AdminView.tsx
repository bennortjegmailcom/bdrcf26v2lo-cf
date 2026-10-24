
import React, { useState, useMemo } from 'react';
import { User, BreakdownReport, Role, Status, WorkGroup, Artisan, Assignment, ResolutionStatusItem, ResolutionStatus, Operator, UserMessage, Shift, HandoverSection , AuditLogEntry} from '../types';
import { INITIAL_REPORTS, INITIAL_ARTISANS, getSectionColor } from '../constants';
import CreateOperatorModal from './modals/CreateOperatorModal';
import { formatDateTime } from '../utils';
import BreakdownTable from './BreakdownTable';
import UserManagementTable from './UserManagementTable';
import EditUserModal from './modals/EditUserModal';
import CreateUserModal from './modals/CreateUserModal';
import EditOperatorModal from './modals/EditOperatorModal';
import AssignJobModal from './modals/AssignJobModal';
import CommentsModal from './modals/CommentsModal';
import ResolveJobModal from './modals/ResolveJobModal';
import CompleteJobModal from './modals/CompleteJobModal';
import WorkGroupManagementTable from './WorkGroupManagementTable';
import CreateWorkGroupModal from './modals/CreateWorkGroupModal';
import EditWorkGroupModal from './modals/EditWorkGroupModal';
import ArtisanManagementTable from './ArtisanManagementTable';
import CreateArtisanModal from './modals/CreateArtisanModal';
import EditArtisanModal from './modals/EditArtisanModal';
import EditResolutionStatusModal from './modals/EditResolutionStatusModal';
import EditReportModal from './modals/EditReportModal';
import BulkUploadModal from './modals/BulkUploadModal';
import ManageSectionModal from './modals/ManageSectionModal';
import { verifyAuditLogChain, VerificationResult } from '../services/tamperProofAudit';
import ManageAreaFaultsModal from './modals/ManageAreaFaultsModal';
import EquipmentQRCodeGenerator from './EquipmentQRCodeGenerator';

interface AdminViewProps {
  auditLogs?: AuditLogEntry[];
  user: User;
  reports: BreakdownReport[];
  handOverReports: BreakdownReport[];
  users: User[];
  workGroups: WorkGroup[];
  artisans: Artisan[];
  filteredArtisans: Artisan[];
  resolutionStatuses: ResolutionStatusItem[];
  updateReport: (reportId: string, updates: Partial<BreakdownReport>) => void;
  deleteReport: (reportId: string) => void;
  clearAllReports: () => void;
  purgeOldReports: (cutoff: string) => Promise<number>;
  updateUser: (userId: string, updates: Partial<User>) => void;
  deleteUser: (userId: string) => void;
  addWorkGroup: (name: string, color?: string) => void;
  updateWorkGroup: (workGroupId: string, updates: Partial<WorkGroup>) => void;
  deleteWorkGroup: (workGroupId: string) => void;
  addArtisan: (artisanData: Omit<Artisan, 'id'>) => void;
  updateArtisan: (artisanId: string, updates: Partial<Artisan>) => void;
  deleteArtisan: (artisanId: string) => void;
  addResolutionStatus: (name: string) => void;
  updateResolutionStatus: (id: string, updates: Partial<ResolutionStatusItem>) => void;
  deleteResolutionStatus: (id: string) => void;
  sections: HandoverSection[];
  addSection: (name: string, targetRole?: Role, color?: string) => void;
  updateSection: (id: string, updates: Partial<HandoverSection>) => void;
  deleteSection: (id: string) => void;
  operators: Operator[];
  addOperator: (name: string, shift: Shift, workGroup?: string, employeeNumber?: string) => void;
  updateOperator: (id: string, updates: Partial<Operator>) => void;
  deleteOperator: (id: string) => void;
  duplicateReport?: (reportId: string) => void;
  adminMessages: UserMessage[];
  markAdminMessageRead: (id: string, isRead: boolean) => Promise<void>;
  updateAdminMessage: (id: string, updates: Partial<UserMessage>) => Promise<void>;
  deleteAdminMessage: (id: string) => Promise<void>;
  onOpenMessages?: () => void;
  onBulkUpload?: (type: 'users' | 'artisans' | 'operators', data: any[]) => Promise<void>;
  onRefreshStaticData?: () => Promise<void>;
}

type AdminTab = 'reports' | 'users' | 'workgroups' | 'fault_presets' | 'artisans' | 'resolutions' | 'sections' | 'operators' | 'qr_codes' | 'maintenance' | 'messages' | 'audit';

const AdminView: React.FC<AdminViewProps> = ({
  auditLogs = [], 
    user, reports, handOverReports, users, workGroups, artisans, filteredArtisans, resolutionStatuses,
    updateReport, deleteReport, clearAllReports, purgeOldReports,
    updateUser, deleteUser,
    addWorkGroup, updateWorkGroup, deleteWorkGroup,
    addArtisan, updateArtisan, deleteArtisan, 
    addResolutionStatus, updateResolutionStatus, deleteResolutionStatus, 
    sections, addSection, updateSection, deleteSection,
    operators, addOperator, updateOperator, deleteOperator,
    duplicateReport,
    adminMessages, markAdminMessageRead, updateAdminMessage, deleteAdminMessage,
    onOpenMessages,
    onBulkUpload,
    onRefreshStaticData
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('reports');
  const [isPurging, setIsPurging] = useState(false);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  type SortField = 'name' | 'employeeNumber' | 'workGroup' | 'shift';
  const [operatorSortField, setOperatorSortField] = useState<SortField>('name');
  const [operatorSortDirection, setOperatorSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleOperatorSort = (field: SortField) => {
    if (operatorSortField === field) {
      setOperatorSortDirection(operatorSortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setOperatorSortField(field);
      setOperatorSortDirection('asc');
    }
  };

  const sortedOperators = [...operators].sort((a, b) => {
    let aVal = a[operatorSortField] || '';
    let bVal = b[operatorSortField] || '';
    
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return operatorSortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return 0;
  });

  // User Management Modals
  const [userToEdit, setUserToEdit] = useState<User | null>(null);
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);

  // Report Management Modals
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [commentsReport, setCommentsReport] = useState<BreakdownReport | null>(null);
  const handleOpenComments = (report: BreakdownReport) => {
    setCommentsReport(report);
    setIsCommentsModalOpen(true);
  };
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [isEditReportModalOpen, setIsEditReportModalOpen] = useState(false);
  const [isCommentsModalOpen, setIsCommentsModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<BreakdownReport | null>(null);

  // Work Group & Area Fault Management Modals
  const [isCreateWgModalOpen, setIsCreateWgModalOpen] = useState(false);
  const [isEditWgModalOpen, setIsEditWgModalOpen] = useState(false);
  const [isManageFaultsModalOpen, setIsManageFaultsModalOpen] = useState(false);
  const [workGroupToEdit, setWorkGroupToEdit] = useState<WorkGroup | null>(null);

  // Artisan Management Modals
  const [isCreateArtisanModalOpen, setIsCreateArtisanModalOpen] = useState(false);
  const [isCreateOperatorModalOpen, setIsCreateOperatorModalOpen] = useState(false);
  const [isEditArtisanModalOpen, setIsEditArtisanModalOpen] = useState(false);
  const [isEditOperatorModalOpen, setIsEditOperatorModalOpen] = useState(false);
  const [isEditResolutionStatusModalOpen, setIsEditResolutionStatusModalOpen] = useState(false);
  const [artisanToEdit, setArtisanToEdit] = useState<Artisan | null>(null);
  const [operatorToEdit, setOperatorToEdit] = useState<Operator | null>(null);
  const [resolutionStatusToEdit, setResolutionStatusToEdit] = useState<ResolutionStatusItem | null>(null);
  const [isSectionModalOpen, setIsSectionModalOpen] = useState(false);
  const [sectionToEdit, setSectionToEdit] = useState<HandoverSection | null>(null);

  // Filter State (Reports Tab)
  const [selectedArtisan, setSelectedArtisan] = useState<{ id: string, name: string } | null>(null);

  // Added missing modal opener functions for report management
  const openAssignModal = (report: BreakdownReport) => {
    setSelectedReport(report);
    setIsAssignModalOpen(true);
  };
  
  const openResolveModal = (report: BreakdownReport) => {
    setSelectedReport(report);
    setIsResolveModalOpen(true);
  };

  const openCompleteModal = (report: BreakdownReport) => {
    setSelectedReport(report);
    setIsCompleteModalOpen(true);
  };

  const openEditReportModal = (report: BreakdownReport) => {
    setSelectedReport(report);
    setIsEditReportModalOpen(true);
  };

  // Added missing submit handlers for report actions
  const handleAssign = (data: { notificationNumber: string; assignments: Assignment[] }) => {
    if (selectedReport) {
      updateReport(selectedReport.id, { 
        notificationNumber: data.notificationNumber,
        assignments: data.assignments,
        status: Status.ASSIGNED, 
        assignedTime: new Date().toISOString() 
      });
    }
    setIsAssignModalOpen(false);
    setSelectedReport(null);
  };

  const handleResolve = (data: { whatWasWrong: string, resolutionStatus: ResolutionStatus, resolutionTime: string, resolutionNotes?: string, resolutionEmployeeNumber?: string }) => {
    if (selectedReport) {
      updateReport(selectedReport.id, { ...data, status: Status.RESOLVED });
    }
    setIsResolveModalOpen(false);
    setSelectedReport(null);
  };

  const handleComplete = (completedTime: string) => {
    if (selectedReport) {
      updateReport(selectedReport.id, {
        status: Status.COMPLETED,
        completedTime: completedTime
      });
    }
    setIsCompleteModalOpen(false);
    setSelectedReport(null);
  };

  // Added missing edit handlers for user, workgroup, and artisan management
  const handleEditUser = (user: User) => {
    setUserToEdit(user);
    setIsEditUserModalOpen(true);
  };

  const handleEditWorkGroup = (wg: WorkGroup) => {
    setWorkGroupToEdit(wg);
    setIsEditWgModalOpen(true);
  };

  const handleEditArtisan = (artisan: Artisan) => {
    setArtisanToEdit(artisan);
    setIsEditArtisanModalOpen(true);
  };

  const handleEditOperator = (operator: Operator) => {
    setOperatorToEdit(operator);
    setIsEditOperatorModalOpen(true);
  };

  const handleEditResolutionStatus = (rs: ResolutionStatusItem) => {
    setResolutionStatusToEdit(rs);
    setIsEditResolutionStatusModalOpen(true);
  };

  const filteredReports = useMemo(() => {
    if (!selectedArtisan) return reports;
    return reports.filter(r => r.assignments && r.assignments.some(a => a.artisanId === selectedArtisan.id));
  }, [reports, selectedArtisan]);

  const oldReportsCount = useMemo(() => {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 4);
    return reports.filter(r => new Date(r.reportingTime) < cutoff).length;
  }, [reports]);

  const handleClearReports = () => {
    if (window.confirm('ARE YOU SURE you want to delete ALL breakdown reports? This action cannot be undone.')) {
        if(window.confirm('Final confirmation. This will wipe the reports database.')) {
            clearAllReports();
        }
    }
  };

  const handleGenerateFreshMockData = async () => {
    if (!window.confirm('Generate fresh mock data? This will add fresh sample reports, artisans, work groups, and job tickets into the database.')) {
      return;
    }
    try {
      localStorage.setItem('cache_reports', JSON.stringify(INITIAL_REPORTS));
      localStorage.setItem('cache_artisans', JSON.stringify(INITIAL_ARTISANS));
      localStorage.setItem('cache_workgroups', JSON.stringify(workGroups.length > 0 ? workGroups : [{ id: 'Matimba', name: 'Matimba' }, { id: 'GG', name: 'GG' }, { id: 'IPC', name: 'IPC' }]));

      const sampleTickets = [
        {
          id: 'ticket-101',
          equipment: 'Conveyor Belt A',
          equipmentNumber: 'CV-101',
          workGroup: 'Matimba',
          workType: 'Breakdown / Unplanned Repair',
          status: 'LOCKOUT_ACTIVE',
          state: 'LOCKOUT_ACTIVE',
          requestedByUserId: '1',
          requestedByUserName: 'GG 1',
          lockoutTime: new Date(Date.now() - 3600000).toISOString(),
          bookedDurationMinutes: 120,
          lockoutComments: 'Belt slipping under heavy load, requires drive pulley inspection.',
          physicalLockedByUserName: 'Jim (Maint. Foreman)',
          physicalLockedAt: new Date(Date.now() - 3000000).toISOString()
        },
        {
          id: 'ticket-102',
          equipment: 'Pump Station 3',
          equipmentNumber: 'PS-03',
          workGroup: 'IPC',
          workType: 'Preventative Maintenance',
          status: 'POSITIVE_TEST',
          state: 'POSITIVE_TEST',
          requestedByUserId: '2',
          requestedByUserName: 'IPC 6',
          lockoutTime: new Date(Date.now() - 7200000).toISOString(),
          bookedDurationMinutes: 60,
          lockoutComments: 'Motor tripping on overload.',
          positiveTestPerformedByUserName: 'Dave (Elec. Supervisor)',
          positiveTestResult: 'PASS',
          positiveTestAt: new Date(Date.now() - 3600000).toISOString()
        }
      ];

      localStorage.setItem('cache_jobTickets', JSON.stringify(sampleTickets));
      window.dispatchEvent(new Event('storage'));
      alert('Fresh mock data generated successfully! Refresh the page to view updated records.');
    } catch (err: any) {
      console.error('Error generating fresh mock data:', err);
      alert('Failed to generate mock data: ' + (err.message || err));
    }
  };

  const downloadBackup = (targetReports: BreakdownReport[], filename: string) => {
    if (targetReports.length === 0) return;
    const headers = ["ID", "Status", "Equipment", "Fault", "Date", "Notification", "Result"];
    const rows = targetReports.map(r => [
      r.id, r.status, r.equipment, `"${r.reportedFault}"`, 
      formatDateTime(r.reportingTime), r.notificationNumber || '', `"${r.whatWasWrong || ''}"`
    ]);
    const csv = headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportData = async (collections: string[], filename: string) => {
    const data: any = {};
    for (const col of collections) {
      try {
        const raw = localStorage.getItem('cache_' + col);
        data[col] = raw ? JSON.parse(raw) : [];
      } catch (err) {
        console.warn(`Could not export collection ${col}:`, err);
      }
    }
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      alert("Export successful!");
    } catch (err) {
      console.error("Export error:", err);
      alert("Failed to create export file.");
    }
  };

  const exportDataArray = async (collectionName: string, filename: string) => {
    try {
      const raw = localStorage.getItem('cache_' + collectionName);
      const data = raw ? JSON.parse(raw) : [];
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      alert("Export successful!");
    } catch (err) {
      console.error("Export error:", err);
      alert("Failed to export data.");
    }
  };

  const exportOperatorsCSV = () => {
    const headers = ["ID", "Name", "Shift", "Work Group", "Employee Number"];
    const rows = operators.map(op => [
        op.id,
        `"${op.name.replace(/"/g, '""')}"`,
        op.shift || '',
        `"${(op.workGroup || '').replace(/"/g, '""')}"`,
        op.employeeNumber || ''
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8," 
        + headers.join(",") + "\n" 
        + rows.map(e => e.join(",")).join("\n");
        
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `team_shifts_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportSetupData = () => exportData(['users', 'workgroups', 'artisans', 'resolutionStatuses', 'operators', 'sections'], `setup_data_export_${new Date().toISOString().split('T')[0]}.json`);
  const exportReportsData = () => exportData(['reports'], `reports_data_export_${new Date().toISOString().split('T')[0]}.json`);
  const exportOperatorsData = () => exportDataArray('operators', `team_data_export_${new Date().toISOString().split('T')[0]}.json`);

  const exportUsersOnly = () => exportData(['users'], `users_export_${new Date().toISOString().split('T')[0]}.json`);
  const exportAreasOnly = () => exportData(['workgroups'], `areas_export_${new Date().toISOString().split('T')[0]}.json`);
  const exportArtisansOnly = () => exportData(['artisans'], `artisans_export_${new Date().toISOString().split('T')[0]}.json`);
  const exportSectionsOnly = () => exportData(['sections'], `sections_export_${new Date().toISOString().split('T')[0]}.json`);
  const exportTeamOnly = () => exportData(['operators'], `team_export_${new Date().toISOString().split('T')[0]}.json`);

  const importSetupData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        for (const col in data) {
          localStorage.setItem('cache_' + col, JSON.stringify(data[col]));
        }
        window.dispatchEvent(new Event('storage'));
        alert("Import successful! Please refresh the page.");
        window.location.reload();
      } catch (err) {
        console.error("Import error:", err);
        alert("Failed to parse data. Ensure it is a valid JSON export.");
      }
    };
    reader.readAsText(file);
  };

  const importReports = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(l => l.trim() !== '');
        const reports: any[] = [];
        
        for (let i = 1; i < lines.length; i++) {
            const parts = lines[i].match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
            if (!parts || parts.length < 5) continue;
            
            reports.push({
                id: parts[0].replace(/"/g, ''),
                status: parts[1].replace(/"/g, ''),
                equipment: parts[2].replace(/"/g, ''),
                reportedFault: parts[3].replace(/"/g, ''),
                reportingTime: new Date().toISOString(),
                notificationNumber: parts[5]?.replace(/"/g, ''),
                whatWasWrong: parts[6]?.replace(/"/g, '')
            });
        }
        
        if (window.confirm(`Importing ${reports.length} reports. Continue?`)) {
            const existing = JSON.parse(localStorage.getItem('cache_reports') || '[]');
            const combined = [...reports, ...existing];
            localStorage.setItem('cache_reports', JSON.stringify(combined));
            window.dispatchEvent(new Event('storage'));
            alert('Import successful!');
            window.location.reload();
        }
    };
    reader.readAsText(file);
  };

  const handlePurge = async () => {
    if (oldReportsCount === 0) {
        alert("No records older than 4 months found.");
        return;
    }
    if (window.confirm(`You are about to PERMANENTLY delete ${oldReportsCount} records older than 4 months. Download a backup first?`)) {
        const cutoff = new Date();
        cutoff.setMonth(cutoff.getMonth() - 4);
        const toPurge = reports.filter(r => new Date(r.reportingTime) < cutoff);
        
        downloadBackup(toPurge, `backup_before_purge_${new Date().toISOString().split('T')[0]}.csv`);
        
        if (window.confirm(`Backup downloaded. Proceed with deletion of ${oldReportsCount} records?`)) {
            setIsPurging(true);
            try {
                const deleted = await purgeOldReports(cutoff.toISOString());
                alert(`Successfully purged ${deleted} records.`);
            } catch (err) {
                alert("Failed to purge records.");
            } finally {
                setIsPurging(false);
            }
        }
    }
  };

  const TabButton = ({ tab, label, icon }: { tab: AdminTab, label: string, icon: React.ReactNode }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`flex items-center px-6 py-3 text-sm font-bold rounded-t-lg transition-all duration-200 border-b-2 ${
        activeTab === tab 
          ? 'bg-gray-800 text-blue-400 border-blue-500' 
          : 'bg-transparent text-gray-400 border-transparent hover:text-gray-200 hover:bg-gray-800/30'
      }`}
    >
      {icon}
      <span className="ml-2">{label}</span>
    </button>
  );

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex border-b border-gray-700 bg-gray-900/50 pt-1 px-1 overflow-x-auto no-scrollbar shrink-0">
        <TabButton tab="reports" label="Reports" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} />
        <TabButton tab="users" label="Users" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>} />
        <TabButton tab="workgroups" label="Areas" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>} />
        <TabButton tab="fault_presets" label="Area Faults" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>} />
        <TabButton tab="artisans" label="Artisans" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>} />
        <TabButton tab="resolutions" label="Statuses" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>} />
        <TabButton tab="sections" label="Sections" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>} />
        <TabButton tab="audit" label="Audit Log" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>} />
        <TabButton tab="operators" label="Team" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>} />
        <TabButton tab="qr_codes" label="Area QR Generator" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>} />
        <TabButton 
            tab="messages" 
            label={`Messages (${adminMessages.filter(m => !m.isReadByAdmin).length})`} 
            icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" /></svg>} 
        />
        <TabButton tab="maintenance" label="Maint" icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>} />
      </div>

      <div className="flex-1 bg-gray-800/20 p-2 md:p-3 overflow-y-auto">
        {activeTab === 'reports' && (
          <section className="animate-fadeIn h-full flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-bold text-white">Reports Management</h2>
                {selectedArtisan && (
                  <div className="flex items-center bg-blue-900/40 border border-blue-500 text-blue-200 px-2 py-0.5 rounded-full text-[10px] font-bold">
                    Artisan: {selectedArtisan.name}
                    <button onClick={() => setSelectedArtisan(null)} className="ml-1.5 hover:text-white"><svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" /></svg></button>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <label className="bg-green-700 hover:bg-green-600 text-white font-bold py-1 px-3 text-[10px] rounded-md transition flex items-center shadow-lg cursor-pointer">
                    <input type="file" accept=".csv" onChange={importReports} className="hidden" />
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>Import
                </label>
                <button onClick={handleClearReports} className="bg-red-800 hover:bg-red-700 text-white font-bold py-1 px-3 text-[10px] rounded-md transition flex items-center shadow-lg"><svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>Clear All</button>
            </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-2 pb-2">
              <BreakdownTable onOpenComments={handleOpenComments} reports={filteredReports} user={user} onDelete={deleteReport} onAssign={openAssignModal} onResolve={openResolveModal} onComplete={openCompleteModal} onEdit={openEditReportModal} onUpdateReport={updateReport} onFilterArtisan={(id, name) => setSelectedArtisan({id, name})} onReportAgain={duplicateReport} resolutionStatuses={resolutionStatuses} />
            </div>
          </section>
        )}

        {activeTab === 'messages' && (
          <section className="animate-fadeIn max-w-4xl mx-auto py-4">
            <div className="flex justify-between items-center mb-6 px-2">
                <h2 className="text-2xl font-bold text-white">System Messages</h2>
                <div className="flex items-center gap-3">
                    {onOpenMessages && (
                        <button 
                            onClick={onOpenMessages}
                            className="bg-blue-650 hover:bg-blue-550 text-white font-bold text-[11px] px-3.5 py-1.5 rounded-lg border border-blue-500/30 transition shadow-md shadow-blue-500/10 uppercase tracking-widest flex items-center gap-1.5"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-blue-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                            Compose Broadcast
                        </button>
                    )}
                    <div className="text-xs text-blue-400 font-bold uppercase py-1 px-3 bg-blue-900/30 rounded-full border border-blue-500/30">
                        {adminMessages.filter(m => m.recipientType === 'admin' && !m.isReadByAdmin).length} Unread Inquiries
                    </div>
                </div>
            </div>
            
            <div className="space-y-4 px-2">
                {adminMessages.filter(m => m.recipientType === 'admin' || m.senderId === user.id).length > 0 ? adminMessages.filter(m => m.recipientType === 'admin' || m.senderId === user.id).map((msg) => (
                    <div key={msg.id} className={`p-5 rounded-xl border transition-all ${msg.isReadByAdmin ? 'bg-gray-800/40 border-gray-700 opacity-75' : 'bg-gray-800 border-blue-500/50 shadow-lg shadow-blue-500/5'}`}>
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${msg.isReadByAdmin ? 'bg-gray-600' : 'bg-blue-500 animate-pulse'}`} />
                                <span className="text-xs font-bold text-blue-400 uppercase tracking-widest">{msg.category}</span>
                                {msg.wantsReply && (
                                    <span className="text-[10px] font-bold bg-orange-900/40 text-orange-400 px-2 py-0.5 rounded-full border border-orange-500/30 flex items-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-2 w-2 mr-1" viewBox="0 0 20 20" fill="currentColor">
                                            <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                                        </svg>
                                        Reply Requested
                                    </span>
                                )}
                                <span className="text-gray-500 text-[10px] font-medium">{formatDateTime(msg.timestamp)}</span>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => markAdminMessageRead(msg.id, !msg.isReadByAdmin)}
                                    className={`text-[10px] font-bold px-2 py-1 rounded transition-colors ${msg.isReadByAdmin ? 'text-gray-400 hover:text-white bg-gray-700' : 'bg-blue-600 text-white hover:bg-blue-500'}`}
                                >
                                    {msg.isReadByAdmin ? 'Mark Unread' : 'Mark Read'}
                                </button>
                                <button 
                                    onClick={() => { if(window.confirm('Delete this message?')) deleteAdminMessage(msg.id); }}
                                    className="text-[10px] font-bold px-2 py-1 bg-red-900/30 text-red-500 rounded hover:bg-red-900/50 transition-colors"
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                        <div className="text-sm text-gray-100 font-medium leading-relaxed">
                            "{msg.content}"
                        </div>
                        <div className="mt-4 pt-3 border-t border-gray-700/50 flex items-center justify-between text-[10px] text-gray-500">
                            <div className="flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                                Sent by: <span className="text-gray-300 ml-1 font-bold italic">{msg.senderName}</span>
                            </div>
                            <button
                                onClick={() => {
                                    setReplyingTo(replyingTo === msg.id ? null : msg.id);
                                    setReplyContent(msg.adminReply || '');
                                }}
                                className="text-blue-400 hover:text-blue-300 font-bold px-2 py-1 bg-blue-900/20 rounded transition-colors"
                            >
                                {msg.adminReply ? 'Edit Reply' : 'Reply'}
                            </button>
                        </div>
                        {msg.adminReply && replyingTo !== msg.id && (
                            <div className="mt-3 p-3 bg-gray-900 rounded-lg border border-gray-700">
                                <span className="text-xs font-bold text-blue-400 block mb-1">Your Reply:</span>
                                <p className="text-sm text-gray-300 whitespace-pre-wrap">{msg.adminReply}</p>
                            </div>
                        )}
                        {replyingTo === msg.id && (
                            <div className="mt-4 p-4 bg-gray-900 rounded-lg border border-blue-500/30">
                                <label className="block text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">Reply to {msg.senderName}</label>
                                <textarea
                                    value={replyContent}
                                    onChange={(e) => setReplyContent(e.target.value)}
                                    placeholder="Type your reply here..."
                                    rows={3}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none resize-none mb-3"
                                />
                                <div className="flex justify-end gap-2">
                                    <button
                                        onClick={() => setReplyingTo(null)}
                                        className="px-3 py-1.5 text-xs font-bold text-gray-400 hover:text-white transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (!replyContent.trim()) return;
                                            await updateAdminMessage(msg.id, { 
                                                adminReply: replyContent, 
                                                isReplyReadByUser: false,
                                                isReadByAdmin: true // Mark original message as read since admin is replying
                                            });
                                            setReplyingTo(null);
                                        }}
                                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors"
                                    >
                                        Send Reply
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )) : (
                    <div className="text-center py-20 bg-gray-800/30 rounded-xl border border-dashed border-gray-700">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-700 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                        </svg>
                        <p className="text-gray-500 italic">No messages found.</p>
                    </div>
                )}
            </div>
          </section>
        )}

        {activeTab === 'maintenance' && (
           <section className="animate-fadeIn max-w-2xl mx-auto py-10">
               <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 shadow-2xl">
                    <h2 className="text-2xl font-bold text-white mb-4">Data Retention & Maintenance</h2>
                    <p className="text-gray-400 mb-8 leading-relaxed">Ensure system performance by purging historical data. Records are typically kept for <span className="text-white font-bold">4 months</span> as per standard policy.</p>
                    
                    <div className="grid grid-cols-2 gap-6 mb-10">
                        <div className="bg-gray-900/50 p-6 rounded-lg border border-gray-700">
                            <span className="text-xs text-gray-500 uppercase font-bold block mb-1">Total Records</span>
                            <span className="text-4xl font-bold text-white">{reports.length}</span>
                        </div>
                        <div className="bg-gray-900/50 p-6 rounded-lg border border-red-900/50">
                            <span className="text-xs text-red-500/70 uppercase font-bold block mb-1">Older than 4 Months</span>
                            <span className="text-4xl font-bold text-red-500">{oldReportsCount}</span>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <button 
                            onClick={() => downloadBackup(reports, `complete_backup_${new Date().toISOString().split('T')[0]}.csv`)}
                            className="w-full flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Download Reports Backup (All)
                        </button>
                        <div className="grid grid-cols-3 gap-3 mt-4">
                            {[1, 4, 12].map(hours => (
                                <button 
                                    key={hours}
                                    onClick={() => {
                                        const cutoff = new Date();
                                        cutoff.setHours(cutoff.getHours() - hours);
                                        const filtered = reports.filter(r => new Date(r.reportingTime) >= cutoff);
                                        downloadBackup(filtered, `backup_${hours}h_${new Date().toISOString().split('T')[0]}.csv`);
                                    }}
                                    className="flex items-center justify-center bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-lg transition text-xs"
                                >
                                    Backup {hours}h
                                </button>
                            ))}
                        </div>

                        <button 
                            onClick={exportSetupData}
                            className="w-full flex items-center justify-center bg-blue-700 hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition mt-4"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Export Setup Data (JSON)
                        </button>
                        <button 
                            onClick={exportReportsData}
                            className="w-full flex items-center justify-center bg-indigo-700 hover:bg-indigo-600 text-white font-bold py-3 rounded-lg transition mt-4"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Export Reports Data (JSON)
                        </button>
                        
                        <label className="w-full flex items-center justify-center bg-green-700 hover:bg-green-600 text-white font-bold py-3 rounded-lg transition mt-4 cursor-pointer">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                            Import Setup Data (JSON)
                            <input type="file" accept=".json" onChange={importSetupData} className="hidden" />
                        </label>

                        <button 
                            onClick={handleGenerateFreshMockData}
                            className="w-full flex items-center justify-center bg-yellow-600 hover:bg-yellow-500 text-gray-950 font-extrabold py-3 rounded-lg transition mt-4 shadow-lg"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
                            Generate Fresh Mock Data
                        </button>

                        <div className="pt-6 mt-6 border-t border-gray-700">
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block mb-3">
                                Export Individual Collections (JSON)
                            </span>
                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    onClick={exportUsersOnly}
                                    className="flex items-center justify-center bg-gray-900/50 hover:bg-gray-800 text-white font-semibold py-2.5 px-3 rounded-lg border border-gray-700 hover:border-gray-600 transition text-xs"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                    Export Users
                                </button>
                                <button 
                                    onClick={exportAreasOnly}
                                    className="flex items-center justify-center bg-gray-900/50 hover:bg-gray-800 text-white font-semibold py-2.5 px-3 rounded-lg border border-gray-700 hover:border-gray-600 transition text-xs"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    Export Areas
                                </button>
                                <button 
                                    onClick={exportArtisansOnly}
                                    className="flex items-center justify-center bg-gray-900/50 hover:bg-gray-800 text-white font-semibold py-2.5 px-3 rounded-lg border border-gray-700 hover:border-gray-600 transition text-xs"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    Export Artisans
                                </button>
                                <button 
                                    onClick={exportSectionsOnly}
                                    className="flex items-center justify-center bg-gray-900/50 hover:bg-gray-800 text-white font-semibold py-2.5 px-3 rounded-lg border border-gray-700 hover:border-gray-600 transition text-xs"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" /></svg>
                                    Export Sections
                                </button>
                                <button 
                                    onClick={exportTeamOnly}
                                    className="flex items-center justify-center bg-gray-900/50 hover:bg-gray-800 text-white font-semibold py-2.5 px-3 rounded-lg border border-gray-700 hover:border-gray-600 transition text-xs col-span-2"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                                    Export Team (Operators)
                                </button>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-gray-700">
                            <button 
                                onClick={handlePurge}
                                disabled={isPurging || oldReportsCount === 0}
                                className={`w-full flex items-center justify-center font-bold py-3 rounded-lg transition shadow-lg ${isPurging || oldReportsCount === 0 ? 'bg-gray-600 cursor-not-allowed opacity-50' : 'bg-red-600 hover:bg-red-700 text-white'}`}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                {isPurging ? 'Purging...' : `Purge ${oldReportsCount} Old Records`}
                            </button>
                            <p className="text-[10px] text-gray-500 mt-2 text-center">Note: Purging will automatically offer a backup download for the deleted records.</p>
                        </div>
                    </div>
               </div>
           </section>
        )}

        {/* ... (other tabs remain unchanged) */}
        {activeTab === 'users' && (
          <section className="animate-fadeIn">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">User Management</h2>
                <div className="flex gap-3">
                    <button onClick={() => setIsBulkUploadModalOpen(true)} className="bg-gray-750 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-md transition text-sm flex items-center shadow-lg uppercase tracking-wider border border-gray-650">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4-4m4 4v12" /></svg>
                        Bulk Upload
                    </button>
                    <button onClick={() => setIsCreateUserModalOpen(true)} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition text-sm flex items-center shadow-lg uppercase tracking-wider">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        New User
                    </button>
                </div>
            </div>
            <UserManagementTable users={users} onEdit={handleEditUser} onDelete={deleteUser} currentUser={user} />
          </section>
        )}
        {activeTab === 'workgroups' && (
          <section className="animate-fadeIn">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Work Group Management</h2>
                <div className="flex gap-3">
                    {onRefreshStaticData && (
                      <button 
                        onClick={onRefreshStaticData} 
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition text-sm flex items-center shadow-lg"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 animate-spin-hover" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 15.89M21 20v-5h-5.181" /></svg>
                        Sync Lookups
                      </button>
                    )}
                    <button 
                      onClick={() => setIsManageFaultsModalOpen(true)} 
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition text-sm flex items-center shadow-lg cursor-pointer"
                      title="Manage 1-tap quick problem description chips per plant area"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                      Area Fault Presets
                    </button>
                    <button onClick={() => setIsCreateWgModalOpen(true)} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition text-sm flex items-center shadow-lg cursor-pointer"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>New Work Group</button>
                </div>
            </div>
            <WorkGroupManagementTable workGroups={workGroups} users={users} onEdit={handleEditWorkGroup} onDelete={deleteWorkGroup} />
          </section>
        )}
        {activeTab === 'fault_presets' && (
          <section className="animate-fadeIn max-w-5xl mx-auto py-4">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    Plant Area Problem Descriptions & Fault Presets
                  </h2>
                  <p className="text-xs text-gray-400 mt-1">
                    Manage the 1-tap quick problem description chips that appear on mobile field reports for each plant area.
                  </p>
                </div>
                <button
                  onClick={() => setIsManageFaultsModalOpen(true)}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-lg cursor-pointer"
                >
                  <span>Open Configurator</span>
                </button>
              </div>

              <p className="text-sm text-gray-300">
                Click <strong>"Open Configurator"</strong> to select any plant area, add new problem descriptions, edit existing ones, reorder, or reset to standard mining defaults.
              </p>
            </div>
          </section>
        )}
        {activeTab === 'artisans' && (
          <section className="animate-fadeIn">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Artisan Management</h2>
                <div className="flex gap-3">
                    <button onClick={() => setIsBulkUploadModalOpen(true)} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md transition text-sm flex items-center shadow-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4-4m4 4v12" /></svg>
                        Bulk
                    </button>
                    <button onClick={() => setIsCreateArtisanModalOpen(true)} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition text-sm flex items-center shadow-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                        New Artisan
                    </button>
                </div>
            </div>
            <ArtisanManagementTable artisans={artisans} onEdit={handleEditArtisan} onDelete={deleteArtisan} />
          </section>
        )}
        {activeTab === 'resolutions' && (
          <section className="animate-fadeIn">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Resolution Statuses</h2>
                <div className="flex gap-3">
                    {onRefreshStaticData && (
                      <button 
                        onClick={onRefreshStaticData} 
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition text-sm flex items-center shadow-lg"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 animate-spin-hover" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 15.89M21 20v-5h-5.181" /></svg>
                        Sync Lookups
                      </button>
                    )}
                    <button onClick={() => {
                      const newName = window.prompt("Enter new resolution status:");
                      if (newName && newName.trim()) {
                        addResolutionStatus(newName.trim());
                      }
                    }} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition text-sm flex items-center shadow-lg"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>New Status</button>
                </div>
            </div>
            <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden max-w-2xl">
              <table className="min-w-full text-sm text-left text-gray-300">
                <thead className="bg-gray-700 text-xs text-gray-300 uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-4 py-3">Status</th>
                    <th scope="col" className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {resolutionStatuses.map((rs) => (
                    <tr key={rs.id} className="hover:bg-gray-700/50">
                      <td className="px-4 py-3 font-medium text-white">{rs.name}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => {
                          handleEditResolutionStatus(rs);
                        }} className="text-blue-400 hover:text-blue-300 font-semibold mr-4">Edit</button>
                        <button onClick={() => {
                          if (window.confirm(`Are you sure you want to delete "${rs.name}"?`)) {
                            deleteResolutionStatus(rs.id);
                          }
                        }} className="text-red-500 hover:text-red-400 font-semibold">Delete</button>
                      </td>
                    </tr>
                  ))}
                  {resolutionStatuses.length === 0 && (
                    <tr>
                      <td colSpan={2} className="px-4 py-3 text-center text-gray-500 italic">No resolution statuses found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
        {activeTab === 'sections' && (
          <section className="animate-fadeIn">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Handover Sections</h2>
                <div className="flex gap-3">
                    {onRefreshStaticData && (
                      <button 
                        onClick={onRefreshStaticData} 
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition text-sm flex items-center shadow-lg"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 animate-spin-hover" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 15.89M21 20v-5h-5.181" /></svg>
                        Sync Lookups
                      </button>
                    )}
                    <button onClick={() => {
                      setSectionToEdit(null);
                      setIsSectionModalOpen(true);
                    }} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition text-sm flex items-center shadow-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                      New Section
                    </button>
                </div>
            </div>
            <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden max-w-3xl">
              <table className="min-w-full text-sm text-left text-gray-300">
                <thead className="bg-gray-700 text-xs text-gray-300 uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-4 py-3">Section Name</th>
                    <th scope="col" className="px-4 py-3">Acknowledging Role</th>
                    <th scope="col" className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {sections.map((sec) => (
                    <tr key={sec.id} className="hover:bg-gray-700/50">
                      <td className="px-4 py-3 font-medium text-white">
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="h-3 w-3 rounded-full border border-white/30 shrink-0"
                            style={{ backgroundColor: getSectionColor(sec.name, sec.color) }}
                          />
                          {sec.name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {sec.targetRole ? (
                          <span className="px-2 py-1 text-xs font-semibold rounded bg-blue-900/40 text-blue-300 border border-blue-850">
                            {sec.targetRole}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500 italic">Any supervisor/admin</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => {
                          setSectionToEdit(sec);
                          setIsSectionModalOpen(true);
                        }} className="text-blue-400 hover:text-blue-300 font-semibold mr-4">Edit</button>
                        <button onClick={() => {
                          if (window.confirm(`Are you sure you want to delete "${sec.name}"?`)) {
                            deleteSection(sec.id);
                          }
                        }} className="text-red-500 hover:text-red-400 font-semibold">Delete</button>
                      </td>
                    </tr>
                  ))}
                  {sections.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-4 py-3 text-center text-gray-500 italic">No handover sections found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
        {activeTab === 'operators' && (
          <section className="animate-fadeIn">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Team</h2>
                <div className="flex gap-3">
                    <button onClick={exportOperatorsCSV} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition text-sm flex items-center shadow-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        Export CSV
                    </button>
                    <button onClick={exportOperatorsData} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md transition text-sm flex items-center shadow-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Export JSON
                    </button>
                    <button onClick={() => setIsBulkUploadModalOpen(true)} className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-md transition text-sm flex items-center shadow-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4-4m4 4v12" /></svg>
                        Bulk
                    </button>
                    <button onClick={() => setIsCreateOperatorModalOpen(true)} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md transition text-sm flex items-center shadow-lg"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>New Team Member</button>
                </div>
            </div>
            <div className="bg-gray-800 rounded-lg shadow-lg overflow-hidden max-w-2xl">
              <table className="min-w-full text-sm text-left text-gray-300">
                <thead className="bg-gray-700 text-xs text-gray-300 uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-4 py-3 cursor-pointer hover:bg-gray-600" onClick={() => handleOperatorSort('name')}>
                      Team Member Name {operatorSortField === 'name' && (operatorSortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th scope="col" className="px-4 py-3 cursor-pointer hover:bg-gray-600" onClick={() => handleOperatorSort('employeeNumber')}>
                      Employee # {operatorSortField === 'employeeNumber' && (operatorSortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th scope="col" className="px-4 py-3 cursor-pointer hover:bg-gray-600" onClick={() => handleOperatorSort('workGroup')}>
                      Area {operatorSortField === 'workGroup' && (operatorSortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th scope="col" className="px-4 py-3 font-bold text-blue-400 cursor-pointer hover:bg-gray-600" onClick={() => handleOperatorSort('shift')}>
                      Shift {operatorSortField === 'shift' && (operatorSortDirection === 'asc' ? '↑' : '↓')}
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {sortedOperators.map((op) => (
                    <tr key={op.id} className="hover:bg-gray-700/50">
                      <td className="px-4 py-3 font-medium text-white">{op.name}</td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">{op.employeeNumber || 'N/A'}</td>
                      <td className="px-4 py-3 text-gray-400">{op.workGroup || '-'}</td>
                      <td className="px-4 py-3 font-bold text-blue-400">Shift {op.shift}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handleEditOperator(op)} className="text-blue-400 hover:text-blue-300 font-semibold mr-4">Edit</button>
                        <button onClick={() => {
                          if (window.confirm(`Are you sure you want to delete "${op.name}"?`)) {
                            deleteOperator(op.id);
                          }
                        }} className="text-red-500 hover:text-red-400 font-semibold">Delete</button>
                      </td>
                    </tr>
                  ))}
                  {operators.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-3 text-center text-gray-500 italic">No team members found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      <EditUserModal isOpen={isEditUserModalOpen} onClose={() => setIsEditUserModalOpen(false)} user={userToEdit} onSubmit={updateUser} workGroups={workGroups} />
      <CreateUserModal isOpen={isCreateUserModalOpen} onClose={() => setIsCreateUserModalOpen(false)} workGroups={workGroups} onUserCreated={() => {}} />
      <CommentsModal
        isOpen={isCommentsModalOpen}
        onClose={() => {setIsCommentsModalOpen(false); setCommentsReport(null);}}
        report={commentsReport}
        currentUser={user}
        onUpdateReport={updateReport}
      />

      {selectedReport && (
        <>
            <AssignJobModal isOpen={isAssignModalOpen} onClose={() => {setIsAssignModalOpen(false); setSelectedReport(null);}} onSubmit={handleAssign} artisans={filteredArtisans} />
            <ResolveJobModal isOpen={isResolveModalOpen} onClose={() => {setIsResolveModalOpen(false); setSelectedReport(null);}} onSubmit={handleResolve} resolutionStatuses={resolutionStatuses} sections={sections} users={users} />
            <CompleteJobModal isOpen={isCompleteModalOpen} onClose={() => {setIsCompleteModalOpen(false); setSelectedReport(null);}} onSubmit={handleComplete} />
             <EditReportModal isOpen={isEditReportModalOpen} onClose={() => {setIsEditReportModalOpen(false); setSelectedReport(null);}} report={selectedReport} onSubmit={updateReport} currentUser={user} artisans={artisans} resolutionStatuses={resolutionStatuses} sections={sections} users={users} />
        </>
      )}
      <CreateWorkGroupModal isOpen={isCreateWgModalOpen} onClose={() => setIsCreateWgModalOpen(false)} onSubmit={addWorkGroup} />
      <EditWorkGroupModal isOpen={isEditWgModalOpen} onClose={() => { setIsEditWgModalOpen(false); setWorkGroupToEdit(null); }} workGroup={workGroupToEdit} onSubmit={updateWorkGroup} />
      <CreateArtisanModal isOpen={isCreateArtisanModalOpen} onClose={() => setIsCreateArtisanModalOpen(false)} onSubmit={addArtisan} />
      <CreateOperatorModal isOpen={isCreateOperatorModalOpen} onClose={() => setIsCreateOperatorModalOpen(false)} onSubmit={addOperator} workGroups={workGroups} currentUser={user} />
      <EditArtisanModal isOpen={isEditArtisanModalOpen} onClose={() => { setIsEditArtisanModalOpen(false); setArtisanToEdit(null); }} artisan={artisanToEdit} onSubmit={updateArtisan} />
      <EditOperatorModal isOpen={isEditOperatorModalOpen} onClose={() => { setIsEditOperatorModalOpen(false); setOperatorToEdit(null); }} operator={operatorToEdit} onSubmit={updateOperator} workGroups={workGroups} />
      <EditResolutionStatusModal isOpen={isEditResolutionStatusModalOpen} onClose={() => setIsEditResolutionStatusModalOpen(false)} statusItem={resolutionStatusToEdit} onSubmit={updateResolutionStatus} />
      
      <ManageSectionModal 
        isOpen={isSectionModalOpen} 
        onClose={() => { setIsSectionModalOpen(false); setSectionToEdit(null); }} 
        section={sectionToEdit} 
        onSubmit={(name, targetRole, color) => {
          if (sectionToEdit) {
            updateSection(sectionToEdit.id, { name, targetRole, color });
          } else {
            addSection(name, targetRole, color);
          }
        }} 
      />

      
        {activeTab === 'audit' && (
          <section className="bg-gray-800 p-6 rounded-b-lg shadow-lg space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-gray-700 pb-4">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span>System Audit Log & LOTO Compliance Ledger</span>
                  <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-600/60 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <span>🛡️</span>
                    <span>TAMPER-PROOF HASH CHAIN ACTIVE</span>
                  </span>
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  Immutable SHA-256 chained audit records for safety compliance, LOTO isolation, and shift handovers.
                </p>
              </div>

              <button
                type="button"
                onClick={async () => {
                  const res = await verifyAuditLogChain(auditLogs);
                  if (res.isValid) {
                    alert(`✓ Cryptographic Audit Chain Validated!\n\nAll ${res.totalLogs} records verified against unbroken SHA-256 hash sequence.\nZero data alterations or deletions detected.\nLatest Root Hash: ${res.lastHash || 'GENESIS'}`);
                  } else {
                    alert(`⚠ Audit Chain Warning!\n\n${res.tamperReason || 'Integrity anomaly detected.'}`);
                  }
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-3.5 text-xs rounded-lg transition shadow-md flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
              >
                <span>🔒</span>
                <span>Verify Cryptographic Chain</span>
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-gray-700 text-gray-300 text-xs">
                    <th className="px-3 py-2.5 rounded-tl-lg">Seq / Hash</th>
                    <th className="px-3 py-2.5">Timestamp</th>
                    <th className="px-3 py-2.5">Action</th>
                    <th className="px-3 py-2.5">Entity</th>
                    <th className="px-3 py-2.5">User</th>
                    <th className="px-3 py-2.5 rounded-tr-lg">Details & Integrity Seal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-700/50">
                      <td className="px-3 py-3 whitespace-nowrap font-mono text-[10px] text-gray-400">
                        <div className="font-bold text-gray-200">#{log.sequenceNumber ?? '1'}</div>
                        <div className="text-[9px] text-emerald-400 truncate max-w-[5rem]" title={log.hash || 'GENESIS'}>
                          {log.hash ? log.hash.slice(0, 8) + '...' : 'Genesis'}
                        </div>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-gray-300 text-xs">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          log.action === 'CREATE' ? 'bg-green-900/50 text-green-400 border border-green-700/50' :
                          log.action === 'UPDATE' ? 'bg-blue-900/50 text-blue-400 border border-blue-700/50' :
                          'bg-red-900/50 text-red-400 border border-red-700/50'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-gray-300 text-xs">
                        {log.entityType} <span className="text-[10px] text-gray-500">({log.entityId.slice(0, 8)}...)</span>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap text-white font-medium text-xs">
                        {log.userName}
                      </td>
                      <td className="px-3 py-3 text-gray-300 text-xs">
                        <div className="max-w-md line-clamp-2" title={log.details}>
                          {log.details}
                        </div>
                        {log.tamperEvidentChecksum && (
                          <div className="text-[9px] font-mono text-emerald-400/90 mt-0.5 flex items-center gap-1">
                            <span>✓</span>
                            <span>{log.tamperEvidentChecksum}</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-500 italic">
                        No audit logs found. Cryptographic ledger will initialize upon first action.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
        {activeTab === 'qr_codes' && (
          <section className="animate-fadeIn max-w-7xl mx-auto py-2">
            <EquipmentQRCodeGenerator />
          </section>
        )}
      <BulkUploadModal isOpen={isBulkUploadModalOpen} onClose={() => setIsBulkUploadModalOpen(false)} onUpload={onBulkUpload || (async () => {})} />
      <ManageAreaFaultsModal
        isOpen={isManageFaultsModalOpen || activeTab === 'fault_presets'}
        onClose={() => {
          setIsManageFaultsModalOpen(false);
          if (activeTab === 'fault_presets') setActiveTab('workgroups');
        }}
        currentUser={user}
        workGroups={workGroups}
      />
    </div>
  );
};

export default AdminView;
