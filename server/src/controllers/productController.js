import { prisma } from '../utils/prisma.js';
import { logActivity } from '../activityLogger.js';

// 1. Create a Product
export const createProduct = async (req, res) => {
    const { shopId, name, price, description } = req.body;

    if (!shopId || !name) {
        return res.status(400).json({ error: "Shop ID and Product Name are required fields!" });
    }

    try {
        const product = await prisma.product.create({
            data: {
                shopId,
                name,
                price: price !== undefined ? parseFloat(price || 0.00) : 0.00,
                description: description || null
            }
        });

        await logActivity(shopId, 'PRODUCT_ADDED', 'Owner', `Product "${name}" added to list`);

        res.status(201).json(product);
    } catch (error) {
        console.error('🚨 Error creating product:', error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// 2. Fetch all Products for a Shop
export const getProducts = async (req, res) => {
    const { shopId } = req.params;

    try {
        const result = await prisma.product.findMany({
            where: { shopId },
            orderBy: { createdAt: 'desc' }
        });
        res.json(result);
    } catch (error) {
        console.error('🚨 Error fetching products:', error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// 3. Update a Product
export const updateProduct = async (req, res) => {
    const { id } = req.params;
    const { name, price, description } = req.body;

    try {
        const existing = await prisma.product.findUnique({
            where: { id }
        });
        if (!existing) {
            return res.status(404).json({ error: "Product not found" });
        }

        const product = await prisma.product.update({
            where: { id },
            data: {
                name: name !== undefined ? name : undefined,
                price: price !== undefined ? parseFloat(price || 0.00) : undefined,
                description: description !== undefined ? description : undefined,
                updatedAt: new Date()
            }
        });

        await logActivity(product.shopId, 'PRODUCT_UPDATED', 'Owner', `Product "${product.name}" updated`);

        res.json(product);
    } catch (error) {
        console.error('🚨 Error updating product:', error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};

// 4. Delete a Product (Hard Delete)
export const deleteProduct = async (req, res) => {
    const { id } = req.params;

    try {
        const existing = await prisma.product.findUnique({
            where: { id }
        });
        if (!existing) {
            return res.status(404).json({ error: "Product not found" });
        }

        await prisma.product.delete({
            where: { id }
        });

        await logActivity(existing.shopId, 'PRODUCT_REMOVED', 'Owner', `Product "${existing.name}" removed from registry`);

        res.json({ message: "Product permanently removed from lists." });
    } catch (error) {
        console.error('🚨 Error deleting product:', error);
        res.status(500).json({ error: "Internal Server Error" });
    }
};
