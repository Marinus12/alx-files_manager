import Queue from 'bull';
import imgThumbnail from 'image-thumbnail';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import redisClient from '../utils/redis';


const imageThumbnail = require('image-thumbnail');

const fileQueue = new Queue('fileQueue');
const userQueue = new Queue('userQueue');

fileQueue.process(async (job) => {
  const { fileId, userId } = job.data;

if (!fileId) {
	console.log('missing filedId');
	throw new Error('Missing fileId');
  }

if (!userId) {
        console.log('missing userId');
        throw new Error('Missing userId');
  }

const file = await File.findOne({ _id: fileId, userId });
  if (!file) 
	console.log('File not found');
	throw new Error('File not found');

  try {
    const options = { width: 500 };
    const thumbnail500 = await imageThumbnail(file.path, options);
    // Save thumbnail500 to the same location with _500 appended

    options.width = 250;
    const thumbnail250 = await imageThumbnail(file.path, options);
    // Save thumbnail250 to the same location with _250 appended

    options.width = 100;
    const thumbnail100 = await imageThumbnail(file.path, options);
    // Save thumbnail100 to the same location with _100 appended

    done();
  } catch (error) {
    done(error);
  }
});
