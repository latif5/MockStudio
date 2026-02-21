
export type DeviceType = 'iphone-15' | 'macbook-air' | 'browser-window' | 'ipad-pro' | 'apple-watch' | 'samsung-galaxy' | 'samsung-galaxy-ultra';

export type BackgroundType = 'solid' | 'gradient' | 'image' | 'transparent';
export type AnimationType = 'none' | 'fade-in' | 'fade-out' | 'shake' | 'zoom-in' | 'zoom-out' | 'slide-up' | 'slide-down' | 'pulse';
export type GradientType = 'linear' | 'radial';
export type EasingType = 'linear' | 'easeIn' | 'easeOut' | 'easeInOut' | 'bounce' | 'elastic';

export interface Position {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Gradient {
  type: GradientType;
  from: string; // Hex or HexAlpha
  to: string;   // Hex or HexAlpha
  angle: number;
}

export interface Keyframe {
  id: string;
  timestamp: number; // Seconds
  property: 'x' | 'y' | 'scale' | 'rotation' | 'opacity';
  value: number;
  easing: EasingType;
}

export interface TimelineProps {
    startTime: number; // in seconds
    duration: number; // in seconds
    animIn: AnimationType;
    animInDuration: number;
    animOut: AnimationType;
    animOutDuration: number;
}

export interface MockupItem extends TimelineProps {
  id: string;
  name: string; // User customizable name
  type: DeviceType;
  contentUrl: string | null;
  isVideo: boolean;
  scale: number;
  rotation: number;
  position: Position;
  shadow: 'none' | 'soft' | 'hard' | 'floating';
  zIndex: number;
  keyframes: Keyframe[];
}

export interface OverlayItem extends TimelineProps {
  id: string;
  name: string; // User customizable name
  type: 'text' | 'emoji' | 'shape' | 'image' | 'video';
  content: string; // Text content or Image URL
  style: {
    color?: string;
    backgroundColor?: string;
    fontSize?: number;
    fontWeight?: string;
    fontFamily?: string;
    borderRadius?: number;
    opacity?: number;
  };
  position: Position;
  scale: number;
  rotation: number;
  zIndex: number;
  keyframes: Keyframe[];
}

export interface CanvasState {
  width: number;
  height: number;
  backgroundType: BackgroundType;
  backgroundColor: string;
  backgroundGradient: Gradient;
  backgroundImage?: string;
  padding: number;
  zoom: number;
}

export interface AppState {
  mockups: MockupItem[];
  overlays: OverlayItem[];
  canvas: CanvasState;
  selectedId: string | null; // ID of selected mockup or overlay
  mode: 'design' | 'video';
  isPlaying: boolean;
  duration: number; // Duration in seconds
  currentTime: number; // Current time in seconds
}
