"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const supabaseAdmin_1 = require("../config/supabaseAdmin");
async function requireAuth(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Unauthorized: No token provided' });
        }
        const token = authHeader.split(' ')[1];
        const { data: { user }, error } = await supabaseAdmin_1.supabaseAdmin.auth.getUser(token);
        if (error || !user) {
            return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }
        // Fetch user profile to get role and shop_id
        const { data: profile, error: profileError } = await supabaseAdmin_1.supabaseAdmin
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
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
}
