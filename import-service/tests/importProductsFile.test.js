const { handler } = require('../lambda/handlers/importProductsFile');

const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

jest.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: jest.fn(),
    PutObjectCommand: jest.fn(),
  };
});

jest.mock('@aws-sdk/s3-request-presigner', () => {
  return {
    getSignedUrl: jest.fn(),
  };
});

describe('importProductsFile', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    process.env = { ...OLD_ENV };
  });

  afterEach(() => {
    jest.restoreAllMocks();
    process.env = OLD_ENV;
  });

  it('returns 400 if name is missing', async () => {
    const res = await handler({
      queryStringParameters: {},
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).message).toBe(
      'name query param is required'
    );
  });

  it('returns signed url with correct key', async () => {
    process.env.BUCKET_NAME = 'test-bucket';

    getSignedUrl.mockResolvedValue('https://signed-url.com');

    const res = await handler({
      queryStringParameters: { name: 'test.csv' },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body).toBe('https://signed-url.com');

    expect(getSignedUrl).toHaveBeenCalledTimes(1);

    expect(process.env.BUCKET_NAME).toBe('test-bucket');
  });

  it('calls S3 PutObjectCommand with correct params', async () => {
    process.env.BUCKET_NAME = 'test-bucket';

    getSignedUrl.mockResolvedValue('https://signed-url.com');

    await handler({
      queryStringParameters: { name: 'test.csv' },
    });

    expect(PutObjectCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        Bucket: 'test-bucket',
        Key: 'uploaded/test.csv',
      })
    );
  });

  it('returns 500 on error', async () => {
    process.env.BUCKET_NAME = 'test-bucket';

    getSignedUrl.mockRejectedValue(new Error('fail'));

    const res = await handler({
      queryStringParameters: { name: 'test.csv' },
    });

    expect(res.statusCode).toBe(500);
    expect(JSON.parse(res.body).message).toBe(
      'Internal Server Error'
    );
  });

  it('handles null event gracefully', async () => {
    const res = await handler({});

    expect(res.statusCode).toBe(400);
  });
});