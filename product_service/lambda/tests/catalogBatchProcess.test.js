const mockSend = jest.fn();

jest.mock("@aws-sdk/client-dynamodb", () => ({
  DynamoDBClient: jest.fn(),
}));

jest.mock("@aws-sdk/lib-dynamodb", () => ({
  DynamoDBDocumentClient: {
    from: jest.fn(() => ({
      send: mockSend,
    })),
  },
  PutCommand: jest.fn((input) => input),
}));

jest.mock("@aws-sdk/client-sns", () => ({
  SNSClient: jest.fn(() => ({
    send: mockSend,
  })),
  PublishCommand: jest.fn((input) => input),
}));

jest.mock("crypto", () => ({
  randomUUID: jest.fn(() => "test-product-id"),
}));

process.env.PRODUCTS_TABLE = "products";
process.env.STOCKS_TABLE = "stocks";
process.env.CREATE_PRODUCT_TOPIC_ARN =
  "arn:aws:sns:eu-west-1:123456789012:createProductTopic";

const { PutCommand } = require("@aws-sdk/lib-dynamodb");
const { PublishCommand } = require("@aws-sdk/client-sns");
const { handler } = require("../handlers/catalogBatchProcess");

describe("catalogBatchProcess", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSend.mockResolvedValue({});

    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should process SQS record, save to DynamoDB and publish to SNS", async () => {
    const event = {
      Records: [
        {
          body: JSON.stringify({
            title: "test",
            description: "desc",
            price: 100,
            count: 2,
          }),
        },
      ],
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ message: "Products created" });

    expect(mockSend).toHaveBeenCalledTimes(3);

    expect(PutCommand).toHaveBeenCalledWith({
      TableName: "products",
      Item: {
        id: "test-product-id",
        title: "test",
        description: "desc",
        price: 100,
      },
    });

    expect(PutCommand).toHaveBeenCalledWith({
      TableName: "stocks",
      Item: {
        product_id: "test-product-id",
        count: 2,
      },
    });

    expect(PublishCommand).toHaveBeenCalledWith({
      TopicArn: process.env.CREATE_PRODUCT_TOPIC_ARN,
      Subject: "New product created",
      Message: JSON.stringify({
        id: "test-product-id",
        title: "test",
        description: "desc",
        price: 100,
        count: 2,
      }),
      MessageAttributes: {
        price: {
          DataType: "Number",
          StringValue: "100",
        },
      },
    });
  });

  it("should return 500 when DynamoDB fails", async () => {
    mockSend.mockRejectedValueOnce(new Error("DynamoDB error"));

    const result = await handler({
      Records: [{ body: JSON.stringify({ title: "test", price: 1 }) }],
    });

    expect(result.statusCode).toBe(500);
    expect(JSON.parse(result.body)).toEqual({
      message: "Error processing messages",
    });
  });
});
