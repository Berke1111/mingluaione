"use client";
import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function SubscriptionSuccessPage() {
  const { user, isLoaded } = useUser();
  const [status, setStatus] = useState("pending");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !user) return;
    const upsertSubscription = async () => {
      setStatus("pending");
      setError(null);
      try {
        const renewalDate = new Date();
        renewalDate.setMonth(renewalDate.getMonth() + 1);
        const { data, error } = await supabase.from("subscriptions").upsert({
          user_id: user.id,
          plan: "beginner",
          credits_total: 500,
          credits_remaining: 500,
          renewal_date: renewalDate.toISOString(),
        }, { onConflict: "user_id" });
        console.log('Supabase upsert result:', { data, error });
        if (error) throw error;
        setStatus("success");
      } catch (err: any) {
        setError(err.message || "Failed to update subscription.");
        setStatus("error");
      }
    };
    upsertSubscription();
  }, [isLoaded, user]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#0d0d0d] text-white">
      <div className="bg-[#18181b] rounded-2xl shadow-xl p-8 max-w-md w-full text-center border border-[#23232a]">
        <h1 className="text-2xl font-bold mb-4">Subscription Successful!</h1>
        {status === "pending" && <p className="text-blue-400">Activating your subscription...</p>}
        {status === "success" && <>
          <p className="text-green-400 mb-2">Your Beginner plan is now active.</p>
          <p className="text-gray-300 mb-4">You have 500 credits. Enjoy generating thumbnails!</p>
          <a href="/" className="inline-block mt-4 px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold text-base shadow-lg transition focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 focus:ring-offset-[#18181b]">Go to App</a>
        </>}
        {status === "error" && <p className="text-red-500">{error}</p>}
      </div>
    </div>
  );
} 