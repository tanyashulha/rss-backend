const stream = require('stream');

const mockSend = jest.fn();

jest.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: jest.fn(() => ({
      send: mockSend,
    })),
    GetObjectCommand: jest.fn(),
  };
});

jest.mock('csv-parser', () => {
  return () => {
    const Transform = require('stream').Transform;

    return new Transform({
      objectMode: true,
      transform(chunk, encoding, callback) {
        callback(null, chunk);
      },
    });
  };
});

const { handler } = require('../lambda/handlers/importFileParser');

describe('importFileParser', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('processes S3 event and parses CSV', async () => {
    const readable = stream.Readable.from([
      'id,name\n',
      '1,apple\n',
      '2,banana\n',
    ]);

    mockSend.mockResolvedValue({
      Body: readable,
    });

    const event = {
      Records: [
        {
          s3: {
            bucket: { name: 'test-bucket' },
            object: { key: 'uploaded/test.csv' },
          },
        },
      ],
    };

    await handler(event);

    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('throws on S3 error', async () => {
    mockSend.mockRejectedValue(new Error('S3 fail'));

    const event = {
      Records: [
        {
          s3: {
            bucket: { name: 'test-bucket' },
            object: { key: 'uploaded/test.csv' },
          },
        },
      ],
    };

    await expect(handler(event)).rejects.toThrow('S3 fail');
  });
});