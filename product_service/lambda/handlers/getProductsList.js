const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client);

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE;
const STOCKS_TABLE = process.env.STOCKS_TABLE;

exports.handler = async (event) => {
  try {
    console.log("GET /products");

    const [productsResult, stocksResult] = await Promise.all([
      dynamo.send(new ScanCommand({ TableName: PRODUCTS_TABLE })),
      dynamo.send(new ScanCommand({ TableName: STOCKS_TABLE })),
    ]);

    const products = productsResult.Items || [];
    const stocks = stocksResult.Items || [];

    console.log("products:", products);
    console.log("stocks:", stocks);

    const merged = products.map((p) => {
      const stock = stocks.find((s) => s.product_id === p.id);

      return {
        ...p,
        count: stock ? stock.count : 0,
      };
    });

    return {
      statusCode: 200,
      headers: corsHeaders(),
      body: JSON.stringify(merged),
    };
  } catch (err) {
    console.error("ERROR:", err);

    return {
      statusCode: 500,
      headers: corsHeaders(),
      body: JSON.stringify({ message: "Internal server error" }),
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