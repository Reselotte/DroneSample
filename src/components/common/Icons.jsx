/**
 * ไอคอนเส้น (SVG) ใช้แทน emoji ทั้งเว็บ
 * ขนาดเท่าตัวอักษร (1em) และสีตามข้อความ (currentColor) → ปรับขนาด/สีด้วย font-size / color ได้
 */
function Icon({ children, className = "", strokeWidth = 2, ...rest }) {
  return (
    <svg
      className={`ic-svg ${className}`.trim()}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const SlopeIcon = (p) => <Icon {...p}><path d="M3 20h18" /><path d="M3 20 17 6" /><path d="M11 20a8 8 0 0 0-2.3-5.7" /></Icon>;
export const DropIcon = (p) => <Icon {...p}><path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" /></Icon>;
export const CheckCircleIcon = (p) => <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="m8 12.5 2.7 2.7L16 10" /></Icon>;
export const CameraIcon = (p) => <Icon {...p}><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></Icon>;
export const AreaIcon = (p) => <Icon {...p}><rect x="4" y="4" width="16" height="16" rx="1.5" /><path d="M4 9h3M4 14h3M9 4v3M14 4v3" /></Icon>;
export const PinIcon = (p) => <Icon {...p}><path d="M12 21s7-6.2 7-11.5a7 7 0 0 0-14 0C5 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></Icon>;
export const PhoneIcon = (p) => <Icon {...p}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z" /></Icon>;
export const LockIcon = (p) => <Icon {...p}><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></Icon>;
export const CalculatorIcon = (p) => <Icon {...p}><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" /></Icon>;
export const WarningIcon = (p) => <Icon {...p}><path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /><path d="M12 9v4M12 17h.01" /></Icon>;
export const SunIcon = (p) => <Icon {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></Icon>;
export const MoonIcon = (p) => <Icon {...p}><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></Icon>;
export const ChevronDownIcon = (p) => <Icon {...p}><path d="m6 9 6 6 6-6" /></Icon>;
export const DroneIcon = (p) => <Icon {...p}><circle cx="12" cy="12" r="2.5" /><path d="M5 5l4.2 4.2M19 5l-4.2 4.2M5 19l4.2-4.2M19 19l-4.2-4.2" /><circle cx="5" cy="5" r="2.6" /><circle cx="19" cy="5" r="2.6" /><circle cx="5" cy="19" r="2.6" /><circle cx="19" cy="19" r="2.6" /></Icon>;
