'use client';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import { useAuth, useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import ThumbnailHistorySidebar from '../components/ThumbnailHistorySidebar';
import Image from 'next/image';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Home() {
  const STARTING_CREDITS = 100;
  const COST_PER_GENERATION = 20;

  const { isSignedIn, userId } = useAuth();
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const [prompt, setPrompt] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enhancing, setEnhancing] = useState(false);
  const [enhanceError, setEnhanceError] = useState<string | null>(null);
  const [refreshHistory, setRefreshHistory] = useState(0);

  // Add state for credits and creditWarning, but fetch from Supabase only
  const [credits, setCredits] = useState<number | null>(null);
  const [creditWarning, setCreditWarning] = useState<string | null>(null);

  // Redirect unauthenticated users to sign-in
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push('/sign-in');
    }
  }, [isLoaded, isSignedIn, router]);

  // Fetch credits from Supabase for the current user
  useEffect(() => {
    if (!isSignedIn || !userId) {
      setCredits(null);
      setCreditWarning(null);
      return;
    }
    let cancelled = false;
    const fetchCredits = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('credits')
        .eq('id', userId)
        .single();
      if (!cancelled) {
        if (error || !data) {
          setCredits(null);
          setCreditWarning('Unable to fetch credits.');
        } else {
          setCredits(data.credits);
          setCreditWarning(data.credits < COST_PER_GENERATION ? 'You do not have enough credits to generate a thumbnail.' : null);
        }
      }
    };
    fetchCredits();
    return () => { cancelled = true; };
  }, [isSignedIn, userId, refreshHistory]);

  // Upsert user in Supabase on first login
  useEffect(() => {
    if (isLoaded && isSignedIn && user) {
      const upsertUser = async () => {
        try {
          const { error } = await supabase.from('users').upsert({
            id: user.id,
            email: user.primaryEmailAddress?.emailAddress,
            credits: 100,
          }, { onConflict: 'id' });
          if (error) {
            console.error('Supabase upsert error:', error);
          }
        } catch (err) {
          console.error('Supabase upsert exception:', err);
        }
      };
      upsertUser();
    }
  }, [isLoaded, isSignedIn, user]);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setImageUrl(null);
    if (!prompt.trim()) {
      setError('Please enter a prompt.');
      return;
    }
    if (!isSignedIn || !userId) {
      setError('You must be signed in to generate a thumbnail.');
      return;
    }
    if (credits === null || credits < COST_PER_GENERATION) {
      setCreditWarning('You do not have enough credits to generate a thumbnail.');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, aspect_ratio: '16:9' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate');
      if (!Array.isArray(data.images) || typeof data.images[0] !== 'string' || !data.images[0]) {
        setError('No image returned from the API.');
        setImageUrl(null);
      } else {
        setImageUrl(data.images[0]);
        setRefreshHistory(r => r + 1); // trigger sidebar refresh
      }
    } catch (err: any) {
      setError(err.message || 'Error generating. Please try again.');
      setImageUrl(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleEnhancePrompt() {
    setEnhanceError(null);
    setEnhancing(true);
    try {
      const res = await fetch('/api/enhance-prompt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to enhance prompt');
      if (!data.enhancedPrompt || typeof data.enhancedPrompt !== 'string') {
        throw new Error('No enhanced prompt returned from the API.');
      }
      setPrompt(data.enhancedPrompt);
    } catch (err: any) {
      setEnhanceError(err.message || 'Error enhancing prompt. Please try again.');
    } finally {
      setEnhancing(false);
    }
  }

  return (
    <>
      <Head>
        <title>Minglu AI – Thumbnail Generator</title>
      </Head>
      <div className="min-h-screen w-full flex flex-col bg-[#0d0d0d]">
        <div className="flex flex-1 w-full h-full">
          {/* Sidebar: hidden on mobile, visible on md+ */}
          <div className="hidden md:block w-72 flex-shrink-0 h-full">
            <ThumbnailHistorySidebar refreshTrigger={refreshHistory} />
          </div>
          {/* Mobile sidebar toggle and overlay handled inside ThumbnailHistorySidebar */}
          {/* Main content */}
          <div className="flex-1 flex flex-col items-center justify-center px-2 sm:px-4 py-6 sm:py-10">
            {/* Hero Section */}
            <div className="w-full max-w-2xl flex flex-col items-center text-center mb-8 sm:mb-12">
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white mb-2 sm:mb-3 drop-shadow-lg leading-tight">Minglu AI</h1>
              <h2 className="text-lg sm:text-2xl font-semibold text-blue-400 mb-1 sm:mb-2">AI YouTube Thumbnail Generator</h2>
              <p className="text-base sm:text-lg md:text-xl text-gray-300 mb-2 font-medium">Generate stunning thumbnails in seconds with artificial intelligence.</p>
            </div>
            {/* Credit Balance Display */}
            <div className="w-full max-w-xl flex flex-row items-center justify-center mb-4">
              <span className="text-lg font-bold text-blue-400 bg-[#23232a] rounded-xl px-4 py-2 shadow border border-[#23232a]">
                Credits: {credits === null ? '...' : credits}
              </span>
            </div>
            {/* Generator UI */}
            <div className="w-full max-w-xl bg-[#18181b] shadow-2xl rounded-3xl p-4 sm:p-8 flex flex-col gap-8 sm:gap-10 items-center border border-[#23232a]">
              <div className="w-full flex flex-col gap-6">
                <h3 className="text-lg sm:text-2xl font-bold text-white mb-2 text-left">Generate Your YouTube Thumbnail</h3>
                <form onSubmit={handleGenerate} className="flex flex-col gap-4 w-full">
                  <div className="flex flex-col gap-2 w-full">
                    <div className="flex flex-col sm:flex-row gap-2 w-full">
                      <input
                        id="prompt"
                        className="flex-1 rounded-xl border border-[#23232a] bg-[#23232a] px-4 py-3 sm:px-5 sm:py-4 text-base sm:text-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-white placeholder:text-gray-500 font-medium transition min-w-0"
                        placeholder="Describe your thumbnail (e.g. 'A cat with sunglasses, vibrant colors')"
                        value={prompt}
                        onChange={e => setPrompt(e.target.value)}
                        disabled={loading || enhancing}
                        maxLength={300}
                        required
                        autoComplete="off"
                      />
                      <button
                        type="button"
                        onClick={handleEnhancePrompt}
                        disabled={enhancing || loading || !prompt.trim()}
                        className="mt-2 sm:mt-0 sm:ml-2 px-4 py-3 rounded-xl bg-blue-800 hover:bg-blue-700 text-white font-semibold text-base shadow transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 min-w-[44px] min-h-[44px]"
                      >
                        {enhancing ? (
                          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                        ) : (
                          <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                        )}
                        <span className="hidden sm:inline">{enhancing ? 'Enhancing...' : 'Enhance Prompt'}</span>
                      </button>
                    </div>
                    {enhanceError && (
                      <div className="text-red-500 text-xs mt-1 font-medium">{enhanceError}</div>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg shadow-lg transition disabled:opacity-60 disabled:cursor-not-allowed mt-2 min-h-[48px]"
                    disabled={loading || credits === null || credits < COST_PER_GENERATION || !isSignedIn}
                  >
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                        Generating...
                      </span>
                    ) : 'Generate'}
                  </button>
                  {creditWarning && (
                    <div className="text-yellow-400 text-center mt-2 w-full font-medium">{creditWarning}</div>
                  )}
                </form>
              </div>
              {/* Output Section */}
              <div className="w-full flex flex-col items-center gap-4">
                {imageUrl && (
                  <>
                    <h4 className="text-base sm:text-lg font-bold text-white mb-2">Your Generated Thumbnail</h4>
                    <div className="w-full max-w-2xl aspect-[16/9] bg-[#18181b] border border-[#23232a] rounded-2xl flex items-center justify-center overflow-hidden shadow-xl relative min-h-[120px] sm:min-h-[180px] max-h-[220px] sm:max-h-[360px]">
                      <Image
                        src={imageUrl}
                        alt="Generated YouTube Thumbnail"
                        width={1280}
                        height={720}
                        className="w-full h-full object-contain rounded-xl shadow-lg"
                        style={{ objectFit: 'contain' }}
                        priority
                      />
                    </div>
                    {/* Download Button */}
                    <DownloadButton imageUrl={imageUrl} />
                  </>
                )}
                {!imageUrl && (
                  <div className="w-full max-w-2xl aspect-[16/9] bg-[#23232a] border-2 border-dashed border-[#23232a] rounded-2xl flex items-center justify-center overflow-hidden min-h-[120px] sm:min-h-[180px] max-h-[220px] sm:max-h-[360px]">
                    {loading ? (
                      <span className="text-blue-400 text-lg animate-pulse">Generating...</span>
                    ) : (
                      <span className="text-gray-500">Your generated thumbnail will appear here</span>
                    )}
                  </div>
                )}
                {error && (
                  <div className="text-red-500 text-center mt-2 w-full font-medium">{error}</div>
                )}
              </div>
            </div>
            <div className="mt-10 text-center text-gray-600 text-xs">Minglu AI &copy; {new Date().getFullYear()}</div>
          </div>
        </div>
      </div>
    </>
  );
}

function DownloadButton({ imageUrl }: { imageUrl: string }) {
  // Helper to get a timestamp string like 2025-07-16_14-30-00
  function getTimestamp() {
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  }

  const handleDownload = async () => {
    try {
      let blob: Blob;
      if (imageUrl.startsWith('data:')) {
        // Base64 data URL
        const res = await fetch(imageUrl);
        blob = await res.blob();
      } else {
        // Remote URL
        const res = await fetch(imageUrl);
        blob = await res.blob();
      }
      // Always save as PNG
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `thumbnail-${getTimestamp()}.png`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
    } catch (err) {
      alert('Failed to download image.');
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      aria-label="Download generated thumbnail as PNG"
      className="mt-3 px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 focus:bg-blue-700 text-white font-semibold text-base shadow-lg transition focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-[#18181b] active:scale-95"
    >
      Download Thumbnail
    </button>
  );
}
