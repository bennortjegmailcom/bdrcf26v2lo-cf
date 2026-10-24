import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { 
  X, 
  MessageSquare, 
  QrCode, 
  ExternalLink, 
  Copy, 
  Check, 
  Phone, 
  Mail, 
  Sparkles,
  ShieldCheck
} from 'lucide-react';

interface WhatsAppContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface MessageChip {
  id: string;
  label: string;
  text: string;
}

const MESSAGE_CHIPS: MessageChip[] = [
  {
    id: 'general',
    label: 'General Inquiry',
    text: 'Hello, I have a general inquiry regarding the Breakdown Reporter system.'
  },
  {
    id: 'urgent',
    label: 'Urgent Breakdown',
    text: 'URGENT: Breakdown assistance required on equipment. Please assist immediately.'
  },
  {
    id: 'account',
    label: 'Access / Account Issue',
    text: 'Hi, I am experiencing an access or account issue on Breakdown Reporter.'
  },
  {
    id: 'feedback',
    label: 'System Feedback',
    text: 'Hello, I would like to submit feedback / suggestion for Breakdown Reporter.'
  }
];

const PHONE_RAW = '27795255106';
const PHONE_DISPLAY = '079 525 5106';
const PHONE_INTERNATIONAL = '+27 79 525 5106';
const SUPPORT_EMAIL = 'bendesign025@gmail.com';

