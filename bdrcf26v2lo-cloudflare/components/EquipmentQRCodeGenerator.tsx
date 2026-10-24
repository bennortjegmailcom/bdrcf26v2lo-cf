import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';

import { INITIAL_WORK_GROUPS } from '../constants';
import { 
  QrCode, 
  Download, 
  Printer, 
  ExternalLink, 
  Copy, 
  Check, 
  MapPin, 
  Sparkles, 
  Grid
} from 'lucide-react';

interface AreaItem {
  id: string;
  name: string;
  description: string;
  bgHex: string;
}

const COLOR_PALETTE = [
  '#1e3a8a', '#0d9488', '#7c3aed', '#2563eb', 
  '#059669', '#d97706', '#0891b2', '#4f46e5', 
  '#9333ea', '#dc2626', '#ca8a04', '#475569'
];

const getAreaColor = (name: string, index: number) => {
  return COLOR_PALETTE[index % COLOR_PALETTE.length];
};

export const EquipmentQRCodeGenerator: React.FC = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});

  // Dynamic WorkGroups / Areas from Database
  const [areas, setAreas] = useState<AreaItem[]>(() => {
    try {
      const cached = localStorage.getItem('cache_workgroups');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((w: any, idx: number) => ({
            id: w.name || w.id,
            name: `${w.name || w.id} Area`,
            description: `Scan-point for ${w.name || w.id} area breakdown reporting.`,
            bgHex: getAreaColor(w.name || w.id, idx)
          }));
        }
      }
    } catch {}
    return INITIAL_WORK_GROUPS.map((w, idx) => ({
      id: w.name,
      name: `${w.name} Area`,
      description: `Scan-point for ${w.name} area breakdown reporting.`,
      bgHex: getAreaColor(w.name, idx)
    }));
  });

