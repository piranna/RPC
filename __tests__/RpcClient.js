import RpcClient from "../lib/RpcClient";

test("No methods", function () {
  const rpcClient = new RpcClient();

  const result = rpcClient.onMessage({ method: "foo" });

  return expect(result).rejects.toMatchInlineSnapshot(`
    Object {
      "code": -32603,
      "message": "Client doesn't accept requests",
    }
  `);
});

test("Method not found", function () {
  const rpcClient = new RpcClient({});

  const result = rpcClient.onMessage({ method: "foo" });

  return expect(result).rejects.toMatchInlineSnapshot(`
    Object {
      "code": -32601,
      "data": "foo",
      "message": "Unknown method 'foo'",
    }
  `);
});

test("Failed method", function () {
  const methods = {
    foo() {
      throw new Error();
    },
  };

  const rpcClient = new RpcClient(methods);

  const request = rpcClient.request("foo");

  return rpcClient
    .onMessage(request)
    .then(function (response) {
      expect(response).toMatchInlineSnapshot(`
        Object {
          "error": Object {
            "code": -32500,
            "data": [Error],
            "message": [Error],
          },
          "id": 0,
          "result": undefined,
        }
      `);

      return rpcClient.onMessage(response);
    })
    .then(function (result) {
      expect(result).toBeUndefined();

      return expect(request).rejects.toMatchInlineSnapshot(`
        Object {
          "code": -32500,
          "data": [Error],
          "message": [Error],
        }
      `);
    });
});

test("Failed notification", function () {
  const methods = {
    foo() {
      const error = new Error();
      error.code = 1234;

      throw error;
    },
  };

  const rpcClient = new RpcClient(methods);

  const notification = rpcClient.notification("foo");

  const result = rpcClient.onMessage(notification);

  return expect(result).rejects.toMatchInlineSnapshot(`[Error]`);
});

test("Unexpected response", function () {
  const rpcClient = new RpcClient();

  const result = rpcClient.onMessage({ id: 0 });

  return expect(result).rejects.toMatchInlineSnapshot(
    `[Error: Received response for unknown request '0']`
  );
});

test("notification with spread params", function () {
  const rpcClient = new RpcClient();

  const notification = rpcClient.notification("foo", "bar");

  expect(notification).toMatchInlineSnapshot(`
    Object {
      "method": "foo",
      "params": Array [
        "bar",
      ],
    }
  `);
});

test("notification with array params", function () {
  const rpcClient = new RpcClient({
    foo() {},
  });

  const notification = rpcClient.notification("foo", ["bar"]);

  return rpcClient.onMessage(notification);
});
