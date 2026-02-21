
import React, { useRef, useState, useEffect } from 'react';
import { Play, Pause, GripVertical, Smartphone, Monitor, Laptop, Box, Type, Smile, Image as ImageIcon, Video, Layers, Diamond } from 'lucide-react';
import { AppState, MockupItem, OverlayItem } from '../types';

interface TimelineProps {
  state: AppState;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onSelect: (id: string) => void;
  onUpdateTiming: (id: string, start: number, duration: number) => void;
  onMoveLayer: (draggedId: string, targetId: string) => void;
}

export const Timeline: React.FC<TimelineProps> = ({ state, onPlayPause, onSeek, onSelect, onUpdateTiming, onMoveLayer }) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{ id: string, type: 'move' | 'resize-left' | 'resize-right', startX: number, originalStart: number, originalDuration: number } | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Combine layers for rendering order (reversed to match visual stack usually)
  // Note: For Z-Index stacking, index 0 is bottom. For Timeline list, usually Top item is Top Z-Index.
  // The App passes sorted layers.
  const layers = [...state.mockups, ...state.overlays].sort((a, b) => b.zIndex - a.zIndex);

  const formatRulerTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    // Format 0:01, 0:02 etc
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatDisplayTime = (seconds: number) => {
     const m = Math.floor(seconds / 60);
     const s = Math.floor(seconds % 60);
     const ms = Math.floor((seconds % 1) * 100);
     return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const getLayerIcon = (layer: MockupItem | OverlayItem) => {
      if ('type' in layer) {
          // It is MockupItem if it has 'type' which matches DeviceType
          if (layer.type === 'iphone-15') return <Smartphone size={14} className="text-blue-400" />;
          if (layer.type === 'macbook-air') return <Laptop size={14} className="text-zinc-400" />;
          if (layer.type === 'browser-window') return <Monitor size={14} className="text-indigo-400" />;
          if (layer.type === 'ipad-pro') return <Monitor size={14} className="text-purple-400" />;
          if (layer.type === 'apple-watch') return <Box size={14} className="text-orange-400" />;
          
          // It is OverlayItem
          if (layer.type === 'text') return <Type size={14} className="text-emerald-400" />;
          if (layer.type === 'emoji') return <Smile size={14} className="text-yellow-400" />;
          if (layer.type === 'shape') return <Box size={14} className="text-pink-400" />;
          if (layer.type === 'image') return <ImageIcon size={14} className="text-cyan-400" />;
      }
      return <Layers size={14} className="text-zinc-500" />;
  };

  const handleSeek = (e: React.MouseEvent) => {
    if (timelineRef.current && !dragging) {
      const rect = timelineRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = Math.min(Math.max(x / rect.width, 0), 1);
      onSeek(percent * state.duration);
    }
  };

  // --- Drag Logic for Time Blocks ---
  const handleMouseDown = (e: React.MouseEvent, item: MockupItem | OverlayItem, type: 'move' | 'resize-left' | 'resize-right') => {
    e.stopPropagation();
    onSelect(item.id);
    setDragging({
      id: item.id,
      type,
      startX: e.clientX,
      originalStart: item.startTime,
      originalDuration: item.duration
    });
  };

  // --- Drag and Drop for Reordering Tracks ---
  const handleTrackDragStart = (e: React.DragEvent, id: string) => {
      e.dataTransfer.setData('layerId', id);
      e.dataTransfer.effectAllowed = 'move';
  };

  const handleTrackDragOver = (e: React.DragEvent, id: string) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (dragOverId !== id) setDragOverId(id);
  };

  const handleTrackDrop = (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      const draggedId = e.dataTransfer.getData('layerId');
      if (draggedId && draggedId !== targetId) {
          onMoveLayer(draggedId, targetId);
      }
      setDragOverId(null);
  };

  const handleTrackDragLeave = () => {
      setDragOverId(null);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragging || !timelineRef.current) return;

      const rect = timelineRef.current.getBoundingClientRect();
      const pixelsPerSecond = rect.width / state.duration;
      const deltaX = e.clientX - dragging.startX;
      const deltaTime = deltaX / pixelsPerSecond;
      
      // Snapping Logic
      const SNAP_THRESHOLD_PX = 15;
      const SNAP_THRESHOLD_SEC = SNAP_THRESHOLD_PX / pixelsPerSecond;
      
      // Collect snap points (Start and End of all OTHER clips + 0 + MaxDuration)
      const snapPoints = [0, state.duration];
      const otherLayers = [...state.mockups, ...state.overlays].filter(l => l.id !== dragging.id);
      
      otherLayers.forEach(l => {
          snapPoints.push(l.startTime);
          snapPoints.push(l.startTime + l.duration);
          
          // FEATURE: Snap to same length (only relevant for resizing)
          if (dragging.type === 'resize-right' || dragging.type === 'resize-left') {
              // If resizing, we might want to snap such that duration equals this other layer's duration
              // For resize-right: NewEnd = CurrentStart + OtherDuration
              if (dragging.type === 'resize-right') {
                  snapPoints.push(dragging.originalStart + l.duration);
              }
              // For resize-left: NewStart = CurrentEnd - OtherDuration
              if (dragging.type === 'resize-left') {
                  snapPoints.push((dragging.originalStart + dragging.originalDuration) - l.duration);
              }
          }
      });

      // Helper to find closest snap
      const findClosestSnap = (targetTime: number): number | null => {
          let closest = null;
          let minDiff = Infinity;
          for (const point of snapPoints) {
              const diff = Math.abs(targetTime - point);
              if (diff < SNAP_THRESHOLD_SEC && diff < minDiff) {
                  minDiff = diff;
                  closest = point;
              }
          }
          return closest;
      };

      let newStart = dragging.originalStart;
      let newDuration = dragging.originalDuration;

      if (dragging.type === 'move') {
        let rawStart = dragging.originalStart + deltaTime;
        let rawEnd = rawStart + dragging.originalDuration;
        
        // Try snapping start first
        const snapStart = findClosestSnap(rawStart);
        if (snapStart !== null) {
            rawStart = snapStart;
            // Recalculate end based on snapped start
            rawEnd = rawStart + dragging.originalDuration;
        } else {
            // Try snapping end
            const snapEnd = findClosestSnap(rawEnd);
            if (snapEnd !== null) {
                rawEnd = snapEnd;
                rawStart = rawEnd - dragging.originalDuration;
            }
        }
        
        newStart = Math.max(0, rawStart);
        if (newStart + newDuration > state.duration) {
            newStart = state.duration - newDuration;
        }

      } else if (dragging.type === 'resize-right') {
        let rawEnd = dragging.originalStart + dragging.originalDuration + deltaTime;
        const snapEnd = findClosestSnap(rawEnd);
        if (snapEnd !== null) rawEnd = snapEnd;
        
        newDuration = Math.max(0.2, rawEnd - dragging.originalStart);
        if (newStart + newDuration > state.duration) {
            newDuration = state.duration - newStart;
        }

      } else if (dragging.type === 'resize-left') {
        let rawStart = dragging.originalStart + deltaTime;
        const snapStart = findClosestSnap(rawStart);
        if (snapStart !== null) rawStart = snapStart;

        const potentialStart = Math.max(0, rawStart);
        const shift = potentialStart - dragging.originalStart;
        
        // prevent start form pushing into negative duration
        if (dragging.originalDuration - shift > 0.2) {
             newDuration = dragging.originalDuration - shift;
             newStart = potentialStart;
        }
      }

      onUpdateTiming(dragging.id, newStart, newDuration);
    };

    const handleMouseUp = () => {
      setDragging(null);
    };

    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, state.duration, onUpdateTiming, state.mockups, state.overlays]);


  return (
    <div className="h-80 bg-[#09090b] border-t border-zinc-800 flex flex-col shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.8)] z-50 select-none text-zinc-300 font-sans">
      
      {/* Controls Bar */}
      <div className="h-10 border-b border-zinc-800 flex items-center justify-between px-4 bg-[#09090b]">
        <div className="flex items-center space-x-4">
            <button 
                onClick={onPlayPause} 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white transition-all ${state.isPlaying ? 'bg-zinc-700 hover:bg-zinc-600' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/20 shadow-lg'}`}
            >
                {state.isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
            </button>
            <div className="text-lg font-mono font-medium text-zinc-200 tracking-tight">
                {formatDisplayTime(state.currentTime)}
            </div>
            <div className="text-xs text-zinc-600 font-mono self-end pb-1.5">
                / {formatDisplayTime(state.duration)}
            </div>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        
        {/* Track Headers (Left Sidebar) */}
        <div className="w-14 md:w-48 lg:w-64 bg-[#09090b] border-r border-zinc-800 flex-shrink-0 flex flex-col z-20 transition-all duration-300">
             {/* Ruler Spacer */}
             <div className="h-8 border-b border-zinc-800 bg-[#09090b] relative flex items-center px-4">
                 <div className="hidden md:block text-[10px] text-zinc-600 font-medium">L A Y E R S</div>
             </div>
             
             <div className="flex-1 overflow-hidden">
                {layers.map((layer) => (
                    <div 
                        key={layer.id} 
                        className={`h-16 border-b border-zinc-800/50 flex items-center px-4 text-sm cursor-pointer transition-colors 
                        ${state.selectedId === layer.id ? 'bg-zinc-900/80 text-white' : 'hover:bg-zinc-900/30 text-zinc-400'}
                        ${dragOverId === layer.id ? 'border-t-2 border-t-indigo-500 bg-zinc-800' : ''}
                        `}
                        onClick={() => onSelect(layer.id)}
                        draggable
                        onDragStart={(e) => handleTrackDragStart(e, layer.id)}
                        onDragOver={(e) => handleTrackDragOver(e, layer.id)}
                        onDrop={(e) => handleTrackDrop(e, layer.id)}
                        onDragLeave={handleTrackDragLeave}
                    >
                        <div className="mr-3 opacity-40 cursor-grab hover:opacity-100 hidden md:block"><GripVertical size={14}/></div>
                        <div className="mr-0 md:mr-3 p-1.5 rounded-md bg-zinc-800/50 border border-zinc-700/50 flex-shrink-0">
                            {getLayerIcon(layer)}
                        </div>
                        <div className="flex-col flex min-w-0 hidden md:flex">
                            <span className="truncate font-medium leading-none mb-1">{layer.name}</span>
                            <span className="text-[10px] text-zinc-600 truncate">
                                {layer.keyframes && layer.keyframes.length > 0 ? `${layer.keyframes.length} Keyframes` : (layer.animation !== 'none' ? `${layer.animation} anim` : 'No animation')}
                            </span>
                        </div>
                    </div>
                ))}
             </div>
        </div>

        {/* Timeline Area (Right Side) */}
        <div className="flex-1 relative bg-[#09090b] flex flex-col overflow-hidden min-w-0">
            
            {/* Ruler */}
            <div 
                className="h-8 bg-[#09090b] border-b border-zinc-800 relative cursor-pointer group"
                onClick={handleSeek}
                ref={timelineRef}
            >
                {/* Major Ticks (Seconds) */}
                {Array.from({ length: state.duration + 1 }).map((_, i) => (
                    <div key={i} className="absolute top-0 bottom-0 pointer-events-none" style={{ left: `${(i / state.duration) * 100}%` }}>
                        <div className="absolute top-0 left-0 w-px h-2.5 bg-zinc-600"></div>
                        <div className="absolute top-3 left-1 text-[10px] font-medium text-zinc-500 -translate-x-1/2 select-none">
                            {formatRulerTime(i)}
                        </div>
                    </div>
                ))}
                {/* Minor Ticks (Half seconds) */}
                {Array.from({ length: state.duration * 2 }).map((_, i) => {
                    if (i % 2 === 0) return null; // Skip majors
                    return (
                        <div key={`m-${i}`} className="absolute top-0 left-0 w-px h-1.5 bg-zinc-800 pointer-events-none" style={{ left: `${(i / (state.duration * 2)) * 100}%` }}></div>
                    )
                })}
            </div>

            {/* Tracks Container */}
            <div className="flex-1 relative overflow-y-auto overflow-x-hidden custom-scrollbar bg-[#09090b]">
                 
                 {/* Playhead (Stays fixed in container view) */}
                <div 
                    className="absolute top-0 bottom-0 z-40 pointer-events-none flex flex-col items-center group"
                    style={{ left: `${(state.currentTime / state.duration) * 100}%` }}
                >
                     {/* Loop/Handle */}
                     <div className="w-3.5 h-3.5 -mt-1.5 rounded-full border-2 border-[#09090b] bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)] z-50"></div>
                     {/* Line */}
                     <div className="w-px flex-1 bg-red-500 shadow-[0_0_4px_rgba(239,68,68,0.4)]"></div>
                </div>

                {layers.map((layer) => {
                    const isSelected = state.selectedId === layer.id;
                    // Determine content for filmstrip effect
                    let bgContent = null;
                    if ('contentUrl' in layer && layer.contentUrl) {
                        // Mockup with Image/Video
                        bgContent = (
                            <div className="w-full h-full flex overflow-hidden opacity-30 grayscale-[50%]">
                                {Array.from({length: 10}).map((_, i) => (
                                     <div key={i} className="flex-shrink-0 h-full aspect-video border-r border-white/5">
                                         {/* We use a simple img for visual preview, ignoring video tag for performance in timeline */}
                                         <img src={layer.contentUrl!} alt="" className="w-full h-full object-cover" />
                                     </div>
                                ))}
                            </div>
                        );
                    } else if ('content' in layer && layer.type === 'text') {
                        bgContent = <div className="p-2 text-xs text-white/20 font-bold truncate">{layer.content}</div>;
                    }

                    return (
                    <div key={layer.id} className="h-16 border-b border-zinc-800/30 relative w-full bg-zinc-900/20 group-hover:bg-zinc-900/40 transition-colors">
                         
                         {/* The Clip */}
                         <div
                            className={`absolute top-2 bottom-2 rounded-lg overflow-hidden group cursor-move select-none flex items-center
                                ${isSelected 
                                    ? 'bg-indigo-900/40 border border-indigo-500/50 shadow-[0_0_15px_-5px_rgba(99,102,241,0.3)]' 
                                    : 'bg-zinc-800 border border-zinc-700 hover:border-zinc-500'}
                            `}
                            style={{
                                left: `${(layer.startTime / state.duration) * 100}%`,
                                width: `${(layer.duration / state.duration) * 100}%`,
                                minWidth: '8px'
                            }}
                            onMouseDown={(e) => handleMouseDown(e, layer, 'move')}
                         >
                             {/* Background Preview (Filmstrip) */}
                             <div className="absolute inset-0 z-0 pointer-events-none">
                                 {bgContent}
                             </div>

                             {/* Video Icon Indicator */}
                             {'isVideo' in layer && layer.isVideo && (
                                 <div className="absolute bottom-1 right-1 z-10 bg-black/60 p-0.5 rounded text-white/80">
                                     <Video size={10} />
                                 </div>
                             )}

                             {/* Resize Handle Left */}
                             <div 
                                className="absolute left-0 top-0 bottom-0 w-4 cursor-w-resize hover:bg-indigo-500/20 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                onMouseDown={(e) => handleMouseDown(e, layer, 'resize-left')}
                             >
                                 <div className="w-1 h-4 bg-white/50 rounded-full"></div>
                             </div>

                             {/* Clip Label & Keyframes */}
                             <div className="relative z-10 px-3 flex items-center space-x-2 w-full min-w-0">
                                 <span className="text-[11px] font-medium text-white/90 truncate shadow-sm pointer-events-none">
                                     {layer.name}
                                 </span>
                                 {/* Keyframe Markers */}
                                 {layer.keyframes.map((k) => {
                                     // Keyframes are relative to layer start time in render logic if we wanted relative, 
                                     // but our data model stores absolute timestamp.
                                     // Need to normalize position within the clip block
                                     const relativePos = k.timestamp;
                                     if (relativePos < layer.startTime || relativePos > layer.startTime + layer.duration) return null;
                                     const percent = ((relativePos - layer.startTime) / layer.duration) * 100;
                                     
                                     return (
                                         <div 
                                            key={k.id}
                                            className="absolute top-1/2 -translate-y-1/2 cursor-pointer hover:scale-125 transition-transform"
                                            style={{ left: `${percent}%` }}
                                            onClick={(e) => { e.stopPropagation(); onSeek(k.timestamp); onSelect(layer.id); }}
                                            title={`Keyframe: ${k.property} (${k.value.toFixed(1)})`}
                                         >
                                             <div className="rotate-45 w-2.5 h-2.5 bg-yellow-400 border border-black shadow-sm"></div>
                                         </div>
                                     );
                                 })}
                             </div>

                             {/* Resize Handle Right */}
                             <div 
                                className="absolute right-0 top-0 bottom-0 w-4 cursor-e-resize hover:bg-indigo-500/20 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                onMouseDown={(e) => handleMouseDown(e, layer, 'resize-right')}
                             >
                                 <div className="w-1 h-4 bg-white/50 rounded-full"></div>
                             </div>
                         </div>
                    </div>
                )})}
            </div>
        </div>
      </div>
    </div>
  );
};
