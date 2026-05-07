const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, ScanCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client);

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE;
const STOCKS_TABLE = process.env.STOCKS_TABLE;

exports.handler = async () => {
  try {
    const [productsResult, stocksResult] = await Promise.all([
      dynamo.send(new ScanCommand({ TableName: PRODUCTS_TABLE })),
      dynamo.send(new ScanCommand({ TableName: STOCKS_TABLE }))
    ]);

    const products = productsResult.Items;
    const stocks = stocksResult.Items;

    const merged = products.map(p => {
      const stock = stocks.find(s => s.product_id === p.id);

      return {
        ...p,
        count: stock ? stock.count : 0
      };
    });

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify(merged)
    };
  } catch (err) {
    console.log("ERROR:", err);

    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Internal server error" })
    };
  }
};