import jwt from 'jsonwebtoken';

const getSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        if (process.env.NODE_ENV === 'production') {
            throw new Error('JWT_SECRET environment variable is required in production.');
        }
        return 'gallamitra-dev-secret-change-me';
    }
    return secret;
};

export const signShopToken = (shop) => {
    return jwt.sign(
        { type: 'shop', shopId: shop.id, email: shop.email?.toLowerCase?.() || shop.email },
        getSecret(),
        { expiresIn: process.env.JWT_SHOP_EXPIRY || '7d' }
    );
};

export const verifyShopToken = (token) => {
    const payload = jwt.verify(token, getSecret());
    if (payload.type !== 'shop') throw new Error('Invalid token type');
    return payload;
};

export const signPortalToken = (partyId, role, shopId) => {
    return jwt.sign(
        { type: 'portal', partyId, role, shopId },
        getSecret(),
        { expiresIn: process.env.JWT_PORTAL_EXPIRY || '30d' }
    );
};

export const verifyPortalToken = (token) => {
    const payload = jwt.verify(token, getSecret());
    if (payload.type !== 'portal') throw new Error('Invalid token type');
    return payload;
};
