import { ObjectId } from 'mongodb';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import path from 'path';
import mime from 'mime-types';
import { Router } from 'express';

/**
 * FilesController class to handle file operations
 */
class FilesController {
  /**
   * Handles the POST /files request to upload a file or create a folder.
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  static async postUpload(req, res) {
    const {
      name, type, parentId, isPublic, data,
    } = req.body;
    const token = req.headers['x-token'];

    // Validate token and user
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const user = await dbClient.db.collection('users').findOne({ _id: ObjectId(userId) });
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // Validate request body
    if (!name) return res.status(400).json({ error: 'Missing name' });
    if (!type || !['folder', 'file', 'image'].includes(type)) return res.status(400).json({ error: 'Missing type' });
    if (!data && type !== 'folder') return res.status(400).json({ error: 'Missing data' });

    // Handle parentId
    let parentFile = null;
    if (parentId) {
      if (parentId !== '0') {
        parentFile = await dbClient.db.collection('files').findOne({ _id: ObjectId(parentId) });
        if (!parentFile) return res.status(400).json({ error: 'Parent not found' });
        if (parentFile.type !== 'folder') return res.status(400).json({ error: 'Parent is not a folder' });
      }
    }

    const newFile = {
      userId: ObjectId(userId),
      name,
      type,
      isPublic: isPublic || false,
      parentId: parentId || 0,
      localPath: null,
    };

    // Handle folder creation
    if (type === 'folder') {
      const result = await dbClient.db.collection('files').insertOne(newFile);
      return res.status(201).json({
        id: result.insertedId,
        userId,
        name,
        type,
        isPublic: newFile.isPublic,
        parentId: newFile.parentId,
      });
    }

    // Handle file/image creation
    const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
    if (!fs.existsSync(folderPath)) fs.mkdirSync(folderPath, { recursive: true });
    const localPath = `${folderPath}/${uuidv4()}`;
    newFile.localPath = localPath;

    await fs.promises.writeFile(localPath, Buffer.from(data, 'base64'));

    const result = await dbClient.db.collection('files').insertOne(newFile);
    return res.status(201).json({
      id: result.insertedId,
      userId,
      name,
      type,
      isPublic: newFile.isPublic,
      parentId: newFile.parentId,
    });
  }

  /**
   * Handles the GET /files/:id request to retrieve file information by ID.
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  static async getShow(req, res) {
    const { id } = req.params;
    const token = req.headers['x-token'];

    // Validate token and user
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(id), userId: ObjectId(userId) });
    if (!file) return res.status(404).json({ error: 'Not found' });

    return res.status(200).json({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
      localPath: file.localPath,
    });
  }

  /**
   * Handles the GET /files request to list files based on parentId and pagination.
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  static async getIndex(req, res) {
    const { parentId = '0', page = 0 } = req.query;
    const token = req.headers['x-token'];

    // Validate token and user
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const files = await dbClient.db.collection('files').aggregate([
      { $match: { parentId, userId: ObjectId(userId) } },
      { $skip: page * 20 },
      { $limit: 20 },
    ]).toArray();

    const response = files.map((file) => ({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: file.isPublic,
      parentId: file.parentId,
      localPath: file.localPath,
    }));

    return res.status(200).json(response);
  }

  /**
   * Handles the PUT /files/:id/publish request to make a file public.
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  static async putPublish(req, res) {
    const { id } = req.params;
    const token = req.headers['x-token'];

    // Validate token and user
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(id), userId: ObjectId(userId) });
    if (!file) return res.status(404).json({ error: 'Not found' });

    await dbClient.db.collection('files').updateOne({ _id: ObjectId(id) }, { $set: { isPublic: true } });

    return res.status(200).json({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: true,
      parentId: file.parentId,
      localPath: file.localPath,
    });
  }

  /**
   * Handles the PUT /files/:id/unpublish request to make a file private.
   * @param {Request} req - Express request object
   * @param {Response} res - Express response object
   */
  static async putUnpublish(req, res) {
    const { id } = req.params;
    const token = req.headers['x-token'];

    // Validate token and user
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(id), userId: ObjectId(userId) });
    if (!file) return res.status(404).json({ error: 'Not found' });

    await dbClient.db.collection('files').updateOne({ _id: ObjectId(id) }, { $set: { isPublic: false } });

    return res.status(200).json({
      id: file._id,
      userId: file.userId,
      name: file.name,
      type: file.type,
      isPublic: false,
      parentId: file.parentId,
      localPath: file.localPath,
    });
  }

  /**
 * Handles the GET /files/:id/data to get the content of a file
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 */
  static async getFile(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user ? req.user._id : null;
    const { size } = req.query;

    if (!ObjectId.isValid(id)) {
      return res.status(404).json({ error: 'Not found' });
    }

    const file = await dbClient.db.collection('files').findOne({ _id: ObjectId(id) });

    if (!file) {
      return res.status(404).json({ error: 'Not found' });
    }

    if (!file.isPublic && (!userId || file.userId.toString() !== userId.toString())) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (file.type === 'folder') {
      return res.status(400).json({ error: "A folder doesn't have content" });
    }

    let localPath = path.join(FOLDER_PATH, file.localPath);

    if (size) {
      const validSizes = ['500', '250', '100'];
      if (!validSizes.includes(size)) {
        return res.status(400).json({ error: 'Invalid size parameter' });
      }
      localPath = `${localPath}_${size}`;
    }

    await fs.promises.access(localPath);

    const mimeType = mime.lookup(file.name) || 'application/octet-stream';
    const fileContent = await fs.promises.readFile(localPath);

    res.setHeader('Content-Type', mimeType);
    return res.status(200).send(fileContent);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
}
