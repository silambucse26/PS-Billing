import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabaseAdmin';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email?: string | null;
    role: string;
    shop_id: string | null;
    franchise_id: string | null;
  };
}

export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }

    // Fetch user profile to get role and shop_id
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('role, shop_id, franchise_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      return res.status(401).json({ error: 'Unauthorized: Profile not found' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: profile.role,
      shop_id: profile.shop_id,
      franchise_id: profile.franchise_id
    };

    next();
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
