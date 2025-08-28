const prisma = require("../config/prisma")

function verifyOwnership({ model, idParam = 'id', field = 'userId', allowRoles = ['ADMIN'] }) {
    return async (req, res, next) => {
        try {
            const userId = req.user?.id;
            const role = req.user?.role;

            if (!userId) return res.status(401).json({ error: 'Unauthorized' });

            const resourceId = req.params[idParam];
            const resource = await prisma[model].findUnique({ where: { id: resourceId } });

            if (!resource) return res.status(404).json({ error: 'Resource not found' });

            if (allowRoles.includes(role)) return next();

            if (String(resource[field]) !== String(userId)) {
                return res.status(403).json({ error: 'Forbidden: not your data' });
            }

            next();
        } catch (err) {
            console.error('[verifyOwnership]', err);
            res.status(500).json({ error: 'Internal server error in ownership check' });
        }
    };
}

module.exports = { verifyOwnership };
