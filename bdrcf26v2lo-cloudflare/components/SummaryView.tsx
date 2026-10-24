import React from 'react';
import { BreakdownReport, Status, WorkGroup } from '../types';

interface SummaryViewProps {
  reports: BreakdownReport[];
  workGroups: WorkGroup[];
}

const SummaryView: React.FC<SummaryViewProps> = ({ reports, workGroups }) => {
  const totalReports = reports.length;
  const activeReports = reports.filter(r => r.status === Status.ACTIVE).length;
  const assignedReports = reports.filter(r => r.status === Status.ASSIGNED).length;
  const resolvedReports = reports.filter(r => r.status === Status.RESOLVED).length;
  const completedReports = reports.filter(r => r.status === Status.COMPLETED).length;

  const highUrgencyReports = reports.filter(r => r.urgency >= 8 && (r.status === Status.ACTIVE || r.status === Status.ASSIGNED)).length;

  const StatCard: React.FC<{ title: string; value: number | string; color: string }> = ({ title, value, color }) => (
    <div className={`bg-gray-800 p-6 rounded-lg shadow-lg border-l-4 ${color}`}>
      <p className="text-sm text-gray-400 uppercase">{title}</p>
      <p className="text-4xl font-bold text-white mt-1">{value}</p>
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-4">
      <h2 className="text-3xl font-bold text-white mb-6">Meeting Summary</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Reports" value={totalReports} color="border-blue-500" />
        <StatCard title="Active Breakdowns" value={activeReports} color="border-red-500" />
        <StatCard title="Jobs Assigned" value={assignedReports} color="border-yellow-500" />
        <StatCard title="High Urgency Active" value={highUrgencyReports} color="border-red-700" />
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
          <h3 className="font-semibold text-lg text-white mb-4">Breakdowns by Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center"><span className="text-gray-300">Active</span><span className="font-bold text-red-500">{activeReports}</span></div>
            <div className="flex justify-between items-center"><span className="text-gray-300">Assigned</span><span className="font-bold text-yellow-500">{assignedReports}</span></div>
            <div className="flex justify-between items-center"><span className="text-gray-300">Resolved</span><span className="font-bold text-blue-500">{resolvedReports}</span></div>
            <div className="flex justify-between items-center"><span className="text-gray-300">Completed</span><span className="font-bold text-green-500">{completedReports}</span></div>
          </div>
        </div>
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
          <h3 className="font-semibold text-lg text-white mb-4">Breakdowns by Work Group</h3>
           <div className="space-y-3">
            {workGroups.map((wg, i) => {
              const count = reports.filter(r => r.workGroup === wg.name).length;
              return (
                <div key={`${wg.id}-${i}`} className="flex justify-between items-center">
                    <span className="text-gray-300">{wg.name}</span>
                    <span className="font-bold text-white">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryView;