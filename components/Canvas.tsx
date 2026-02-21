
import React, { useRef, useState, useEffect, useMemo } from 'react';
import { AppState, MockupItem, OverlayItem, Keyframe, Position } from '../types';
import { DeviceFrame } from './DeviceFrame';
import { RotateCw } from 'lucide-react';
import { EASING_FUNCTIONS } from '../constants';

interface CanvasProps {
  state: AppState;
  onSelectMockup: (id: string) => void;
  onDeselect: () => void;
  onUpdateMockup: (id: string, updates: Partial<MockupItem>) => void;
  onUpdateOverlay: (id: string, updates: any) => void;
  onEmptyMockupClick: () => void;
}

interface SnapGuide {
    type: 'vertical' | 'horizontal';
    position: number; // The coordinate value relative to canvas center
}

// Helper to determine base dimensions for size indicator
const getBaseDimensions = (type: string): { w: number, h: number } | null => {
    switch (type) {
        case 'iphone-15': return { w: 300, h: 615 };
        case 'macbook-air': return { w: 720, h: 424 }; // Approx with base
        case 'browser-window': return { w: 600, h: 380 };
        case 'ipad-pro': return { w: 480, h: 640 };
        case 'apple-watch': return { w: 180, h: 220 }; // Estimated
        case 'rect': 
        case 'circle': 
        case 'rounded':
        case 'triangle':
        case 'star':
        case 'heart':
        case 'hexagon':
            return { w: 100, h: 100 };
        case 'diamond':
            return { w: 100, h: 100 }; // Rotated square effectively
        default: return null;
    }
};

// --- INTERPOLATION ENGINE ---

const interpolate = (baseValue: number, keyframes: Keyframe[], currentTime: number, property: Keyframe['property']): number => {
    if (!keyframes || keyframes.length === 0) return baseValue;

    // Filter keyframes for specific property and sort by time
    const props = keyframes.filter(k => k.property === property).sort((a, b) => a.timestamp - b.timestamp);
    
    if (props.length === 0) return baseValue;

    // 1. Before first keyframe
    if (currentTime <= props[0].timestamp) return props[0].value;

    // 2. After last keyframe
    if (currentTime >= props[props.length - 1].timestamp) return props[props.length - 1].value;

    // 3. Between keyframes
    for (let i = 0; i < props.length - 1; i++) {
        const start = props[i];
        const end = props[i + 1];

        if (currentTime >= start.timestamp && currentTime < end.timestamp) {
            const duration = end.timestamp - start.timestamp;
            const progress = (currentTime - start.timestamp) / duration;
            const easeFunc = EASING_FUNCTIONS[end.easing] || EASING_FUNCTIONS.linear;
            const easedProgress = easeFunc(progress);
            
            return start.value + (end.value - start.value) * easedProgress;
        }
    }

    return baseValue;
};


// Helper component for video overlays to handle sync logic
const VideoOverlay: React.FC<{ src: string, isPlaying: boolean, currentTime: number, startTime: number }> = ({ src, isPlaying, currentTime, startTime }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        if (videoRef.current) {
            if (isPlaying) videoRef.current.play().catch(() => {});
            else videoRef.current.pause();
        }
    }, [isPlaying]);

    useEffect(() => {
        if (videoRef.current) {
            const relativeTime = currentTime - startTime;
            if (Math.abs(videoRef.current.currentTime - relativeTime) > 0.2) {
                if (relativeTime >= 0 && (!videoRef.current.duration || relativeTime <= videoRef.current.duration)) {
                    videoRef.current.currentTime = relativeTime;
                } else if (relativeTime < 0) {
                    videoRef.current.currentTime = 0;
                }
            }
        }
    }, [currentTime, startTime]);

    return (
        <video 
            ref={videoRef}
            src={src} 
            className="w-full h-full object-cover pointer-events-none select-none" 
            loop 
            muted 
            playsInline 
        />
    );
};

