
import React from 'react';
import { 
  Lock, 
  Unlock, 
  BarChart3, 
  Maximize2, 
  Camera, 
  Clock, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle,
  FileText,
  Layers,
  ArrowRight
} from 'lucide-react';

const InstructionCard: React.FC<{ 
  title: string; 
  icon?: React.ReactNode; 
  badge?: string; 
  badgeColor?: string;
  children: React.ReactNode 
}> = ({ title, icon, badge, badgeColor = 'bg-blue-900/60 text-blue-300 border-blue-700', children }) => (
  <div className="bg-gray-800/90 p-6 rounded-xl shadow-lg border border-gray-750 mt-4 transition-all hover:border-gray-600">
    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
      <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
        {icon}
        <span>{title}</span>
      </h3>
      {badge && (
        <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full border ${badgeColor}`}>
          {badge}
        </span>
      )}
    </div>
    <div className="space-y-3 text-gray-300 text-sm leading-relaxed">
      {children}
    </div>
  </div>
);

const AboutView: React.FC = () => {
  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar w-full relative">
      <div className="max-w-4xl mx-auto pb-12 pt-2 px-2">
        
        {/* Header Hero */}
        <div className="text-center mb-10 bg-gradient-to-b from-gray-850 to-gray-900 p-8 rounded-2xl border border-gray-800 shadow-xl flex flex-col items-center">
          <img 
            src="https://res.cloudinary.com/dcgkov1em/image/upload/v1791118593/bdrlogosnobg_txnuak.png" 
            alt="BDR Logo" 
            className="h-20 w-auto object-contain drop-shadow-lg mb-3"
          />
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">Application Guide & Documentation</h2>
          <p className="text-gray-400 text-sm mt-2 max-w-2xl mx-auto">
            Comprehensive reference for Plant Breakdown Reporting, Safety Lockout Job Tickets, and Morning Meeting Utilization Tracking.
          </p>
        </div>

        <div className="space-y-10">

          {/* SECTION: MEETING OVERVIEW */}
          <section id="meeting-overview">
            <div className="flex items-center gap-2 border-b-2 border-blue-500/40 pb-2 mb-4">
              <BarChart3 className="h-6 w-6 text-blue-400" />
              <h2 className="text-2xl font-black text-white tracking-tight">Meeting Overview & Utilization Tracker</h2>
            </div>

            <InstructionCard 
              title="Equipment Utilization Timeline" 
              icon={<BarChart3 className="h-5 w-5 text-blue-400" />}
              badge="New Feature"
              badgeColor="bg-blue-950 text-blue-300 border-blue-800"
            >
              <p>
                The <span className="font-bold text-blue-400">"Meeting Overview 📊"</span> tab provides a high-level 24-hour visualization comparing equipment downtime against maintenance isolation bookings. Designed specifically for morning production review meetings.
              </p>
              <div className="grid sm:grid-cols-2 gap-3 mt-3 pt-2 border-t border-gray-700/60">
                <div className="bg-gray-900/70 p-3 rounded-lg border border-gray-800">
                  <div className="flex items-center gap-2 text-xs font-black text-red-400 mb-1">
                    <span className="h-3 w-5 bg-red-600 rounded"></span> Active Downtime / Breakdowns
                  </div>
                  <p className="text-xs text-gray-400">
                    Red-striped bars show exact breakdown duration, from reporting time until resolution or completion.
                  </p>
                </div>
                <div className="bg-gray-900/70 p-3 rounded-lg border border-gray-800">
                  <div className="flex items-center gap-2 text-xs font-black text-amber-400 mb-1">
                    <span className="h-3 w-5 bg-amber-500 rounded"></span> Padlock Lockouts (Job Tickets)
                  </div>
                  <p className="text-xs text-gray-400">
                    Amber (Locked) and Green (Returned/OK) striped bars show artisan isolation padlock sessions.
                  </p>
                </div>
              </div>
            </InstructionCard>

            <InstructionCard 
              title="Interactive Timeline Controls & Pop-Out Mode" 
              icon={<Maximize2 className="h-5 w-5 text-indigo-400" />}
            >
              <ul className="list-disc list-inside space-y-2 pl-1">
                <li>
                  <span className="font-bold text-white">Hover for Duration:</span> Hovering over any breakdown or lockout bar displays the exact computed duration (e.g. <span className="text-blue-300 font-mono">2h 15m</span>) and timestamps.
                </li>
                <li>
                  <span className="font-bold text-white">Click for Complete Description:</span> Clicking any timeline block opens a slide-in <span className="text-amber-300 font-semibold">Detail Toast Popup</span> showing reported fault details, artisan notes, employee numbers, and test outcomes.
                </li>
                <li>
                  <span className="font-bold text-white">Sticky Column & Smooth Scrolling:</span> The equipment name column stays pinned on the left as you scroll horizontally across all 24 hourly time slots.
                </li>
                <li>
                  <span className="font-bold text-white">Shift Windows:</span> Switch between <span className="text-gray-200 font-medium">24h Production Day (06:00-06:00)</span>, <span className="text-gray-200 font-medium">Day Shift (06:00-18:00)</span>, and <span className="text-gray-200 font-medium">Night Shift (18:00-06:00)</span>.
                </li>
                <li>
                  <span className="font-bold text-indigo-300">Pop Out Presentation:</span> Click <span className="bg-gray-700 text-white font-bold px-1.5 py-0.5 rounded text-xs">POP OUT PRESENTATION</span> to open an immersive, distraction-free fullscreen view formatted for boardroom projectors.
                </li>
                <li>
                  <span className="font-bold text-blue-300">Export Screenshot:</span> Click <span className="bg-blue-600 text-white font-bold px-1.5 py-0.5 rounded text-xs">EXPORT SCREENSHOT</span> to instantly download a high-resolution PNG capture of the timeline for handover logs.
                </li>
              </ul>
            </InstructionCard>
          </section>

          {/* SECTION: JOB TICKETS & LOCKOUTS */}
          <section id="job-tickets">
            <div className="flex items-center gap-2 border-b-2 border-amber-500/40 pb-2 mb-4">
              <Lock className="h-6 w-6 text-amber-400" />
              <h2 className="text-2xl font-black text-white tracking-tight">Job Tickets (Safety Isolation & Lockouts)</h2>
            </div>

            <InstructionCard 
              title="Booking a Safety Isolation (Locking Out Equipment)" 
              icon={<Lock className="h-5 w-5 text-amber-500" />}
              badge="Safety Critical"
              badgeColor="bg-amber-950 text-amber-300 border-amber-800"
            >
              <p>
                Artisans, Schedulers, and Supervisors use the <span className="font-bold text-amber-400">"Job Tickets 🔒"</span> tab to formally record and audit physical padlock isolations:
              </p>
              <ul className="list-disc list-inside space-y-2 pl-1">
                <li>
                  Click <span className="font-bold text-amber-400">"+ BOOK LOCKOUT"</span> on the Job Tickets dashboard or directly on any equipment track in the Meeting Overview.
                </li>
                <li>
                  <span className="font-bold text-white">Link to Active Breakdown:</span> You can select an active breakdown to automatically pre-fill the equipment tag, plant area, and scope of work description.
                </li>
                <li>
                  <span className="font-bold text-white">Booked Duration:</span> Specify expected isolation duration (<span className="text-gray-300 font-mono">30 mins to 12 hours</span>, or <span className="text-gray-300 font-mono">Unspecified</span>). Active lockouts display a live countdown timer.
                </li>
                <li>
                  <span className="font-bold text-white">Employee Identification:</span> Your Employee Number is mandatory to ensure verified traceability of the safety padlock.
                </li>
              </ul>
            </InstructionCard>

            <InstructionCard 
              title="Safe Handover, Testing & Unlocking (Returning Equipment)" 
              icon={<Unlock className="h-5 w-5 text-green-500" />}
              badge="Mandatory Protocol"
              badgeColor="bg-green-950 text-green-300 border-green-800"
            >
              <p>
                When maintenance work is finished and the physical padlock is removed, the isolation ticket must be formally closed:
              </p>
              <ul className="list-disc list-inside space-y-2 pl-1">
                <li>
                  Click <span className="font-bold text-green-400">"UNLOCK & RETURN"</span> on the active locked ticket card or inside the Meeting Overview detail toast.
                </li>
                <li>
                  <span className="font-bold text-white">Test Run Outcome:</span> Select whether the equipment test run was <span className="text-green-400 font-bold">Tested & OK</span> or <span className="text-red-400 font-bold">Failed Test</span>.
                </li>
                <li>
                  <span className="font-bold text-white">Handback Notes:</span> Record handover comments, control handback details, or remaining advisory notes.
                </li>
                <li>
                  <span className="font-bold text-yellow-300">Mandatory Verification Checklist:</span> The returning artisan must check the required declaration:
                  <div className="bg-yellow-950/30 border border-yellow-800/60 p-2.5 rounded-lg text-xs text-yellow-200 font-semibold my-1.5 flex items-start gap-2">
                    <ShieldCheck className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
                    <span>"I solemnly verify that my lockout padlock has been unlocked/removed, and the equipment has been safely run and tested before handover back to production."</span>
                  </div>
                </li>
                <li>
                  Provide the returning <span className="font-bold text-white">Employee Number</span> to complete the sign-off.
                </li>
              </ul>
            </InstructionCard>
          </section>

          {/* SECTION: GENERAL FEATURES */}
          <section id="general-tools">
            <div className="flex items-center gap-2 border-b-2 border-gray-700 pb-2 mb-4">
              <Layers className="h-6 w-6 text-gray-400" />
              <h2 className="text-2xl font-black text-white tracking-tight">General & Workflow Features</h2>
            </div>
            
            <InstructionCard title="Messaging the Administrator" icon={<FileText className="h-5 w-5 text-purple-400" />}>
              <p>Need support or need to request a configuration change? Use the <span className="font-semibold text-purple-400">"Msg Admin"</span> button in the top header.</p>
              <ul className="list-disc list-inside space-y-1.5 pl-1">
                <li>Select a category (e.g., "Add User", "Report Bug", "Plant Area Request").</li>
                <li>Toggle <span className="font-semibold text-white">"Require reply"</span> if you need a direct response.</li>
                <li>Admins receive instant notifications on their management console.</li>
              </ul>
            </InstructionCard>

            <InstructionCard title="Copying & Exporting Data" icon={<FileText className="h-5 w-5 text-green-400" />}>
              <p>Moving data to Excel, SAP, or reporting systems is fast and flexible:</p>
              <ul className="list-disc list-inside space-y-1.5 pl-1">
                <li><span className="font-semibold text-blue-400">Quick-Copy Cells:</span> Hover over FG Numbers or Fault descriptions to copy values directly to clipboard.</li>
                <li><span className="font-semibold text-green-400">CSV Exports:</span> In "History" and "Daily Report", use the <span className="font-semibold text-green-400">"Export"</span> button for Excel-compatible spreadsheets.</li>
                <li><span className="font-semibold text-purple-400">Hand Over Table:</span> Use <span className="font-semibold text-purple-400">"Copy Table"</span> to copy structured shift handover data ready for pasting.</li>
              </ul>
            </InstructionCard>
          </section>

          {/* SECTION: ROLES */}
          <section id="roles-workflow">
            <div className="flex items-center gap-2 border-b-2 border-gray-700 pb-2 mb-4">
              <ShieldCheck className="h-6 w-6 text-emerald-400" />
              <h2 className="text-2xl font-black text-white tracking-tight">Role-Based Responsibilities</h2>
            </div>

            <InstructionCard title="Process Control Reporters" icon={<AlertTriangle className="h-5 w-5 text-red-400" />}>
              <ul className="list-disc list-inside space-y-2 pl-1">
                <li><span className="font-semibold text-blue-400">Reporting Faults:</span> Click "Create New Report", provide Equipment Name, FG/Tag Number, Fault details, and Urgency rating (1 to 10).</li>
                <li><span className="font-semibold text-white">Lifecycle Tracking:</span> Track status changes from <span className="text-red-400 font-bold">Active</span> → <span className="text-yellow-400 font-bold">Assigned</span> → <span className="text-blue-400 font-bold">Resolved</span>.</li>
                <li><span className="font-semibold text-green-400">Final Confirmation:</span> Once an artisan resolves a fault, verify equipment operation and click <span className="text-green-400 font-bold">"Mark Complete"</span> to close the ticket.</li>
                <li><span className="font-semibold text-gray-300">Report Again:</span> Quick-duplicate recurring faults using the "Report Again" button on existing reports.</li>
              </ul>
            </InstructionCard>

            <InstructionCard title="Schedulers & Coordinators" icon={<CheckCircle2 className="h-5 w-5 text-blue-400" />}>
              <ul className="list-disc list-inside space-y-2 pl-1">
                <li><span className="font-semibold text-white">Dashboard Supervision:</span> Monitor active breakdowns across all plant areas in the current production window.</li>
                <li><span className="font-semibold text-blue-400">Artisan Assignment:</span> Assign notifications (SAP numbers) and designate one or multiple trade artisans (Mechanical, Electrical, Instrumentation).</li>
                <li><span className="font-semibold text-yellow-400">Shift Hand Over:</span> Unfinished jobs marked "Given to dayshift" move into the persistent Hand Over tab with red badge alerts.</li>
                <li><span className="font-semibold text-indigo-400">In-Place Quick Adjust:</span> Click directly on assign/resolve time stamps on the dashboard for instant time corrections.</li>
              </ul>
            </InstructionCard>
          </section>

        </div>

        {/* Footer & License Information */}
        <div className="mt-16 pt-8 border-t border-gray-750 text-center">
          <p className="text-gray-400 text-sm mb-2">&copy; 2026 Ben Nortje t/a Bendesign. All Rights Reserved.</p>
          <p className="text-gray-500 text-xs mb-8 max-w-2xl mx-auto">
            Breakdown Reporter & Utilization Tracker independently designed and developed by Ben Nortje (Bendesign).
          </p>
          
          <div className="text-left bg-gray-900/70 p-6 rounded-xl border border-gray-800 mx-auto max-w-3xl shadow-inner">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-gray-300 font-bold mb-2 text-xs uppercase tracking-wider">Licence Status</h4>
                <p className="text-gray-400 text-xs leading-relaxed">
                  Grootegeluk Mine (Exxaro) holds a non-exclusive, non-transferable licence to use this software for internal business operations. While the Developer remains an employee of the Mine, this licence is provided on a royalty-free basis.
                </p>
              </div>
              <div>
                <h4 className="text-gray-300 font-bold mb-2 text-xs uppercase tracking-wider">Key Terms</h4>
                <ul className="space-y-1.5 text-xs text-gray-400">
                  <li><span className="text-blue-400 font-semibold">Ownership:</span> All intellectual property, source code, and logic remain the sole property of the Developer.</li>
                  <li><span className="text-blue-400 font-semibold">Restrictions:</span> Unauthorised copying, redistribution, or reverse-engineering is strictly prohibited.</li>
                  <li><span className="text-blue-400 font-semibold">Commercial Freedom:</span> The Developer reserves the right to market and license this software to other entities.</li>
                </ul>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-gray-800 text-center">
              <p className="text-xs text-gray-500 italic">
                For support, custom features, or commercial enquiries, please contact the Developer directly. <strong>WhatsApp 0795255106</strong>
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AboutView;

