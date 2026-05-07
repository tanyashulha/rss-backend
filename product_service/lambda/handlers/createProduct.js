const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, TransactWriteCommand } = require("@aws-sdk/lib-dynamodb");
const { randomUUID } = require("crypto");

const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client);

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE;
const STOCKS_TABLE = process.env.STOCKS_TABLE;

exports.handler = async (event) => {
  try {
    console.log("Incoming event:", JSON.stringify(event));

    const body = JSON.parse(event.body || "{}");
    console.log("Body:", body);

    const { title, description, price, count } = body;

    if (!title ||
        typeof title !== "string" ||
        !description ||
        typeof price !== "number" ||
        price < 0 ||
        typeof count !== "number" ||
        count < 0) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ message: "Invalid product data" }),
      };
    }

    const id = randomUUID();

    const product = {
      id,
      title,
      description,
      price,
    };

    const stock = {
      product_id: id,
      count,
    };

    await dynamo.send(
      new TransactWriteCommand({
        TransactItems: [
          {
            Put: {
              TableName: PRODUCTS_TABLE,
              Item: product,
            },
          },
          {
            Put: {
              TableName: STOCKS_TABLE,
              Item: stock,
            },
          },
        ],
      })
    );

    return {
      statusCode: 201,
      headers: corsHeaders(),
      body: JSON.stringify({ ...product, count }),
    };
  } catch (err) {
    console.error("ERROR:", err);

    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
  };
}