export const Canvas: React.FC<CanvasProps> = ({ state, onSelectMockup, onDeselect, onUpdateMockup, onUpdateOverlay, onEmptyMockupClick }) => {
  const { canvas, mockups, overlays, currentTime, mode } = state;
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Drag State for Visual Transform
  const [transformDrag, setTransformDrag] = useState<{
      id: string, 
      type: 'scale' | 'rotate' | 'move', 
      corner?: 'tl' | 'tr' | 'bl' | 'br',
      startX: number, 
      startY: number,
      initialValX: number, // Used for move (X) or value (scale/rotate)
      initialValY: number, // Used for move (Y)
      initialRotation: number,
      initialScale: number
  } | null>(null);

  // Active Snap Guides
  const [activeGuides, setActiveGuides] = useState<SnapGuide[]>([]);

  // Editing State for Text
  const [editingId, setEditingId] = useState<string | null>(null);

  // Helper to check if item is visible at current time
  const isVisible = (startTime: number, duration: number) => {
    if (mode === 'design') return true;
    return currentTime >= startTime && currentTime <= startTime + duration;
  };

  // Helper to get animation style/class based on timing
  const getAnimationClass = (item: MockupItem | OverlayItem) => {
      if (mode === 'design') return '';
      
      const { startTime, duration, animIn, animInDuration, animOut, animOutDuration } = item;
      const timeSinceStart = currentTime - startTime;
      const timeUntilEnd = (startTime + duration) - currentTime;

      if (timeSinceStart < animInDuration && animIn !== 'none') return `anim-${animIn}`;
      if (timeUntilEnd < animOutDuration && animOut !== 'none') return `anim-${animOut}`;
      return '';
  };

  // Background Style
  const getBackgroundStyle = () => {
    switch (canvas.backgroundType) {
      case 'solid':
        return { backgroundColor: canvas.backgroundColor };
      case 'gradient':
        const { from, to, angle, type } = canvas.backgroundGradient;
        if (type === 'radial') {
             return { backgroundImage: `radial-gradient(circle at center, ${from}, ${to})` };
        }
        return { backgroundImage: `linear-gradient(${angle}deg, ${from}, ${to})` };
      case 'image':
        if (canvas.backgroundImage) {
            return {
              backgroundImage: `url(${canvas.backgroundImage})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            };
        }
        return { backgroundColor: '#18181b' };
      case 'transparent':
        return { backgroundColor: 'transparent' }; 
      default:
        return { backgroundColor: '#18181b' };
    }
  };

  // --- Helper to update properties or keyframes ---
  const updateItemProperty = (id: string, updates: any) => {
      const isMockup = mockups.some(m => m.id === id);
      
      // IF DESIGN MODE: Update static property directly
      if (mode === 'design') {
          if (isMockup) onUpdateMockup(id, updates);
          else onUpdateOverlay(id, updates);
          return;
      }

      // IF VIDEO MODE: Update Keyframes
      // We need to merge existing keyframes with new ones at current time
      const item = isMockup ? mockups.find(m => m.id === id) : overlays.find(o => o.id === id);
      if (!item) return;

      const newKeyframes = [...item.keyframes];
      
      Object.entries(updates).forEach(([key, value]) => {
          if (key === 'position') {
              const pos = value as Position;
              upsertKeyframe(newKeyframes, 'x', pos.x);
              upsertKeyframe(newKeyframes, 'y', pos.y);
          } else if (key === 'scale' || key === 'rotation' || key === 'opacity') {
              upsertKeyframe(newKeyframes, key as any, value as number);
          } else {
              // Non-animatable property in this context, just update static
              if (isMockup) onUpdateMockup(id, { [key]: value });
              else onUpdateOverlay(id, { [key]: value });
          }
      });

      if (isMockup) onUpdateMockup(id, { keyframes: newKeyframes });
      else onUpdateOverlay(id, { keyframes: newKeyframes });
  };

  const upsertKeyframe = (keyframes: Keyframe[], property: Keyframe['property'], value: number) => {
      const existingIndex = keyframes.findIndex(k => k.property === property && Math.abs(k.timestamp - currentTime) < 0.05);
      
      if (existingIndex >= 0) {
          keyframes[existingIndex] = { ...keyframes[existingIndex], value };
      } else {
          keyframes.push({
              id: Math.random().toString(36).substr(2, 9),
              timestamp: currentTime,
              property,
              value,
              easing: 'easeInOut' // Default easing
          });
      }
  };


  // --- Transform Logic ---
  const handleMouseDown = (e: React.MouseEvent, item: MockupItem | OverlayItem, type: 'scale' | 'rotate' | 'move', corner?: 'tl'|'tr'|'bl'|'br') => {
      e.stopPropagation();
      // We do not prevent default here to ensure focus events work, but we stop propagation
      
      // Do not drag if we are in text edit mode for this item
      if (editingId === item.id && type === 'move') return;

      onSelectMockup(item.id); // Ensure selection
      
      // Determine Start Values based on current Rendered state (interpolated)
      const currentX = interpolate(item.position.x, item.keyframes, currentTime, 'x');
      const currentY = interpolate(item.position.y, item.keyframes, currentTime, 'y');
      const currentScale = interpolate(item.scale, item.keyframes, currentTime, 'scale');
      const currentRotation = interpolate(item.rotation, item.keyframes, currentTime, 'rotation');

      setTransformDrag({
          id: item.id,
          type,
          corner,
          startX: e.clientX,
          startY: e.clientY,
          initialValX: currentX, // For move X
          initialValY: currentY, // For move Y
          initialScale: currentScale,
          initialRotation: currentRotation
      });
  };

  useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
          if (!transformDrag) return;

          const deltaX = (e.clientX - transformDrag.startX) / canvas.zoom;
          const deltaY = (e.clientY - transformDrag.startY) / canvas.zoom;
          
          if (transformDrag.type === 'scale') {
              // Scale Logic with 4 corners
              const sensitivity = 0.005;
              let change = 0;
              
              if (transformDrag.corner) {
                  const xFactor = (transformDrag.corner === 'tr' || transformDrag.corner === 'br') ? 1 : -1;
                  const yFactor = (transformDrag.corner === 'bl' || transformDrag.corner === 'br') ? 1 : -1;
                  change = (deltaX * xFactor) + (deltaY * yFactor);
              } else {
                  // Fallback for single handle (br)
                  change = deltaX + deltaY;
              }

              const newScale = Math.max(0.1, transformDrag.initialScale + change * sensitivity);
              updateItemProperty(transformDrag.id, { scale: newScale });
          } 
          else if (transformDrag.type === 'rotate') {
              // Rotate Logic
              const newRot = transformDrag.initialRotation + deltaX;
              updateItemProperty(transformDrag.id, { rotation: newRot });
          } 
          else if (transformDrag.type === 'move') {
              // Move Logic with VISUAL GUIDES
              let newX = transformDrag.initialValX + deltaX;
              let newY = transformDrag.initialValY + deltaY;
              
              const SNAP_THRESHOLD = 10 / canvas.zoom; // Threshold for showing guides
              const newGuides: SnapGuide[] = [];

              // 1. Center Snapping
              if (Math.abs(newX) < SNAP_THRESHOLD) {
                  newGuides.push({ type: 'vertical', position: 0 });
              }
              if (Math.abs(newY) < SNAP_THRESHOLD) {
                  newGuides.push({ type: 'horizontal', position: 0 });
              }

              // 2. Align with other objects (Use their CURRENT interpolated positions)
              const allItems = [...mockups, ...overlays].filter(i => i.id !== transformDrag.id);
              
              for (const other of allItems) {
                  const otherX = interpolate(other.position.x, other.keyframes, currentTime, 'x');
                  const otherY = interpolate(other.position.y, other.keyframes, currentTime, 'y');

                  if (Math.abs(newX - otherX) < SNAP_THRESHOLD) {
                      if (!newGuides.some(g => g.type === 'vertical' && g.position === otherX)) {
                          newGuides.push({ type: 'vertical', position: otherX });
                      }
                  }
                  if (Math.abs(newY - otherY) < SNAP_THRESHOLD) {
                      if (!newGuides.some(g => g.type === 'horizontal' && g.position === otherY)) {
                          newGuides.push({ type: 'horizontal', position: otherY });
                      }
                  }
              }

              setActiveGuides(newGuides);

              // Update position freely (snapping visual only)
              updateItemProperty(transformDrag.id, { position: { x: newX, y: newY } });
          }
      };

      const handleMouseUp = () => {
          setTransformDrag(null);
          setActiveGuides([]); // Clear guides on drop
      };

      if (transformDrag) {
          window.addEventListener('mousemove', handleMouseMove);
          window.addEventListener('mouseup', handleMouseUp);
      }
      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
      };
  }, [transformDrag, mockups, overlays, onUpdateMockup, onUpdateOverlay, canvas.zoom, mode, currentTime]);


  // Helper to render visual controls around selected item
  const renderControls = (item: MockupItem | OverlayItem, currentScale: number, currentRotation: number) => {
      // Don't show transform controls if editing text
      if (state.selectedId !== item.id || editingId === item.id) return null;
      
      const invScale = 1 / currentScale;
      const handleSize = 10 * invScale;
      const offset = 5 * invScale; // 1/2 of handle size to center it
      const rotDist = 36 * invScale;
      
      const handleClass = "absolute bg-white border border-indigo-500 shadow-sm pointer-events-auto transition-transform hover:scale-125 z-50";
      const handleStyleBase = { width: `${handleSize}px`, height: `${handleSize}px`, borderRadius: `${2 * invScale}px` };

      // Indicator Content
      let infoLabel = null;
      if (transformDrag && transformDrag.id === item.id) {
          let text = '';
          if (transformDrag.type === 'rotate') {
              text = `${Math.round(currentRotation)}°`;
          } else if (transformDrag.type === 'scale') {
               // Try to get base dimensions
               const type = 'type' in item ? (item as any).type : 'content' in item ? (item as any).content : '';
               const base = getBaseDimensions(type);
               if (base) {
                   text = `${Math.round(base.w * currentScale)} x ${Math.round(base.h * currentScale)}`;
               } else {
                   text = `${Math.round(currentScale * 100)}%`;
               }
          }

          if (text) {
              infoLabel = (
                  <div 
                    className="absolute left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap z-[60]"
                    style={{ bottom: `${-30 * invScale}px`, transform: `scale(${invScale})` }}
                  >
                      {text}
                  </div>
              );
          }
      }

      return (
          <div className="absolute inset-0 border-2 border-indigo-500 pointer-events-none z-40">
               {/* Info Label */}
               {infoLabel}

               {/* Rotate Handle (Top Center) */}
               <div 
                  className="absolute left-1/2 -translate-x-1/2 bg-white rounded-full shadow-md flex items-center justify-center cursor-move pointer-events-auto hover:bg-zinc-50 hover:text-indigo-600 transition-colors"
                  style={{ 
                      top: `-${rotDist}px`, 
                      width: `${24 * invScale}px`, 
                      height: `${24 * invScale}px`,
                      cursor: 'grab' 
                    }}
                  onMouseDown={(e) => handleMouseDown(e, item, 'rotate')}
                  onClick={(e) => e.stopPropagation()}
               >
                   <RotateCw size={14 * invScale} className="text-zinc-700" />
               </div>
               
               {/* TL */}
               <div 
                  className={`${handleClass} cursor-nwse-resize`}
                  style={{ ...handleStyleBase, top: `-${offset}px`, left: `-${offset}px` }}
                  onMouseDown={(e) => handleMouseDown(e, item, 'scale', 'tl')}
                  onClick={(e) => e.stopPropagation()}
               />
               {/* TR */}
               <div 
                  className={`${handleClass} cursor-nesw-resize`}
                  style={{ ...handleStyleBase, top: `-${offset}px`, right: `-${offset}px` }}
                  onMouseDown={(e) => handleMouseDown(e, item, 'scale', 'tr')}
                  onClick={(e) => e.stopPropagation()}
               />
               {/* BL */}
               <div 
                  className={`${handleClass} cursor-nesw-resize`}
                  style={{ ...handleStyleBase, bottom: `-${offset}px`, left: `-${offset}px` }}
                  onMouseDown={(e) => handleMouseDown(e, item, 'scale', 'bl')}
                  onClick={(e) => e.stopPropagation()}
               />
               {/* BR */}
               <div 
                  className={`${handleClass} cursor-nwse-resize`}
                  style={{ ...handleStyleBase, bottom: `-${offset}px`, right: `-${offset}px` }}
                  onMouseDown={(e) => handleMouseDown(e, item, 'scale', 'br')}
                  onClick={(e) => e.stopPropagation()}
               />
          </div>
      );
  };

  // Render Guides
  const renderGuides = () => (
      <svg className="absolute inset-0 pointer-events-none overflow-visible" style={{ width: '100%', height: '100%', left: 0, top: 0, zIndex: 9999 }}>
          {activeGuides.map((guide, i) => {
              if (guide.type === 'vertical') {
                  const x = (canvas.width / 2) + guide.position;
                  return (
                      <line key={i} x1={x} y1={-10000} x2={x} y2={10000} stroke="#06b6d4" strokeWidth="1" strokeDasharray="4 2" />
                  );
              } else {
                  const y = (canvas.height / 2) + guide.position;
                  return (
                      <line key={i} x1={-10000} y1={y} x2={10000} y2={y} stroke="#06b6d4" strokeWidth="1" strokeDasharray="4 2" />
                  );
              }
          })}
      </svg>
  );

  // Render Motion Path
  const renderMotionPath = (item: MockupItem | OverlayItem) => {
      if (mode !== 'video' || item.keyframes.length < 2) return null;
      if (state.selectedId !== item.id) return null;

      // Collect X and Y keyframes
      const xKeys = item.keyframes.filter(k => k.property === 'x').sort((a,b) => a.timestamp - b.timestamp);
      const yKeys = item.keyframes.filter(k => k.property === 'y').sort((a,b) => a.timestamp - b.timestamp);

      if (xKeys.length === 0 && yKeys.length === 0) return null;

      const pathPoints: string[] = [];
      const startTime = Math.min(...item.keyframes.map(k => k.timestamp));
      const endTime = Math.max(...item.keyframes.map(k => k.timestamp));
      
      // Sample points along the timeline to draw the curve
      const step = (endTime - startTime) / 50; 
      
      for(let t = startTime; t <= endTime; t += step) {
          const x = interpolate(item.position.x, item.keyframes, t, 'x');
          const y = interpolate(item.position.y, item.keyframes, t, 'y');
          const cx = (canvas.width / 2) + x;
          const cy = (canvas.height / 2) + y;
          pathPoints.push(`${cx},${cy}`);
      }

      return (
          <svg className="absolute inset-0 pointer-events-none overflow-visible" style={{ width: '100%', height: '100%', left: 0, top: 0, zIndex: 10 }}>
              <polyline 
                points={pathPoints.join(' ')} 
                fill="none" 
                stroke="#6366f1" 
                strokeWidth="2" 
                strokeDasharray="4 4" 
                opacity="0.5"
            />
              {/* Draw dots at keyframes */}
              {item.keyframes.filter(k => k.property === 'x' || k.property === 'y').map(k => {
                   const x = interpolate(item.position.x, item.keyframes, k.timestamp, 'x');
                   const y = interpolate(item.position.y, item.keyframes, k.timestamp, 'y');
                   const cx = (canvas.width / 2) + x;
                   const cy = (canvas.height / 2) + y;
                   return (
                       <circle key={k.id} cx={cx} cy={cy} r="3" fill="#6366f1" />
                   )
              })}
          </svg>
      );
  };
  
  // Render Specific Shape SVG
  const renderShape = (overlay: OverlayItem) => {
      const fill = overlay.style.backgroundColor || '#ffffff';
      const shapeType = overlay.content || 'rect'; // Default to rect if empty
      const size = 100; // Base size, scaled by transform

      const commonProps = {
          width: "100%",
          height: "100%",
          fill: fill,
          style: {
              filter: 'drop-shadow(0px 4px 6px rgba(0,0,0,0.1))'
          }
      };

      switch(shapeType) {
          case 'circle':
              return <div style={{width: '100px', height: '100px', backgroundColor: fill, borderRadius: '50%'}}></div>;
          case 'rounded':
              return <div style={{width: '100px', height: '100px', backgroundColor: fill, borderRadius: '20px'}}></div>;
          case 'triangle':
              return (
                  <svg viewBox="0 0 100 100" style={{width: '100px', height: '100px'}}>
                      <path d="M50 15 L15 85 L85 85 Z" fill={fill} />
                  </svg>
              );
          case 'star':
              return (
                  <svg viewBox="0 0 24 24" style={{width: '100px', height: '100px'}}>
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill={fill} />
                  </svg>
              );
          case 'heart':
              return (
                   <svg viewBox="0 0 24 24" style={{width: '100px', height: '100px'}}>
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill={fill} />
                   </svg>
              );
          case 'diamond':
               return (
                   <div style={{width: '70px', height: '70px', backgroundColor: fill, transform: 'rotate(45deg)', margin: '15px'}}></div>
               );
          case 'hexagon':
               return (
                  <svg viewBox="0 0 100 100" style={{width: '100px', height: '100px'}}>
                      <path d="M50 0 L95 25 L95 75 L50 100 L5 75 L5 25 Z" fill={fill} />
                  </svg>
               );
          case 'rect':
          default:
              return <div style={{width: '100px', height: '100px', backgroundColor: fill, borderRadius: overlay.style.borderRadius || 0}}></div>;
      }
  };

  // Combine items for unified rendering sorted by Z-Index
  const sortedItems = useMemo(() => {
    const combined = [...mockups, ...overlays];
    return combined.sort((a, b) => a.zIndex - b.zIndex);
  }, [mockups, overlays]);

  // Calculate scaled footprint for scrolling
  const scaledWidth = canvas.width * canvas.zoom;
  const scaledHeight = canvas.height * canvas.zoom;

  return (
    <div
      className="flex-1 h-full bg-zinc-950 overflow-auto relative select-none custom-scrollbar"
      onClick={() => { onDeselect(); setEditingId(null); }}
    >
       {/* Inner Wrapper for Centering */}
       <div className="min-w-full min-h-full flex items-center justify-center p-10">
          
          {/* Layout Footprint Container */}
          <div
             style={{
                 width: scaledWidth,
                 height: scaledHeight,
                 position: 'relative',
                 transition: 'width 0.3s ease-out, height 0.3s ease-out'
             }}
             onClick={(e) => e.stopPropagation()}
          >
              {/* Visual Checkerboard Underlay (Separate from Export Node) */}
              {canvas.backgroundType === 'transparent' && (
                  <div 
                      className="absolute inset-0 pointer-events-none"
                      style={{
                          transform: `scale(${canvas.zoom})`,
                          transformOrigin: 'top left',
                          width: canvas.width, 
                          height: canvas.height,
                          backgroundImage: 'linear-gradient(45deg, #27272a 25%, transparent 25%), linear-gradient(-45deg, #27272a 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #27272a 75%), linear-gradient(-45deg, transparent 75%, #27272a 75%)',
                          backgroundSize: '20px 20px',
                          backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
                      }}
                  />
              )}

              <div
                id="export-canvas"
                className="shadow-2xl relative origin-top-left"
                style={{
                  width: canvas.width,
                  height: canvas.height,
                  transform: `scale(${canvas.zoom})`,
                  transition: 'transform 0.3s ease-out',
                  zIndex: 1, // Ensure it sits above checkerboard
                  ...getBackgroundStyle(),
                }}
                ref={canvasRef}
                onMouseDown={(e) => { e.stopPropagation(); onDeselect(); }}
              >
                {renderGuides()}

                <div style={{ padding: canvas.padding, width: '100%', height: '100%', position: 'relative' }}>
                  
                  {sortedItems.map((item) => {
                     if (!isVisible(item.startTime, item.duration)) return null;
                     const animClass = getAnimationClass(item);
                     
                     // Determine if it is a mockup or an overlay
                     const isMockup = 'contentUrl' in item;

                     // Calculate Render Properties (Interpolated)
                     const renderX = interpolate(item.position.x, item.keyframes, currentTime, 'x');
                     const renderY = interpolate(item.position.y, item.keyframes, currentTime, 'y');
                     const renderScale = interpolate(item.scale, item.keyframes, currentTime, 'scale');
                     const renderRotation = interpolate(item.rotation, item.keyframes, currentTime, 'rotation');

                     if (isMockup) {
                         const mockup = item as MockupItem;
                         return (
                            <div key={mockup.id} className={`absolute inset-0 flex items-center justify-center pointer-events-none`}>
                                {renderMotionPath(item)}
                                <div className={`relative ${animClass}`}> 
                                    <div 
                                        className="pointer-events-auto"
                                        style={{
                                            transform: `translate(${renderX}px, ${renderY}px) rotate(${renderRotation}deg) scale(${renderScale})`,
                                            zIndex: mockup.zIndex,
                                            position: 'relative'
                                        }}
                                    >
                                         <div 
                                            className="relative cursor-move"
                                            onMouseDown={(e) => handleMouseDown(e, mockup, 'move')}
                                            onClick={(e) => e.stopPropagation()} 
                                            draggable={false}
                                         >
                                             <DeviceFrame
                                                 mockup={mockup}
                                                 isSelected={state.selectedId === mockup.id}
                                                 onSelect={onSelectMockup}
                                                 isPlaying={state.isPlaying && mode === 'video'}
                                                 currentTime={currentTime}
                                                 onEmptyClick={() => {
                                                    onSelectMockup(mockup.id);
                                                    onEmptyMockupClick();
                                                 }}
                                             />
                                             {state.selectedId === mockup.id && (
                                                 <div className="absolute inset-0 pointer-events-none">
                                                     {renderControls(mockup, renderScale, renderRotation)}
                                                 </div>
                                             )}
                                         </div>
                                    </div>
                                </div>
                            </div>
                         );
                     } else {
                         const overlay = item as OverlayItem;
                         const isEditing = editingId === overlay.id;

                         // Filter styles for container to avoid double-rendering background on non-rectangular shapes
                         const containerStyle = { ...overlay.style };
                         if (overlay.type === 'shape') {
                             delete containerStyle.backgroundColor;
                         }

                         return (
                            <div key={overlay.id} className={`absolute inset-0 flex items-center justify-center pointer-events-none`}>
                                {renderMotionPath(item)}
                                <div
                                    className={`pointer-events-auto cursor-move relative group ${animClass}`}
                                    onMouseDown={(e) => handleMouseDown(e, overlay, 'move')}
                                    onClick={(e) => e.stopPropagation()}
                                    draggable={false}
                                    onDoubleClick={(e) => {
                                         if (overlay.type === 'text') {
                                             e.stopPropagation();
                                             setEditingId(overlay.id);
                                         }
                                    }}
                                    style={{
                                        transform: `translate(${renderX}px, ${renderY}px) rotate(${renderRotation}deg) scale(${renderScale})`,
                                        zIndex: overlay.zIndex, // Important: Apply zIndex here
                                        ...containerStyle,
                                        fontSize: overlay.style.fontSize ? `${overlay.style.fontSize}px` : undefined,
                                        fontFamily: overlay.style.fontFamily || 'Inter',
                                    }}
                                >
                                    {overlay.type === 'text' && (
                                        isEditing ? (
                                            <input
                                                autoFocus
                                                className="bg-transparent outline-none w-full text-center min-w-[100px]"
                                                value={overlay.content}
                                                onChange={(e) => onUpdateOverlay(overlay.id, { content: e.target.value })}
                                                onBlur={() => setEditingId(null)}
                                                onKeyDown={(e) => { if(e.key === 'Enter') { e.preventDefault(); setEditingId(null); } }}
                                                onClick={(e) => e.stopPropagation()} 
                                                style={{
                                                    color: overlay.style.color || '#fff',
                                                    fontWeight: overlay.style.fontWeight || '600',
                                                    fontSize: 'inherit',
                                                    fontFamily: 'inherit'
                                                }}
                                            />
                                        ) : (
                                            <span style={{color: overlay.style.color || '#fff', fontWeight: overlay.style.fontWeight || '600'}}>
                                                {overlay.content}
                                            </span>
                                        )
                                    )}
                                    {overlay.type === 'emoji' && <span style={{fontSize: '48px'}}>{overlay.content}</span>}
                                    {overlay.type === 'shape' && renderShape(overlay)}
                                    {overlay.type === 'image' && <img src={overlay.content} alt="" className="w-full h-full object-cover pointer-events-none select-none" draggable={false} />}
                                    {overlay.type === 'video' && <VideoOverlay src={overlay.content} isPlaying={state.isPlaying && mode === 'video'} currentTime={currentTime} startTime={overlay.startTime} />}
                                    
                                    {/* Controls */}
                                    {renderControls(overlay, renderScale, renderRotation)}
                                </div>
                            </div>
                         );
                     }
                  })}
                </div>
              </div>
          </div>
       </div>
    </div>
  );
};
