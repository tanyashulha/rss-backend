const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");
const { randomUUID } = require("crypto");

const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client);

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE;
const STOCKS_TABLE = process.env.STOCKS_TABLE;

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