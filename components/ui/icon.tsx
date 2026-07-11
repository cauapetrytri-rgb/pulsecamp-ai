import type { SVGProps } from "react";

import type { IconName } from "@/lib/navigation";

const paths: Record<IconName, React.ReactNode> = {
  dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
  sparkles: <><path d="m12 3 1.1 3.1L16 7.4l-2.9 1.2L12 12l-1.1-3.4L8 7.4l2.9-1.3L12 3Z"/><path d="m18.5 13 .7 2 1.8.8-1.8.7-.7 2-.7-2-1.8-.7 1.8-.8.7-2Z"/><path d="m5.5 13 .8 2.2 2.2.8-2.2.9-.8 2.1-.8-2.1-2.2-.9 2.2-.8.8-2.2Z"/></>,
  campaign: <><path d="m3 11 15-6v14L3 13v-2Z"/><path d="M7 14v5a2 2 0 0 0 2 2h1v-5"/><path d="M18 9a3 3 0 0 1 0 6"/></>,
  creative: <><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="8" cy="9" r="2"/><path d="m4 17 5-5 4 4 3-3 4 4"/></>,
  site: <><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><circle cx="7" cy="6.5" r=".5"/><circle cx="10" cy="6.5" r=".5"/><path d="m9 14 2 2 4-4"/></>,
  link: <><path d="m10 13 4-4"/><path d="M7.5 15.5 6 17a4 4 0 0 1-5.7-5.7l3-3A4 4 0 0 1 9 8"/><path d="M16.5 8.5 18 7a4 4 0 0 1 5.7 5.7l-3 3A4 4 0 0 1 15 16"/></>,
  origin: <><circle cx="12" cy="12" r="3"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/><path d="m4.9 4.9 3.5 3.5M15.6 15.6l3.5 3.5M19.1 4.9l-3.5 3.5M8.4 15.6l-3.5 3.5"/></>,
  integration: <><path d="M8 3v4M16 3v4M5 7h14v4a7 7 0 0 1-14 0V7Z"/><path d="M12 18v3"/></>,
  conversation: <><path d="M4 4h16v12H8l-4 4V4Z"/><path d="M8 9h8M8 12h5"/></>,
  lead: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/><path d="m18 5 1.5 1.5L22 4"/></>,
  pipeline: <><rect x="3" y="4" width="5" height="16" rx="1"/><rect x="10" y="4" width="5" height="11" rx="1"/><rect x="17" y="4" width="5" height="7" rx="1"/></>,
  sale: <><path d="M4 5h16l-2 9H6L4 5Z"/><path d="M8 14v2a2 2 0 0 0 2 2h7"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></>,
  team: <><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20a6 6 0 0 1 12 0M14 15a5 5 0 0 1 7 4.5"/></>,
  attribution: <><circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M8.5 7.5 16 16M18 5v6h-6"/></>,
  report: <><path d="M5 3h11l3 3v15H5V3Z"/><path d="M9 17v-4M12 17V9M15 17v-6"/></>,
  event: <><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/><circle cx="12" cy="12" r="5"/><path d="m10 12 1.5 1.5L14.5 10"/></>,
  goal: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>,
  company: <><path d="M4 21V5l8-3 8 3v16"/><path d="M8 8h2M14 8h2M8 12h2M14 12h2M10 21v-5h4v5"/></>,
  user: <><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>,
  settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></>,
  billing: <><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></>,
  filter: <><path d="M4 5h16M7 12h10M10 19h4"/></>,
  bell: <><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4"/></>,
  help: <><circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.7 2.7 0 1 1 4.1 2.3c-1.1.7-1.6 1.1-1.6 2.2M12 17h.01"/></>,
  plus: <path d="M12 5v14M5 12h14"/>,
  search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
  download: <><path d="M12 3v12M7 10l5 5 5-5M4 21h16"/></>,
  copy: <><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/></>,
  check: <path d="m5 12 4 4L19 6"/>,
  warning: <><path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 9v4M12 17h.01"/></>,
  clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
  arrow: <path d="m9 18 6-6-6-6"/>,
};

export function Icon({ name, ...props }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
      {paths[name]}
    </svg>
  );
}
