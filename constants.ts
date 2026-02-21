
import { DeviceType, Gradient, MockupItem, AnimationType, EasingType } from "./types";

export const DEVICE_DEFINITIONS: Record<DeviceType, { name: string; aspectRatio: number; frameColor: string }> = {
  'iphone-15': { name: 'iPhone 15 Pro', aspectRatio: 9 / 19.5, frameColor: '#1c1c1e' },
  'macbook-air': { name: 'MacBook Air', aspectRatio: 16 / 10, frameColor: '#27272a' },
  'browser-window': { name: 'Chrome Browser', aspectRatio: 16 / 9, frameColor: '#ffffff' },
  'ipad-pro': { name: 'iPad Pro', aspectRatio: 4 / 3, frameColor: '#1c1c1e' },
  'apple-watch': { name: 'Apple Watch', aspectRatio: 1 / 1.25, frameColor: '#1c1c1e' },
  'samsung-galaxy': { name: 'Galaxy S24', aspectRatio: 9 / 19.5, frameColor: '#1c1c1e' },
  'samsung-galaxy-ultra': { name: 'S24 Ultra', aspectRatio: 9 / 19.5, frameColor: '#1c1c1e' },
};

export const ANIMATION_PRESETS_IN: { value: AnimationType; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'fade-in', label: 'Fade In' },
    { value: 'zoom-in', label: 'Zoom In' },
    { value: 'slide-up', label: 'Slide Up' },
    { value: 'shake', label: 'Shake' },
    { value: 'pulse', label: 'Pulse' },
];

export const ANIMATION_PRESETS_OUT: { value: AnimationType; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'fade-out', label: 'Fade Out' },
    { value: 'zoom-out', label: 'Zoom Out' },
    { value: 'slide-down', label: 'Slide Down' },
];

export const EASING_PRESETS: { value: EasingType; label: string }[] = [
    { value: 'linear', label: 'Linear' },
    { value: 'easeIn', label: 'Smooth In' },
    { value: 'easeOut', label: 'Smooth Out' },
    { value: 'easeInOut', label: 'Smooth In/Out' },
    { value: 'bounce', label: 'Bounce' },
    { value: 'elastic', label: 'Elastic' },
];

// Easing Functions (t is 0-1)
export const EASING_FUNCTIONS: Record<EasingType, (t: number) => number> = {
    linear: (t) => t,
    easeIn: (t) => t * t,
    easeOut: (t) => t * (2 - t),
    easeInOut: (t) => t < .5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
    bounce: (t) => {
        const n1 = 7.5625, d1 = 2.75;
        if (t < 1 / d1) return n1 * t * t;
        else if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
        else if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
        else return n1 * (t -= 2.625 / d1) * t + 0.984375;
    },
    elastic: (t) => {
        const c4 = (2 * Math.PI) / 3;
        return t === 0 ? 0 : t === 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
    }
};

export const GOOGLE_FONTS = [
  // Sans Serif
  'Inter', 'Roboto', 'Open Sans', 'Montserrat', 'Lato', 'Poppins', 'Nunito', 'Raleway', 'Oswald', 
  'Rubik', 'Noto Sans', 'Ubuntu', 'Mukta', 'Work Sans', 'Quicksand', 'Barlow', 'Manrope', 'DM Sans',
  'PT Sans', 'Fira Sans', 'Josefin Sans', 'Source Sans Pro', 'Titillium Web', 'Hind', 'Kanit',
  
  // Serif
  'Merriweather', 'Playfair Display', 'Lora', 'PT Serif', 'Noto Serif', 'Roboto Slab', 
  'Libre Baskerville', 'Crimson Text', 'Arvo', 'Bitter', 'EB Garamond', 'Domine', 'Bree Serif', 
  'Slabo 27px', 'Zilla Slab', 'Cinzel',
  
  // Display / Heading
  'Bebas Neue', 'Anton', 'Abril Fatface', 'Lobster', 'Righteous', 'Comfortaa', 'Fredoka One', 
  'Fjalla One', 'Patua One', 'Alfa Slab One', 'Bangers', 'Luckiest Guy', 'Russo One', 'Unica One', 
  'Orbitron', 'Audiowide', 'Press Start 2P', 'Monoton', 'Creepster', 'Special Elite',

  // Handwriting / Script
  'Dancing Script', 'Pacifico', 'Caveat', 'Satisfy', 'Great Vibes', 'Permanent Marker', 
  'Sacramento', 'Indie Flower', 'Amatic SC', 'Shadows Into Light', 'Gloria Hallelujah', 'Courgette',
  'Kalam', 'Handlee', 'Patrick Hand', 'Yellowtail', 'Cookie', 'Chewy',

  // Monospace
  'Roboto Mono', 'Inconsolata', 'Source Code Pro', 'Fira Code', 'Space Mono', 'IBM Plex Mono', 
  'Nanum Gothic Coding', 'VT323', 'Cousine', 'Anonymous Pro'
].sort();

