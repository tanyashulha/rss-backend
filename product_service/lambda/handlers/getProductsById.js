const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const {
  DynamoDBDocumentClient,
  GetCommand,
} = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client);

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE;
const STOCKS_TABLE = process.env.STOCKS_TABLE;

exports.handler = async (event) => {
  try {
    console.log("Incoming event:", JSON.stringify(event));

    const productId = event.pathParameters?.productId;

    if (!productId) {
      return {
        statusCode: 400,
        headers: corsHeaders(),
        body: JSON.stringify({ message: "productId is required" }),
      };
    }

    const productResult = await dynamo.send(
      new GetCommand({
        TableName: PRODUCTS_TABLE,
        Key: { id: productId },
      })
    );

    const product = productResult.Item;

    if (!product) {
      return {
        statusCode: 404,
        headers: corsHeaders(),
        body: JSON.stringify({ message: "Product not found" }),
      };
    }

    const stockResult = await dynamo.send(
      new GetCommand({
        TableName: STOCKS_TABLE,
        Key: { product_id: productId },
      })
    );

    const stock = stockResult.Item;

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify({
        ...product,
        count: stock ? stock.count : 0,
      }),
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