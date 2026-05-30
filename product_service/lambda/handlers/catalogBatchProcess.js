const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { randomUUID } = require("crypto");

const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");

const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client);

const sns = new SNSClient({});

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE;
const STOCKS_TABLE = process.env.STOCKS_TABLE;

const TOPIC_ARN = process.env.CREATE_PRODUCT_TOPIC_ARN;

exports.handler = async (event) => {
  console.log("EVENT:", JSON.stringify(event));

  try {
    for (const record of event.Records) {
      const data = JSON.parse(record.body);

      console.log("PARSED DATA:", data);

      const productId = randomUUID();

      await dynamo.send(
        new PutCommand({
          TableName: PRODUCTS_TABLE,
          Item: {
            id: productId,
            title: data.title,
            description: data.description,
            price: data.price,
          },
        })
      );

      await dynamo.send(
        new PutCommand({
          TableName: STOCKS_TABLE,
          Item: {
            product_id: productId,
            count: data.count ?? 1,
          },
        })
      );

      const price = Number(data.price);

      await sns.send(
        new PublishCommand({
          TopicArn: TOPIC_ARN,
          Subject: "New product created",
          Message: JSON.stringify({
            id: productId,
            ...data,
            price,
          }),
          MessageAttributes: {
            price: {
              DataType: "Number",
              StringValue: String(price),
            },
          },
        })
      );
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Products created" }),
    };
  } catch (err) {
    console.error("ERROR:", err);

    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Error processing messages" }),
    };
  }
};