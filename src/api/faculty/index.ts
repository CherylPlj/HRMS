// pages/api/faculty/index.ts

import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);


const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const faculty = await prisma.Faculty.findMany();
      res.status(200).json(faculty);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    catch (error) {
      res.status(500).json({ error: 'Failed to fetch faculty data' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
