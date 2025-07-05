import { authenticateUser, refreshAccessToken, registerUser, logoutUser } from '../services/authServices.js';


const signUp = async (req, res) => {
    try {
        const { firstname, lastname, email,password, phone_number } = req.body;

        const user = await registerUser(firstname, lastname, email, password, phone_number);

        return res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user
        });

    } catch (error) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
};


const login = async (req, res) => {
    try {
        const { phone_number, password } = req.body;
        const { accessToken, refreshToken, outputMessage } = await authenticateUser(phone_number, password);

        return res.status(200).json({ 
            success: true, 
            accessToken, 
            refreshToken, 
            message: outputMessage,
           
        });
    } catch (error) {
        return res.status(401).json({ success: false, message: error.message });
    }
};

const refreshToken = async (req, res) => {
    try {
      const raw = req.body.refreshToken;
      if (!raw) {
        return res
          .status(400)
          .json({ success: false, message: 'Refresh token required' });
      }
  
      const { accessToken, refreshToken: newRefresh } =
        await refreshAccessToken(raw);
  
      return res.status(200).json({
        success: true,
        accessToken,
        refreshToken: newRefresh
      });
    } catch (err) {
      return res
        .status(403)
        .json({ success: false, message: err.message });
    }
  };

const logout = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({ success: false, message: 'Refresh token is required' });
        }

        await logoutUser(refreshToken);

        res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export { login, refreshToken, logout, signUp };
