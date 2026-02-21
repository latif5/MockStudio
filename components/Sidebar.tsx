
import React, { useState, useEffect, useRef } from 'react';
import { AppState, DeviceType, BackgroundType, MockupItem, AnimationType, Gradient, EasingType } from '../types';
import { Smartphone, Monitor, Laptop, Image as ImageIcon, Type, Layers, Palette, Layout, Settings, Box, Plus, Clapperboard, Pencil, Circle, MoveHorizontal, X, LogIn, LogOut, ArrowUp, ArrowDown, Copy, Trash2, ChevronUp, ChevronDown, Smile, Triangle, Star, Heart, Check, Search, ChevronRight, GripVertical, Watch, Activity, Upload } from 'lucide-react';
import { DEVICE_DEFINITIONS, DEFAULT_GRADIENTS, SHADOW_STYLES, CANVAS_PRESETS, ANIMATION_PRESETS_IN, ANIMATION_PRESETS_OUT, GOOGLE_FONTS, EMOJI_PRESETS, SHAPE_PRESETS, EASING_PRESETS } from '../constants';

interface SidebarProps {
  state: AppState;
  updateState: (newState: Partial<AppState>) => void;
  updateMockup: (id: string, updates: Partial<MockupItem>) => void;
  updateOverlay: (id: string, updates: any) => void;
  addMockup: (type: DeviceType) => void;
  addOverlay: (type: 'text' | 'emoji' | 'shape' | 'image' | 'video', content?: string) => void;
  updateCanvas: (updates: Partial<AppState['canvas']>) => void;
  isOpen: boolean;
  onClose: () => void;
  // New props for actions
  onReorderLayer: (id: string, direction: 'front' | 'back' | 'forward' | 'backward') => void;
  onDuplicateLayer: (id: string) => void;
  onDeleteLayer: (id: string) => void;
  onMoveLayer: (draggedId: string, targetId: string) => void;
}

// ... (Helper functions remain the same) ...
const hexToRgba = (hex: string) => {
    let c = hex.substring(1).split('');
    if(c.length===3){
        c= [c[0], c[0], c[1], c[1], c[2], c[2]];
    }
    let a = 'ff';
    if(c.length === 8) {
        a = c.slice(6,8).join('');
        c = c.slice(0,6);
    }
    const r = parseInt(c.slice(0,2).join(''), 16);
    const g = parseInt(c.slice(2,4).join(''), 16);
    const b = parseInt(c.slice(4,6).join(''), 16);
    const alpha = parseInt(a, 16) / 255;
    return { r, g, b, a: alpha, hexBase: `#${c.join('')}` };
};

const updateHexAlpha = (hex: string, alpha: number) => {
    const { hexBase } = hexToRgba(hex);
    const a = Math.round(alpha * 255).toString(16).padStart(2, '0');
    return `${hexBase}${a}`;
};

const loadGoogleFont = (fontName: string) => {
    if (!fontName) return;
    const id = `font-${fontName.replace(/\s+/g, '-')}`;
    if (!document.getElementById(id)) {
        const link = document.createElement('link');
        link.id = id;
        link.href = `https://fonts.googleapis.com/css2?family=${fontName.replace(/\s+/g, '+')}:wght@300;400;500;700&display=swap`;
        link.rel = 'stylesheet';
        link.crossOrigin = 'anonymous'; // Important for html-to-image
        document.head.appendChild(link);
    }
};

interface FontItemProps {
    font: string;
    isSelected: boolean;
    onClick: () => void;
}

const FontItem: React.FC<FontItemProps> = ({ font, isSelected, onClick }) => {
    // Load the font when this item is mounted (rendered in list)
    useEffect(() => {
        loadGoogleFont(font);
    }, [font]);

    return (
        <button
            onClick={onClick}
            className={`w-full text-left px-3 py-2 text-sm rounded flex items-center justify-between group ${isSelected ? 'bg-indigo-600/20 text-indigo-400' : 'text-zinc-300 hover:bg-zinc-800'}`}
        >
            <span style={{ fontFamily: font }}>{font}</span>
            {isSelected && <Check size={12} />}
        </button>
    );
};

