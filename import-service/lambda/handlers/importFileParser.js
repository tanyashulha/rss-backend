const {
  S3Client,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');

const csv = require('csv-parser');
const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');

const s3 = new S3Client({ region: process.env.AWS_REGION });
const sqs = new SQSClient({ region: process.env.AWS_REGION });

const QUEUE_URL = process.env.SQS_URL;

exports.handler = async (event) => {
  console.log('EVENT:', JSON.stringify(event));

  try {
    for (const record of event.Records) {
      const bucket = record.s3.bucket.name;
      const key = decodeURIComponent(
        record.s3.object.key.replace(/\+/g, ' ')
      );

      console.log('BUCKET:', bucket);
      console.log('KEY:', key);

      const getCommand = new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      });

      const response = await s3.send(getCommand);

      if (!response.Body) {
        throw new Error('Empty S3 response body');
      }

      const stream = response.Body;

     const rows = [];

      await new Promise((resolve, reject) => {
        response.Body
          .pipe(csv())
          .on('data', (data) => rows.push(data))
          .on('end', resolve)
          .on('error', reject);
      });

      console.log('ROWS COUNT:', rows.length);

      for (const row of rows) {
        await sqs.send(
          new SendMessageCommand({
            QueueUrl: QUEUE_URL,
            MessageBody: JSON.stringify(row),
          })
        );
      }

      console.log('CSV parsing finished');

      const parsedKey = key.startsWith('uploaded/')
        ? key.replace('uploaded/', 'parsed/')
        : `parsed/${key}`;

      await s3.send(
        new CopyObjectCommand({
          Bucket: bucket,
          CopySource: `${bucket}/${key}`,
          Key: parsedKey,
        })
      );

      console.log(`Copied to parsed: ${parsedKey}`);

      await s3.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: key,
        })
      );

      console.log(`Deleted original file: ${key}`);
    }
  } catch (err) {
    console.error('ERROR:', err);
    throw err;
  }
};