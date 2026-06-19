import React, { useRef, useEffect, useState } from 'react';
import { AnnotationTool, BrushColor, CanvasBackground, WebcamFrame, VideoFilter, Stroke, Point, WebcamFrameStyle, WebcamBgEffect, WebcamReplaceType, WebcamPerformanceMode } from '../types';
import { 
  Trash2, Undo, Check, AlertCircle, GripHorizontal, Minimize2, Maximize2, 
  Type, Circle, Square, ArrowRight, Paintbrush, Zap, MousePointer, 
  Eye, EyeOff, Sparkles, HelpCircle
} from 'lucide-react';

interface WorkspaceCanvasProps {
  currentTool: AnnotationTool;
  brushColor: BrushColor;
  brushWidth: number;
  canvasBg: CanvasBackground;
  bgImageUrl?: string;
  webcamActive: boolean;
  webcamFrame: WebcamFrame;
  videoFilter: VideoFilter;
  webcamStream: MediaStream | null;
  onCanvasStreamReady: (stream: MediaStream) => void;
  isRecording: boolean;
  selectedFps?: number;

  // Sync callbacks to update parent state on toolbar click or hotkey triggers
  onToolChange?: (tool: AnnotationTool) => void;
  onColorChange?: (color: BrushColor) => void;
  onWeightChange?: (width: number) => void;
  onTogglePause?: () => void;
  onStopRecording?: () => void;

  // Phase 4 Webcam props
  webcamFrameStyle?: WebcamFrameStyle;
  webcamBgEffect?: WebcamBgEffect;
  webcamReplaceType?: WebcamReplaceType;
  webcamReplaceColor?: string;
  webcamReplaceImageUrl?: string;
  webcamMirrored?: boolean;
  webcamPerfMode?: WebcamPerformanceMode;
}

interface ClickRipple {
  x: number;
  y: number;
  startTime: number;
  duration: number;
}

// Convert colors to hex equivalents matching the Pointly design
const COLOR_MAP: Record<BrushColor, string> = {
  amber: '#FF7A33',
  green: '#4ADE80',
  white: '#F4F1EA',
  blue: '#38BDF8',
};

// Canvas Resolution constants for standard HD 16:9 recordings
const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;

