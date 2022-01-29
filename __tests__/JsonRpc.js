import JsonRpc from "@piranna/rpc/JsonRpc";

test("basic", function () {
  const methods = {
    foo() {
      return "bar";
    },
  };

  const jsonRpc = new JsonRpc(methods);

  const request = jsonRpc.request("foo", function (error, result) {
    expect(error).toBeFalsy();
    expect(result).toBe("bar");

    return "bar 2";
  });

  expect(request.valueOf()).toEqual('{"id":0,"jsonrpc":"2.0","method":"foo"}');
  expect(request.then).toBeInstanceOf(Function);

  return Promise.all([
    jsonRpc
    .onMessage(request)
    .then(function (response) {
      expect(response.valueOf()).toEqual('{"id":0,"jsonrpc":"2.0","result":"bar"}');

      const result = jsonRpc.onMessage(response);

      return expect(result).resolves.toBeUndefined();
    }),
    expect(request).resolves.toBe("bar 2")
  ])
});

describe("onMessage", function () {
  test("Invalid JsonRPC version 'undefined'", function () {
    const jsonRpc = new JsonRpc();

    return jsonRpc.onMessage('{"id": 0}')
    .then(function (result) {
      expect(result.valueOf()).toEqual(
        '{"error":{"code":-32600,"message":"Invalid JsonRPC version \'undefined\'"},"id":0,"jsonrpc":"2.0"}'
      );
    })
  });

  test("Invalid JsonRPC version 'undefined' no id", function () {
    const jsonRpc = new JsonRpc();

    return jsonRpc.onMessage('{}')
    .then(function(result) {
      expect(result.valueOf()).toEqual(
        '{"error":{"code":-32600,"message":"Invalid JsonRPC version \'undefined\'"},"id":null,"jsonrpc":"2.0"}'
      );
    })
  });

  describe("Invalid JSON", function () {
    test("hide full errors", function () {
      const jsonRpc = new JsonRpc();

      return jsonRpc.onMessage("foo")
      .then(function(result) {
        expect(JSON.parse(result)).toMatchObject(
          {
            error: {
              code: -32700,
              data: expect.stringMatching(
                /^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/
              ),
              message: "Invalid JSON"
            },
            id: null,
            jsonrpc: "2.0"
          }
        );
      })
    });

    test("send full errors", function () {
      const jsonRpc = new JsonRpc(null, {sendFullErrors: true});

      return jsonRpc.onMessage("foo")
      .then(function(result) {
        expect(JSON.parse(result)).toMatchObject(
          {
            error: {
              code: -32700,
              data: {
                message: "Unexpected token o in JSON at position 1",
                name: "SyntaxError",
                stack: expect.stringContaining("SyntaxError: Unexpected token o in JSON at position 1"),
                uuid: expect.stringMatching(
                  /^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/
                )
              },
              message: "Invalid JSON"
            },
            id: null,
            jsonrpc: "2.0"
          }
        );

        return jsonRpc.onMessage(result);
      })
      .catch(function(error) {
        expect(error).toMatchInlineSnapshot(`[Error: Invalid JSON]`)
      });
    });
  });

  test("No methods", function () {
    const jsonRpc = new JsonRpc();

    const result = jsonRpc.onMessage('{"jsonrpc":"2.0","method":"foo"}');

    return expect(result).rejects.toMatchInlineSnapshot(`
      Object {
        "code": -32603,
        "message": "Client doesn't accept requests",
      }
    `);
  });

  test("Method not found", function () {
    const jsonRpc = new JsonRpc({});

    const result = jsonRpc.onMessage('{"jsonrpc":"2.0","method":"foo"}');

    return expect(result).rejects.toMatchInlineSnapshot(`
      Object {
        "code": -32601,
        "data": "foo",
        "message": "Unknown method 'foo'",
      }
    `);
  });

  test("Response of failed notification", function () {
    const jsonRpc = new JsonRpc();

    const result = jsonRpc.onMessage('{"jsonrpc":"2.0","id":null}');

    return expect(result).rejects.toMatchInlineSnapshot(`undefined`);
  });

  test("Request with `null` id", function () {
    const jsonRpc = new JsonRpc({}, {
      onWarn(message)
      {
        expect(message).toBe("Using `null` as requests `id` is discouraged");
      }
    });

    return jsonRpc.onMessage(
      '{"jsonrpc":"2.0","id":null,"method":"foo"}'
    )
    .then(function(result) {
      expect(result.valueOf()).toEqual(
        '{"error":{"code":-32601,"data":"foo","message":"Unknown method \'foo\'"},"id":null,"jsonrpc":"2.0"}'
      );
    })
  });
});

test("notification", function () {
  const jsonRpc = new JsonRpc();

  const notification = jsonRpc.notification("foo", ["bar"]);

  expect(notification.valueOf()).toEqual(
    '{"jsonrpc":"2.0","method":"foo","params":["bar"]}'
  );
});

test("Failed notification", function () {
  const methods = {
    foo() {
      const error = new Error();
      error.code = 1234;

      throw error;
    },
  };

  const jsonRpc = new JsonRpc(methods);

  const notification = jsonRpc.notification("foo");

  const result = jsonRpc.onMessage(notification);

  return expect(result).rejects.toMatchInlineSnapshot(`[Error]`);
});

describe("Failed request", function () {
  test("hide error info", function () {
    const methods = {
      foo() {
        const error = new Error();
        error.code = 1234;

        throw error;
      },
    };

    const jsonRpc = new JsonRpc(methods);

    const notification = jsonRpc.request("foo");

    const promise = jsonRpc.onMessage(notification);

    return promise
    .then(function (result) {
      result = JSON.parse(result);

      expect(result).toMatchObject(
        {
          error: {
            code: 1234,
            data: expect.stringMatching(
              /^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/
            ),
            message: "",
          },
          id: 0,
          jsonrpc: "2.0",
        }
      );
    })
  });

  test("send full error", function () {
    const methods = {
      foo() {
        const error = new Error();
        error.code = 1234;

        throw error;
      },
    };

    const jsonRpc = new JsonRpc(methods, {sendFullErrors: true});

    const notification = jsonRpc.request("foo");

    const promise = jsonRpc.onMessage(notification);

    return promise
    .then(function (result) {
      result = JSON.parse(result);

      expect(result).toMatchObject(
        {
          error: {
            code: 1234,
            message: "",
            stack: expect.any(String),
            uuid: expect.stringMatching(
              /^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/
            ),
          },
          id: 0,
          jsonrpc: "2.0",
        }
      );
    })
  });
});
