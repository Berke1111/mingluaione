import { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-08-16' });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { userId, email, plan } = req.body;
  if (!userId || !email || !plan) {
    return res.status(400).json({ error: 'Missing userId, email, or plan' });
  }
  // Only Beginner plan for now
  let priceId = 'price_1RlVEVQDB47VSUORjmdQn7oz';
  if (plan === 'pro') priceId = 'price_pro'; // Replace with your real Pro price ID
  if (plan === 'enterprise') priceId = 'price_enterprise'; // Replace with your real Enterprise price ID
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      customer_email: email,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: 'http://localhost:3000/success',
      cancel_url: 'http://localhost:3000/cancel',
      metadata: {
        user_id: userId,
        plan,
      },
    });
    return res.status(200).json({ url: session.url });
  } catch (err: any) {
    console.error('Stripe checkout error:', err);
    return res.status(500).json({ error: err.message || 'Failed to create Stripe Checkout session' });
  }
} 