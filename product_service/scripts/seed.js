const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient, PutCommand } = require("@aws-sdk/lib-dynamodb");

const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client);

const PRODUCTS_TABLE = "products";
const STOCKS_TABLE = "stocks";

const products = [
  {
    id: "1",
    title: "Product 1",
    description: "Super Product 1",
    price: 500
  },
  {
    id: "2",
    title: "Product 2",
    description: "Super Product 2",
    price: 1200
  }
];

const stocks = [
  {
    product_id: "1",
    count: 15
  },
  {
    product_id: "2",
    count: 5
  }
];

async function seed() {
  for (const p of products) {
    await dynamo.send(new PutCommand({
      TableName: PRODUCTS_TABLE,
      Item: p
    }));
  }

  for (const s of stocks) {
    await dynamo.send(new PutCommand({
      TableName: STOCKS_TABLE,
      Item: s
    }));
  }

  console.log("Seed completed");
}

seed();