const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client);

const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE;
const STOCKS_TABLE = process.env.STOCKS_TABLE;

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);

    const { title, description, price, count } = body;

    if (!title || price === undefined || count === undefined) {
      return {
        statusCode: 400,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "*",
          "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
        },
        body: JSON.stringify({ message: "Invalid product data" }),
      };
    }

    const id = Date.now().toString();

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
      new PutCommand({
        TableName: PRODUCTS_TABLE,
        Item: product,
      })
    );

    await dynamo.send(
      new PutCommand({
        TableName: STOCKS_TABLE,
        Item: stock,
      })
    );

    return {
      statusCode: 201,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
      },
      body: JSON.stringify({
        ...product,
        count,
      }),
    };
  } catch (err) {
    console.error(err);

    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
      },
      body: JSON.stringify({ message: "Internal Server Error" }),
    };
  }
};