// --- Custom Font Picker Component ---
const FontPicker = ({ currentFont, onChange }: { currentFont: string, onChange: (font: string) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const [visibleFonts, setVisibleFonts] = useState<string[]>([]);

    const filteredFonts = GOOGLE_FONTS.filter(f => f.toLowerCase().includes(searchTerm.toLowerCase()));

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Load initial font
    useEffect(() => {
        loadGoogleFont(currentFont);
    }, [currentFont]);

    // Lazy load fonts when list is open
    useEffect(() => {
        if (isOpen) {
            // Load filtered fonts
        }
    }, [isOpen, searchTerm]);

    return (
        <div className="relative" ref={containerRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-xs text-white flex items-center justify-between hover:bg-zinc-700 transition-colors"
            >
                <span className="truncate" style={{ fontFamily: currentFont }}>{currentFont}</span>
                <ChevronDown size={14} className="text-zinc-500" />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-900 border border-zinc-700 rounded-lg shadow-2xl z-[100] max-h-64 flex flex-col">
                    <div className="p-2 border-b border-zinc-800 sticky top-0 bg-zinc-900 z-10">
                        <div className="relative">
                            <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500" />
                            <input 
                                type="text"
                                placeholder="Search fonts..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded pl-8 pr-2 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-indigo-500 outline-none"
                                autoFocus
                            />
                        </div>
                    </div>
                    <div className="overflow-y-auto flex-1 p-1 custom-scrollbar">
                        {filteredFonts.length === 0 ? (
                            <div className="text-center p-4 text-xs text-zinc-500">No fonts found</div>
                        ) : (
                            filteredFonts.map((font) => (
                                <FontItem 
                                    key={font} 
                                    font={font} 
                                    isSelected={currentFont === font} 
                                    onClick={() => {
                                        onChange(font);
                                        setIsOpen(false);
                                    }} 
                                />
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};


export const Sidebar: React.FC<SidebarProps> = ({ state, updateState, updateMockup, updateOverlay, addMockup, addOverlay, updateCanvas, isOpen, onClose, onReorderLayer, onDuplicateLayer, onDeleteLayer, onMoveLayer }) => {
  const [activeTab, setActiveTab] = React.useState<'mockup' | 'background' | 'overlays'>('mockup');
  const [animTab, setAnimTab] = React.useState<'in' | 'out'>('in');
  const [customFont, setCustomFont] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showShapePicker, setShowShapePicker] = useState(false);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  
  // State for Add Layer Pickers
  const [activeAddPicker, setActiveAddPicker] = useState<'none' | 'emoji' | 'shape'>('none');
  const addPickerRef = useRef<HTMLDivElement>(null);
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bgImageInputRef = useRef<HTMLInputElement>(null);

  const selectedMockup = state.mockups.find(m => m.id === state.selectedId);
  const selectedOverlay = state.overlays.find(o => o.id === state.selectedId);
  const selectedItem = selectedMockup || selectedOverlay;

  // Find nearest keyframe to current time for selected item
  const activeKeyframe = selectedItem?.keyframes?.find(k => Math.abs(k.timestamp - state.currentTime) < 0.1);

  const handleUpdateKeyframeEasing = (easing: EasingType) => {
      if (!selectedItem || !activeKeyframe) return;
      
      const newKeyframes = selectedItem.keyframes.map(k => 
          k.id === activeKeyframe.id ? { ...k, easing } : k
      );
      
      if (selectedMockup) updateMockup(selectedMockup.id, { keyframes: newKeyframes });
      if (selectedOverlay) updateOverlay(selectedOverlay.id, { keyframes: newKeyframes });
  };

  const handleClearKeyframes = () => {
      if(window.confirm("Remove all animation keyframes for this layer?")) {
        if (selectedMockup) updateMockup(selectedMockup.id, { keyframes: [] });
        if (selectedOverlay) updateOverlay(selectedOverlay.id, { keyframes: [] });
      }
  };


  // Click outside to close add pickers
  useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
          if (addPickerRef.current && !addPickerRef.current.contains(event.target as Node)) {
              setActiveAddPicker('none');
          }
      };
      if (activeAddPicker !== 'none') {
          document.addEventListener('mousedown', handleClickOutside);
      }
      return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [activeAddPicker]);

  // File Upload Handler (For Mockups)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && selectedMockup) {
      const url = URL.createObjectURL(file);
      const isVideo = file.type.startsWith('video/');
      
      if (isVideo) {
          const video = document.createElement('video');
          video.preload = 'metadata';
          video.onloadedmetadata = () => {
               const newDuration = video.duration;
               updateMockup(selectedMockup.id, { contentUrl: url, isVideo: true, duration: newDuration });
               
               // Extend global timeline if video is longer
               const end = selectedMockup.startTime + newDuration;
               if (end > state.duration) {
                   updateState({ duration: Math.ceil(end) });
               }
          };
          video.onerror = () => {
              updateMockup(selectedMockup.id, { contentUrl: url, isVideo: true });
          };
          video.src = url;
      } else {
          updateMockup(selectedMockup.id, { contentUrl: url, isVideo: false });
      }

      // Reset value so same file can be selected again if needed
      e.target.value = '';
    }
  };

  // Media Layer Upload Handler (For Overlays)
  const handleLayerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const url = URL.createObjectURL(file);
          const type = file.type.startsWith('video/') ? 'video' : 'image';
          addOverlay(type, url);
          // Reset input so same file can be selected again if needed
          e.target.value = '';
      }
  };

  const handleBgImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          const url = URL.createObjectURL(file);
          updateCanvas({ backgroundType: 'image', backgroundImage: url });
          e.target.value = '';
      }
  };

  const handleAnimTypeChange = (anim: AnimationType, type: 'in' | 'out') => {
      if (selectedMockup) {
          if (type === 'in') updateMockup(selectedMockup.id, { animIn: anim });
          else updateMockup(selectedMockup.id, { animOut: anim });
      }
      if (selectedOverlay) {
          if (type === 'in') updateOverlay(selectedOverlay.id, { animIn: anim });
          else updateOverlay(selectedOverlay.id, { animOut: anim });
      }
  };

  const handleAnimDurationChange = (duration: number, type: 'in' | 'out') => {
      if (selectedMockup) {
          if (type === 'in') updateMockup(selectedMockup.id, { animInDuration: duration });
          else updateMockup(selectedMockup.id, { animOutDuration: duration });
      }
      if (selectedOverlay) {
          if (type === 'in') updateOverlay(selectedOverlay.id, { animInDuration: duration });
          else updateOverlay(selectedOverlay.id, { animOutDuration: duration });
      }
  };
  
  const handleRename = (name: string) => {
      if (selectedMockup) updateMockup(selectedMockup.id, { name });
      if (selectedOverlay) updateOverlay(selectedOverlay.id, { name });
  };
  
  const handleFontChange = (font: string) => {
      // Font is loaded inside FontPicker/FontItem components
      if (selectedOverlay) {
          updateOverlay(selectedOverlay.id, { style: { ...selectedOverlay.style, fontFamily: font } });
      }
  };
  
  const handleCustomFontLoad = () => {
      loadGoogleFont(customFont);
      if (selectedOverlay) {
           updateOverlay(selectedOverlay.id, { style: { ...selectedOverlay.style, fontFamily: customFont } });
      }
  };

  // --- Drag and Drop Handlers ---
  const handleDragStart = (e: React.DragEvent, id: string) => {
      e.dataTransfer.setData('layerId', id);
      e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (dragOverId !== id) {
          setDragOverId(id);
      }
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
      e.preventDefault();
      const draggedId = e.dataTransfer.getData('layerId');
      if (draggedId && draggedId !== targetId) {
          onMoveLayer(draggedId, targetId);
      }
      setDragOverId(null);
  };

  const handleDragLeave = () => {
      setDragOverId(null);
  };

  // Helper to render aspect ratio SVG
  const renderRatioIcon = (ratio: number) => {
      let w = 16;
      let h = 16;
      if (ratio > 1) { h = 16 / ratio; } else { w = 16 * ratio; }
      return (
          <svg width="20" height="20" viewBox="0 0 20 20" className="text-zinc-500">
              <rect x={10 - w/2} y={10 - h/2} width={w} height={h} fill="none" stroke="currentColor" strokeWidth="1.5" rx="1"/>
          </svg>
      );
  };
  
  const ColorPickerWithAlpha = ({ label, value, onChange }: { label: string, value: string, onChange: (val: string) => void }) => {
      const { hexBase, a } = hexToRgba(value);
      return (
          <div className="flex flex-col space-y-2">
              <label className="text-[10px] text-zinc-500">{label}</label>
              <div className="flex items-center space-x-2">
                  <input 
                      type="color" 
                      value={hexBase}
                      onChange={(e) => onChange(updateHexAlpha(e.target.value, a))}
                      className="w-8 h-8 p-0 border-0 rounded overflow-hidden cursor-pointer"
                  />
                  <div className="flex-1 flex flex-col space-y-1">
                      <input 
                          type="range" min="0" max="1" step="0.01"
                          value={a}
                          onChange={(e) => onChange(updateHexAlpha(hexBase, parseFloat(e.target.value)))}
                          className="w-full h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                      <div className="flex justify-between text-[9px] text-zinc-500">
                          <span>{Math.round(a * 100)}%</span>
                          <span className="font-mono">{value.toUpperCase()}</span>
                      </div>
                  </div>
              </div>
          </div>
      );
  };
  
  // Sorting for Layer List display (Reverse Z-Index for UI, so Top is First)
  const getSortedLayers = () => {
      const all = [...state.mockups, ...state.overlays];
      return all.sort((a, b) => b.zIndex - a.zIndex);
  };

  return (
    <div 
        className={`
            fixed inset-y-0 left-0 z-50 bg-zinc-900 border-r border-zinc-800 shadow-xl flex flex-col flex-shrink-0 transition-transform duration-300 ease-in-out
            w-72 lg:w-80 
            md:relative md:translate-x-0
            ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
    >
      {/* Header Mobile Only */}
      <div className="md:hidden flex items-center justify-between p-4 border-b border-zinc-800">
          <span className="font-bold text-sm">Settings</span>
          <button onClick={onClose}><X size={20} className="text-zinc-400" /></button>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center p-2 space-x-1 border-b border-zinc-800">
        <button onClick={() => setActiveTab('mockup')} className={`flex-1 flex items-center justify-center py-2 px-3 rounded-md text-sm font-medium transition-colors ${activeTab === 'mockup' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}`}>
          <Smartphone size={16} className="mr-2" /> Edit
        </button>
        <button onClick={() => setActiveTab('background')} className={`flex-1 flex items-center justify-center py-2 px-3 rounded-md text-sm font-medium transition-colors ${activeTab === 'background' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}`}>
          <Palette size={16} className="mr-2" /> Canvas
        </button>
        <button onClick={() => setActiveTab('overlays')} className={`flex-1 flex items-center justify-center py-2 px-3 rounded-md text-sm font-medium transition-colors ${activeTab === 'overlays' ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'}`}>
          <Layers size={16} className="mr-2" /> Layers
        </button>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* --- MOCKUP / EDIT TAB --- */}
        {activeTab === 'mockup' && (
          <>
            {!selectedItem && (
                 <div className="text-sm text-zinc-500 italic p-4 text-center bg-zinc-900/50 rounded border border-zinc-800">
                     Select an object to edit its properties.
                 </div>
            )}

            {/* Rename Layer */}
            {selectedItem && (
                <div className="pb-4 border-b border-zinc-800">
                     <label className="text-xs text-zinc-500 block mb-1">Layer Name</label>
                     <input 
                         type="text" 
                         value={selectedItem.name} 
                         onChange={(e) => handleRename(e.target.value)}
                         className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-white focus:border-indigo-500 outline-none"
                         placeholder="Rename selected layer..."
                     />
                </div>
            )}
            
            {/* ... (Existing code for Text, Emoji, Shape, Device, Media Upload, Appearance) ... */}
            {selectedOverlay && selectedOverlay.type === 'text' && (
                <div className="space-y-4 pt-2 border-b border-zinc-800 pb-4">
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Typography</h3>
                    <div>
                        <label className="text-xs text-zinc-400 block mb-1">Font Family</label>
                        <FontPicker 
                            currentFont={selectedOverlay.style.fontFamily || 'Inter'}
                            onChange={handleFontChange}
                        />
                         <div className="mt-2 flex space-x-2 pt-2 border-t border-zinc-800/50">
                            <input 
                                type="text"
                                placeholder="Custom Google Font Name..."
                                value={customFont}
                                onChange={(e) => setCustomFont(e.target.value)}
                                className="flex-1 bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-white"
                            />
                            <button 
                                onClick={handleCustomFontLoad}
                                className="px-3 py-1 bg-zinc-700 text-xs rounded hover:bg-zinc-600"
                            >
                                Load
                            </button>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <ColorPickerWithAlpha 
                            label="Color"
                            value={selectedOverlay.style.color || '#ffffff'}
                            onChange={(val) => updateOverlay(selectedOverlay.id, { style: { ...selectedOverlay.style, color: val } })}
                        />
                         <div>
                            <label className="text-[10px] text-zinc-500 block mb-2">Size</label>
                            <input 
                                type="number" 
                                value={selectedOverlay.style.fontSize} 
                                onChange={(e) => updateOverlay(selectedOverlay.id, { style: { ...selectedOverlay.style, fontSize: parseInt(e.target.value) } })}
                                className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-white"
                            />
                        </div>
                    </div>
                </div>
            )}
            
            {/* ... (Emoji, Shape, Device Logic unchanged, keeping structure) ... */}
            {/* For brevity, existing sections are retained conceptually */}
            
            {selectedOverlay && selectedOverlay.type === 'emoji' && (
                 <div className="space-y-4 pt-2 border-b border-zinc-800 pb-4">
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Emoji</h3>
                    <div className="relative">
                        <button 
                            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                            className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded flex items-center justify-between hover:bg-zinc-700"
                        >
                            <span className="text-3xl">{selectedOverlay.content}</span>
                            <span className="text-xs text-zinc-400">Change</span>
                        </button>
                        {showEmojiPicker && (
                            <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 grid grid-cols-6 gap-2">
                                {EMOJI_PRESETS.map((emoji) => (
                                    <button 
                                        key={emoji}
                                        onClick={() => {
                                            updateOverlay(selectedOverlay.id, { content: emoji });
                                            setShowEmojiPicker(false);
                                        }}
                                        className="text-2xl hover:bg-zinc-800 rounded p-1"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

             {selectedOverlay && selectedOverlay.type === 'shape' && (
                <div className="space-y-4 pt-2 border-b border-zinc-800 pb-4">
                     <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Shape</h3>
                     {/* ... Shape Picker ... */}
                     <div className="relative">
                        <button 
                            onClick={() => setShowShapePicker(!showShapePicker)}
                            className="w-full p-3 bg-zinc-800 border border-zinc-700 rounded flex items-center justify-between hover:bg-zinc-700"
                        >
                            <div className="flex items-center space-x-2">
                                <Box size={16} />
                                <span className="text-sm capitalize">{selectedOverlay.content || 'rect'}</span>
                            </div>
                            <span className="text-xs text-zinc-400">Change</span>
                        </button>
                        {showShapePicker && (
                            <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 grid grid-cols-3 gap-2">
                                {SHAPE_PRESETS.map((shape) => (
                                    <button 
                                        key={shape.id}
                                        onClick={() => {
                                            updateOverlay(selectedOverlay.id, { content: shape.id });
                                            setShowShapePicker(false);
                                        }}
                                        className={`flex flex-col items-center justify-center p-2 rounded hover:bg-zinc-800 ${selectedOverlay.content === shape.id ? 'bg-zinc-800 text-indigo-400' : 'text-zinc-400'}`}
                                    >
                                        {shape.id === 'rect' && <Box size={20} />}
                                        {shape.id === 'circle' && <Circle size={20} />}
                                        {shape.id === 'rounded' && <Box size={20} className="rounded-md" />}
                                        {shape.id === 'triangle' && <Triangle size={20} />}
                                        {shape.id === 'star' && <Star size={20} />}
                                        {shape.id === 'heart' && <Heart size={20} />}
                                        {shape.id === 'diamond' && <div className="w-4 h-4 border-2 border-current rotate-45"></div>}
                                        {shape.id === 'hexagon' && <Box size={20} />}
                                        <span className="text-[10px] mt-1">{shape.label}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <ColorPickerWithAlpha 
                        label="Fill Color"
                        value={selectedOverlay.style.backgroundColor || '#3b82f6'}
                        onChange={(val) => updateOverlay(selectedOverlay.id, { style: { ...selectedOverlay.style, backgroundColor: val } })}
                    />
                </div>
            )}

            {(!selectedOverlay) && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Add Device</h3>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(DEVICE_DEFINITIONS).map(([key, def]) => (
                  <button
                    key={key}
                    onClick={() => selectedMockup ? updateMockup(selectedMockup.id, { type: key as DeviceType }) : addMockup(key as DeviceType)}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border text-sm transition-all ${
                      selectedMockup?.type === key 
                        ? 'border-indigo-500 bg-indigo-500/10 text-white' 
                        : 'border-zinc-700 bg-zinc-800/50 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-800'
                    }`}
                  >
                    {key.includes('iphone') && <Smartphone size={20} className="mb-2" />}
                    {key.includes('samsung') && <Smartphone size={20} className="mb-2" />}
                    {key.includes('macbook') && <Laptop size={20} className="mb-2" />}
                    {key.includes('browser') && <Layout size={20} className="mb-2" />}
                    {key.includes('ipad') && <Monitor size={20} className="mb-2" />}
                    {key.includes('watch') && <Watch size={20} className="mb-2" />}
                    <span className="text-center">{def.name}</span>
                  </button>
                ))}
              </div>
            </div>
            )}

            {selectedMockup && (
            <div className="space-y-3 pt-4 border-t border-zinc-800">
               <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Screen Content</h3>
               <input 
                   ref={fileInputRef}
                   type="file" 
                   className="hidden" 
                   accept="image/*,video/*"
                   onChange={handleFileUpload}
               />
               
               {selectedMockup.contentUrl ? (
                   <div className="space-y-2">
                       <div className="relative w-full h-48 bg-zinc-900 rounded-lg overflow-hidden border border-zinc-700 group">
                           {selectedMockup.isVideo ? (
                               <video 
                                   src={selectedMockup.contentUrl} 
                                   className="w-full h-full object-cover" 
                                   muted 
                                   loop 
                                   autoPlay 
                                   playsInline
                               />
                           ) : (
                               <img 
                                   src={selectedMockup.contentUrl} 
                                   alt="Preview" 
                                   className="w-full h-full object-cover" 
                               />
                           )}
                       </div>
                       <div className="grid grid-cols-2 gap-2">
                           <button 
                               onClick={() => fileInputRef.current?.click()}
                               className="flex items-center justify-center py-2 px-3 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-xs text-zinc-300 hover:text-white transition-colors"
                           >
                               <ImageIcon size={14} className="mr-2" /> Replace
                           </button>
                           <button 
                               onClick={() => updateMockup(selectedMockup.id, { contentUrl: null, isVideo: false })}
                               className="flex items-center justify-center py-2 px-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded text-xs text-red-400 hover:text-red-300 transition-colors"
                           >
                               <Trash2 size={14} className="mr-2" /> Remove
                           </button>
                       </div>
                   </div>
               ) : (
                   <button 
                       onClick={() => fileInputRef.current?.click()}
                       className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-zinc-700 rounded-lg cursor-pointer hover:border-zinc-500 hover:bg-zinc-800/50 transition-colors group"
                   >
                       <div className="p-3 bg-zinc-800 rounded-full mb-2 group-hover:scale-110 transition-transform">
                           <ImageIcon size={20} className="text-zinc-400" />
                       </div>
                       <span className="text-xs text-zinc-400 font-medium">Upload Image or Video</span>
                       <span className="text-[10px] text-zinc-600 mt-1">Supports PNG, JPG, MP4, WebM</span>
                   </button>
               )}
            </div>
            )}

            {selectedItem && (
                <div className="space-y-4 pt-4 border-t border-zinc-800">
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Appearance</h3>
                    
                    {/* Shadow Controls */}
                    {selectedMockup && (
                    <div className="flex flex-col space-y-2">
                        <label className="text-xs text-zinc-400">Shadow</label>
                        <div className="flex bg-zinc-800 rounded-md p-1">
                            {Object.keys(SHADOW_STYLES).map((s) => (
                                <button
                                    key={s}
                                    onClick={() => updateMockup(selectedMockup.id, { shadow: s as any })}
                                    className={`flex-1 py-1 text-xs capitalize rounded-sm ${selectedMockup.shadow === s ? 'bg-zinc-600 text-white shadow' : 'text-zinc-400 hover:text-white'}`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>
                    )}

                    {/* Scale */}
                    <div>
                        <div className="flex justify-between text-xs text-zinc-400 mb-1">
                            <span>Scale</span>
                            <span>{Math.round(selectedItem.scale * 100)}%</span>
                        </div>
                        <input
                            type="range"
                            min="0.5"
                            max="1.5"
                            step="0.05"
                            value={selectedItem.scale}
                            onChange={(e) => selectedMockup ? updateMockup(selectedMockup.id, { scale: parseFloat(e.target.value) }) : updateOverlay(selectedOverlay!.id, { scale: parseFloat(e.target.value) })}
                            className="w-full accent-indigo-500 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>

                    {/* Rotation */}
                     <div>
                        <div className="flex justify-between text-xs text-zinc-400 mb-1">
                            <span>Rotation</span>
                            <span>{Math.round(selectedItem.rotation)}°</span>
                        </div>
                        <input
                            type="range"
                            min="-180"
                            max="180"
                            step="1"
                            value={selectedItem.rotation}
                            onChange={(e) => selectedMockup ? updateMockup(selectedMockup.id, { rotation: parseInt(e.target.value) }) : updateOverlay(selectedOverlay!.id, { rotation: parseInt(e.target.value) })}
                            className="w-full accent-indigo-500 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                        />
                    </div>

                    {/* KEYFRAME CONTROLS - NEW SECTION */}
                    {state.mode === 'video' && (
                        <div className="pt-4 border-t border-zinc-800">
                             <div className="flex items-center justify-between mb-3">
                                <h3 className="text-xs font-semibold text-yellow-400 uppercase tracking-wider flex items-center">
                                    <Activity size={12} className="mr-1"/> Keyframes
                                </h3>
                                <button onClick={handleClearKeyframes} className="text-[10px] text-red-400 hover:text-red-300">Clear All</button>
                             </div>
                             
                             {activeKeyframe ? (
                                 <div className="bg-zinc-800/50 rounded p-2 border border-yellow-500/30">
                                     <div className="flex justify-between items-center mb-2">
                                         <span className="text-xs text-yellow-200">Current Keyframe</span>
                                         <span className="text-[10px] font-mono text-zinc-500">{activeKeyframe.property}</span>
                                     </div>
                                     <div className="space-y-2">
                                         <label className="text-[10px] text-zinc-400 block">Motion Speed (Easing)</label>
                                         <div className="grid grid-cols-2 gap-2">
                                             {EASING_PRESETS.map(ease => (
                                                 <button
                                                    key={ease.value}
                                                    onClick={() => handleUpdateKeyframeEasing(ease.value)}
                                                    className={`px-2 py-1 text-[10px] rounded border transition-colors ${
                                                        activeKeyframe.easing === ease.value
                                                        ? 'bg-yellow-500/20 border-yellow-500 text-yellow-200'
                                                        : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700'
                                                    }`}
                                                 >
                                                     {ease.label}
                                                 </button>
                                             ))}
                                         </div>
                                     </div>
                                 </div>
                             ) : (
                                 <div className="text-[10px] text-zinc-500 p-2 bg-zinc-800/30 rounded border border-dashed border-zinc-700 text-center">
                                     Move the playhead to a keyframe to edit its motion speed. <br/>
                                     Drag object in canvas to create a keyframe.
                                 </div>
                             )}
                        </div>
                    )}

                    <div className="pt-4 border-t border-zinc-800">
                         <h3 className="text-xs font-semibold text-indigo-400 uppercase tracking-wider flex items-center mb-3">
                             <Clapperboard size={12} className="mr-1"/> Animation (In/Out)
                         </h3>
                         
                         <div className="flex bg-zinc-800 rounded p-1 mb-3">
                             <button 
                                onClick={() => setAnimTab('in')}
                                className={`flex-1 flex items-center justify-center py-1 text-[10px] font-medium rounded transition-colors ${animTab === 'in' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
                             >
                                 <LogIn size={10} className="mr-1" /> Entry
                             </button>
                             <button 
                                onClick={() => setAnimTab('out')}
                                className={`flex-1 flex items-center justify-center py-1 text-[10px] font-medium rounded transition-colors ${animTab === 'out' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-zinc-200'}`}
                             >
                                 <LogOut size={10} className="mr-1" /> Exit
                             </button>
                         </div>
                         
                         <div className="grid grid-cols-2 gap-2 mb-3">
                             {(animTab === 'in' ? ANIMATION_PRESETS_IN : ANIMATION_PRESETS_OUT).map((anim) => {
                                 const isActive = animTab === 'in' ? selectedItem.animIn === anim.value : selectedItem.animOut === anim.value;
                                 return (
                                    <button
                                        key={anim.value}
                                        onClick={() => handleAnimTypeChange(anim.value, animTab)}
                                        className={`px-2 py-1.5 text-[10px] rounded border transition-all truncate ${isActive
                                            ? 'bg-indigo-500/20 border-indigo-500 text-indigo-200' 
                                            : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700'
                                        }`}
                                    >
                                        {anim.label}
                                    </button>
                                 )
                             })}
                         </div>

                         <div>
                             <div className="flex justify-between text-[10px] text-zinc-400 mb-1">
                                 <span>Duration</span>
                                 <span>{animTab === 'in' ? selectedItem.animInDuration : selectedItem.animOutDuration}s</span>
                             </div>
                             <input
                                type="range"
                                min="0.1"
                                max="3"
                                step="0.1"
                                value={animTab === 'in' ? selectedItem.animInDuration : selectedItem.animOutDuration}
                                onChange={(e) => handleAnimDurationChange(parseFloat(e.target.value), animTab)}
                                className="w-full accent-indigo-500 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer"
                             />
                         </div>
                    </div>

                </div>
            )}
          </>
        )}
        
        {/* --- BACKGROUND TAB --- */}
        {activeTab === 'background' && (
          <div className="space-y-6">
              <div>
               <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Type</h3>
               <div className="flex bg-zinc-800 p-1 rounded-md">
                   {['solid', 'gradient', 'image', 'transparent'].map(t => (
                       <button
                           key={t}
                           onClick={() => updateCanvas({ backgroundType: t as BackgroundType })}
                           className={`flex-1 capitalize py-1.5 text-xs rounded-sm truncate ${state.canvas.backgroundType === t ? 'bg-zinc-600 text-white shadow' : 'text-zinc-400 hover:text-white'}`}
                       >
                           {t === 'transparent' ? 'None' : t}
                       </button>
                   ))}
               </div>
            </div>
            
            {state.canvas.backgroundType === 'image' && (
                <div>
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Upload Image</h3>
                    <input 
                       ref={bgImageInputRef}
                       type="file" 
                       className="hidden" 
                       accept="image/*"
                       onChange={handleBgImageUpload}
                    />
                    <button 
                       onClick={() => bgImageInputRef.current?.click()}
                       className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-zinc-700 rounded-lg cursor-pointer hover:border-zinc-500 hover:bg-zinc-800/50 transition-colors group"
                    >
                       <div className="p-3 bg-zinc-800 rounded-full mb-2 group-hover:scale-110 transition-transform">
                           <Upload size={20} className="text-zinc-400" />
                       </div>
                       <span className="text-xs text-zinc-400 font-medium">Click to upload</span>
                       <span className="text-[10px] text-zinc-600 mt-1">Supports PNG, JPG, WEBP</span>
                    </button>
                    {state.canvas.backgroundImage && (
                        <div className="mt-4 relative h-24 rounded border border-zinc-700 overflow-hidden">
                            <img src={state.canvas.backgroundImage} className="w-full h-full object-cover" />
                        </div>
                    )}
                </div>
            )}

            {state.canvas.backgroundType === 'solid' && (
                 <div>
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Color</h3>
                    <div className="grid grid-cols-6 gap-2 mb-3">
                        {['#000000', '#ffffff', '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef'].map(color => (
                            <button
                                key={color}
                                onClick={() => updateCanvas({ backgroundColor: color })}
                                className="w-8 h-8 rounded-full border border-zinc-700 hover:scale-110 transition-transform shadow-sm"
                                style={{ backgroundColor: color }}
                            />
                        ))}
                    </div>
                    <ColorPickerWithAlpha 
                        label="Custom Color"
                        value={state.canvas.backgroundColor}
                        onChange={(val) => updateCanvas({ backgroundColor: val })}
                    />
                 </div>
            )}
            {state.canvas.backgroundType === 'gradient' && (
                <div>
                     <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Presets</h3>
                     <div className="grid grid-cols-2 gap-3">
                         {DEFAULT_GRADIENTS.map((g, i) => (
                             <button
                                key={i}
                                onClick={() => updateCanvas({ backgroundGradient: g })}
                                className="h-12 rounded-lg border border-zinc-700/50 hover:border-white/50 transition-all"
                                style={{ background: `linear-gradient(${g.angle}deg, ${g.from}, ${g.to})` }}
                             />
                         ))}
                     </div>
                     <div className="mt-4 space-y-3 pt-4 border-t border-zinc-800">
                         <div className="flex justify-between items-center mb-2">
                             <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Custom Gradient</h3>
                             <div className="flex bg-zinc-800 rounded p-0.5">
                                 <button 
                                    onClick={() => updateCanvas({ backgroundGradient: {...state.canvas.backgroundGradient, type: 'linear'} })}
                                    className={`p-1 rounded ${state.canvas.backgroundGradient.type === 'linear' ? 'bg-zinc-600 text-white' : 'text-zinc-500'}`}
                                 >
                                     <MoveHorizontal size={14} />
                                 </button>
                                 <button 
                                    onClick={() => updateCanvas({ backgroundGradient: {...state.canvas.backgroundGradient, type: 'radial'} })}
                                    className={`p-1 rounded ${state.canvas.backgroundGradient.type === 'radial' ? 'bg-zinc-600 text-white' : 'text-zinc-500'}`}
                                 >
                                     <Circle size={14} />
                                 </button>
                             </div>
                         </div>
                         {state.canvas.backgroundGradient.type === 'linear' && (
                         <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-zinc-400">Angle</span>
                            <div className="flex items-center space-x-2">
                                <input 
                                    type="range" min="0" max="360"
                                    value={state.canvas.backgroundGradient.angle}
                                    onChange={(e) => updateCanvas({ backgroundGradient: {...state.canvas.backgroundGradient, angle: parseInt(e.target.value)} })}
                                    className="w-16 h-1 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                />
                                <span className="text-xs text-zinc-500 w-8 text-right">{state.canvas.backgroundGradient.angle}°</span>
                            </div>
                         </div>
                         )}
                         <div className="space-y-3">
                             <ColorPickerWithAlpha 
                                label="From"
                                value={state.canvas.backgroundGradient.from}
                                onChange={(val) => updateCanvas({ backgroundGradient: {...state.canvas.backgroundGradient, from: val} })}
                             />
                             <ColorPickerWithAlpha 
                                label="To"
                                value={state.canvas.backgroundGradient.to}
                                onChange={(val) => updateCanvas({ backgroundGradient: {...state.canvas.backgroundGradient, to: val} })}
                             />
                         </div>
                     </div>
                </div>
            )}
            <div className="pt-4 border-t border-zinc-800">
                <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Canvas Size</h3>
                 <div className="grid grid-cols-2 gap-2 mb-4">
                     {CANVAS_PRESETS.map((preset) => (
                         <button
                             key={preset.name}
                             onClick={() => updateCanvas({ width: preset.width, height: preset.height })}
                             className={`p-2 text-xs border rounded transition-colors text-left flex items-center space-x-2 ${
                                 state.canvas.width === preset.width && state.canvas.height === preset.height 
                                 ? 'border-indigo-500 bg-indigo-500/10 text-white' 
                                 : 'border-zinc-700 bg-zinc-800/30 text-zinc-400 hover:border-zinc-600 hover:bg-zinc-800'
                             }`}
                         >
                             <div className="shrink-0">{renderRatioIcon(preset.ratio)}</div>
                             <div className="min-w-0">
                                <div className="font-medium truncate">{preset.name}</div>
                                <div className="text-[10px] opacity-60">{preset.width} x {preset.height}</div>
                             </div>
                         </button>
                     ))}
                 </div>
                 <div className="grid grid-cols-2 gap-3">
                     <div>
                         <label className="text-[10px] text-zinc-500 mb-1 block">Width</label>
                         <input 
                            type="number" 
                            value={state.canvas.width}
                            onChange={(e) => updateCanvas({ width: parseInt(e.target.value) })}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-white"
                         />
                     </div>
                     <div>
                         <label className="text-[10px] text-zinc-500 mb-1 block">Height</label>
                         <input 
                            type="number" 
                            value={state.canvas.height}
                            onChange={(e) => updateCanvas({ height: parseInt(e.target.value) })}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded px-2 py-1.5 text-xs text-white"
                         />
                     </div>
                 </div>
            </div>
          </div>
        )}

        {/* --- OVERLAYS / LAYERS TAB --- */}
        {activeTab === 'overlays' && (
             <div className="space-y-6">
                 
                 {/* Action Bar for Layers */}
                 {state.selectedId && (
                     <div className="grid grid-cols-4 gap-2 mb-4">
                         <button onClick={() => onReorderLayer(state.selectedId!, 'forward')} className="p-2 bg-zinc-800 rounded hover:bg-zinc-700 flex justify-center text-zinc-300" title="Bring Forward">
                             <ChevronUp size={16} />
                         </button>
                         <button onClick={() => onReorderLayer(state.selectedId!, 'backward')} className="p-2 bg-zinc-800 rounded hover:bg-zinc-700 flex justify-center text-zinc-300" title="Send Backward">
                             <ChevronDown size={16} />
                         </button>
                         <button onClick={() => onDuplicateLayer(state.selectedId!)} className="p-2 bg-zinc-800 rounded hover:bg-zinc-700 flex justify-center text-zinc-300" title="Duplicate">
                             <Copy size={16} />
                         </button>
                         <button onClick={() => onDeleteLayer(state.selectedId!)} className="p-2 bg-red-900/30 text-red-400 rounded hover:bg-red-900/50 flex justify-center" title="Delete">
                             <Trash2 size={16} />
                         </button>
                     </div>
                 )}

                 <div className="grid grid-cols-4 gap-2 relative" ref={addPickerRef}>
                     <button onClick={() => addOverlay('text')} className="flex flex-col items-center justify-center p-3 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors">
                         <Type size={20} className="mb-1 text-zinc-300"/>
                         <span className="text-[10px] text-zinc-400">Text</span>
                     </button>
                      <button onClick={() => setActiveAddPicker(activeAddPicker === 'emoji' ? 'none' : 'emoji')} className={`flex flex-col items-center justify-center p-3 rounded-lg transition-colors ${activeAddPicker === 'emoji' ? 'bg-zinc-700 ring-2 ring-indigo-500/50' : 'bg-zinc-800 hover:bg-zinc-700'}`}>
                         <span className="text-xl mb-1">😎</span>
                         <span className="text-[10px] text-zinc-400">Emoji</span>
                     </button>
                     <button onClick={() => setActiveAddPicker(activeAddPicker === 'shape' ? 'none' : 'shape')} className={`flex flex-col items-center justify-center p-3 rounded-lg transition-colors ${activeAddPicker === 'shape' ? 'bg-zinc-700 ring-2 ring-indigo-500/50' : 'bg-zinc-800 hover:bg-zinc-700'}`}>
                         <Box size={20} className="mb-1 text-zinc-300"/>
                         <span className="text-[10px] text-zinc-400">Shape</span>
                     </button>
                     <button onClick={() => mediaInputRef.current?.click()} className="flex flex-col items-center justify-center p-3 bg-zinc-800 rounded-lg hover:bg-zinc-700 transition-colors">
                         <ImageIcon size={20} className="mb-1 text-zinc-300"/>
                         <span className="text-[10px] text-zinc-400">Media</span>
                         <input type="file" ref={mediaInputRef} className="hidden" onChange={handleLayerUpload} accept="image/*,video/*" />
                     </button>

                     {/* Emoji Add Picker */}
                     {activeAddPicker === 'emoji' && (
                         <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 grid grid-cols-6 gap-2">
                             {EMOJI_PRESETS.map((emoji) => (
                                 <button 
                                     key={emoji}
                                     onClick={() => {
                                         addOverlay('emoji', emoji);
                                         setActiveAddPicker('none');
                                     }}
                                     className="text-2xl hover:bg-zinc-800 rounded p-1"
                                 >
                                     {emoji}
                                 </button>
                             ))}
                         </div>
                     )}
                     
                     {/* Shape Add Picker */}
                     {activeAddPicker === 'shape' && (
                        <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-zinc-900 border border-zinc-700 rounded-lg shadow-xl z-50 grid grid-cols-3 gap-2">
                            {SHAPE_PRESETS.map((shape) => (
                                <button 
                                    key={shape.id}
                                    onClick={() => {
                                        addOverlay('shape', shape.id);
                                        setActiveAddPicker('none');
                                    }}
                                    className="flex flex-col items-center justify-center p-2 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white"
                                >
                                    {shape.id === 'rect' && <Box size={20} />}
                                    {shape.id === 'circle' && <Circle size={20} />}
                                    {shape.id === 'rounded' && <Box size={20} className="rounded-md" />}
                                    {shape.id === 'triangle' && <Triangle size={20} />}
                                    {shape.id === 'star' && <Star size={20} />}
                                    {shape.id === 'heart' && <Heart size={20} />}
                                    {shape.id === 'diamond' && <div className="w-4 h-4 border-2 border-current rotate-45"></div>}
                                    {shape.id === 'hexagon' && <Box size={20} />}
                                    <span className="text-[10px] mt-1">{shape.label}</span>
                                </button>
                            ))}
                        </div>
                     )}
                 </div>
                 
                 <div className="pt-4 border-t border-zinc-800">
                      <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Layer List</h3>
                      
                      <div className="space-y-1">
                        {getSortedLayers().map((item) => {
                             const isMockup = 'contentUrl' in item;
                             return (
                                 <div 
                                    key={item.id} 
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, item.id)}
                                    onDragOver={(e) => handleDragOver(e, item.id)}
                                    onDrop={(e) => handleDrop(e, item.id)}
                                    onDragLeave={handleDragLeave}
                                    onClick={() => updateState({ selectedId: item.id })}
                                    className={`flex items-center p-2 rounded cursor-pointer group transition-all duration-200
                                        ${state.selectedId === item.id ? 'bg-indigo-500/20 border-indigo-500/50' : 'bg-zinc-800 hover:bg-zinc-700 border-transparent'}
                                        ${dragOverId === item.id ? 'border-t-2 border-t-indigo-500 bg-zinc-700' : 'border'}
                                    `}
                                 >
                                     <div className="mr-3 cursor-grab text-zinc-500 hover:text-white"><GripVertical size={14} /></div>
                                     {isMockup ? <Smartphone size={14} className="mr-2 text-zinc-400"/> : <Layers size={14} className="mr-2 text-zinc-400"/>}
                                     <span className="text-xs text-zinc-300 truncate flex-1 select-none">{item.name}</span>
                                     <div className="opacity-0 group-hover:opacity-100 flex space-x-1">
                                         <button onClick={(e) => { e.stopPropagation(); onReorderLayer(item.id, 'forward'); }} className="p-1 hover:bg-zinc-600 rounded"><ArrowUp size={10} /></button>
                                         <button onClick={(e) => { e.stopPropagation(); onReorderLayer(item.id, 'backward'); }} className="p-1 hover:bg-zinc-600 rounded"><ArrowDown size={10} /></button>
                                     </div>
                                 </div>
                             );
                        })}
                      </div>
                 </div>
             </div>
        )}

      </div>
      
      {/* Footer Info */}
      <div className="p-4 border-t border-zinc-800 text-[10px] text-zinc-500 text-center">
        MockupStudio v1.0
      </div>
    </div>
  );
};
