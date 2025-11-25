import React, { useEffect, useRef, useState } from 'react';
import { Socket } from 'socket.io-client';

interface WhiteboardProps {
  socket: Socket | null;
  lectureId: number;
  isReadOnly: boolean;
  onClose: () => void;
}

interface Point {
  x: number;
  y: number;
}

interface DrawData {
  prevPoint: Point | null;
  currentPoint: Point;
  color: string;
  width: number;
}

const Whiteboard: React.FC<WhiteboardProps> = ({ socket, lectureId, isReadOnly, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(2);
  const prevPoint = useRef<Point | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current?.parentElement) {
        setCanvasSize({
          width: canvasRef.current.parentElement.clientWidth,
          height: canvasRef.current.parentElement.clientHeight
        });
      }
    };

    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = canvasSize.width;
    canvas.height = canvasSize.height;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
    }

    // Request existing state
    if (socket) {
      socket.emit('request-whiteboard-state', { lectureId });
    }
  }, [canvasSize, socket, lectureId]);

  useEffect(() => {
    if (!socket) return;

    const handleDraw = (data: DrawData) => {
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;

      drawLine(ctx, data.prevPoint, data.currentPoint, data.color, data.width);
    };

    const handleClear = () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    const handleState = (data: { history: DrawData[] }) => {
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;
      
      data.history.forEach(item => {
        drawLine(ctx, item.prevPoint, item.currentPoint, item.color, item.width);
      });
    };

    socket.on('whiteboard-draw', handleDraw);
    socket.on('whiteboard-clear', handleClear);
    socket.on('whiteboard-state', handleState);

    return () => {
      socket.off('whiteboard-draw', handleDraw);
      socket.off('whiteboard-clear', handleClear);
      socket.off('whiteboard-state', handleState);
    };
  }, [socket]);

  const drawLine = (
    ctx: CanvasRenderingContext2D,
    start: Point | null,
    end: Point,
    strokeColor: string,
    strokeWidth: number
  ) => {
    start = start ?? end;
    ctx.beginPath();
    ctx.lineWidth = strokeWidth;
    ctx.strokeStyle = strokeColor;
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.closePath();
  };

  const getPoint = (e: React.MouseEvent | React.TouchEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (isReadOnly) return;
    setIsDrawing(true);
    prevPoint.current = getPoint(e);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || isReadOnly || !socket) return;

    const currentPoint = getPoint(e);
    const ctx = canvasRef.current?.getContext('2d');

    if (ctx && prevPoint.current) {
      drawLine(ctx, prevPoint.current, currentPoint, color, lineWidth);

      socket.emit('whiteboard-draw', {
        lectureId,
        drawingData: {
          prevPoint: prevPoint.current,
          currentPoint,
          color,
          width: lineWidth
        }
      });

      prevPoint.current = currentPoint;
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    prevPoint.current = null;
  };

  const clearBoard = () => {
    if (isReadOnly || !socket) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      socket.emit('whiteboard-clear', { lectureId });
    }
  };

  return (
    <div className="whiteboard-container" style={{ 
      position: 'absolute', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      backgroundColor: 'white', 
      zIndex: 100,
      display: 'flex',
      flexDirection: 'column'
    }}>
      <div className="whiteboard-toolbar" style={{
        padding: '10px',
        borderBottom: '1px solid #ddd',
        display: 'flex',
        gap: '10px',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {!isReadOnly && (
            <>
              <input 
                type="color" 
                value={color} 
                onChange={(e) => setColor(e.target.value)}
                title="Color"
              />
              <select 
                value={lineWidth} 
                onChange={(e) => setLineWidth(Number(e.target.value))}
                style={{ padding: '4px', borderRadius: '4px' }}
                title="Brush Size"
              >
                <option value="2">Thin</option>
                <option value="5">Medium</option>
                <option value="10">Thick</option>
              </select>
              <button 
                onClick={() => setColor('#ffffff')} 
                style={{ 
                  padding: '4px 8px', 
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  background: color === '#ffffff' ? '#e9ecef' : 'white'
                }}
                title="Eraser"
              >
                Eraser
              </button>
              <button 
                onClick={clearBoard}
                style={{ 
                  padding: '4px 8px', 
                  borderRadius: '4px',
                  border: '1px solid #dc3545',
                  background: 'white',
                  color: '#dc3545'
                }}
              >
                Clear All
              </button>
            </>
          )}
          {isReadOnly && <span style={{ color: '#666' }}>View Only Mode</span>}
        </div>
        <button 
          onClick={onClose}
          style={{
            padding: '4px 12px',
            borderRadius: '4px',
            border: 'none',
            background: '#6c757d',
            color: 'white',
            cursor: 'pointer'
          }}
        >
          Close Whiteboard
        </button>
      </div>
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          style={{ 
            touchAction: 'none',
            cursor: isReadOnly ? 'default' : 'crosshair'
          }}
        />
      </div>
    </div>
  );
};

export default Whiteboard;