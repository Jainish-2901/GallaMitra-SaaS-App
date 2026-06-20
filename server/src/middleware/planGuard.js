import { prisma } from '../utils/prisma.js';

export const requirePlanTab = (requiredTab) => async (req, res, next) => {
    try {
        const plan = await prisma.plan.findUnique({
            where: { id: req.shop.plan || '' },
            select: { allowedTabs: true }
        });
        const allowedTabs = plan?.allowedTabs || [];
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