export const WhatsAppContactModal: React.FC<WhatsAppContactModalProps> = ({
  isOpen,
  onClose
}) => {
  const [selectedChipId, setSelectedChipId] = useState<string | null>(null);
  const [customMessage, setCustomMessage] = useState<string>('');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  // Determine current active message text
  const activeMessage = selectedChipId
    ? MESSAGE_CHIPS.find(c => c.id === selectedChipId)?.text || customMessage
    : customMessage;

  // Compute WhatsApp link
  const waUrl = activeMessage.trim()
    ? `https://wa.me/${PHONE_RAW}?text=${encodeURIComponent(activeMessage.trim())}`
    : `https://wa.me/${PHONE_RAW}`;

  // Generate QR code when waUrl changes
  useEffect(() => {
    if (!isOpen) return;
    let isCurrent = true;

    QRCode.toDataURL(waUrl, {
      width: 280,
      margin: 2,
      color: {
        dark: '#022c22', // Very dark emerald
        light: '#ffffff'
      },
      errorCorrectionLevel: 'M'
    })
      .then(url => {
        if (isCurrent) setQrCodeDataUrl(url);
      })
      .catch(err => {
        console.error('Failed to generate WhatsApp QR code:', err);
      });

    return () => {
      isCurrent = false;
    };
  }, [waUrl, isOpen]);

  // Handle escape key to close
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleChipClick = (chip: MessageChip) => {
    if (selectedChipId === chip.id) {
      // Toggle off
      setSelectedChipId(null);
      setCustomMessage('');
    } else {
      setSelectedChipId(chip.id);
      setCustomMessage(chip.text);
    }
  };

  const copyToClipboard = async (text: string, type: 'phone' | 'email') => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      if (type === 'phone') {
        setCopiedPhone(true);
        setTimeout(() => setCopiedPhone(false), 2000);
      } else {
        setCopiedEmail(true);
        setTimeout(() => setCopiedEmail(false), 2000);
      }
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-lg bg-gray-900 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 bg-gray-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Direct WhatsApp Support</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Live Chat
                </span>
              </div>
              <p className="text-xs text-gray-400">Scan QR code or click to initiate direct mobile chat</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* QR Code and Quick Scan Section */}
          <div className="flex flex-col sm:flex-row items-center gap-5 bg-gray-950/50 border border-gray-800/80 p-4 rounded-xl">
            <div className="flex-shrink-0 bg-white p-2.5 rounded-xl shadow-lg border border-gray-200">
              {qrCodeDataUrl ? (
                <img 
                  src={qrCodeDataUrl} 
                  alt="WhatsApp Chat QR Code" 
                  className="w-40 h-40 object-contain block rounded"
                />
              ) : (
                <div className="w-40 h-40 flex items-center justify-center bg-gray-100 text-gray-400 rounded">
                  <QrCode className="w-8 h-8 animate-pulse text-gray-400" />
                </div>
              )}
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/40 border border-emerald-800/50 px-2.5 py-1 rounded-full">
                <Sparkles className="w-3.5 h-3.5" />
                Instant Camera Scan
              </div>
              <h4 className="text-sm font-semibold text-white">Connect on Mobile</h4>
              <p className="text-xs text-gray-400 leading-relaxed">
                Open your smartphone camera or WhatsApp scanner to immediately message support with your chosen inquiry.
              </p>
              <div className="text-[11px] text-gray-500">
                Number: <span className="text-gray-300 font-mono font-medium">{PHONE_DISPLAY}</span>
              </div>
            </div>
          </div>

          {/* Pre-filled Message Chips */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Select Pre-Filled Message (Optional)
              </label>
              {selectedChipId && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedChipId(null);
                    setCustomMessage('');
                  }}
                  className="text-[11px] text-gray-400 hover:text-white underline transition-colors"
                >
                  Clear Selection
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              {MESSAGE_CHIPS.map(chip => {
                const isSelected = selectedChipId === chip.id;
                return (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => handleChipClick(chip)}
                    className={`text-left p-2.5 rounded-xl border text-xs font-medium transition-all ${
                      isSelected
                        ? 'bg-emerald-950/50 border-emerald-500 text-emerald-200 shadow-sm shadow-emerald-950'
                        : 'bg-gray-800/70 border-gray-700/70 text-gray-300 hover:bg-gray-800 hover:border-gray-600 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold">{chip.label}</span>
                      {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                    </div>
                    <p className="text-[11px] text-gray-400 line-clamp-2">
                      {chip.text}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Target Link & Direct Action Button */}
          <div className="space-y-2">
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl font-bold text-sm bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white shadow-lg shadow-emerald-950/50 transition-all border border-emerald-400/30"
            >
              <MessageSquare className="w-4 h-4 fill-current" />
              <span>Open WhatsApp Web / App ({PHONE_INTERNATIONAL})</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>
          </div>

          {/* Quick Copy Contact Bar */}
          <div className="pt-2 border-t border-gray-800">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 mb-2">
              Direct Contact Details
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {/* Phone copy */}
              <button
                type="button"
                onClick={() => copyToClipboard(PHONE_DISPLAY, 'phone')}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-800/80 border border-gray-700/80 hover:bg-gray-800 hover:border-gray-600 text-xs text-gray-200 transition-colors"
              >
                <div className="flex items-center gap-2 truncate">
                  <Phone className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                  <span className="font-mono text-gray-200">{PHONE_DISPLAY}</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-gray-400 font-medium ml-2">
                  {copiedPhone ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </div>
              </button>

              {/* Email copy */}
              <button
                type="button"
                onClick={() => copyToClipboard(SUPPORT_EMAIL, 'email')}
                className="flex items-center justify-between px-3 py-2 rounded-lg bg-gray-800/80 border border-gray-700/80 hover:bg-gray-800 hover:border-gray-600 text-xs text-gray-200 transition-colors"
              >
                <div className="flex items-center gap-2 truncate">
                  <Mail className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                  <span className="font-mono text-gray-200 truncate">{SUPPORT_EMAIL}</span>
                </div>
                <div className="flex items-center gap-1 text-[11px] text-gray-400 font-medium ml-2 flex-shrink-0">
                  {copiedEmail ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer note */}
        <div className="px-5 py-3 bg-gray-950/80 border-t border-gray-800 flex items-center justify-between text-[11px] text-gray-400">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Authorized Plant Support Channel</span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppContactModal;
