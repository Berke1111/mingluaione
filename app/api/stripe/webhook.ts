import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-06-30.basil' });
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PLAN_CREDITS: Record<string, number> = {
  beginner: 500,
  pro: 1000,
  enterprise: 10000,
};

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }
  const sig = req.headers['stripe-signature'] as string;
  let event;
  try {
    const chunks = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks);
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
  console.log('Received Stripe event:', event.type);
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const user_id = session.metadata?.user_id;
    const plan = session.metadata?.plan || 'beginner';
    const credits = PLAN_CREDITS[plan] || 500;
    const subscribed_at = new Date().toISOString();
    if (user_id) {
      const { data, error } = await supabase.from('user_credits').upsert({
        user_id,
        plan,
        credits,
        subscribed_at,
      }, { onConflict: 'user_id' });
      console.log('Supabase upsert result:', { data, error });
      if (error) {
        return res.status(500).send('Supabase error');
      }
    }
  }
  res.status(200).json({ received: true });
} 