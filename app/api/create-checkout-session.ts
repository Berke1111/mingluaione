import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { getAuth } from '@clerk/nextjs/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-08-16' });

const PLAN_PRICE_IDS: Record<string, string> = {
  beginner: 'price_1RlVVgQDB47VSUORzMwzinrl', // Provided Price ID
  pro: 'price_pro', // Replace with your real Pro price ID
  enterprise: 'price_enterprise', // Replace with your real Enterprise price ID
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const auth = getAuth(req);
  if (!auth.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const { plan } = req.body;
  if (!plan || !PLAN_PRICE_IDS[plan]) {
    return res.status(400).json({ error: 'Invalid plan' });
  }
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: PLAN_PRICE_IDS[plan],
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/stripe/cancel`,
      metadata: {
        user_id: auth.userId,
        plan,
      },
    });
    return res.status(200).json({ url: session.url });
  } catch (err: any) {
    console.error('Stripe checkout error:', err);
    return res.status(500).json({ error: err.message || 'Failed to create Stripe Checkout session' });
  }
} 