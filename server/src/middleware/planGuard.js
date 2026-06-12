import { db } from '../db.js';

export const requirePlanTab = (requiredTab) => async (req, res, next) => {
    try {
        const planRes = await db.query(
            'SELECT "allowedTabs" FROM "Plan" WHERE id = $1',
            [req.shop.plan]
        );
        const allowedTabs = planRes.rows[0]?.allowedTabs || [];
        if (!allowedTabs.includes(requiredTab)) {
            return res.status(403).json({
                error: `Your current plan does not include access to this feature (${requiredTab}).`
            });
        }
        next();
    } catch (error) {
        console.error('Plan guard error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
