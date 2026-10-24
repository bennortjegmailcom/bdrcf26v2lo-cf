import React, { useState } from 'react';
import { 
  QrCode, 
  FileText, 
  ShieldCheck, 
  MessageSquare
} from 'lucide-react';
import WhatsAppContactModal from './modals/WhatsAppContactModal';
import TermsAndPrivacyModal from './modals/TermsAndPrivacyModal';

export const AppFooter: React.FC = () => {
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState(false);
  const [isTermsPrivacyOpen, setIsTermsPrivacyOpen] = useState(false);
  const [termsPrivacyTab, setTermsPrivacyTab] = useState<'terms' | 'privacy'>('terms');

  const openTerms = () => {
    setTermsPrivacyTab('terms');
    setIsTermsPrivacyOpen(true);
  };

  const openPrivacy = () => {
    setTermsPrivacyTab('privacy');
    setIsTermsPrivacyOpen(true);
  };

  const currentYear = new Date().getFullYear();

  return (
    <>
      <footer 
        className="fixed bottom-0 left-0 right-0 z-40 bg-gray-950/90 backdrop-blur-md border-t border-gray-800 text-gray-400 py-1.5 px-3 sm:px-4 text-[11px] leading-tight select-none print:hidden shadow-lg shadow-black/40"
        role="contentinfo"
      >
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          {/* Left Side: Live Operational Status, App Name, Copyright */}
          <div className="flex items-center gap-2">
            {/* Live Operational Status Indicator (green pulse dot) */}
            <div className="flex items-center gap-1.5 font-medium" title="All real-time telemetry systems operational">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-emerald-400 font-semibold tracking-wider uppercase text-[10px]">
                Operational
              </span>
            </div>

            <span className="text-gray-700 hidden sm:inline">•</span>

            <span className="text-gray-300 font-semibold tracking-wide">
              Breakdown Reporter
            </span>

            <span className="text-gray-700 hidden sm:inline">•</span>

            <span className="text-gray-500 font-normal">
              &copy; {currentYear}
            </span>
          </div>

          {/* Right Side: Clickable Triggers Separated by Dividers */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* a) WhatsApp Trigger */}
            <button
              type="button"
              onClick={() => setIsWhatsAppOpen(true)}
              className="group flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-950/40 hover:bg-emerald-900/50 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-300 hover:text-emerald-200 transition-all cursor-pointer"
              title="Open WhatsApp Contact & QR Code"
            >
              <span className="relative flex items-center justify-center">
                <MessageSquare className="w-3 h-3 fill-emerald-500/30 text-emerald-400" />
              </span>
              <span className="font-semibold tracking-tight">WhatsApp 079 525 5106</span>
              <QrCode className="w-3 h-3 text-emerald-400/80 group-hover:text-emerald-300 transition-colors ml-0.5" />
            </button>

            {/* Divider */}
            <span className="text-gray-800" aria-hidden="true">|</span>

            {/* b) Terms & Conditions Trigger */}
            <button
              type="button"
              onClick={openTerms}
              className="group flex items-center gap-1 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer py-0.5 px-1 rounded hover:bg-gray-900/60"
              title="View Terms & Conditions"
            >
              <FileText className="w-3 h-3 text-gray-500 group-hover:text-gray-300 transition-colors" />
              <span className="hover:underline">Terms &amp; Conditions</span>
            </button>

            {/* Divider */}
            <span className="text-gray-800" aria-hidden="true">|</span>

            {/* c) Privacy Policy Trigger */}
            <button
              type="button"
              onClick={openPrivacy}
              className="group flex items-center gap-1 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer py-0.5 px-1 rounded hover:bg-gray-900/60"
              title="View Privacy Policy"
            >
              <ShieldCheck className="w-3 h-3 text-gray-500 group-hover:text-gray-300 transition-colors" />
              <span className="hover:underline">Privacy Policy</span>
            </button>
          </div>
        </div>
      </footer>

      {/* Pop-Out Modals */}
      <WhatsAppContactModal 
        isOpen={isWhatsAppOpen}
        onClose={() => setIsWhatsAppOpen(false)}
      />

      <TermsAndPrivacyModal 
        isOpen={isTermsPrivacyOpen}
        onClose={() => setIsTermsPrivacyOpen(false)}
        initialTab={termsPrivacyTab}
      />
    </>
  );
};

export default AppFooter;
