import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-06-30.basil' });
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const PRICE_CREDITS: Record<string, number> = {
  price_xxx_starter: 500,
  price_xxx_pro: 1000,
  price_xxx_enterprise: 10000,
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
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(chunk);
    }
    const rawBody = Buffer.concat(chunks);
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('Webhook signature verification failed:', err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    console.error('Webhook signature verification failed:', err);
    return res.status(400).send('Webhook Error: Unknown error');
  }
  console.log('Received Stripe event:', event.type);

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const user_id = session.metadata?.user_id;
    const stripe_customer_id = session.customer as string;
    const subscription_id = session.subscription as string;
    let price_id = '';
    let credits = 0;
    const status = 'active';
    // Try to get price_id from session.items or session.display_items or session.line_items
    if ((session as unknown as Record<string, unknown>).items && (session as unknown as { items?: { data?: { price?: { id?: string } }[] } }).items?.data?.[0]?.price?.id) {
      price_id = (session as unknown as { items: { data: { price?: { id?: string } }[] } }).items.data[0].price?.id || '';
    } else if ((session as unknown as Record<string, unknown>).display_items && (session as unknown as { display_items?: { plan?: { id?: string } }[] }).display_items?.[0]?.plan?.id) {
      price_id = (session as unknown as { display_items: { plan?: { id?: string } }[] }).display_items[0].plan?.id || '';
    } else if ((session as unknown as Record<string, unknown>).line_items && (session as unknown as { line_items?: { data?: { price?: { id?: string } }[] } }).line_items?.data?.[0]?.price?.id) {
      price_id = (session as unknown as { line_items: { data: { price?: { id?: string } }[] } }).line_items.data[0].price?.id || '';
    } else if ((session as unknown as Record<string, unknown>).amount_total) {
      // fallback: try to get from subscription
      if (subscription_id) {
        try {
          const subscription = await stripe.subscriptions.retrieve(subscription_id);
          price_id = (subscription.items.data[0]?.price?.id) || '';
        } catch (err: unknown) {
          if (err instanceof Error) {
            console.error('Failed to fetch subscription for price_id:', err.message);
          } else {
            console.error('Failed to fetch subscription for price_id:', err);
          }
        }
      }
    }
    credits = PRICE_CREDITS[price_id] || 0;
    if (!user_id || !stripe_customer_id || !subscription_id || !price_id || credits === 0) {
      console.error('Missing required info for subscription/credits:', { user_id, stripe_customer_id, subscription_id, price_id, credits });
      return res.status(400).json({ error: 'Missing required info for subscription/credits' });
    }
    // Upsert into subscriptions table
    const { error: subError } = await supabase.from('subscriptions').upsert({
      user_id,
      stripe_customer_id,
      subscription_id,
      price_id,
      status,
      created_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });
    if (subError) {
      console.error('Supabase subscriptions upsert error:', subError);
      return res.status(500).json({ error: 'Supabase subscriptions upsert error' });
    }
    // Add credits to user_credits table
    const { data: creditsData, error: creditsError } = await supabase
      .from('user_credits')
      .select('credits')
      .eq('user_id', user_id)
      .single();
    let newCredits = credits;
    if (creditsData && typeof creditsData.credits === 'number') {
      newCredits += creditsData.credits;
    }
    const { error: upsertError } = await supabase.from('user_credits').upsert({
      user_id,
      credits: newCredits,
    }, { onConflict: 'user_id' });
    if (upsertError) {
      console.error('Supabase user_credits upsert error:', upsertError);
      return res.status(500).json({ error: 'Supabase user_credits upsert error' });
    }
    console.log('Subscription and credits updated for user:', user_id, { price_id, credits: newCredits });
  }
  res.status(200).json({ received: true });
} 