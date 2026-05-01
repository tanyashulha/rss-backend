const products = require("../data/products");

exports.handler = async (event) => {
  const { productId } = event.pathParameters;

  const product = products.find(p => p.id === productId);

  if (!product) {
    return {
      statusCode: 404,
      headers: {
        "Access-Control-Allow-Origin": "*"
      },
      body: JSON.stringify({
        message: "Product not found"
      })
    };
  }

  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*"
    },
    body: JSON.stringify(product)
  };
};