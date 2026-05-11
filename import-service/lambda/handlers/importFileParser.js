const {
  S3Client,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} = require('@aws-sdk/client-s3');

const csv = require('csv-parser');

const s3 = new S3Client({});

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
      const stream = response.Body;

      await new Promise((resolve, reject) => {
        stream
          .pipe(csv())
          .on('data', (data) => {
            console.log('CSV ROW:', data);
          })
          .on('end', resolve)
          .on('error', reject);
      });

      console.log('CSV parsing finished');

      const parsedKey = key.replace('uploaded/', 'parsed/');

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