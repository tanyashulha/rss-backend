const stream = require('stream');

const mockSend = jest.fn();

jest.mock('@aws-sdk/client-s3', () => {
  return {
    S3Client: jest.fn(() => ({
      send: mockSend,
    })),
    GetObjectCommand: jest.fn(),
    CopyObjectCommand: jest.fn(),
    DeleteObjectCommand: jest.fn(),
  };
});

jest.mock('csv-parser', () => {
  return () => {
    const { Transform } = require('stream');

    return new Transform({
      objectMode: true,
      transform(chunk, enc, cb) {
        cb(null, chunk);
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

  it('processes CSV and moves file to parsed folder', async () => {
    const readable = stream.Readable.from([
      'id,name\n',
      '1,apple\n',
      '2,banana\n',
    ]);

    mockSend
      .mockResolvedValueOnce({ Body: readable })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

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

    expect(mockSend).toHaveBeenCalledTimes(3);
  });

  it('throws error when S3 fails', async () => {
    mockSend.mockRejectedValue(new Error('S3 error'));

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

    await expect(handler(event)).rejects.toThrow('S3 error');
  });
});