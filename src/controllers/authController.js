import { authenticateUser, refreshAccessToken } from '../services/authService.js';

const login = async (req, res) => {
    try {
        const { phone_number, password } = req.body;
        const { accessToken, refreshToken } = await authenticateUser(phone_number, password);

        return res.status(200).json({ success: true, accessToken, refreshToken });
    } catch (error) {
        return res.status(401).json({ success: false, message: error.message });
    }
};

const refreshToken = async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(403).json({ success: false, message: 'Refresh token required' });
        }

        const refreshToken = authHeader.split(' ')[1];
        const newAccessToken = await refreshAccessToken(refreshToken);

        return res.status(200).json({ success: true, accessToken: newAccessToken });
    } catch (error) {
        return res.status(403).json({ success: false, message: error.message });
    }
};

const logout = async (req, res) => {
    return res.status(200).json({ success: true, message: 'Logged out successfully' });
};

export { login, refreshToken, logout };
