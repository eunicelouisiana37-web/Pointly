export type AnnotationTool = 'brush' | 'laser' | 'spotlight' | 'arrow' | 'rect' | 'circle' | 'highlighter' | 'text' | 'eraser' | 'none';

export type BrushColor = 'amber' | 'green' | 'white' | 'blue';

export type CanvasBackground = 'charcoal' | 'grid' | 'dots' | 'light-slate' | 'image';

export type WebcamFrame = 'circle' | 'squircle' | 'square';

export type WebcamFrameStyle = 'clean' | 'rounded' | 'none';

export type WebcamBgEffect = 'none' | 'blur' | 'replace';

export type WebcamReplaceType = 'color' | 'image';

export type WebcamPerformanceMode = 'high-quality' | 'low-power';

export type VideoFilter = 'none' | 'amber-glow' | 'bw' | 'cyberpunk' | 'warm';

export type CaptureMode = 'studio' | 'screen';

export interface Point {
  x: number;
  y: number;
  timestamp: number;
}

export interface Stroke {
  points: Point[];
  color: string;
  width: number;
  tool: AnnotationTool;
  text?: string;
  fontSize?: number;
}

export interface Recording {
  id: string;
  name: string;
  duration: number; // in seconds
  size: number; // bytes
  createdAt: number; // timestamp
  videoUrl: string; // object URL or local URL reference
  mode: CaptureMode;
  thumbnailUrl?: string;
}

export interface AppState {
  currentTool: AnnotationTool;
  brushColor: BrushColor;
  brushWidth: number;
  canvasBg: CanvasBackground;
  bgImageUrl?: string;
  webcamActive: boolean;
  webcamFrame: WebcamFrame;
  videoFilter: VideoFilter;
  webcamSize: number; // percentage/size factor
  activeMicId?: string;
  activeCameraId?: string;
  microphoneActive: boolean;
}
