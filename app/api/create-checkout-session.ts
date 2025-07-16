import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { getAuth } from '@clerk/nextjs/server';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2025-06-30.basil' });

const PLAN_PRICE_IDS: Record<string, string> = {
  beginner: 'price_1RlVVgQDB47VSUORzMwzinrl',
  pro: 'price_pro',
  enterprise: 'price_enterprise',
};

interface CreateCheckoutSessionBody {
  plan: string;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const auth = getAuth(req);
  if (!auth.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  let plan: string;
  try {
    // If using Next.js API routes with bodyParser: true, req.body is already parsed
    // If using bodyParser: false, you need to parse the body yourself
    const body = req.body as CreateCheckoutSessionBody;
    plan = body.plan;
  } catch {
    return res.status(400).json({ error: 'Invalid request body' });
  }
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
  } catch (err: unknown) {
    if (err instanceof Error) {
      console.error('Stripe checkout error:', err);
      return res.status(500).json({ error: err.message || 'Failed to create Stripe Checkout session' });
    }
    console.error('Stripe checkout error:', err);
    return res.status(500).json({ error: 'Failed to create Stripe Checkout session' });
  }
} 