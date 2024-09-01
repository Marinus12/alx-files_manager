import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

class DBClient {
  constructor() {
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || 27017;
    const database = process.env.DB_DATABASE || 'files_manager';

    const url = `mongodb://${host}:${port}`;
    this.client = new MongoClient(url, { useUnifiedTopology: true });
    this.client.connect().catch((err) => console.error('Failed to connect to MongoDB:', err));
    this.db = this.client.db(database);
  }

  isAlive() {
    // Check connection status (not directly available, but can check the server pool state)
    return this.client.topology && this.client.topology.s.server && this.client.topology.s.server.s.pool && this.client.topology.s.server.s.pool.s.poolState === 'connected';
  }

  async nbUsers() {
    return this.db.collection('users').countDocuments();
  }

  async nbFiles() {
    return this.db.collection('files').countDocuments();
  }
}

const dbClient = new DBClient();
export default dbClient;
