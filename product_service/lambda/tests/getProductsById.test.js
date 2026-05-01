const { handler } = require("../handlers/getProductsById");

describe("getProductsById", () => {
  test("should return product if exists", async () => {
    const event = {
      pathParameters: {
        productId: "1",
      },
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(200);

    const body = JSON.parse(result.body);

    expect(body).toHaveProperty("id", "1");
    expect(body).toHaveProperty("title");
  });

  test("should return 404 if product not found", async () => {
    const event = {
      pathParameters: {
        productId: "999",
      },
    };

    const result = await handler(event);

    expect(result.statusCode).toBe(404);

    const body = JSON.parse(result.body);

    expect(body).toHaveProperty("message");
  });
});