export const WorkspaceCanvas: React.FC<WorkspaceCanvasProps> = ({
  currentTool,
  brushColor,
  brushWidth,
  canvasBg,
  bgImageUrl,
  webcamActive,
  webcamFrame,
  videoFilter,
  webcamStream,
  onCanvasStreamReady,
  isRecording,
  selectedFps = 60,
  onToolChange,
  onColorChange,
  onWeightChange,
  onTogglePause,
  onStopRecording,

  // Destructure Phase 4 props with robust custom defaults
  webcamFrameStyle = 'clean',
  webcamBgEffect = 'none',
  webcamReplaceType = 'color',
  webcamReplaceColor = '#10b981',
  webcamReplaceImageUrl = '',
  webcamMirrored = true,
  webcamPerfMode = 'high-quality',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isMouseInCanvas, setIsMouseInCanvas] = useState(false);

  // Drawing States (stored in refs for raw speed in requestAnimationFrame rendering loop)
  const strokesRef = useRef<Stroke[]>([]);
  const currentStrokePoints = useRef<Point[]>([]);
  const laserPoints = useRef<Point[]>([]);
  const ripplesRef = useRef<ClickRipple[]>([]);
  const isDrawing = useRef(false);
  const mouseCoords = useRef<Point>({ x: 0, y: 0, timestamp: 0 });

  // History for Undo operations (at least 10 actions)
  const [historyLength, setHistoryLength] = useState(0);

  // Phase 3 Options state
  const [showToolbar, setShowToolbar] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [floatingPos, setFloatingPos] = useState({ x: 24, y: 24 });
  const [enableClickHighlight, setEnableClickHighlight] = useState(true);

  // Text Tool Placement state
  const [activeTextInput, setActiveTextInput] = useState<{
    x: number;
    y: number;
    canvasX: number;
    canvasY: number;
  } | null>(null);
  const [textInputValue, setTextInputValue] = useState('');

  // Dragging states of the floating toolbar
  const toolbarDragStart = useRef<{ startX: number; startY: number; pos: { x: number; y: number } } | null>(null);

  // Webcam Position & Dragging (on-canvas coordination)
  const [webcamPos, setWebcamPos] = useState({ x: 1280 - 240 - 40, y: 720 - 240 - 40 }); // Bottom right default
  const [webcamSize, setWebcamSize] = useState(240); // Size/diameter in canvas px
  const [isHoveringWebcam, setIsHoveringWebcam] = useState(false);
  const [isHoveringResize, setIsHoveringResize] = useState(false);
  const [dragMode, setDragMode] = useState<'none' | 'move' | 'resize'>('none');
  
  const dragStartOffset = useRef({ x: 0, y: 0 });
  const dragStartPos = useRef({ x: 0, y: 0 });
  const dragStartSize = useRef(0);

  const [bgImageElement, setBgImageElement] = useState<HTMLImageElement | null>(null);

  // Phase 4 Webcam Effects & AI segmenter hooks
  const [segmenterReady, setSegmenterReady] = useState(false);
  const [segmenterLoading, setSegmenterLoading] = useState(false);
  const vbgImageElementRef = useRef<HTMLImageElement | null>(null);
  
  const selfieSegmentationRef = useRef<any>(null);
  const lastProcessedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const lastSendTimeRef = useRef<number>(0);

  // Sync mutable refs of props to avoid closure stalls inside callbacks
  const webcamBgEffectRef = useRef(webcamBgEffect);
  const webcamReplaceTypeRef = useRef(webcamReplaceType);
  const webcamReplaceColorRef = useRef(webcamReplaceColor);
  const webcamPerfModeRef = useRef(webcamPerfMode);

  useEffect(() => {
    webcamBgEffectRef.current = webcamBgEffect;
  }, [webcamBgEffect]);

  useEffect(() => {
    webcamReplaceTypeRef.current = webcamReplaceType;
  }, [webcamReplaceType]);

  useEffect(() => {
    webcamReplaceColorRef.current = webcamReplaceColor;
  }, [webcamReplaceColor]);

  useEffect(() => {
    webcamPerfModeRef.current = webcamPerfMode;
  }, [webcamPerfMode]);

  // Pre-load custom virtual background image
  useEffect(() => {
    if (webcamReplaceImageUrl) {
      const img = new Image();
      img.onload = () => {
        vbgImageElementRef.current = img;
      };
      img.src = webcamReplaceImageUrl;
    } else {
      vbgImageElementRef.current = null;
    }
  }, [webcamReplaceImageUrl]);

  // Load and construct SelfieSegmentation on active selection
  useEffect(() => {
    if (!webcamActive || webcamBgEffect === 'none') {
      return;
    }
    if (selfieSegmentationRef.current) {
      return;
    }

    let active = true;
    const loadSegmenter = async () => {
      setSegmenterLoading(true);
      try {
        if (!(window as any).SelfieSegmentation) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/selfie_segmentation.js';
            script.crossOrigin = 'anonymous';
            script.onload = () => resolve();
            script.onerror = (err) => reject(new Error('Failed to download MediaPipe segmenter script.'));
            document.head.appendChild(script);
          });
        }

        if (!active) return;

        const SelfieClass = (window as any).SelfieSegmentation;
        if (!SelfieClass) {
          throw new Error('SelfieSegmentation Class undefined on global window object.');
        }

        const segmenterInstance = new SelfieClass({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`
        });

        segmenterInstance.setOptions({
          modelSelection: 1, // landscape/selfie (very lightweight and fast)
        });

        let segmentedCanvas: HTMLCanvasElement | null = null;
        let cutoutCanvas: HTMLCanvasElement | null = null;

        segmenterInstance.onResults((results: any) => {
          if (!active) return;
          if (!results || !results.image) return;

          const w = results.image.width || 480;
          const h = results.image.height || 480;

          if (!segmentedCanvas) {
            segmentedCanvas = document.createElement('canvas');
            segmentedCanvas.width = w;
            segmentedCanvas.height = h;
          } else if (segmentedCanvas.width !== w || segmentedCanvas.height !== h) {
            segmentedCanvas.width = w;
            segmentedCanvas.height = h;
          }

          if (!cutoutCanvas) {
            cutoutCanvas = document.createElement('canvas');
            cutoutCanvas.width = w;
            cutoutCanvas.height = h;
          } else if (cutoutCanvas.width !== w || cutoutCanvas.height !== h) {
            cutoutCanvas.width = w;
            cutoutCanvas.height = h;
          }

          const sCtx = segmentedCanvas.getContext('2d');
          const cCtx = cutoutCanvas.getContext('2d');
          if (!sCtx || !cCtx) return;

          // Process cutout user
          cCtx.clearRect(0, 0, w, h);
          cCtx.drawImage(results.segmentationMask, 0, 0, w, h);
          cCtx.globalCompositeOperation = 'source-in';
          cCtx.drawImage(results.image, 0, 0, w, h);
          cCtx.globalCompositeOperation = 'source-over';

          // Composite background
          sCtx.clearRect(0, 0, w, h);
          if (webcamBgEffectRef.current === 'blur') {
            sCtx.save();
            sCtx.filter = 'blur(16px)';
            sCtx.drawImage(results.image, 0, 0, w, h);
            sCtx.restore();
          } else if (webcamBgEffectRef.current === 'replace') {
            if (webcamReplaceTypeRef.current === 'color') {
              sCtx.fillStyle = webcamReplaceColorRef.current || '#10b981';
              sCtx.fillRect(0, 0, w, h);
            } else if (webcamReplaceTypeRef.current === 'image' && vbgImageElementRef.current) {
              const img = vbgImageElementRef.current;
              const imgRatio = img.width / img.height;
              const targetRatio = w / h;
              let sw = img.width;
              let sh = img.height;
              let sx = 0;
              let sy = 0;
              if (imgRatio > targetRatio) {
                sw = img.height * targetRatio;
                sx = (img.width - sw) / 2;
              } else {
                sh = img.width / targetRatio;
                sy = (img.height - sh) / 2;
              }
              sCtx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
            } else {
              sCtx.fillStyle = webcamReplaceColorRef.current || '#10b981';
              sCtx.fillRect(0, 0, w, h);
            }
          }

          // Merge Cutout citizen on top
          sCtx.drawImage(cutoutCanvas, 0, 0, w, h);

          lastProcessedCanvasRef.current = segmentedCanvas;
          lastFrameTimeRef.current = Date.now();
        });

        selfieSegmentationRef.current = segmenterInstance;
        setSegmenterReady(true);
      } catch (err) {
        console.warn('MediaPipe Body segmenter initialization failed. Defaulting to standard cam streams.', err);
      } finally {
        setSegmenterLoading(false);
      }
    };

    loadSegmenter();

    return () => {
      active = false;
      if (selfieSegmentationRef.current) {
        try {
          selfieSegmentationRef.current.close();
        } catch (_) {}
        selfieSegmentationRef.current = null;
      }
      setSegmenterReady(false);
    };
  }, [webcamActive, webcamBgEffect]);

  // Pre-load background image
  useEffect(() => {
    if (bgImageUrl) {
      const img = new Image();
      img.onload = () => {
        setBgImageElement(img);
      };
      img.src = bgImageUrl;
    } else {
      setBgImageElement(null);
    }
  }, [bgImageUrl]);

  // Handle webcam stream link
  useEffect(() => {
    if (videoRef.current) {
      if (webcamActive && webcamStream) {
        videoRef.current.srcObject = webcamStream;
        videoRef.current.play().catch((err) => console.warn('Camera elements preview start failed:', err));
      } else {
        videoRef.current.srcObject = null;
      }
    }
  }, [webcamActive, webcamStream]);

  // Canvas capture stream initialization
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      try {
        const stream = canvas.captureStream(selectedFps);
        onCanvasStreamReady(stream);
      } catch (err) {
        console.error('Failed to create canvas stream capture:', err);
      }
    }
  }, [onCanvasStreamReady, selectedFps]);

  // Keyboard Shortcuts: P pen, A arrow, T text, E eraser, Ctrl+Z undo, Space pause/resume
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Shield if user is typing on high level inputs
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      const key = e.key.toLowerCase();

      // Ctrl + Z / Cmd + Z Undo Check
      if ((e.ctrlKey || e.metaKey) && key === 'z') {
        e.preventDefault();
        handleUndo();
        return;
      }

      switch (key) {
        case 'p':
          e.preventDefault();
          if (onToolChange) onToolChange('brush');
          break;
        case 'a':
          e.preventDefault();
          if (onToolChange) onToolChange('arrow');
          break;
        case 't':
          e.preventDefault();
          if (onToolChange) onToolChange('text');
          break;
        case 'e':
          e.preventDefault();
          if (onToolChange) onToolChange('eraser');
          break;
        case ' ':
          e.preventDefault();
          if (onTogglePause) onTogglePause();
          break;
        case 's':
          e.preventDefault();
          if (onStopRecording) onStopRecording();
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onToolChange, onTogglePause, onStopRecording, historyLength]);

  // Collision detection utility for dragging and resizing
  const getMouseHitTarget = (x: number, y: number) => {
    if (!webcamActive) return { isOver: false, isResize: false };

    const dist = Math.hypot(x - (webcamPos.x + webcamSize / 2), y - (webcamPos.y + webcamSize / 2));
    const resizeX = webcamPos.x + webcamSize;
    const resizeY = webcamPos.y + webcamSize;
    const resizeDist = Math.hypot(x - resizeX, y - resizeY);

    const isResize = resizeDist < 24; // Within 24px of bottom right
    const isOver = dist < webcamSize / 2 || (x >= webcamPos.x && x <= webcamPos.x + webcamSize && y >= webcamPos.y && y <= webcamPos.y + webcamSize && webcamFrame !== 'circle');

    return { isOver, isResize };
  };

  // Convert client coordinate of pointer down to Canvas reference space
  const getCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0, timestamp: Date.now() };

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * CANVAS_WIDTH;
    const y = ((e.clientY - rect.top) / rect.height) * CANVAS_HEIGHT;
    
    return { x, y, timestamp: Date.now() };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const coords = getCanvasCoords(e);
    
    // Add Click ripple visualizer if enabled
    if (enableClickHighlight) {
      ripplesRef.current.push({
        x: coords.x,
        y: coords.y,
        startTime: Date.now(),
        duration: 450,
      });
    }

    // Check if hitting webcam PIP elements
    const hit = getMouseHitTarget(coords.x, coords.y);
    if (hit.isResize) {
      setDragMode('resize');
      dragStartPos.current = { x: coords.x, y: coords.y };
      dragStartSize.current = webcamSize;
      return;
    } else if (hit.isOver) {
      setDragMode('move');
      dragStartOffset.current = { x: coords.x - webcamPos.x, y: coords.y - webcamPos.y };
      return;
    }

    // Active Text Tool Input Trigger
    if (currentTool === 'text') {
      const rect = e.currentTarget.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;

      setActiveTextInput({
        x: clickX,
        y: clickY,
        canvasX: coords.x,
        canvasY: coords.y,
      });
      setTextInputValue('');
      return;
    }

    // Close text input overlay if active and clicked elsewhere
    if (activeTextInput) {
      commitTextAnnotation();
    }

    if (currentTool === 'none') return;

    if (currentTool === 'eraser') {
      isDrawing.current = true;
      eraseAt(coords.x, coords.y);
      return;
    }

    if (
      currentTool === 'brush' || 
      currentTool === 'highlighter' || 
      currentTool === 'laser' || 
      currentTool === 'arrow' || 
      currentTool === 'rect' || 
      currentTool === 'circle'
    ) {
      isDrawing.current = true;
      currentStrokePoints.current = [coords];
      
      if (currentTool === 'laser') {
        laserPoints.current.push(coords);
      }
    }
  };

  const handlePointerEnter = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsMouseInCanvas(true);
    const coords = getCanvasCoords(e);
    mouseCoords.current = coords;
  };

  const handlePointerLeave = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setIsMouseInCanvas(false);
    mouseCoords.current = { x: 0, y: 0, timestamp: Date.now() };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoords(e);
    mouseCoords.current = coords;
    if (!isMouseInCanvas) {
      setIsMouseInCanvas(true);
    }

    // Check hover states
    const hit = getMouseHitTarget(coords.x, coords.y);
    setIsHoveringResize(hit.isResize);
    setIsHoveringWebcam(hit.isOver && !hit.isResize);

    // Apply active drags
    if (dragMode === 'move') {
      const newX = Math.max(0, Math.min(CANVAS_WIDTH - webcamSize, coords.x - dragStartOffset.current.x));
      const newY = Math.max(0, Math.min(CANVAS_HEIGHT - webcamSize, coords.y - dragStartOffset.current.y));
      setWebcamPos({ x: newX, y: newY });
      return;
    } else if (dragMode === 'resize') {
      const deltaX = coords.x - dragStartPos.current.x;
      const newSize = Math.max(100, Math.min(480, dragStartSize.current + deltaX));
      
      // Limit bounds on expand
      const adjustedX = Math.min(webcamPos.x, CANVAS_WIDTH - newSize);
      const adjustedY = Math.min(webcamPos.y, CANVAS_HEIGHT - newSize);
      setWebcamPos({ x: adjustedX, y: adjustedY });
      setWebcamSize(newSize);
      return;
    }

    if (!isDrawing.current) {
      if (currentTool === 'laser') {
        laserPoints.current.push(coords);
      }
      return;
    }

    if (currentTool === 'eraser') {
      eraseAt(coords.x, coords.y);
      return;
    }

    if (currentStrokePoints.current.length > 0) {
      currentStrokePoints.current.push(coords);
      
      if (currentTool === 'laser') {
        laserPoints.current.push(coords);
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragMode !== 'none') {
      setDragMode('none');
      return;
    }

    if (!isDrawing.current) return;
    isDrawing.current = false;

    if (currentStrokePoints.current.length > 0) {
      if (
        currentTool === 'brush' || 
        currentTool === 'highlighter' || 
        currentTool === 'arrow' || 
        currentTool === 'rect' || 
        currentTool === 'circle'
      ) {
        const strokeColor = COLOR_MAP[brushColor];
        
        strokesRef.current.push({
          points: [...currentStrokePoints.current],
          color: strokeColor,
          width: brushWidth,
          tool: currentTool,
        });

        setHistoryLength(strokesRef.current.length);
      }
      currentStrokePoints.current = [];
    }
  };

  // Erase stroke collisions
  const eraseAt = (x: number, y: number) => {
    const eraseRadius = 24;
    const initialCount = strokesRef.current.length;
    
    // Filter out strokes that pass close to the eraser point
    strokesRef.current = strokesRef.current.filter((stroke) => {
      // Text erasure collision
      if (stroke.tool === 'text' && stroke.text) {
        const p = stroke.points[0];
        if (!p) return true;
        return Math.hypot(p.x - x, p.y - y) > eraseRadius * 1.5;
      }

      // Rectangle erasure collision
      if (stroke.tool === 'rect') {
        const p1 = stroke.points[0];
        const p2 = stroke.points[stroke.points.length - 1];
        if (!p1 || !p2) return true;
        const left = Math.min(p1.x, p2.x);
        const right = Math.max(p1.x, p2.x);
        const top = Math.min(p1.y, p2.y);
        const bottom = Math.max(p1.y, p2.y);

        const dLeft = Math.abs(x - left);
        const dRight = Math.abs(x - right);
        const dTop = Math.abs(y - top);
        const dBottom = Math.abs(y - bottom);

        const isNearBorder = (dLeft < eraseRadius || dRight < eraseRadius) && y >= top && y <= bottom ||
                            (dTop < eraseRadius || dBottom < eraseRadius) && x >= left && x <= right;
        return !isNearBorder;
      }

      // Circle erasure collision
      if (stroke.tool === 'circle') {
        const p1 = stroke.points[0];
        const p2 = stroke.points[stroke.points.length - 1];
        if (!p1 || !p2) return true;
        const radius = Math.hypot(p2.x - p1.x, p2.y - p1.y);
        const distToCenter = Math.hypot(x - p1.x, y - p1.y);
        const closeness = Math.abs(distToCenter - radius);
        return closeness > eraseRadius;
      }

      // Arrow erasure collision
      if (stroke.tool === 'arrow') {
        const p1 = stroke.points[0];
        const p2 = stroke.points[stroke.points.length - 1];
        if (!p1 || !p2) return true;
        const A = x - p1.x;
        const B = y - p1.y;
        const C = p2.x - p1.x;
        const D = p2.y - p1.y;
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        if (lenSq !== 0) param = dot / lenSq;

        let xx, yy;
        if (param < 0) {
          xx = p1.x;
          yy = p1.y;
        } else if (param > 1) {
          xx = p2.x;
          yy = p2.y;
        } else {
          xx = p1.x + param * C;
          yy = p1.y + param * D;
        }

        const distance = Math.hypot(x - xx, y - yy);
        return distance > eraseRadius;
      }

      // Freehand drawing and highlighter points collision
      const hitRadius = stroke.tool === 'highlighter' ? eraseRadius * 1.8 : eraseRadius;
      return !stroke.points.some((p) => Math.hypot(p.x - x, p.y - y) < hitRadius);
    });

    if (strokesRef.current.length !== initialCount) {
      setHistoryLength(strokesRef.current.length);
    }
  };

  const handleUndo = () => {
    if (strokesRef.current.length > 0) {
      strokesRef.current.pop();
      setHistoryLength(strokesRef.current.length);
    }
  };

  const handleClear = () => {
    strokesRef.current = [];
    laserPoints.current = [];
    currentStrokePoints.current = [];
    ripplesRef.current = [];
    setHistoryLength(0);
  };

  const commitTextAnnotation = () => {
    if (activeTextInput && textInputValue.trim()) {
      const strokeColor = COLOR_MAP[brushColor];
      strokesRef.current.push({
        points: [{ x: activeTextInput.canvasX, y: activeTextInput.canvasY, timestamp: Date.now() }],
        color: strokeColor,
        width: brushWidth,
        tool: 'text',
        text: textInputValue,
        fontSize: brushWidth * 1.5 + 12,
      });
      setHistoryLength(strokesRef.current.length);
    }
    setActiveTextInput(null);
  };

  // Continuous animation loop drawing onto the WebM recorded canvas
  useEffect(() => {
    let animFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const overlayCanvas = overlayRef.current;
    const overlayCtx = overlayCanvas ? overlayCanvas.getContext('2d') : null;

    // Drawing Arrow helper function
    const drawArrow = (context: CanvasRenderingContext2D, p1: Point, p2: Point, color: string, width: number) => {
      context.beginPath();
      context.strokeStyle = color;
      context.fillStyle = color;
      context.lineWidth = width;
      context.lineCap = 'round';
      context.lineJoin = 'round';

      context.moveTo(p1.x, p1.y);
      context.lineTo(p2.x, p2.y);
      context.stroke();

      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      const headLength = Math.max(16, width * 3.2);

      context.beginPath();
      context.moveTo(p2.x, p2.y);
      context.lineTo(p2.x - headLength * Math.cos(angle - Math.PI / 6), p2.y - headLength * Math.sin(angle - Math.PI / 6));
      context.lineTo(p2.x - headLength * Math.cos(angle + Math.PI / 6), p2.y - headLength * Math.sin(angle + Math.PI / 6));
      context.closePath();
      context.fill();
    };

    // Drawing Rect helper function
    const drawRect = (context: CanvasRenderingContext2D, p1: Point, p2: Point, color: string, width: number) => {
      context.beginPath();
      context.strokeStyle = color;
      context.lineWidth = width;
      context.rect(p1.x, p1.y, p2.x - p1.x, p2.y - p1.y);
      context.stroke();
    };

    // Drawing Circle helper function
    const drawCircle = (context: CanvasRenderingContext2D, p1: Point, p2: Point, color: string, width: number) => {
      context.beginPath();
      context.strokeStyle = color;
      context.lineWidth = width;
      const radius = Math.hypot(p2.x - p1.x, p2.y - p1.y);
      context.arc(p1.x, p1.y, radius, 0, Math.PI * 2);
      context.stroke();
    };

    const render = () => {
      // 1. Clear Screen
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      if (overlayCtx) {
        overlayCtx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }

      // 2. Draw Theme Backgrounds
      if (canvasBg === 'image' && bgImageElement) {
        const scale = Math.max(CANVAS_WIDTH / bgImageElement.width, CANVAS_HEIGHT / bgImageElement.height);
        const nw = bgImageElement.width * scale;
        const nh = bgImageElement.height * scale;
        const nx = (CANVAS_WIDTH - nw) / 2;
        const ny = (CANVAS_HEIGHT - nh) / 2;
        ctx.drawImage(bgImageElement, nx, ny, nw, nh);
      } else {
        if (canvasBg === 'charcoal') {
          ctx.fillStyle = '#15161A';
          ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        } else if (canvasBg === 'grid') {
          ctx.fillStyle = '#15161A';
          ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
          
          ctx.strokeStyle = '#23252C';
          ctx.lineWidth = 1;
          const gridSize = 40;
          
          for (let x = 0; x < CANVAS_WIDTH; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, CANVAS_HEIGHT);
            ctx.stroke();
          }
          for (let y = 0; y < CANVAS_HEIGHT; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(CANVAS_WIDTH, y);
            ctx.stroke();
          }
        } else if (canvasBg === 'dots') {
          ctx.fillStyle = '#15161A';
          ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
          
          ctx.fillStyle = '#2A2C37';
          const space = 24;
          for (let x = space; x < CANVAS_WIDTH; x += space) {
            for (let y = space; y < CANVAS_HEIGHT; y += space) {
              ctx.beginPath();
              ctx.arc(x, y, 1.5, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        } else if (canvasBg === 'light-slate') {
          ctx.fillStyle = '#ECECEC';
          ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
          
          ctx.strokeStyle = '#DFDFDF';
          ctx.lineWidth = 1;
          const gridSize = 32;
          for (let x = 0; x < CANVAS_WIDTH; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, CANVAS_HEIGHT);
            ctx.stroke();
          }
          for (let y = 0; y < CANVAS_HEIGHT; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(CANVAS_WIDTH, y);
            ctx.stroke();
          }
        }
      }

      // 3. Draw Completed Strokes
      strokesRef.current.forEach((stroke) => {
        if (stroke.points.length === 0) return;

        if (stroke.tool === 'brush') {
          ctx.beginPath();
          ctx.strokeStyle = stroke.color;
          ctx.lineWidth = stroke.width;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
          for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
          }
          ctx.stroke();
        } else if (stroke.tool === 'highlighter') {
          ctx.save();
          ctx.beginPath();
          ctx.strokeStyle = stroke.color;
          ctx.lineWidth = stroke.width * 2.5;
          ctx.lineCap = 'square';
          ctx.lineJoin = 'round';
          ctx.globalAlpha = 0.45; // Real semi-transparent marker feel

          ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
          for (let i = 1; i < stroke.points.length; i++) {
            ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
          }
          ctx.stroke();
          ctx.restore();
        } else if (stroke.tool === 'arrow') {
          const p1 = stroke.points[0];
          const p2 = stroke.points[stroke.points.length - 1];
          drawArrow(ctx, p1, p2, stroke.color, stroke.width);
        } else if (stroke.tool === 'rect') {
          const p1 = stroke.points[0];
          const p2 = stroke.points[stroke.points.length - 1];
          drawRect(ctx, p1, p2, stroke.color, stroke.width);
        } else if (stroke.tool === 'circle') {
          const p1 = stroke.points[0];
          const p2 = stroke.points[stroke.points.length - 1];
          drawCircle(ctx, p1, p2, stroke.color, stroke.width);
        } else if (stroke.tool === 'text' && stroke.text) {
          ctx.save();
          ctx.fillStyle = stroke.color;
          ctx.font = `600 ${stroke.fontSize || 24}px "Space Grotesk", sans-serif`;
          ctx.fillText(stroke.text, stroke.points[0].x, stroke.points[0].y);
          ctx.restore();
        }
      });

      // 4. Draw Current Drawing Stroke
      if (currentStrokePoints.current.length > 1) {
        const strokeColor = COLOR_MAP[brushColor];
        
        if (currentTool === 'brush') {
          ctx.beginPath();
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = brushWidth;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';

          ctx.moveTo(currentStrokePoints.current[0].x, currentStrokePoints.current[0].y);
          for (let i = 1; i < currentStrokePoints.current.length; i++) {
            ctx.lineTo(currentStrokePoints.current[i].x, currentStrokePoints.current[i].y);
          }
          ctx.stroke();
        } else if (currentTool === 'highlighter') {
          ctx.save();
          ctx.beginPath();
          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = brushWidth * 2.5;
          ctx.lineCap = 'square';
          ctx.lineJoin = 'round';
          ctx.globalAlpha = 0.45;

          ctx.moveTo(currentStrokePoints.current[0].x, currentStrokePoints.current[0].y);
          for (let i = 1; i < currentStrokePoints.current.length; i++) {
            ctx.lineTo(currentStrokePoints.current[i].x, currentStrokePoints.current[i].y);
          }
          ctx.stroke();
          ctx.restore();
        } else if (currentTool === 'arrow') {
          const p1 = currentStrokePoints.current[0];
          const p2 = currentStrokePoints.current[currentStrokePoints.current.length - 1];
          drawArrow(ctx, p1, p2, strokeColor, brushWidth);
        } else if (currentTool === 'rect') {
          const p1 = currentStrokePoints.current[0];
          const p2 = currentStrokePoints.current[currentStrokePoints.current.length - 1];
          drawRect(ctx, p1, p2, strokeColor, brushWidth);
        } else if (currentTool === 'circle') {
          const p1 = currentStrokePoints.current[0];
          const p2 = currentStrokePoints.current[currentStrokePoints.current.length - 1];
          drawCircle(ctx, p1, p2, strokeColor, brushWidth);
        }
      }

      // 5. Draw Laser Pointer Trail (smoke fading calculation)
      const now = Date.now();
      laserPoints.current = laserPoints.current.filter((lp) => now - lp.timestamp < 1000);

      if (laserPoints.current.length > 0) {
        ctx.beginPath();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let i = 0; i < laserPoints.current.length; i++) {
          const p = laserPoints.current[i];
          const age = now - p.timestamp;
          const lifeFactor = 1 - age / 1000;
          
          if (i === 0) {
            ctx.moveTo(p.x, p.y);
          } else {
            ctx.lineTo(p.x, p.y);
          }

          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.strokeStyle = `rgba(255, 122, 51, ${lifeFactor})`;
          ctx.lineWidth = 14 * lifeFactor;
        }
        ctx.stroke();

        const tipPoint = laserPoints.current[laserPoints.current.length - 1];
        ctx.beginPath();
        const laserGlow = ctx.createRadialGradient(tipPoint.x, tipPoint.y, 2, tipPoint.x, tipPoint.y, 16);
        laserGlow.addColorStop(0, '#FFFFFF');
        laserGlow.addColorStop(0.2, 'rgba(255, 122, 51, 1)');
        laserGlow.addColorStop(1, 'rgba(255, 122, 51, 0)');
        ctx.fillStyle = laserGlow;
        ctx.arc(tipPoint.x, tipPoint.y, 16, 0, Math.PI * 2);
        ctx.fill();
      }

      // 6. Draw Live Webcam PIP video
      if (webcamActive && videoRef.current && videoRef.current.readyState >= 2) {
        // Asynchronously request frame background segmentation with adaptive throttling to prevent GPU thermal locks
        if (webcamBgEffect !== 'none' && selfieSegmentationRef.current) {
          const nowTs = Date.now();
          const processingRateLimit = webcamPerfMode === 'low-power' ? 200 : 45; // 5fps for power saver vs 22fps raw precision
          if (nowTs - lastSendTimeRef.current >= processingRateLimit) {
            selfieSegmentationRef.current.send({ image: videoRef.current }).catch(() => {});
            lastSendTimeRef.current = nowTs;
          }
        }

        ctx.save();

        let filterStr = 'none';
        if (videoFilter === 'amber-glow') {
          filterStr = 'brightness(1.1) sepia(0.3) saturate(1.4) hue-rotate(-15deg)';
        } else if (videoFilter === 'bw') {
          filterStr = 'grayscale(1)';
        } else if (videoFilter === 'cyberpunk') {
          filterStr = 'contrast(1.4) saturate(1.8) hue-rotate(185deg)';
        } else if (videoFilter === 'warm') {
          filterStr = 'brightness(0.95) sepia(0.25) saturate(1.1)';
        }
        ctx.filter = filterStr;

        if (webcamFrame === 'circle') {
          ctx.beginPath();
          ctx.arc(webcamPos.x + webcamSize / 2, webcamPos.y + webcamSize / 2, webcamSize / 2, 0, Math.PI * 2);
          ctx.clip();
        } else if (webcamFrame === 'squircle') {
          ctx.beginPath();
          const r = webcamSize / 4;
          const x = webcamPos.x;
          const y = webcamPos.y;
          const w = webcamSize;
          ctx.moveTo(x + r, y);
          ctx.arcTo(x + w, y, x + w, y + w, r);
          ctx.arcTo(x + w, y + w, x, y + w, r);
          ctx.arcTo(x, y + w, x, y, r);
          ctx.arcTo(x, y, x + w, y, r);
          ctx.closePath();
          ctx.clip();
        } else if (webcamFrame === 'square') {
          ctx.beginPath();
          const r = 24;
          const x = webcamPos.x;
          const y = webcamPos.y;
          const w = webcamSize;
          ctx.moveTo(x + r, y);
          ctx.arcTo(x + w, y, x + w, y + w, r);
          ctx.arcTo(x + w, y + w, x, y + w, r);
          ctx.arcTo(x, y + w, x, y, r);
          ctx.arcTo(x, y, x + w, y, r);
          ctx.closePath();
          ctx.clip();
        }

        ctx.translate(webcamPos.x + webcamSize / 2, webcamPos.y + webcamSize / 2);
        // Horizontal mirroring toggle support
        ctx.scale(webcamMirrored ? -1 : 1, 1);

        // Draw segmented frame cutout if background effect is active, else fall back to original video
        if (webcamBgEffect !== 'none' && lastProcessedCanvasRef.current) {
          ctx.drawImage(
            lastProcessedCanvasRef.current,
            -webcamSize / 2,
            -webcamSize / 2,
            webcamSize,
            webcamSize
          );
        } else {
          ctx.drawImage(
            videoRef.current,
            -webcamSize / 2,
            -webcamSize / 2,
            webcamSize,
            webcamSize
          );
        }
        
        ctx.restore();

        // 7. Render Custom Frame Styles (Clean Glow vs Soft Rounded Double Border vs None)
        if (webcamFrameStyle !== 'none') {
          ctx.save();
          
          if (webcamFrameStyle === 'clean') {
            ctx.strokeStyle = '#FF7A33';
            ctx.lineWidth = 4;
            ctx.shadowColor = 'rgba(255, 122, 51, 0.45)';
            ctx.shadowBlur = 12;
          } else if (webcamFrameStyle === 'rounded') {
            ctx.strokeStyle = '#F4F1EA';
            ctx.lineWidth = 4;
            ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
            ctx.shadowBlur = 8;
          }

          if (webcamFrame === 'circle') {
            ctx.beginPath();
            ctx.arc(webcamPos.x + webcamSize / 2, webcamPos.y + webcamSize / 2, webcamSize / 2 - 2, 0, Math.PI * 2);
            ctx.stroke();
          } else if (webcamFrame === 'squircle') {
            ctx.beginPath();
            const r = webcamSize / 4;
            const x = webcamPos.x + 2;
            const y = webcamPos.y + 2;
            const w = webcamSize - 4;
            ctx.moveTo(x + r, y);
            ctx.arcTo(x + w, y, x + w, y + w, r);
            ctx.arcTo(x + w, y + w, x, y + w, r);
            ctx.arcTo(x, y + w, x, y, r);
            ctx.arcTo(x, y, x + w, y, r);
            ctx.closePath();
            ctx.stroke();
          } else if (webcamFrame === 'square') {
            ctx.beginPath();
            const r = 24;
            const x = webcamPos.x + 2;
            const y = webcamPos.y + 2;
            const w = webcamSize - 4;
            ctx.moveTo(x + r, y);
            ctx.arcTo(x + w, y, x + w, y + w, r);
            ctx.arcTo(x + w, y + w, x, y + w, r);
            ctx.arcTo(x, y + w, x, y, r);
            ctx.arcTo(x, y, x + w, y, r);
            ctx.closePath();
            ctx.stroke();
          }
          ctx.restore();
        }

        // Draw Webcam resize handle on overlayCanvas ONLY
        if (overlayCtx && (isHoveringResize || dragMode === 'resize')) {
          overlayCtx.save();
          overlayCtx.fillStyle = '#FF7A33';
          overlayCtx.beginPath();
          overlayCtx.arc(webcamPos.x + webcamSize, webcamPos.y + webcamSize, 10, 0, Math.PI * 2);
          overlayCtx.fill();
          overlayCtx.strokeStyle = '#F4F1EA';
          overlayCtx.lineWidth = 2;
          overlayCtx.stroke();
          overlayCtx.restore();
        }
      }

      // 7. Draw Spotlight Overlay mask on overlayCanvas ONLY
      if (overlayCtx && currentTool === 'spotlight' && isMouseInCanvas && (mouseCoords.current.x > 0 || mouseCoords.current.y > 0)) {
        overlayCtx.save();
        
        overlayCtx.fillStyle = 'rgba(10, 11, 14, 0.82)';
        overlayCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        overlayCtx.globalCompositeOperation = 'destination-out';
        overlayCtx.beginPath();
        const spotlightRadius = 110;
        overlayCtx.arc(mouseCoords.current.x, mouseCoords.current.y, spotlightRadius, 0, Math.PI * 2);
        overlayCtx.fill();

        overlayCtx.globalCompositeOperation = 'source-over';
        overlayCtx.beginPath();
        const searchGlow = overlayCtx.createRadialGradient(
          mouseCoords.current.x, mouseCoords.current.y, spotlightRadius - 8,
          mouseCoords.current.x, mouseCoords.current.y, spotlightRadius + 4
        );
        searchGlow.addColorStop(0, 'rgba(255, 122, 51, 0)');
        searchGlow.addColorStop(0.2, 'rgba(255, 122, 51, 0.55)');
        searchGlow.addColorStop(1, 'rgba(255, 122, 51, 0)');
        overlayCtx.fillStyle = searchGlow;
        overlayCtx.arc(mouseCoords.current.x, mouseCoords.current.y, spotlightRadius + 4, 0, Math.PI * 2);
        overlayCtx.fill();

        overlayCtx.restore();
      }

      // 8. Draw Animated User Interaction Ripples/Clicks on overlayCanvas ONLY
      const nowTs = Date.now();
      ripplesRef.current = ripplesRef.current.filter((r) => nowTs - r.startTime < r.duration);
      if (overlayCtx) {
        ripplesRef.current.forEach((ripple) => {
          const progress = (nowTs - ripple.startTime) / ripple.duration;
          overlayCtx.save();
          
          overlayCtx.beginPath();
          overlayCtx.arc(ripple.x, ripple.y, progress * 46, 0, Math.PI * 2);
          overlayCtx.strokeStyle = `rgba(255, 122, 51, ${1 - progress})`;
          overlayCtx.lineWidth = 4 * (1 - progress);
          overlayCtx.stroke();
          
          overlayCtx.beginPath();
          overlayCtx.arc(ripple.x, ripple.y, progress * 20, 0, Math.PI * 2);
          overlayCtx.fillStyle = `rgba(255, 122, 51, ${0.16 * (1 - progress)})`;
          overlayCtx.fill();
          
          overlayCtx.restore();
        });
      }

      animFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [canvasBg, currentTool, brushColor, brushWidth, bgImageElement, webcamActive, webcamFrame, videoFilter, webcamSize, webcamPos, isHoveringResize, dragMode, enableClickHighlight, webcamFrameStyle, webcamBgEffect, webcamReplaceType, webcamReplaceColor, webcamReplaceImageUrl, webcamMirrored, webcamPerfMode, segmenterReady, isMouseInCanvas]);

  // Toolbar Pointer Drag Events
  const handleToolbarDragStart = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (!target.closest('.drag-handle')) return;

    e.preventDefault();
    toolbarDragStart.current = {
      startX: e.clientX,
      startY: e.clientY,
      pos: { ...floatingPos },
    };
    target.setPointerCapture(e.pointerId);
  };

  const handleToolbarDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!toolbarDragStart.current) return;
    const deltaX = e.clientX - toolbarDragStart.current.startX;
    const deltaY = e.clientY - toolbarDragStart.current.startY;

    const container = containerRef.current;
    const containerWidth = container?.clientWidth || 1000;
    const containerHeight = container?.clientHeight || 600;

    const newX = Math.max(10, Math.min(containerWidth - 140, toolbarDragStart.current.pos.x + deltaX));
    const newY = Math.max(10, Math.min(containerHeight - 80, toolbarDragStart.current.pos.y + deltaY));

    setFloatingPos({ x: newX, y: newY });
  };

  const handleToolbarDragEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!toolbarDragStart.current) return;
    const target = e.target as HTMLElement;
    target.releasePointerCapture(e.pointerId);
    toolbarDragStart.current = null;
  };

  return (
    <div className="relative w-full overflow-hidden flex flex-col gap-3" ref={containerRef} id="canvas-container">
      {/* Offscreen hidden webcam stream node */}
      <video
        ref={videoRef}
        className="hidden"
        playsInline
        muted
        autoPlay
      />

      {/* Main interactive canvas stage */}
      <div className="relative border border-[#23252C] rounded-2xl bg-[#090A0C] overflow-hidden group shadow-2xl shadow-black/60 aspect-video w-full max-w-7xl mx-auto">
        <canvas
          ref={canvasRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          onPointerEnter={handlePointerEnter}
          className={`w-full h-full block relative z-10 ${
            dragMode === 'move' ? 'cursor-grabbing' : 
            dragMode === 'resize' ? 'cursor-se-resize' :
            isHoveringResize ? 'cursor-se-resize' :
            isHoveringWebcam ? 'cursor-grab' :
            currentTool === 'brush' ? 'cursor-crosshair' :
            currentTool === 'highlighter' ? 'cursor-crosshair' :
            currentTool === 'eraser' ? 'cursor-cell' :
            currentTool === 'arrow' ? 'cursor-crosshair' :
            currentTool === 'rect' ? 'cursor-crosshair' :
            currentTool === 'circle' ? 'cursor-crosshair' :
            currentTool === 'laser' ? 'cursor-none' :
            currentTool === 'spotlight' ? 'cursor-none' : 'cursor-default'
          }`}
          style={{ touchAction: 'none' }}
        />

        {/* Auxiliary overlay layer for on-screen transient feedback, excluded from canvas.captureStream() */}
        <canvas
          ref={overlayRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          className="absolute inset-0 w-full h-full pointer-events-none block z-30"
        />

        {/* Text Area Inline edit overlay */}
        {activeTextInput && (
          <div 
            className="absolute z-40 bg-[#15161A] border border-[#FF7A33] rounded-lg p-2.5 flex items-center shadow-2xl"
            style={{
              top: `${activeTextInput.y}px`,
              left: `${activeTextInput.x}px`,
              transform: 'translate(-10px, -50%)',
            }}
            id="inline-text-edit-overlay"
          >
            <input
              type="text"
              autoFocus
              value={textInputValue}
              onChange={(e) => setTextInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  commitTextAnnotation();
                } else if (e.key === 'Escape') {
                  setActiveTextInput(null);
                }
              }}
              onBlur={() => {
                commitTextAnnotation();
              }}
              style={{
                fontSize: `${brushWidth * 1.5 + 13}px`,
                color: COLOR_MAP[brushColor],
              }}
              className="bg-transparent border-none outline-none min-w-[150px] max-w-[280px] p-1 font-sans font-semibold text-zinc-100 placeholder-zinc-700"
              placeholder="Write text mark..."
              id="annotation-text-input"
            />
            <button 
              onClick={commitTextAnnotation}
              className="p-1 cursor-pointer text-[#4ADE80] hover:bg-zinc-800 rounded transition"
              id="confirm-text-annotation"
            >
              <Check size={14} />
            </button>
          </div>
        )}

        {/* Draggable, Collapsible FLOATING ANNOTATION TOOLBAR */}
        {showToolbar && (
          <div
            className="absolute z-50 bg-[#15161A]/95 border border-[#23252C]/90 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 min-w-[220px] backdrop-blur-md transition-all duration-200"
            style={{
              top: `${floatingPos.y}px`,
              left: `${floatingPos.x}px`,
            }}
            onPointerDown={handleToolbarDragStart}
            onPointerMove={handleToolbarDragMove}
            onPointerUp={handleToolbarDragEnd}
            id="floating-annotation-toolbar"
          >
            {/* Toolbar Grip and Status */}
            <div className="flex items-center justify-between gap-4 pb-2 border-b border-[#23252C] drag-handle cursor-move select-none">
              <div className="flex items-center gap-1.5 text-[#FF7A33] font-mono font-bold text-[10px] uppercase tracking-wider drag-handle">
                <GripHorizontal size={14} className="text-zinc-500 drag-handle" />
                <span>Presenter Dock</span>
              </div>
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition cursor-pointer"
                title={isCollapsed ? 'Expand Dock' : 'Collapse Dock'}
                id="btn-collapse-floating"
              >
                {isCollapsed ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
              </button>
            </div>

            {/* Expanded Tool Panel */}
            {!isCollapsed && (
              <div className="space-y-3" id="floating-toolbar-body">
                {/* Tools Grid */}
                <div className="space-y-1">
                  <span className="text-[9px] uppercase font-mono tracking-wider text-zinc-500 font-bold block">
                    Annotation Brushes
                  </span>
                  <div className="grid grid-cols-4 gap-1 bg-black/40 p-1.5 rounded-xl border border-white/5">
                    {([
                      { id: 'brush', label: 'Pen (P)', icon: Paintbrush },
                      { id: 'highlighter', label: 'Marker (H)', icon: Paintbrush },
                      { id: 'arrow', label: 'Arrow (A)', icon: ArrowRight },
                      { id: 'rect', label: 'Rect', icon: Square },
                      { id: 'circle', label: 'Circle', icon: Circle },
                      { id: 'text', label: 'Text (T)', icon: Type },
                      { id: 'laser', label: 'Laser', icon: Zap },
                      { id: 'spotlight', label: 'Spotlight', icon: MousePointer },
                    ] as { id: AnnotationTool; label: string; icon: any }[]).map((t) => (
                      <button
                        key={t.id}
                        onClick={() => {
                          if (onToolChange) onToolChange(t.id);
                        }}
                        className={`p-2 rounded-lg transition-all flex flex-col items-center justify-center gap-1 cursor-pointer ${
                          currentTool === t.id
                            ? 'bg-[#FF7A33]/20 text-[#FF7A33] border border-[#FF7A33]/35 shadow-inner'
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-transparent'
                        }`}
                        title={t.label}
                        id={`float-tool-btn-${t.id}`}
                      >
                        <t.icon size={14} className={t.id === 'highlighter' ? 'opacity-85 scale-y-90 rotate-45' : ''} />
                        <span className="text-[8px] font-mono leading-none tracking-tighter truncate w-full text-center">
                          {t.id === 'brush' ? 'Pen' : t.id === 'highlighter' ? 'Marker' : t.id}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Sub Options (Colors and Weight) */}
                {currentTool !== 'eraser' && currentTool !== 'spotlight' && currentTool !== 'laser' && (
                  <div className="space-y-2 pt-1 border-t border-[#23252C]/50">
                    {/* Brush Colors */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] uppercase font-mono tracking-wider text-zinc-500 font-bold">Colors</span>
                      <div className="flex items-center gap-1">
                        {(['amber', 'green', 'white', 'blue'] as BrushColor[]).map((c) => (
                          <button
                            key={c}
                            onClick={() => {
                              if (onColorChange) onColorChange(c);
                            }}
                            className={`w-5 h-5 rounded-full cursor-pointer transition-all ${
                              c === 'amber' ? 'bg-[#FF7A33]' :
                              c === 'green' ? 'bg-[#4ADE80]' :
                              c === 'white' ? 'bg-[#F4F1EA]' : 'bg-[#38BDF8]'
                            } ${
                              brushColor === c
                                ? 'ring-2 ring-offset-2 ring-offset-[#15161A] ring-[#FF7A33] scale-110'
                                : 'scale-90 opacity-60 hover:opacity-100 hover:scale-100'
                            }`}
                            title={`Select ${c} color`}
                            id={`float-color-${c}`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Weight size slider */}
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[9px] uppercase font-mono tracking-wider text-zinc-500 font-bold">Thickness</span>
                      <div className="flex items-center gap-1.5 flex-1 justify-end">
                        <input
                          type="range"
                          min={2}
                          max={18}
                          step={1}
                          value={brushWidth}
                          onChange={(e) => {
                            if (onWeightChange) onWeightChange(parseInt(e.target.value));
                          }}
                          className="w-16 accent-[#FF7A33] h-1 bg-zinc-800 rounded appearance-none cursor-pointer"
                          id="range-brush-weight-floating"
                        />
                        <span className="text-[9px] font-mono text-zinc-400 w-6 text-right font-bold">{brushWidth}px</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Interactive Toggles built-in */}
                <div className="pt-2 border-t border-[#23252C]/50 space-y-1.5">
                  <label className="flex items-center justify-between text-[9px] text-zinc-400 font-medium cursor-pointer" id="label-ripple-toggle">
                    <span className="flex items-center gap-1">
                      <Sparkles size={10} className="text-[#FF7A33]" />
                      Click Wave Highlights
                    </span>
                    <input
                      type="checkbox"
                      checked={enableClickHighlight}
                      onChange={(e) => setEnableClickHighlight(e.target.checked)}
                      className="rounded bg-zinc-800 border-zinc-700 text-[#FF7A33] focus:ring-[#FF7A33]/50 w-3 h-3 cursor-pointer"
                      id="checkbox-click-wave-floating"
                    />
                  </label>
                  
                  <div className="text-[8px] font-mono leading-relaxed text-zinc-500 bg-black/20 p-1.5 rounded-lg border border-white-5">
                    💡 Shortcuts: <strong className="text-[#FF7A33]">P</strong> pen • <strong className="text-[#FF7A33]">A</strong> arrow • <strong className="text-[#FF7A33]">T</strong> text • <strong className="text-[#FF7A33]">E</strong> eraser • <strong className="text-[#FF7A33]">Ctrl+Z</strong> undo
                  </div>
                </div>
              </div>
            )}

            {/* Micro Collapsed Toolbar State view */}
            {isCollapsed && (
              <div className="text-center py-1 text-[10px] text-zinc-400 font-mono">
                Tool active: <strong className="text-[#FF7A33] capitalize">{currentTool === 'brush' ? 'Pen' : currentTool}</strong>
              </div>
            )}
          </div>
        )}

        {/* Live banner indicators when recording */}
        {isRecording && (
          <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 bg-[#FF7A33]/15 border border-[#FF7A33]/40 rounded-full text-xs font-medium tracking-tight text-[#FF7A33] animate-pulse-record animate-pulse" id="recording-overlay-banner">
            <span className="w-2 h-2 rounded-full bg-[#FF7A33] block"></span>
            STUDIO RECORDING ACTIVE
          </div>
        )}

        {/* Tips for dragging and drawing */}
        {webcamActive && (
          <div className="absolute top-4 right-4 hidden group-hover:flex items-center gap-2 px-3 py-1.5 bg-black/80 border border-white/10 rounded-lg text-[10px] text-zinc-400 font-mono tracking-tight pointer-events-none">
            <AlertCircle size={10} className="text-[#FF7A33]" />
            DRAG CAMERA TO RETARGET, CORNER TO RESIZE
          </div>
        )}
      </div>

      {/* Whiteboard Controls Rail bar directly below canvas */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 bg-[#1C1E24]/80 border border-[#23252C] rounded-xl max-w-7xl w-full mx-auto backdrop-blur" id="easel-toolbar">
        <div className="flex items-center gap-2.5">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500 font-mono font-medium">Presenter Easel:</span>
          
          <button
            onClick={handleUndo}
            disabled={historyLength === 0}
            className={`p-2 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer ${
              historyLength > 0
                ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                : 'bg-zinc-900/40 text-zinc-600 cursor-not-allowed'
            }`}
            title="Undo stroke"
            id="btn-undo"
          >
            <Undo size={14} />
            <span className="hidden sm:inline">Undo</span>
          </button>

          <button
            onClick={handleClear}
            disabled={historyLength === 0 && laserPoints.current.length === 0}
            className={`p-2 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium cursor-pointer ${
              historyLength > 0 || laserPoints.current.length > 0
                ? 'bg-red-950/40 hover:bg-red-950/60 text-red-400 border border-red-500/10'
                : 'bg-zinc-900/40 text-zinc-600 cursor-not-allowed'
            }`}
            title="Clear all strokes"
            id="btn-clear"
          >
            <Trash2 size={14} />
            <span className="hidden sm:inline">Clear Board</span>
          </button>

          <div className="h-4 w-px bg-zinc-800"></div>

          {/* Clean Pass Overlay toggle button */}
          <button
            onClick={() => setShowToolbar(!showToolbar)}
            className={`p-2 rounded-lg transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer ${
              showToolbar
                ? 'bg-[#FF7A33]/15 text-[#FF7A33] border border-[#FF7A33]/25'
                : 'bg-zinc-800 text-zinc-400 border border-transparent'
            }`}
            title="Toggle the floating controller toolbar visibility"
            id="btn-toggle-toolbar-clean"
          >
            {showToolbar ? <Eye size={14} /> : <EyeOff size={14} />}
            <span>{showToolbar ? 'Hide Overlays' : 'Show Overlays'}</span>
          </button>
        </div>

        {/* Display showing status indicator */}
        <div className="flex items-center gap-3">
          <div className="text-[11px] font-mono text-zinc-400 bg-[#15161A] px-2.5 py-1 rounded-md border border-white/5 flex items-center gap-1.5">
            <span className={`w-1.5 h-1.5 rounded-full ${historyLength > 0 ? 'bg-[#FF7A33]' : 'bg-zinc-600'}`}></span>
            Saved Marks: {historyLength}
          </div>
        </div>
      </div>
    </div>
  );
};
