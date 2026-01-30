
import { Router } from 'express';
import { getUser } from './userStorage.js';

const router = Router();

router.get('/check-admin', async (req, res) => {
    try {
        const email = 'alankoshy.12@gmail.com';
        const user = await getUser(email);
        res.json({
            checkedEmail: email,
            found: !!user,
            role: user?.role,
            fullProfile: user
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
