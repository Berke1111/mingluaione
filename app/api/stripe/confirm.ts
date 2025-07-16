import { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { userId, email } = req.body;
  if (!userId) {
    return res.status(400).json({ error: 'Missing userId' });
  }
  // For now, always set plan to 'beginner' and credits to 500
  const plan = 'beginner';
  const credits = 500;
  const subscribed_at = new Date().toISOString();
  try {
    const { data, error } = await supabase.from('user_credits').upsert({
      user_id: userId,
      plan,
      credits,
      subscribed_at,
    }, { onConflict: 'user_id' });
    if (error) {
      return res.status(500).json({ error: error.message });
    }
    return res.status(200).json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to update credits' });
  }
} 