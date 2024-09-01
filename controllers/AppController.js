import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class AppController {
    static getStatus(req, res) {
        // Check if Redis and MongoDB are alive
        const status = {
            redis: redisClient.isAlive(),
            db: dbClient.isAlive(),
        };
        res.status(200).json(status);
    }

    static async getStats(req, res) {
        // Get the number of users and files from the database
        const stats = {
            users: await dbClient.nbUsers(),
            files: await dbClient.nbFiles(),
        };
        res.status(200).json(stats);
    }
}

export default AppController;
