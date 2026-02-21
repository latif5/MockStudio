
import React, { useEffect, useRef } from 'react';
import { DeviceType, MockupItem } from '../types';
import { SHADOW_STYLES } from '../constants';
import { Plus } from 'lucide-react';

interface DeviceFrameProps {
  mockup: MockupItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
  isPlaying?: boolean; // Optional prop to control playback
  currentTime?: number; // Added to sync audio/video seek
  onEmptyClick?: () => void;
}

export const DeviceFrame: React.FC<DeviceFrameProps> = ({ mockup, isSelected, onSelect, isPlaying = true, currentTime = 0, onEmptyClick }) => {
  const { type, contentUrl, isVideo, shadow, startTime } = mockup;
  const videoRef = useRef<HTMLVideoElement>(null);

  // Sync playback state and time
  useEffect(() => {
    if (isVideo && videoRef.current) {
      // Manage Playback
      if (isPlaying) {
        videoRef.current.play().catch(e => {
            // Browsers often block unmuted playback without user interaction
            console.log('Autoplay prevented', e);
        });
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, isVideo]);

  // Sync Video Time with Global Timeline
  useEffect(() => {
    if (isVideo && videoRef.current) {
       // Calculate what the video time should be relative to its start time on timeline
       const relativeTime = currentTime - startTime;
       
       // Sync if discrepancy is large (e.g. seeking/looping) or if video is ahead/behind significantly
       // Note: Regular updates are 100ms. We give a small buffer.
       if (Math.abs(videoRef.current.currentTime - relativeTime) > 0.2) {
           // Clamp to duration if possible to avoid errors
           if (relativeTime >= 0 && (!videoRef.current.duration || relativeTime <= videoRef.current.duration)) {
                videoRef.current.currentTime = relativeTime;
           } else if (relativeTime < 0) {
                videoRef.current.currentTime = 0;
           }
       }
    }
  }, [currentTime, isVideo, startTime]);

  // Base Frame Container
  const renderFrame = (children: React.ReactNode) => (
    <div
      className={`relative transition-all duration-300 ease-in-out group select-none ${SHADOW_STYLES[shadow]} ${isSelected ? 'ring-2 ring-indigo-500' : ''}`}
    >
      {children}
    </div>
  );

  const renderContent = () => {
    if (!contentUrl) {
      return (
        <div 
          className="w-full h-full bg-zinc-800 flex items-center justify-center select-none"
        >
          <button 
            className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-lg transition-all hover:scale-110 hover:bg-zinc-100 cursor-pointer active:scale-95"
            onClick={(e) => {
                e.stopPropagation();
                onEmptyClick?.();
            }}
            title="Upload Media"
          >
            <Plus size={32} className="text-black" />
          </button>
        </div>
      );
    }
    return isVideo ? (
      <video
        ref={videoRef}
        src={contentUrl}
        className="w-full h-full object-cover pointer-events-none select-none"
        loop
        playsInline
        crossOrigin="anonymous" 
      />
    ) : (
      <img 
        src={contentUrl} 
        alt="Content" 
        className="w-full h-full object-cover pointer-events-none select-none" 
        crossOrigin="anonymous"
        draggable={false}
      />
    );
  };

  // --- iPhone 15 Pro ---
  if (type === 'iphone-15') {
    return renderFrame(
      <div className="relative w-[300px] h-[615px] bg-black rounded-[50px] p-[10px] ring-1 ring-white/10 shadow-2xl">
        {/* Outer Frame */}
        <div className="absolute inset-0 rounded-[50px] border-[6px] border-zinc-800 pointer-events-none z-20"></div>
        {/* Screen */}
        <div className="relative w-full h-full bg-black rounded-[42px] overflow-hidden">
          {renderContent()}
          {/* Dynamic Island */}
          <div className="absolute top-[18px] left-1/2 -translate-x-1/2 w-[90px] h-[26px] bg-black rounded-full z-30 flex items-center justify-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-[#1a1a1a]/50 blur-[1px]"></div>
          </div>
        </div>
        {/* Buttons */}
        <div className="absolute -left-[8px] top-[120px] w-[3px] h-[30px] bg-zinc-700 rounded-l-md"></div>
        <div className="absolute -left-[8px] top-[160px] w-[3px] h-[50px] bg-zinc-700 rounded-l-md"></div>
        <div className="absolute -right-[8px] top-[130px] w-[3px] h-[80px] bg-zinc-700 rounded-r-md"></div>
      </div>
    );
  }

  // --- Samsung Galaxy S24 ---
  if (type === 'samsung-galaxy') {
    return renderFrame(
      <div className="relative w-[300px] h-[615px] bg-black rounded-[36px] p-[8px] ring-1 ring-white/10 shadow-2xl">
         {/* Outer Frame */}
        <div className="absolute inset-0 rounded-[36px] border-[4px] border-zinc-800 pointer-events-none z-20"></div>
        <div className="relative w-full h-full bg-black rounded-[28px] overflow-hidden">
          {renderContent()}
          {/* Punch Hole Camera */}
          <div className="absolute top-[12px] left-1/2 -translate-x-1/2 w-[12px] h-[12px] bg-black rounded-full z-30 ring-1 ring-zinc-800"></div>
        </div>
        {/* Buttons */}
        <div className="absolute -right-[6px] top-[120px] w-[3px] h-[50px] bg-zinc-700 rounded-r-md"></div>
        <div className="absolute -right-[6px] top-[180px] w-[3px] h-[30px] bg-zinc-700 rounded-r-md"></div>
      </div>
    );
  }

  // --- Samsung Galaxy S24 Ultra ---
  if (type === 'samsung-galaxy-ultra') {
    return renderFrame(
      <div className="relative w-[305px] h-[620px] bg-black rounded-[4px] p-[6px] ring-1 ring-white/10 shadow-2xl">
         {/* Outer Frame */}
        <div className="absolute inset-0 rounded-[4px] border-[2px] border-zinc-700 pointer-events-none z-20"></div>
        <div className="relative w-full h-full bg-black rounded-[2px] overflow-hidden">
          {renderContent()}
          {/* Punch Hole Camera */}
          <div className="absolute top-[12px] left-1/2 -translate-x-1/2 w-[10px] h-[10px] bg-black rounded-full z-30 ring-1 ring-zinc-800"></div>
        </div>
        {/* Buttons */}
        <div className="absolute -right-[4px] top-[150px] w-[2px] h-[40px] bg-zinc-700 rounded-r-sm"></div>
        <div className="absolute -right-[4px] top-[200px] w-[2px] h-[25px] bg-zinc-700 rounded-r-sm"></div>
      </div>
    );
  }

  // --- MacBook Air ---
  if (type === 'macbook-air') {
    return renderFrame(
      <div className="relative flex flex-col items-center">
        {/* Screen */}
        <div className="relative w-[640px] h-[400px] bg-black rounded-t-2xl p-[10px] ring-1 ring-white/10">
            <div className="absolute inset-0 rounded-t-2xl border-[4px] border-zinc-800 pointer-events-none z-20"></div>
            <div className="relative w-full h-full bg-black rounded-t-lg overflow-hidden">
                {renderContent()}
            </div>
             {/* Camera Notch Area (Simulated) */}
             <div className="absolute top-[10px] left-1/2 -translate-x-1/2 w-[120px] h-[16px] bg-black rounded-b-lg z-30"></div>
        </div>
        {/* Base */}
        <div className="w-[720px] h-[24px] bg-gradient-to-b from-zinc-700 to-zinc-800 rounded-b-xl relative shadow-xl">
             <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[100px] h-[8px] bg-zinc-800 rounded-b-lg"></div>
        </div>
      </div>
    );
  }

  // --- Browser Window ---
  if (type === 'browser-window') {
    return renderFrame(
      <div className="w-[600px] h-[380px] bg-white dark:bg-zinc-900 rounded-xl shadow-2xl overflow-hidden flex flex-col ring-1 ring-black/5 dark:ring-white/10">
        {/* Browser Header */}
        <div className="h-[36px] bg-zinc-100 dark:bg-zinc-800 border-b border-zinc-200 dark:border-zinc-700 flex items-center px-4 space-x-2">
          <div className="flex space-x-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
            <div className="w-3 h-3 rounded-full bg-green-400"></div>
          </div>
          {/* Address Bar */}
          <div className="flex-1 mx-4 h-[22px] bg-white dark:bg-zinc-900 rounded-md border border-zinc-200 dark:border-zinc-600 flex items-center px-2">
            <div className="w-3 h-3 bg-zinc-300 dark:bg-zinc-700 rounded-sm"></div>
            <div className="ml-2 w-1/3 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-sm"></div>
          </div>
        </div>
        {/* Content */}
        <div className="flex-1 bg-white relative overflow-hidden">
             {renderContent()}
        </div>
      </div>
    );
  }

  // --- iPad Pro ---
  if (type === 'ipad-pro') {
    return renderFrame(
        <div className="relative w-[512px] h-[682px] bg-zinc-900 rounded-[36px] p-[12px] ring-1 ring-white/10 shadow-2xl">
            {/* Bezel */}
            <div className="absolute inset-0 rounded-[36px] border-[12px] border-black pointer-events-none z-20"></div>
             <div className="relative w-full h-full bg-black rounded-[24px] overflow-hidden">
                {renderContent()}
            </div>
            {/* Front Camera (in bezel) */}
             <div className="absolute top-[6px] left-1/2 -translate-x-1/2 w-[4px] h-[4px] bg-zinc-800 rounded-full z-30"></div>
        </div>
    );
  }

  // --- Apple Watch ---
  if (type === 'apple-watch') {
    return renderFrame(
      <div className="relative w-[240px] h-[296px] bg-zinc-800 rounded-[56px] p-[6px] ring-1 ring-white/10 shadow-2xl">
         {/* Strap connectors */}
         <div className="absolute -top-[20px] left-1/2 -translate-x-1/2 w-[140px] h-[40px] bg-zinc-700/50 rounded-t-3xl -z-10"></div>
         <div className="absolute -bottom-[20px] left-1/2 -translate-x-1/2 w-[140px] h-[40px] bg-zinc-700/50 rounded-b-3xl -z-10"></div>

        {/* Body Gradient */}
        <div className="absolute inset-0 rounded-[56px] bg-gradient-to-br from-zinc-700 via-zinc-800 to-zinc-900 pointer-events-none"></div>
        {/* Screen */}
        <div className="relative w-full h-full bg-black rounded-[48px] overflow-hidden border-[4px] border-zinc-900 shadow-inner">
             {renderContent()}
        </div>
        {/* Crown */}
        <div className="absolute top-[60px] -right-[12px] w-[12px] h-[36px] bg-gradient-to-b from-zinc-300 to-zinc-500 rounded-r-md border-l border-black/50 shadow-lg"></div>
        {/* Side Button */}
        <div className="absolute top-[110px] -right-[6px] w-[6px] h-[44px] bg-zinc-700 rounded-r-md"></div>
      </div>
    );
  }

  return null;
};
