"use client";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function StripeSuccessPage() {
  const { user, isLoaded, isSignedIn } = useUser();
  const [credits, setCredits] = useState<number | null>(null);
  const [plan, setPlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn || !user) {
      setError('You must be signed in to view your subscription.');
      setLoading(false);
      return;
    }
    const fetchCredits = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('user_credits')
          .select('credits, plan')
          .eq('user_id', user.id)
          .single();
        if (error) throw error;
        setCredits(data.credits);
        setPlan(data.plan);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch credits');
      } finally {
        setLoading(false);
      }
    };
    fetchCredits();
  }, [isLoaded, isSignedIn, user]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0d0d0d] text-white">
      <div className="bg-[#18181b] rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-[#23232a]">
        <h1 className="text-2xl font-bold mb-4">Subscription Successful!</h1>
        {loading && <p className="text-blue-400">Loading your subscription...</p>}
        {error && <p className="text-red-500">{error}</p>}
        {!loading && !error && (
          <>
            <p className="text-green-400 mb-2">Your subscription is now active.</p>
            <p className="text-gray-300 mb-4">Plan: <span className="font-bold text-blue-400">{plan ? plan.charAt(0).toUpperCase() + plan.slice(1) : "Unknown"}</span></p>
            <p className="text-gray-300 mb-4">Credits: <span className="font-bold text-blue-400">{credits ?? 'Unknown'}</span></p>
            <a href="/" className="inline-block mt-4 px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold text-base shadow-lg transition focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-[#18181b]">Go to App</a>
          </>
        )}
      </div>
    </div>
  );
} 