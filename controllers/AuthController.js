import { v4 as uuidv4 } from 'uuid';
import sha1 from 'sha1';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';

class AuthController {
  static async getConnect(req, res) {
    const authHeader = req.headers.authorization || '';
    const [authType, token] = authHeader.split(' ');

    if (authType !== 'Basic') return res.status(401).json({ error: 'Unauthorized' });

    const decoded = Buffer.from(token, 'base64').toString('utf8');
    const [email, password] = decoded.split(':');

    const hashedPassword = sha1(password);
    const user = await dbClient.db.collection('users').findOne({ email, password: hashedPassword });

    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const authToken = uuidv4();
    await redisClient.set(`auth_${authToken}`, user._id.toString(), 24 * 60 * 60); // 24 hours expiration

    res.status(200).json({ token: authToken });
  }

  static async getDisconnect(req, res) {
    const token = req.headers['x-token'];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    await redisClient.del(`auth_${token}`);
    res.status(204).send();
  }
}

export default AuthController;