// Read workgroups from localStorage
  useEffect(() => {
    const updateFromCache = () => {
      try {
        const cached = localStorage.getItem('cache_workgroups');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const list = parsed.map((w: any, idx: number) => {
              const name = w.name || w.id;
              return {
                id: name,
                name: `${name} Area`,
                description: `Scan-point for ${name} area breakdown reporting.`,
                bgHex: getAreaColor(name, idx)
              };
            });
            setAreas(list);
          }
        }
      } catch (err) {
        console.warn("Error reading cache_workgroups:", err);
      }
    };
    updateFromCache();
    window.addEventListener('storage', updateFromCache);
    return () => window.removeEventListener('storage', updateFromCache);
  }, []);

  // Safe window origin resolver
  const getOrigin = () => {
    return typeof window !== 'undefined' ? window.location.origin : '';
  };

  const getTargetUrl = (areaId: string) => {
    return `${getOrigin()}/field-report?area=${encodeURIComponent(areaId)}`;
  };

  // Generate QR codes for all areas in database
  useEffect(() => {
    const generateQRs = async () => {
      const urls: Record<string, string> = {};
      for (const area of areas) {
        try {
          const url = getTargetUrl(area.id);
          const dataUrl = await QRCode.toDataURL(url, {
            width: 320,
            margin: 2,
            color: {
              dark: '#0f172a',
              light: '#ffffff',
            },
            errorCorrectionLevel: 'H'
          });
          urls[area.id] = dataUrl;
        } catch (err) {
          console.error(`Error generating QR for area ${area.name}:`, err);
        }
      }
      setQrDataUrls(urls);
    };

    generateQRs();
  }, [areas]);

  const handleCopyLink = (areaId: string) => {
    const url = getTargetUrl(areaId);
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(areaId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  // Download high-resolution PNG placard for the entire Area
  const handleDownloadPNG = (area: AreaItem) => {
    const qrImageSrc = qrDataUrls[area.id];
    if (!qrImageSrc) return;

    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 750;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Decorative outer border
    ctx.strokeStyle = area.bgHex;
    ctx.lineWidth = 14;
    ctx.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);

    // Top Header Banner
    ctx.fillStyle = area.bgHex;
    ctx.fillRect(16, 16, canvas.width - 32, 85);

    // Header Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BREAKDOWN REPORTING POINT', canvas.width / 2, 68);

    // Area Title
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 36px system-ui, -apple-system, sans-serif';
    ctx.fillText(area.name.toUpperCase(), canvas.width / 2, 155);

    // Subtitle
    ctx.fillStyle = '#475569';
    ctx.font = 'bold 18px monospace, sans-serif';
    ctx.fillText('PLANT AREA DISPATCH SCAN-POINT', canvas.width / 2, 200);

    // Draw Logo & QR Code image
    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    
    const qrImg = new Image();
    
    logoImg.onload = () => {
      // Draw BDR Logo on left side of header banner
      ctx.drawImage(logoImg, 30, 24, 70, 70);
      
      qrImg.onload = () => {
        ctx.drawImage(qrImg, 130, 225, 340, 340);

        // Bottom Instruction Card
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(40, 585, canvas.width - 80, 115);

        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 2;
        ctx.strokeRect(40, 585, canvas.width - 80, 115);

        ctx.fillStyle = '#0f172a';
        ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
        ctx.fillText('SCAN TO REPORT BREAKDOWN IN THIS AREA', canvas.width / 2, 622);

        ctx.fillStyle = '#64748b';
        ctx.font = '14px system-ui, -apple-system, sans-serif';
        ctx.fillText('Instantly loads breakdown dispatcher with Area pre-locked', canvas.width / 2, 650);
        ctx.fillText(`Area Dispatch ID: ${area.id}`, canvas.width / 2, 675);

        // Trigger actual download
        const pngData = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.download = `${area.id}_Area_Dispatch_QR.png`;
        downloadLink.href = pngData;
        downloadLink.click();
      };
      qrImg.src = qrImageSrc;
    };
    logoImg.src = 'https://res.cloudinary.com/dcgkov1em/image/upload/v1791118602/bdrlogo_xilrzb.png';
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 text-gray-100">
      
      {/* Header & Controls Toolbar */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 shadow-lg flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <img 
            src="https://res.cloudinary.com/dcgkov1em/image/upload/v1791118593/bdrlogosnobg_txnuak.png" 
            alt="BDR Logo" 
            className="h-10 w-auto object-contain shrink-0"
          />
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <QrCode className="w-5 h-5 text-blue-400" />
              Area QR Code Generator
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Generate, preview, and print physical placard scan-points linked directly to <code className="text-blue-300 font-mono">/field-report?area={'{id}'}</code>
            </p>
          </div>
        </div>

        <button
          onClick={handlePrint}
          className="px-4.5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 transition cursor-pointer shadow-md shadow-blue-600/20 active:scale-[0.98] self-stretch md:self-auto"
        >
          <Printer className="w-4 h-4" />
          <span>Print All Area Placards</span>
        </button>
      </div>

      {/* Grid of Area QR Placards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:grid-cols-3 print:gap-6">
        {areas.map((area) => {
          const qrImage = qrDataUrls[area.id];
          const targetUrl = getTargetUrl(area.id);
          const isCopied = copiedId === area.id;

          return (
            <div 
              key={area.id}
              className="bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-2xl p-5 flex flex-col justify-between shadow-md transition break-inside-avoid print:border-2 print:border-black print:bg-white print:text-black print:p-4"
              style={{ borderTop: `4px solid ${area.bgHex}` }}
            >
              
              {/* Header Information */}
              <div className="space-y-2">
                <div className="flex justify-between items-start">
                  <span 
                    className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full text-white border print:border-black print:text-black print:bg-gray-100"
                    style={{ backgroundColor: `${area.bgHex}25`, borderColor: `${area.bgHex}50` }}
                  >
                    {area.id} Section
                  </span>
                  <span className="text-[10px] font-mono text-gray-500 print:text-gray-700">
                    ID: {area.id}
                  </span>
                </div>

                <h3 className="text-lg font-bold text-white tracking-tight leading-snug print:text-black">
                  {area.name} Placard
                </h3>

                <p className="text-xs text-gray-400 leading-relaxed print:text-gray-700">
                  {area.description}
                </p>
              </div>

              {/* Center QR Code */}
              <div className="my-5 flex flex-col items-center justify-center p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                {qrImage ? (
                  <img 
                    src={qrImage} 
                    alt={`QR code for ${area.name}`}
                    className="w-44 h-44 object-contain"
                  />
                ) : (
                  <div className="w-44 h-44 flex items-center justify-center bg-gray-100 text-gray-400 text-xs animate-pulse">
                    Generating QR...
                  </div>
                )}

                <span className="text-[10px] text-slate-500 font-bold mt-1.5 uppercase tracking-wider print:text-black">
                  Scan to Report Breakdown
                </span>
              </div>

              {/* Target URL Preview */}
              <div className="text-[10px] font-mono text-gray-400 bg-gray-950 border border-gray-800 p-2 rounded-lg truncate mb-4 print:border-gray-300 print:bg-gray-50 print:text-black">
                <span className="text-gray-500 print:text-gray-700">Link: </span>
                {targetUrl}
              </div>

              {/* Card Actions (Hidden when printing) */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-800 print:hidden">
                
                {/* Download PNG Button */}
                <button
                  type="button"
                  onClick={() => handleDownloadPNG(area)}
                  className="h-9 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition cursor-pointer shadow-sm active:scale-[0.98]"
                  title="Download high-resolution printable PNG placard"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PNG</span>
                </button>

                {/* Copy Link Button */}
                <button
                  type="button"
                  onClick={() => handleCopyLink(area.id)}
                  className="h-9 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition cursor-pointer"
                  title="Copy QR target URL"
                >
                  {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied ? 'Copied' : 'Copy'}</span>
                </button>

                {/* Open Link Test */}
                <a
                  href={targetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-9 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1 transition"
                  title="Test Field Report URL"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                  <span>Test</span>
                </a>

              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
};

export default EquipmentQRCodeGenerator;
