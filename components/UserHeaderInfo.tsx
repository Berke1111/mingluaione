"use client";
import { useUser, useClerk } from '@clerk/nextjs';
import { useState, useRef, useEffect } from 'react';

function getInitials(name: string | undefined, email: string | undefined) {
  if (name && name.trim()) {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return '?';
}

export default function UserHeaderInfo({ credits }: { credits?: number }) {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close dropdown on outside click or ESC
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    if (open) {
      document.addEventListener('mousedown', handleClick);
      document.addEventListener('keydown', handleKey);
    }
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  if (!isLoaded || !user) return null;
  const avatarUrl = user.imageUrl;
  const initials = getInitials(user.fullName, user.primaryEmailAddress?.emailAddress);

  return (
    <div className="relative flex items-center">
      <button
        ref={buttonRef}
        aria-label="Open user menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
        className="w-10 h-10 rounded-full border-2 border-blue-400 bg-[#23232a] flex items-center justify-center shadow focus:outline-none focus:ring-2 focus:ring-blue-400 transition hover:scale-105"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Profile avatar"
            className="w-9 h-9 rounded-full object-cover"
            draggable={false}
          />
        ) : (
          <span className="w-9 h-9 flex items-center justify-center rounded-full bg-blue-600 text-white font-bold text-lg">
            {initials}
          </span>
        )}
      </button>
      {/* Dropdown */}
      {open && (
        <div
          ref={dropdownRef}
          tabIndex={-1}
          role="menu"
          aria-label="User menu"
          className="absolute right-0 mt-2 w-56 bg-[#18181b] border border-[#23232a] rounded-xl shadow-2xl z-50 py-2 animate-fade-in flex flex-col"
        >
          <div className="px-4 py-2 flex items-center gap-3 border-b border-[#23232a]">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile avatar" className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <span className="w-8 h-8 flex items-center justify-center rounded-full bg-blue-600 text-white font-bold text-base">{initials}</span>
            )}
            <div className="flex flex-col">
              <span className="text-white font-semibold text-sm truncate">{user.fullName || 'User'}</span>
              <span className="text-gray-400 text-xs truncate">{user.primaryEmailAddress?.emailAddress}</span>
            </div>
          </div>
          <button
            className="w-full text-left px-4 py-2 text-white hover:bg-blue-600 focus:bg-blue-700 focus:outline-none transition text-sm"
            role="menuitem"
            tabIndex={0}
            onClick={() => {
              window.location.href = '/profile';
              setOpen(false);
            }}
          >
            View Profile
          </button>
          {typeof credits === 'number' && (
            <div className="px-4 py-2 text-blue-400 text-sm font-semibold">Credits: {credits}</div>
          )}
          <button
            className="w-full text-left px-4 py-2 text-red-400 hover:bg-red-100/10 focus:bg-red-100/20 focus:outline-none transition text-sm"
            role="menuitem"
            tabIndex={0}
            onClick={() => signOut()}
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
} 