export const DEFAULT_GRADIENTS: Gradient[] = [
  { type: 'linear', from: '#FF9A9E', to: '#FECFEF', angle: 45 },
  { type: 'linear', from: '#a18cd1', to: '#fbc2eb', angle: 120 },
  { type: 'linear', from: '#84fab0', to: '#8fd3f4', angle: 120 },
  { type: 'linear', from: '#e0c3fc', to: '#8ec5fc', angle: 120 },
  { type: 'linear', from: '#4facfe', to: '#00f2fe', angle: 0 },
  { type: 'linear', from: '#43e97b', to: '#38f9d7', angle: 0 },
  { type: 'linear', from: '#fa709a', to: '#fee140', angle: 45 },
  { type: 'linear', from: '#30cfd0', to: '#330867', angle: 45 },
  { type: 'linear', from: '#667eea', to: '#764ba2', angle: 135 },
  { type: 'linear', from: '#f43b47', to: '#453a94', angle: 135 },
];

export const CANVAS_PRESETS = [
  { name: 'FHD (16:9)', width: 1920, height: 1080, ratio: 16/9 },
  { name: 'Instagram Post', width: 1080, height: 1080, ratio: 1/1 },
  { name: 'Story / Reel / TikTok', width: 1080, height: 1920, ratio: 9/16 },
  { name: 'Instagram Portrait', width: 1080, height: 1350, ratio: 4/5 },
  { name: 'Instagram Landscape', width: 1080, height: 566, ratio: 1.91 },
  { name: 'YouTube Thumbnail', width: 1280, height: 720, ratio: 16/9 },
  { name: 'Twitter Header', width: 1500, height: 500, ratio: 3/1 },
  { name: 'LinkedIn Cover', width: 1584, height: 396, ratio: 4/1 },
  { name: 'Facebook Cover', width: 820, height: 312, ratio: 2.63 },
  { name: 'Dribbble Shot', width: 1600, height: 1200, ratio: 4/3 },
  { name: '4K (16:9)', width: 3840, height: 2160, ratio: 16/9 },
];

export const EMOJI_PRESETS = [
    '🔥', '✨', '💖', '👍', '🎉', '😎', '🚀', '💡', 
    '✅', '❌', '⭐', '⚡', '👋', '👀', '💯', '🤔',
    '🎨', '💻', '📱', '📸', '🎵', '📍', '🗓️', '🔔',
    '😊', '😂', '😍', '😭', '😡', '🤯', '🥳', '😴'
];

export const SHAPE_PRESETS = [
    { id: 'rect', label: 'Square' },
    { id: 'circle', label: 'Circle' },
    { id: 'rounded', label: 'Rounded' },
    { id: 'triangle', label: 'Triangle' },
    { id: 'star', label: 'Star' },
    { id: 'heart', label: 'Heart' },
    { id: 'diamond', label: 'Diamond' },
    { id: 'hexagon', label: 'Hexagon' },
];

export const INITIAL_MOCKUP: MockupItem = {
  id: 'mockup-1',
  name: 'iPhone 15 Pro',
  type: 'iphone-15',
  contentUrl: null,
  isVideo: false,
  scale: 1,
  rotation: 0,
  position: { x: 0, y: 0 },
  shadow: 'soft',
  zIndex: 1,
  startTime: 0,
  duration: 5,
  animIn: 'none',
  animInDuration: 0.5,
  animOut: 'none',
  animOutDuration: 0.5,
  keyframes: []
};

export const SHADOW_STYLES = {
  none: '',
  soft: 'drop-shadow-2xl',
  hard: 'shadow-[10px_10px_0px_0px_rgba(0,0,0,0.5)]',
  floating: 'shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] transform translate-y-[-10px]',
};
