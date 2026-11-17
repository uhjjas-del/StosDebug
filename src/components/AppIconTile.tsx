import { SideApp } from '../types/stosdebug';

export function AppIconTile({ app }: { app: SideApp }) {
  return (
    <div
      style={{
        background: `linear-gradient(135deg, ${app.iconBg} 0%, ${app.iconAccent} 100%)`,
      }}
      className="flex h-[60px] w-[60px] shrink-0 items-center justify-center rounded-[15px] text-lg font-bold tracking-tight text-white shadow-sm"
    >
      {app.iconLabel}
    </div>
  );
}
