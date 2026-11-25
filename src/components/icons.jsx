const Svg = ({ children, size = 20, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"
    strokeLinecap="square" aria-hidden="true" {...p}>
    {children}
  </svg>
);

export const BagIcon = (p) => <Svg {...p}><path d="M5 8h14l-1 13H6L5 8z" /><path d="M9 8V6a3 3 0 0 1 6 0v2" /></Svg>;
export const MenuIcon = (p) => <Svg {...p}><path d="M3 7h18M3 12h18M3 17h18" /></Svg>;
export const CloseIcon = (p) => <Svg {...p}><path d="M5 5l14 14M19 5L5 19" /></Svg>;
export const SearchIcon = (p) => <Svg {...p}><circle cx="11" cy="11" r="6.5" /><path d="M16 16l5 5" /></Svg>;
export const UserIcon = (p) => <Svg {...p}><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></Svg>;
export const PlusIcon = (p) => <Svg {...p}><path d="M12 5v14M5 12h14" /></Svg>;
export const MinusIcon = (p) => <Svg {...p}><path d="M5 12h14" /></Svg>;
export const ArrowIcon = (p) => <Svg {...p}><path d="M4 12h16M14 6l6 6-6 6" /></Svg>;
export const ChatIcon = (p) => <Svg {...p}><path d="M4 5h16v11H9l-5 4V5z" /></Svg>;
export const SparkIcon = (p) => <Svg {...p}><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z" /></Svg>;
export const CopyIcon = (p) => <Svg {...p}><rect x="8" y="8" width="12" height="12" /><path d="M16 8V4H4v12h4" /></Svg>;
export const RulerIcon = (p) => <Svg {...p}><path d="M3 16L16 3l5 5L8 21l-5-5z" /><path d="M7 12l2 2M10 9l2 2M13 6l2 2" /></Svg>;
export const SendIcon = (p) => <Svg {...p}><path d="M4 12l16-8-6 16-2-7-8-1z" /></Svg>;
export const RefreshIcon = (p) => <Svg {...p}><path d="M20 12a8 8 0 1 1-2.3-5.7" /><path d="M20 4v5h-5" /></Svg>;
export const DownloadIcon = (p) => <Svg {...p}><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></Svg>;
