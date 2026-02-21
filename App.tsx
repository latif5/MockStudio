
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Sidebar } from './components/Sidebar';
import { Canvas } from './components/Canvas';
import { Timeline } from './components/Timeline';
import { AppState, DeviceType, MockupItem, OverlayItem, BackgroundType } from './types';
import { INITIAL_MOCKUP, DEFAULT_GRADIENTS, DEVICE_DEFINITIONS } from './constants';
import { Download, Monitor, Moon, Sun, Undo2, Redo2, ZoomIn, ZoomOut, PlusCircle, Video, LayoutTemplate, Film, Menu, ArrowUp, ArrowDown, Copy, Trash2, ArrowUpFromLine, ArrowDownToLine, Layers, Loader2, Settings, X, ChevronDown, Check } from 'lucide-react';
import { toPng } from 'html-to-image';

// --- Types needed for helper functions ---
const generateId = () => Math.random().toString(36).substr(2, 9);

const App: React.FC = () => {
  // --- State ---
  const [state, setState] = useState<AppState>({
    mockups: [INITIAL_MOCKUP],
    overlays: [],
    canvas: {
      width: 1920,
      height: 1080,
      backgroundType: 'gradient',
      backgroundColor: '#000000',
      backgroundGradient: DEFAULT_GRADIENTS[8],
      padding: 40,
      zoom: 0.5, // Initial placeholder, will be calculated
    },
    selectedId: INITIAL_MOCKUP.id,
    mode: 'design',
    isPlaying: false,
    duration: 10,
    currentTime: 0,
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [hasInitializedZoom, setHasInitializedZoom] = useState(false);
  const [clipboardId, setClipboardId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  
  // Export Settings State
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportSettings, setExportSettings] = useState<{
      imageScale: 1 | 2 | 4;
      videoRes: 720 | 1080 | 1440;
      videoFps: 25 | 30 | 60;
  }>({
      imageScale: 2,
      videoRes: 1080,
      videoFps: 30
  });


  // Ref for canvas click upload interaction
  const canvasInputRef = useRef<HTMLInputElement>(null);

  // Ref to access latest state in event listeners without re-binding
  const stateRef = useRef(state);
  useEffect(() => {
      stateRef.current = state;
  }, [state]);

  // --- Handlers & Helpers (Hoisted for usage in effects) ---
  
  const updateState = (newState: Partial<AppState>) => {
    setState((prev) => ({ ...prev, ...newState }));
  };

  const updateMockup = (id: string, updates: Partial<MockupItem>) => {
    setState((prev) => ({
      ...prev,
      mockups: prev.mockups.map((m) => (m.id === id ? { ...m, ...updates } : m)),
    }));
  };
  
  const updateOverlay = (id: string, updates: Partial<OverlayItem>) => {
      setState((prev) => ({
        ...prev,
        overlays: prev.overlays.map((o) => (o.id === id ? { ...o, ...updates } : o)),
      }));
  };
  
  const deleteLayer = (id: string) => {
      setState(prev => ({
          ...prev,
          mockups: prev.mockups.filter(m => m.id !== id),
          overlays: prev.overlays.filter(o => o.id !== id),
          selectedId: prev.selectedId === id ? null : prev.selectedId
      }));
  };

  const getNextZIndex = () => {
      const allItems = [...state.mockups, ...state.overlays];
      if (allItems.length === 0) return 1;
      return Math.max(...allItems.map(i => i.zIndex)) + 1;
  };

  const duplicateLayer = (id: string) => {
      const mockup = state.mockups.find(m => m.id === id);
      if (mockup) {
          const newItem: MockupItem = {
              ...mockup,
              id: generateId(),
              name: `${mockup.name} (Copy)`,
              position: { x: mockup.position.x + 20, y: mockup.position.y + 20 },
              zIndex: getNextZIndex()
          };
          setState(prev => ({
              ...prev,
              mockups: [...prev.mockups, newItem],
              selectedId: newItem.id
          }));
          return;
      }
      
      const overlay = state.overlays.find(o => o.id === id);
      if (overlay) {
          const newItem: OverlayItem = {
              ...overlay,
              id: generateId(),
              name: `${overlay.name} (Copy)`,
              position: { x: overlay.position.x + 20, y: overlay.position.y + 20 },
              zIndex: getNextZIndex()
          };
          setState(prev => ({
              ...prev,
              overlays: [...prev.overlays, newItem],
              selectedId: newItem.id
          }));
      }
  };

  const reorderLayer = (id: string, direction: 'front' | 'back' | 'forward' | 'backward') => {
      const allItems = [...state.mockups, ...state.overlays].sort((a,b) => a.zIndex - b.zIndex);
      const currentIndex = allItems.findIndex(i => i.id === id);
      if (currentIndex === -1) return;

      const currentItem = allItems[currentIndex];
      
      let newZIndex = currentItem.zIndex;
      const updates: {id: string, zIndex: number}[] = [];

      if (direction === 'front') {
           newZIndex = allItems[allItems.length - 1].zIndex + 1;
           updates.push({ id: currentItem.id, zIndex: newZIndex });
      } else if (direction === 'back') {
           const minZ = Math.min(...allItems.map(i => i.zIndex));
           newZIndex = minZ - 1;
           updates.push({ id: currentItem.id, zIndex: newZIndex });
      } else if (direction === 'forward') {
           if (currentIndex < allItems.length - 1) {
               const nextItem = allItems[currentIndex + 1];
               // Swap Z Indices
               updates.push({ id: currentItem.id, zIndex: nextItem.zIndex });
               updates.push({ id: nextItem.id, zIndex: currentItem.zIndex });
           }
      } else if (direction === 'backward') {
           if (currentIndex > 0) {
               const prevItem = allItems[currentIndex - 1];
               // Swap Z Indices
               updates.push({ id: currentItem.id, zIndex: prevItem.zIndex });
               updates.push({ id: prevItem.id, zIndex: currentItem.zIndex });
           }
      }

      // Apply updates
      setState(prev => {
          let newMockups = [...prev.mockups];
          let newOverlays = [...prev.overlays];

          updates.forEach(u => {
              newMockups = newMockups.map(m => m.id === u.id ? { ...m, zIndex: u.zIndex } : m);
              newOverlays = newOverlays.map(o => o.id === u.id ? { ...o, zIndex: u.zIndex } : o);
          });

          return { ...prev, mockups: newMockups, overlays: newOverlays };
      });
  };

  // Move Layer (Drag and Drop Logic)
  const moveLayer = (draggedId: string, targetId: string) => {
    setState(prev => {
        // 1. Get all items combined
        const allItems = [...prev.mockups, ...prev.overlays].sort((a, b) => b.zIndex - a.zIndex); // Descending (Visual Top first)
        
        // 2. Find indices
        const fromIndex = allItems.findIndex(i => i.id === draggedId);
        const toIndex = allItems.findIndex(i => i.id === targetId);
        
        if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return prev;

        // 3. Move item in the array
        const item = allItems[fromIndex];
        allItems.splice(fromIndex, 1);
        allItems.splice(toIndex, 0, item);

        // 4. Re-assign Z-indices based on new array order
        // The first item in the array (Top of list) should have the highest Z-index
        const newMockups: MockupItem[] = [];
        const newOverlays: OverlayItem[] = [];

        allItems.forEach((item, index) => {
            const newZ = allItems.length - index;
            if ('contentUrl' in item) {
                // It's a mockup
                newMockups.push({ ...item as MockupItem, zIndex: newZ });
            } else {
                // It's an overlay
                newOverlays.push({ ...item as OverlayItem, zIndex: newZ });
            }
        });

        return {
            ...prev,
            mockups: newMockups,
            overlays: newOverlays
        };
    });
  };

  const handleCanvasFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file && state.selectedId) {
          const url = URL.createObjectURL(file);
          const isVideo = file.type.startsWith('video/');
          
          if (isVideo) {
             const video = document.createElement('video');
             video.preload = 'metadata';
             video.onloadedmetadata = () => {
                 const newDuration = video.duration;
                 updateMockup(state.selectedId!, { contentUrl: url, isVideo: true, duration: newDuration });
                 
                 // Extend timeline if video is longer than current duration
                 const currentMockup = state.mockups.find(m => m.id === state.selectedId);
                 if (currentMockup) {
                     const endTime = currentMockup.startTime + newDuration;
                     if (endTime > state.duration) {
                         updateState({ duration: Math.ceil(endTime) });
                     }
                 }
             };
             video.onerror = () => {
                 updateMockup(state.selectedId!, { contentUrl: url, isVideo: true });
             };
             video.src = url;
          } else {
             updateMockup(state.selectedId, { contentUrl: url, isVideo: false });
          }

          e.target.value = ''; // Reset
      }
  };


  // --- Keyboard Shortcuts (Editing) ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

        // Delete
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (state.selectedId) deleteLayer(state.selectedId);
        }

        // Duplicate (Ctrl+D)
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') {
            e.preventDefault();
            if (state.selectedId) duplicateLayer(state.selectedId);
        }

        // Copy (Ctrl+C)
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
            // e.preventDefault(); // Don't prevent default copy if user wants to copy text, but here we capture object
            if (state.selectedId) setClipboardId(state.selectedId);
        }

        // Paste (Ctrl+V)
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
             // e.preventDefault();
             if (clipboardId) duplicateLayer(clipboardId);
        }

        // Layer Ordering
        // Brackets [ ] to move back/forward
        if (e.key === ']' && state.selectedId) {
             reorderLayer(state.selectedId, 'forward');
        }
        if (e.key === '[' && state.selectedId) {
             reorderLayer(state.selectedId, 'backward');
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.selectedId, state.mockups, state.overlays, clipboardId]);

  // --- Keyboard Shortcuts (Media Controls) ---
  useEffect(() => {
      const handleMediaKeys = (e: KeyboardEvent) => {
          const target = e.target as HTMLElement;
          if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
          
          const current = stateRef.current;

          // Space: Play/Pause
          if (e.code === 'Space') {
              e.preventDefault();
              updateState({ isPlaying: !current.isPlaying });
          }

          // Arrow Left: Step Back (0.1s)
          if (e.code === 'ArrowLeft') {
              e.preventDefault();
              updateState({ 
                  isPlaying: false,
                  currentTime: Math.max(0, current.currentTime - 0.1) 
              });
          }

          // Arrow Right: Step Forward (0.1s)
          if (e.code === 'ArrowRight') {
              e.preventDefault();
              updateState({ 
                  isPlaying: false,
                  currentTime: Math.min(current.duration, current.currentTime + 0.1) 
              });
          }

          // Arrow Up: Go to Start
          if (e.code === 'ArrowUp') {
              e.preventDefault();
              updateState({ currentTime: 0 });
          }

          // Arrow Down: Go to End
          if (e.code === 'ArrowDown') {
              e.preventDefault();
              updateState({ currentTime: current.duration });
          }
      };

      window.addEventListener('keydown', handleMediaKeys);
      return () => window.removeEventListener('keydown', handleMediaKeys);
  }, []);


  // --- Auto-Fit Zoom on Mount ---
  useEffect(() => {
      if (!hasInitializedZoom) {
          const sidebarWidth = 320; 
          const availableWidth = window.innerWidth - (window.innerWidth > 768 ? sidebarWidth : 0) - 80;
          const availableHeight = window.innerHeight - 200; 
          
          const scaleX = availableWidth / state.canvas.width;
          const scaleY = availableHeight / state.canvas.height;
          const fitZoom = Math.min(scaleX, scaleY, 0.85);
          
          updateCanvas({ zoom: Math.max(0.1, fitZoom) });
          setHasInitializedZoom(true);
      }
  }, [hasInitializedZoom, state.canvas.width, state.canvas.height]);

  // --- Playback Timer Effect ---
  useEffect(() => {
    let interval: number;
    if (state.isPlaying) {
      interval = window.setInterval(() => {
        setState(prev => {
          const allItems = [...prev.mockups, ...prev.overlays];
          const maxContentTime = allItems.length > 0 
            ? Math.max(...allItems.map(i => i.startTime + i.duration))
            : prev.duration;
          
          const loopPoint = Math.min(prev.duration, Math.max(maxContentTime, 1));
          if (prev.currentTime >= loopPoint) return { ...prev, currentTime: 0 }; 
          return { ...prev, currentTime: prev.currentTime + 0.1 };
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [state.isPlaying, state.duration]);

  const handleUpdateTiming = (id: string, startTime: number, duration: number) => {
      setState(prev => {
          const mIndex = prev.mockups.findIndex(m => m.id === id);
          if (mIndex !== -1) {
              const newMockups = [...prev.mockups];
              newMockups[mIndex] = { ...newMockups[mIndex], startTime, duration };
              return { ...prev, mockups: newMockups };
          }
          const oIndex = prev.overlays.findIndex(o => o.id === id);
          if (oIndex !== -1) {
              const newOverlays = [...prev.overlays];
              newOverlays[oIndex] = { ...newOverlays[oIndex], startTime, duration };
              return { ...prev, overlays: newOverlays };
          }
          return prev;
      });
  };

  const updateCanvas = (updates: Partial<AppState['canvas']>) => {
    setState((prev) => ({
      ...prev,
      canvas: { ...prev.canvas, ...updates },
    }));
  };

  const addMockup = (type: DeviceType) => {
    const newMockup: MockupItem = {
      ...INITIAL_MOCKUP,
      id: generateId(),
      name: DEVICE_DEFINITIONS[type].name,
      type,
      position: { x: 50, y: 50 },
      zIndex: getNextZIndex(), // Increment Z Index
      startTime: 0,
      duration: 5,
      animIn: 'none',
      animInDuration: 0.5,
      animOut: 'none',
      animOutDuration: 0.5
    };
    setState((prev) => ({
      ...prev,
      mockups: [...prev.mockups, newMockup],
      selectedId: newMockup.id,
    }));
  };

  const addOverlay = (type: 'text' | 'emoji' | 'shape' | 'image' | 'video', content?: string) => {
      const newOverlay: OverlayItem = {
          id: generateId(),
          name: `${type.charAt(0).toUpperCase() + type.slice(1)} Layer`,
          type,
          content: content || (type === 'text' ? 'Double Click' : type === 'emoji' ? '🔥' : 'rect'),
          style: type === 'shape' ? { backgroundColor: '#3b82f6', borderRadius: 20 } : { color: '#ffffff', fontSize: 32 },
          position: { x: 0, y: 0 },
          scale: 1,
          rotation: 0,
          zIndex: getNextZIndex(), // Increment Z Index
          startTime: 0,
          duration: 5,
          animIn: 'none',
          animInDuration: 0.5,
          animOut: 'none',
          animOutDuration: 0.5,
          keyframes: []
      };
      
      // Special defaults for media
      if (type === 'image' || type === 'video') {
          newOverlay.scale = 0.5; // Start smaller for images
      }

      setState(prev => ({
          ...prev,
          overlays: [...prev.overlays, newOverlay],
          selectedId: newOverlay.id
      }));
  };

  const handleExportPng = async () => {
    const node = document.getElementById('export-canvas');
    if (!node) return;
    const currentSelection = state.selectedId;
    
    setIsExporting(true);
    updateState({ selectedId: null });
    setShowExportModal(false);

    // Allow UI to update (remove selection border)
    setTimeout(async () => {
        try {
            const dataUrl = await toPng(node, { 
                cacheBust: true,
                pixelRatio: exportSettings.imageScale,
                style: { transform: 'none', margin: '0' },
                width: state.canvas.width,
                height: state.canvas.height
            });
            const link = document.createElement('a');
            link.download = `mockup-${state.canvas.width * exportSettings.imageScale}x${state.canvas.height * exportSettings.imageScale}.png`;
            link.href = dataUrl;
            link.click();
        } catch (err) {
            console.error('Export failed', err);
            alert('Could not export image.');
        } finally {
            updateState({ selectedId: currentSelection });
            setIsExporting(false);
        }
    }, 500);
  };

  const handleExportVideo = () => {
      setShowExportModal(false);
      const confirm = window.confirm(
          `Exporting to MP4 (${exportSettings.videoRes}p @ ${exportSettings.videoFps}fps) requires screen recording.\n\n` +
          "Click OK, then select THIS tab in the browser dialog."
      );
      
      if (confirm) {
          try {
             // Calculate ideal resolution based on quality setting
             let width = 1920, height = 1080;
             let bitrate = 5000000;
             
             if (exportSettings.videoRes === 720) {
                 width = 1280; height = 720; bitrate = 2500000;
             } else if (exportSettings.videoRes === 1080) {
                 width = 1920; height = 1080; bitrate = 5000000;
             } else if (exportSettings.videoRes === 1440) {
                 width = 2560; height = 1440; bitrate = 8000000;
             }

             navigator.mediaDevices.getDisplayMedia({
                 video: { 
                     displaySurface: "browser",
                     width: { ideal: width },
                     height: { ideal: height },
                     frameRate: { ideal: exportSettings.videoFps }
                 },
                 audio: false
             }).then((stream) => {
                 const mediaRecorder = new MediaRecorder(stream, {
                     mimeType: 'video/webm;codecs=vp9',
                     videoBitsPerSecond: bitrate
                 });
                 const chunks: BlobPart[] = [];
                 
                 mediaRecorder.ondataavailable = (e) => {
                     if (e.data.size > 0) chunks.push(e.data);
                 };
                 
                 mediaRecorder.onstop = () => {
                     const blob = new Blob(chunks, { type: "video/webm" });
                     const url = URL.createObjectURL(blob);
                     const a = document.createElement("a");
                     a.href = url;
                     a.download = `mockup-video-${exportSettings.videoRes}p.webm`;
                     a.click();
                     setIsExporting(false);
                 };
                 
                 mediaRecorder.start();
                 setIsExporting(true);
                 updateState({ isPlaying: true, currentTime: 0 }); 
                 
                 setTimeout(() => {
                     mediaRecorder.stop();
                     updateState({ isPlaying: false });
                     stream.getTracks().forEach(track => track.stop());
                 }, state.duration * 1000 + 500); 
             }).catch(e => {
                 console.error(e);
                 setIsExporting(false);
             });
          } catch (e) {
              alert("Screen recording not supported in this browser.");
          }
      }
  };

  return (
    <div className="flex h-screen w-full bg-zinc-950 text-zinc-100 overflow-hidden font-sans relative">
      
      {/* Hidden File Input for Canvas Click Interaction */}
      <input 
          type="file" 
          ref={canvasInputRef} 
          className="hidden" 
          accept="image/*,video/*"
          onChange={handleCanvasFileUpload} 
      />

      {/* Loading Overlay */}
      {isExporting && (
          <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
              <div className="flex flex-col items-center p-8 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl max-w-sm text-center">
                  <div className="relative mb-6">
                      <div className="absolute inset-0 bg-indigo-500 blur-xl opacity-20 rounded-full"></div>
                      <Loader2 className="w-12 h-12 text-indigo-500 animate-spin relative z-10" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">
                      {state.mode === 'video' ? 'Recording Video...' : 'Exporting Image...'}
                  </h3>
                  <p className="text-sm text-zinc-400">
                      {state.mode === 'video' 
                        ? 'Please wait while we record your animation. Do not switch tabs.' 
                        : 'Generating high-quality PNG. This might take a moment.'}
                  </p>
              </div>
          </div>
      )}

      {/* Export Options Modal */}
      {showExportModal && (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowExportModal(false)}>
            <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl p-6 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold">Export Settings</h3>
                    <button onClick={() => setShowExportModal(false)} className="text-zinc-500 hover:text-white"><X size={20}/></button>
                </div>
                
                {state.mode === 'design' ? (
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-400">Image Quality</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[1, 2, 4].map((scale) => (
                                    <button
                                        key={scale}
                                        onClick={() => setExportSettings(s => ({ ...s, imageScale: scale as any }))}
                                        className={`p-3 rounded-lg border text-sm font-medium flex flex-col items-center justify-center transition-all ${
                                            exportSettings.imageScale === scale 
                                            ? 'bg-indigo-600 border-indigo-500 text-white' 
                                            : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700'
                                        }`}
                                    >
                                        <span>{scale === 1 ? '1K' : scale === 2 ? '2K' : '4K'}</span>
                                        <span className="text-[10px] opacity-70 mt-1">{scale}x Scale</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button 
                            onClick={handleExportPng}
                            className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center"
                        >
                            <Download size={18} className="mr-2" /> Download PNG
                        </button>
                    </div>
                ) : (
                    <div className="space-y-6">
                         <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-400">Video Resolution</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[720, 1080, 1440].map((res) => (
                                    <button
                                        key={res}
                                        onClick={() => setExportSettings(s => ({ ...s, videoRes: res as any }))}
                                        className={`p-3 rounded-lg border text-sm font-medium flex flex-col items-center justify-center transition-all ${
                                            exportSettings.videoRes === res 
                                            ? 'bg-indigo-600 border-indigo-500 text-white' 
                                            : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700'
                                        }`}
                                    >
                                        <span>{res === 1440 ? 'QHD' : res === 1080 ? 'FHD' : 'HD'}</span>
                                        <span className="text-[10px] opacity-70 mt-1">{res}p</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-400">Frame Rate</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[25, 30, 60].map((fps) => (
                                    <button
                                        key={fps}
                                        onClick={() => setExportSettings(s => ({ ...s, videoFps: fps as any }))}
                                        className={`p-3 rounded-lg border text-sm font-medium flex flex-col items-center justify-center transition-all ${
                                            exportSettings.videoFps === fps 
                                            ? 'bg-indigo-600 border-indigo-500 text-white' 
                                            : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700'
                                        }`}
                                    >
                                        <span>{fps}</span>
                                        <span className="text-[10px] opacity-70 mt-1">FPS</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                         <button 
                            onClick={handleExportVideo}
                            className="w-full mt-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center"
                        >
                            <Film size={18} className="mr-2" /> Record & Export MP4
                        </button>
                    </div>
                )}
            </div>
        </div>
      )}

      <Sidebar 
        state={state}
        updateState={updateState}
        updateMockup={updateMockup}
        updateOverlay={updateOverlay}
        addMockup={addMockup}
        addOverlay={addOverlay}
        updateCanvas={updateCanvas}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        // Pass helpers to Sidebar
        onReorderLayer={reorderLayer}
        onDuplicateLayer={duplicateLayer}
        onDeleteLayer={deleteLayer}
        onMoveLayer={moveLayer}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full relative min-w-0 transition-all duration-300">
        
        {/* Top Toolbar */}
        <div className="h-14 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-4 md:px-6 z-30 shrink-0 gap-4">
            <div className="flex items-center space-x-4 shrink-0">
               <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden p-2 -ml-2 text-zinc-400 hover:text-white">
                   <Menu size={20} />
               </button>
               <h1 className="font-bold text-lg tracking-tight hidden sm:block">Mockup<span className="text-indigo-500">Studio</span></h1>
               <div className="h-6 w-px bg-zinc-800 mx-2 hidden sm:block"></div>
               <div className="flex bg-zinc-800 rounded-lg p-0.5">
                   <button onClick={() => updateState({ mode: 'design' })} className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${state.mode === 'design' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}>
                       <LayoutTemplate size={14} /><span className="hidden sm:inline">Design</span>
                   </button>
                   <button onClick={() => updateState({ mode: 'video' })} className={`flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${state.mode === 'video' ? 'bg-zinc-700 text-white shadow-sm' : 'text-zinc-400 hover:text-white'}`}>
                       <Video size={14} /><span className="hidden sm:inline">Video</span>
                   </button>
               </div>
            </div>

            <div className="hidden md:flex flex-1 justify-center max-w-md items-center space-x-3 px-2">
                <ZoomOut size={16} className="text-zinc-500 shrink-0" />
                <input type="range" min="0.1" max="3" step="0.05" value={state.canvas.zoom} onChange={(e) => updateCanvas({ zoom: parseFloat(e.target.value) })} className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400" />
                <ZoomIn size={16} className="text-zinc-500 shrink-0" />
                <span className="text-xs text-zinc-500 w-10 text-right shrink-0">{Math.round(state.canvas.zoom * 100)}%</span>
            </div>

            <div className="flex items-center space-x-3 shrink-0">
                 {state.mode === 'design' ? (
                     <button onClick={() => setShowExportModal(true)} disabled={isExporting} className="flex items-center space-x-2 bg-zinc-100 hover:bg-white text-zinc-900 px-3 md:px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                         <Download size={16} /><span className="hidden sm:inline">Export PNG</span>
                     </button>
                 ) : (
                     <button onClick={() => setShowExportModal(true)} disabled={isExporting} className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white px-3 md:px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed">
                         <Film size={16} /><span className="hidden sm:inline">Export MP4</span>
                     </button>
                 )}
            </div>
        </div>

        <Canvas 
            state={state}
            onSelectMockup={(id) => setState(prev => ({ ...prev, selectedId: id }))}
            onDeselect={() => setState(prev => ({ ...prev, selectedId: null }))}
            onUpdateMockup={updateMockup}
            onUpdateOverlay={updateOverlay}
            onEmptyMockupClick={() => canvasInputRef.current?.click()}
        />
        
        {state.mode === 'video' ? (
            <Timeline 
                state={state}
                onPlayPause={() => updateState({ isPlaying: !state.isPlaying })}
                onSeek={(time) => updateState({ currentTime: time })}
                onSelect={(id) => updateState({ selectedId: id })}
                onUpdateTiming={handleUpdateTiming}
                onMoveLayer={moveLayer}
            />
        ) : (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center p-2 bg-zinc-900/90 backdrop-blur-xl border border-white/10 rounded-full shadow-2xl z-40 transition-all duration-300">
                 
                 {/* Main Add Button (Always Visible) */}
                 <button 
                    onClick={() => addMockup('iphone-15')} 
                    className="w-10 h-10 rounded-full bg-zinc-800 hover:bg-indigo-500 text-zinc-200 hover:text-white flex items-center justify-center transition-colors shadow-lg"
                    title="Add Mockup"
                 >
                    <PlusCircle size={20} />
                 </button>

                 <div className="w-px h-6 bg-zinc-700 mx-3"></div>

                 {state.selectedId ? (
                    <div className="flex items-center space-x-1.5">
                        {/* Selected Item Info (Hidden on small screens) */}
                        <div className="hidden sm:flex items-center mr-2 px-2 py-1 bg-zinc-800/50 rounded text-xs text-zinc-400">
                            <Layers size={12} className="mr-1.5" />
                            <span className="max-w-[80px] truncate">
                                {state.mockups.find(m => m.id === state.selectedId)?.name || state.overlays.find(o => o.id === state.selectedId)?.name || 'Layer'}
                            </span>
                        </div>
                        
                        {/* Layer Reordering */}
                        <div className="flex bg-zinc-800/80 rounded-lg p-0.5 border border-zinc-700/50">
                            <button onClick={() => reorderLayer(state.selectedId!, 'backward')} className="p-2 hover:bg-zinc-700 rounded text-zinc-300 hover:text-white" title="Move Backward">
                                <ArrowDown size={16} />
                            </button>
                            <button onClick={() => reorderLayer(state.selectedId!, 'forward')} className="p-2 hover:bg-zinc-700 rounded text-zinc-300 hover:text-white" title="Move Forward">
                                <ArrowUp size={16} />
                            </button>
                        </div>
                        
                        <div className="flex bg-zinc-800/80 rounded-lg p-0.5 border border-zinc-700/50">
                            <button onClick={() => reorderLayer(state.selectedId!, 'back')} className="p-2 hover:bg-zinc-700 rounded text-zinc-300 hover:text-white" title="Send to Back">
                                <ArrowDownToLine size={16} />
                            </button>
                            <button onClick={() => reorderLayer(state.selectedId!, 'front')} className="p-2 hover:bg-zinc-700 rounded text-zinc-300 hover:text-white" title="Bring to Front">
                                <ArrowUpFromLine size={16} />
                            </button>
                        </div>

                        <div className="w-px h-6 bg-zinc-700 mx-1"></div>

                        {/* Actions */}
                        <button onClick={() => duplicateLayer(state.selectedId!)} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-300 hover:text-white" title="Duplicate">
                            <Copy size={18} />
                        </button>
                        <button onClick={() => deleteLayer(state.selectedId!)} className="p-2 hover:bg-red-900/30 rounded-full text-red-400 hover:text-red-300" title="Delete">
                            <Trash2 size={18} />
                        </button>
                    </div>
                 ) : (
                    <span className="text-xs text-zinc-500 pr-2">Select an item to edit</span>
                 )}
            </div>
        )}
      </div>
      
      {isSidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>
      )}

    </div>
  );
};

export default App;
