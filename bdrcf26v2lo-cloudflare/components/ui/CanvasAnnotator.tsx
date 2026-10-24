import React, { useRef, useState, useEffect } from 'react';

interface CanvasAnnotatorProps {
  imageUrl: string;
  onSave: (annotatedBase64: string) => void;
  onCancel: () => void;
}

const COLORS = [
  { name: 'Safety Red', value: '#EF4444' },
  { name: 'Safety Amber', value: '#F59E0B' },
  { name: 'Safety Green', value: '#10B981' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'White', value: '#FFFFFF' },
];

const BRUSH_SIZES = [
  { label: 'Fine', value: 3 },
  { label: 'Medium', value: 6 },
  { label: 'Thick', value: 12 },
];

const CanvasAnnotator: React.FC<CanvasAnnotatorProps> = ({ imageUrl, onSave, onCancel }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [color, setColor] = useState('#EF4444');
  const [brushSize, setBrushSize] = useState(6);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<string[]>([]);
  const imageRef = useRef<HTMLImageElement | null>(null);

  // Initialize and scale canvas to fit image and container
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    img.onload = () => {
      imageRef.current = img;
      resizeAndDraw();
    };
  }, [imageUrl]);

  const resizeAndDraw = () => {
    const img = imageRef.current;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!img || !canvas || !container) return;

    // Calculate maximum bounding dimensions inside the container
    const maxWidth = Math.min(container.clientWidth, 800);
    const maxHeight = 500;

    let width = img.width;
    let height = img.height;

    // Keep aspect ratio
    const ratio = width / height;
    if (width > maxWidth) {
      width = maxWidth;
      height = width / ratio;
    }
    if (height > maxHeight) {
      height = maxHeight;
      width = height * ratio;
    }

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(img, 0, 0, width, height);
      // Save initial blank state to history
      setHistory([canvas.toDataURL()]);
    }
  };

  // Redraw when screen sizes change (e.g., responsive rotations)
  useEffect(() => {
    const handleResize = () => {
      // Avoid destroying existing drawings on minor resize, but adjust layout
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    
    // Check if touch event
    if ('touches' in e) {
      if (e.touches.length === 0) return null;
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    } else {
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const coords = getCoordinates(e);
    if (!coords) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.beginPath();
      ctx.moveTo(coords.x, coords.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      setIsDrawing(true);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const coords = getCoordinates(e);
    if (!coords) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.lineTo(coords.x, coords.y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      // Save current state to history for undo
      const dataUrl = canvas.toDataURL();
      setHistory((prev) => [...prev, dataUrl]);
    }
  };

  const handleUndo = () => {
    if (history.length <= 1) return; // Can't undo initial image state
    const newHistory = history.slice(0, -1);
    setHistory(newHistory);

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      const img = new Image();
      img.src = newHistory[newHistory.length - 1];
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
      };
    }
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const img = imageRef.current;
    if (canvas && ctx && img) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      setHistory([canvas.toDataURL()]);
    }
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      onSave(dataUrl);
    }
  };

  return (
    <div className="flex flex-col bg-gray-950 rounded-lg overflow-hidden border border-gray-800 shadow-2xl max-w-4xl w-full mx-auto">
      {/* Top Banner Control Header */}
      <div className="bg-gray-900 px-4 py-3 border-b border-gray-800 flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-400">MARKUP TOOL:</span>
          {/* Colors */}
          <div className="flex items-center gap-1.5">
            {COLORS.map((col) => (
              <button
                key={col.value}
                type="button"
                onClick={() => setColor(col.value)}
                className={`w-6 h-6 rounded-full border-2 transition ${
                  color === col.value ? 'border-white scale-110' : 'border-transparent hover:scale-105'
                }`}
                style={{ backgroundColor: col.value }}
                title={col.name}
              />
            ))}
          </div>
          <span className="h-4 w-px bg-gray-800 hidden sm:inline" />
          {/* Sizes */}
          <div className="hidden sm:flex items-center gap-1 bg-gray-950 p-0.5 rounded border border-gray-800">
            {BRUSH_SIZES.map((size) => (
              <button
                key={size.value}
                type="button"
                onClick={() => setBrushSize(size.value)}
                className={`px-2 py-1 text-[10px] font-bold rounded transition ${
                  brushSize === size.value
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                {size.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleUndo}
            disabled={history.length <= 1}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 text-xs font-bold rounded text-gray-200 transition"
          >
            Undo
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="px-3 py-1.5 bg-red-950/40 hover:bg-red-950/80 text-red-400 text-xs font-bold rounded transition"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Main Interactive Drawing Canvas Area */}
      <div ref={containerRef} className="bg-gray-900/60 p-4 flex items-center justify-center min-h-[300px] overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="bg-gray-950 rounded shadow-inner cursor-crosshair max-w-full border border-gray-800 touch-none"
        />
      </div>

      {/* Bottom Actions */}
      <div className="bg-gray-900 px-4 py-3 border-t border-gray-800 flex justify-end gap-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm text-gray-400 hover:text-white transition"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-sm transition"
        >
          Apply Markup
        </button>
      </div>
    </div>
  );
};

export default CanvasAnnotator;
