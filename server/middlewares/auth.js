const jwt = require('jsonwebtoken');

const authMiddleware = (secretEnvVar) => {
    return (req, res, next) => {
        let token = null;

        // Tenta ler o cookie do admin se for o middleware do admin
        if (secretEnvVar === 'ADMIN_JWT_SECRET' && req.cookies && req.cookies.gatti_admin_token) {
            token = req.cookies.gatti_admin_token;
        }

        if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
            token = req.headers.authorization.split(' ')[1];
        } else if (!token && req.query.token) {
            token = req.query.token;
        }

        if (!token) {
            return res.status(401).json({ error: 'Acesso negado. Token não fornecido.' });
        }

        try {
            const secret = process.env[secretEnvVar];
            const decoded = jwt.verify(token, secret);
            req.user = decoded; 
            next();
        } catch (error) {
            return res.status(401).json({ error: 'Token inválido ou expirado.' });
        }
    };
};

module.exports = {
    authFuncionario: authMiddleware('JWT_SECRET'),
    authAdmin: authMiddleware('ADMIN_JWT_SECRET')
};
