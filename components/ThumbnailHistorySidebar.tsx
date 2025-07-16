"use client";
import { useUser, useClerk } from '@clerk/nextjs';
import { useEffect, useState, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import Image from 'next/image';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const SIDEBAR_WIDTH = 'w-[270px]';

const TABS = [
  { key: 'history', label: 'History', icon: (
    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
  ) },
  { key: 'settings', label: 'Settings', icon: (
    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2" /></svg>
  ) },
  { key: 'subscription', label: 'Subscription', icon: (
    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h8m-4-4v8" /></svg>
  ) },
];

export default function ThumbnailHistorySidebar({ refreshTrigger }: { refreshTrigger?: any }) {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('history');
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [subscription, setSubscription] = useState<{ plan: string; credits_remaining: number } | null>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const firstTabRef = useRef<HTMLButtonElement>(null);

  // Fetch history for the current user
  const fetchHistory = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('thumbnail_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (!error && data) setHistory(data);
    setLoading(false);
  };

  // Fetch subscription info for the current user
  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user) return;
      const { data, error } = await supabase
        .from('subscriptions')
        .select('plan, credits_remaining')
        .eq('user_id', user.id)
        .single();
      if (!error && data) setSubscription(data);
      else setSubscription(null);
    };
    if (isLoaded && isSignedIn && user) {
      fetchSubscription();
    }
  }, [isLoaded, isSignedIn, user]);

  useEffect(() => {
    if (isLoaded && isSignedIn && user && activeTab === 'history') {
      fetchHistory();
    }
    // eslint-disable-next-line
  }, [isLoaded, isSignedIn, user, refreshTrigger, activeTab]);

  // Keyboard accessibility for closing sidebar and focus trap
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (open && e.key === 'Escape') setOpen(false);
      // Focus trap: tab/shift+tab stays in sidebar
      if (open && e.key === 'Tab' && sidebarRef.current) {
        const focusable = sidebarRef.current.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      }
    }
    if (open) document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  useEffect(() => {
    if (open && sidebarRef.current) {
      // Focus the first tab for accessibility
      setTimeout(() => {
        firstTabRef.current?.focus();
      }, 100);
    }
  }, [open]);

  if (!isLoaded || !isSignedIn) return null;

  // Responsive sidebar classes
  const sidebarBase =
    `fixed top-0 left-0 h-screen ${SIDEBAR_WIDTH} bg-[#18181b] border-r border-[#23232a] shadow-2xl z-50 flex flex-col transition-transform duration-300 ease-in-out`;
  const sidebarOpen = 'translate-x-0';
  const sidebarClosed = '-translate-x-full md:translate-x-0';

  // Profile info
  const avatarUrl = user.imageUrl;
  const initials = user.fullName?.split(' ').map(n => n[0]).join('').toUpperCase() || user.primaryEmailAddress?.emailAddress?.[0]?.toUpperCase() || '?';

  // Sign out and redirect to login
  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/sign-in';
  };

  return (
    <>
      {/* Hamburger for mobile only */}
      <button
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-[#23232a] text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
        aria-label={open ? 'Close sidebar' : 'Open sidebar'}
        onClick={() => setOpen((v) => !v)}
        tabIndex={0}
      >
        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          {open ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 8h16M4 16h16" />
          )}
        </svg>
      </button>
      {/* Sidebar */}
      <nav
        ref={sidebarRef}
        className={
          sidebarBase +
          ' ' +
          (open ? sidebarOpen : sidebarClosed) +
          ' md:translate-x-0 md:static md:block'
        }
        aria-label="Sidebar navigation"
        tabIndex={-1}
        aria-modal={open ? 'true' : undefined}
        role="dialog"
      >
        {/* Profile info with sign out */}
        <div className="flex flex-col items-center gap-2 px-4 py-6 border-b border-[#23232a]">
          <button
            className="w-14 h-14 flex items-center justify-center rounded-full border-2 border-blue-400 bg-blue-600 text-white font-bold text-2xl focus:outline-none focus:ring-2 focus:ring-blue-400 hover:scale-105 transition"
            aria-label="Sign out"
            onClick={handleSignOut}
            title="Sign out"
          >
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt="Profile avatar"
                width={56}
                height={56}
                className="w-14 h-14 rounded-full object-cover"
                priority
              />
            ) : (
              <span>{initials}</span>
            )}
          </button>
          <div className="text-white font-semibold text-base truncate w-full text-center">{user.fullName || 'User'}</div>
          <div className="text-gray-400 text-xs truncate w-full text-center">{user.primaryEmailAddress?.emailAddress}</div>
          {/* Subscription info */}
          {subscription && (
            <div className="mt-2 text-blue-400 text-xs font-semibold bg-[#23232a] rounded px-3 py-1 border border-[#23232a]">
              {subscription.plan.charAt(0).toUpperCase() + subscription.plan.slice(1)} &bull; {subscription.credits_remaining} credits left
            </div>
          )}
        </div>
        {/* Tabs */}
        <div className="flex flex-row md:flex-col gap-1 px-2 py-2 border-b border-[#23232a]" role="tablist" aria-orientation="vertical">
          {TABS.map((tab, i) => (
            <button
              key={tab.key}
              ref={i === 0 ? firstTabRef : undefined}
              role="tab"
              aria-selected={activeTab === tab.key}
              tabIndex={activeTab === tab.key ? 0 : -1}
              className={`flex items-center px-3 py-2 rounded-lg font-medium text-sm transition focus:outline-none focus:ring-2 focus:ring-blue-400 ${activeTab === tab.key ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-blue-950 hover:text-white'}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {activeTab === 'history' && (
            <HistoryTab history={history} loading={loading} />
          )}
          {activeTab === 'settings' && (
            <SettingsTab onLogout={handleSignOut} />
          )}
          {activeTab === 'subscription' && (
            <SubscriptionTab />
          )}
        </div>
      </nav>
      {/* Overlay for mobile when sidebar is open */}
      {open && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 z-40 md:hidden transition-opacity duration-300"
          aria-hidden="true"
          onClick={() => setOpen(false)}
        />
      )}
    </>
  );
}

function HistoryTab({ history, loading }: { history: any[]; loading: boolean }) {
  return (
    <div className="space-y-3">
      {loading ? (
        <div className="text-blue-400 text-center mt-4">Loading...</div>
      ) : history.length === 0 ? (
        <div className="text-gray-400 text-center mt-4">No thumbnails yet.</div>
      ) : (
        history.map((item) => (
          <HistoryItem key={item.id} item={item} />
        ))
      )}
    </div>
  );
}

function HistoryItem({ item }: { item: any }) {
  const formattedDate = new Date(item.created_at).toLocaleString();
  return (
    <div className="flex items-center gap-3 bg-[#23232a] rounded-xl p-2 shadow hover:bg-blue-950 transition group">
      <Image
        src={item.image_url}
        alt="Thumbnail preview"
        width={64}
        height={40}
        className="w-16 h-10 object-cover rounded-lg border border-[#23232a]"
        loading="lazy"
      />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-300 truncate">{formattedDate}</div>
      </div>
      <a
        href={item.image_url}
        download
        className="ml-2 px-2 py-1 rounded bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
        aria-label="Download thumbnail"
        tabIndex={0}
      >
        Download
      </a>
    </div>
  );
}

function SettingsTab({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="text-gray-300 text-sm p-4 flex flex-col gap-4">
      <div>
        <div className="font-bold mb-2">Settings</div>
        <div className="text-xs text-gray-400">(Settings UI placeholder)</div>
      </div>
      <button
        className="w-full px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-red-400 transition"
        onClick={onLogout}
        aria-label="Logout"
      >
        Logout
      </button>
    </div>
  );
}

function SubscriptionTab() {
  const handleSubscribe = () => {
    window.location.href = 'https://buy.stripe.com/test_bJe3cx0zrbvO8JD2S1bMQ01';
  };

  return (
    <div className="text-gray-300 text-sm p-4">
      <div className="font-bold mb-2">Subscription</div>
      <div className="mb-4">
        <button
          className="w-full px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
          onClick={handleSubscribe}
        >
          Subscribe
        </button>
      </div>
      <div className="text-xs text-gray-400">You will be redirected to Stripe Checkout. Credits renew monthly.</div>
    </div>
  );
} 