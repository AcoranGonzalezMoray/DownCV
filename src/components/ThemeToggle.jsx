import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle({ theme, toggleTheme }) {
  return (
    <button
      onClick={toggleTheme}
      className="p-1.5 text-[var(--ui-text-tertiary)] hover:text-[var(--ui-text-primary)] bg-[var(--ui-bg-card)] hover:bg-[var(--ui-bg-card-hover)] rounded border border-[var(--ui-border-primary)] transition flex items-center gap-1.5 text-xs whitespace-nowrap shrink-0"
      title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 text-yellow-400 shrink-0" />
      ) : (
        <Moon className="w-4 h-4 text-indigo-400 shrink-0" />
      )}
      <span className="hidden min-[1700px]:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
    </button>
  );
}
