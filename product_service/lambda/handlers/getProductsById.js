const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, GetCommand, ScanCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client);

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE;
const STOCKS_TABLE = process.env.STOCKS_TABLE;

exports.handler = async (event) => {
  try {
    const { productId } = event.pathParameters;

    // 1. get product
    const productResult = await dynamo.send(
      new GetCommand({
        TableName: PRODUCTS_TABLE,
        Key: { id: productId }
      })
    );

    const product = productResult.Item;

    if (!product) {
      return {
        statusCode: 404,
        headers: {
          "Access-Control-Allow-Origin": "*"
        },
        body: JSON.stringify({ message: "Product not found" })
      };
    }

    // 2. get stock (because stocks table uses product_id as PK)
    const stockResult = await dynamo.send(
      new GetCommand({
        TableName: STOCKS_TABLE,
        Key: { product_id: productId }
      })
    );

    const stock = stockResult.Item;

    // 3. join result
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        ...product,
        count: stock ? stock.count : 0
      })
    };

  } catch (err) {
    console.log("ERROR:", err);

    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error" })
    };
  }
};