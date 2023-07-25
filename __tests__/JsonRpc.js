import JsonRpc from "@piranna/rpc/JsonRpc";


const UUID_REGEX = /^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/


test("basic", async function () {
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

  await Promise.all([
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
  describe("Invalid JsonRPC version 'undefined'", function () {
    test("id", async function () {
      const jsonRpc = new JsonRpc();

      const result = await jsonRpc.onMessage('{"id": 0}')

      expect(JSON.parse(result)).toMatchInlineSnapshot(
        {
          error: {
            data: expect.stringMatching(UUID_REGEX)
          }
        }, `
        {
          "error": {
            "code": -32600,
            "data": StringMatching /\\^\\[a-fA-F0-9\\]\\{8\\}-\\[a-fA-F0-9\\]\\{4\\}-\\[a-fA-F0-9\\]\\{4\\}-\\[a-fA-F0-9\\]\\{4\\}-\\[a-fA-F0-9\\]\\{12\\}\\$/,
            "message": "Invalid JsonRPC version 'undefined'",
          },
          "id": 0,
          "jsonrpc": "2.0",
        }
      `);
    });

    test("no id", async function () {
      const jsonRpc = new JsonRpc();

      const result = await jsonRpc.onMessage('{}')

      expect(JSON.parse(result)).toMatchInlineSnapshot(
        {
          error: {
            data: expect.stringMatching(UUID_REGEX)
          }
        }, `
        {
          "error": {
            "code": -32600,
            "data": StringMatching /\\^\\[a-fA-F0-9\\]\\{8\\}-\\[a-fA-F0-9\\]\\{4\\}-\\[a-fA-F0-9\\]\\{4\\}-\\[a-fA-F0-9\\]\\{4\\}-\\[a-fA-F0-9\\]\\{12\\}\\$/,
            "message": "Invalid JsonRPC version 'undefined'",
          },
          "id": null,
          "jsonrpc": "2.0",
        }
      `);
    });
  });

  describe("Parse error", function () {
    test("hide full errors", async function () {
      const jsonRpc = new JsonRpc();

      const result = await jsonRpc.onMessage("foo")

      expect(JSON.parse(result)).toMatchObject(
        {
          error: {
            code: -32700,
            data: expect.stringMatching(
              /^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/
            ),
            message: "Parse error"
          },
          id: null,
          jsonrpc: "2.0"
        }
      );
    });

    test("send full errors", async function () {
      const jsonRpc = new JsonRpc(null, {sendFullErrors: true});

      const result = await jsonRpc.onMessage("foo")

      expect(JSON.parse(result)).toMatchObject(
        {
          error: {
            code: -32700,
            data: {
              message: "Unexpected token 'o', \"foo\" is not valid JSON",
              name: "SyntaxError",
              stack: expect.stringContaining("SyntaxError: Unexpected token 'o', \"foo\" is not valid JSON"),
              uuid: expect.stringMatching(
                /^[a-fA-F0-9]{8}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{12}$/
              )
            },
            message: "Parse error"
          },
          id: null,
          jsonrpc: "2.0"
        }
      );

      const promise = jsonRpc.onMessage(result)

      await expect(promise).rejects.toMatchInlineSnapshot(`[Error: Parse error]`);
    });
  });

  test("No methods", async function () {
    const jsonRpc = new JsonRpc();

    const result = jsonRpc.onMessage('{"jsonrpc":"2.0","method":"foo"}');

    await Promise.all([
      expect(result).rejects.toMatchInlineSnapshot(
        `[Error: Client doesn't accept requests]`
      ),
      result.catch(function (error) {
        expect(error.code).toBe(-32603);
        expect(error.message).toBe("Client doesn't accept requests");
      })
    ]);
  });

  test("Method not found", async function () {
    const jsonRpc = new JsonRpc({});

    const result = jsonRpc.onMessage('{"jsonrpc":"2.0","method":"foo"}');

    await Promise.all([
      expect(result).rejects.toMatchInlineSnapshot(
        `[Error: Unknown notification 'foo']`
      ),
      result.catch(function (error) {
        expect(error.code).toBe(-32601);
        expect(error.data).toBe("foo");
        expect(error.message).toBe("Unknown notification 'foo'");
      })
    ]);
  });

  test("Response of failed notification", async function () {
    const jsonRpc = new JsonRpc();

    const result = jsonRpc.onMessage('{"jsonrpc":"2.0","id":null}');

    await expect(result).rejects.toMatchInlineSnapshot(`undefined`);
  });

  test("Request with `null` id", async function () {
    const jsonRpc = new JsonRpc({}, {
      onWarn(message)
      {
        expect(message).toBe("Using `null` as requests `id` is discouraged");
      }
    });

    const result = await jsonRpc.onMessage(
      '{"jsonrpc":"2.0","id":null,"method":"foo"}'
    )

    expect(JSON.parse(result)).toMatchInlineSnapshot(
      {
        error: {
          data: expect.stringMatching(UUID_REGEX)
        }
      }, `
      {
        "error": {
          "code": -32601,
          "data": StringMatching /\\^\\[a-fA-F0-9\\]\\{8\\}-\\[a-fA-F0-9\\]\\{4\\}-\\[a-fA-F0-9\\]\\{4\\}-\\[a-fA-F0-9\\]\\{4\\}-\\[a-fA-F0-9\\]\\{12\\}\\$/,
          "message": "Unknown method 'foo'",
        },
        "id": null,
        "jsonrpc": "2.0",
      }
    `);
  });
});

test("notification", function () {
  const jsonRpc = new JsonRpc();

  const notification = jsonRpc.notification("foo", ["bar"]);

  expect(notification.valueOf()).toEqual(
    '{"jsonrpc":"2.0","method":"foo","params":["bar"]}'
  );
});

test("Failed notification", async function () {
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

  await expect(result).rejects.toMatchInlineSnapshot(`[Error]`);
});

describe("Failed request", function () {
  test("hide error info", async function () {
    const methods = {
      foo() {
        const error = new Error();
        error.code = 1234;

        throw error;
      },
    };

    const jsonRpc = new JsonRpc(methods);

    const notification = jsonRpc.request("foo");

    const result = await jsonRpc.onMessage(notification);

    expect(JSON.parse(result)).toMatchObject(
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
  });

  test("send full error", async function () {
    const methods = {
      foo() {
        const error = new Error();
        error.code = 1234;

        throw error;
      },
    };

    const jsonRpc = new JsonRpc(methods, {sendFullErrors: true});

    const notification = jsonRpc.request("foo");

    const result = await jsonRpc.onMessage(notification);

    expect(JSON.parse(result)).toMatchObject(
      {
        error: {
          code: 1234,
          message: "",
          stack: expect.any(String),
          uuid: expect.stringMatching(UUID_REGEX),
        },
        id: 0,
        jsonrpc: "2.0",
      }
    );
  })
});

describe('batch', function()
{
  test('basic', async function()
  {
    const methods = {
      foo() {
        return "bar";
      },
      foo2() {
        return "bar2";
      },
    };

    const jsonRpc = new JsonRpc(methods);

    const batch = jsonRpc.createBatch()

    // Batch request returns a promise
    const promiseRequest = batch.request("foo", function (error, result) {
      expect(error).toBeFalsy();
      expect(result).toBe("bar");

      return "bar 2";
    });
    expect(promiseRequest).toBeInstanceOf(Promise);
    expect(promiseRequest.id).toBeUndefined();
    expect(promiseRequest.method).toBeUndefined();
    expect(promiseRequest.params).toBeUndefined();
    expect(promiseRequest.then).toBeInstanceOf(Function);

    // Batch notification returns undefined
    const notification = batch.notification("foo2");
    expect(notification).toBeUndefined();

    // Requests are initialized when the batch is executed
    const promiseRun = batch.run()
    expect(promiseRun.valueOf()).toEqual(
      '[{"id":0,"jsonrpc":"2.0","method":"foo"},{"jsonrpc":"2.0","method":"foo2"}]'
    );
    expect(promiseRun.then).toBeInstanceOf(Function);

    // Response and Result
    const promiseResponse = jsonRpc.onMessage(promiseRun)
    const promiseResult = promiseResponse.then(jsonRpc.onMessage.bind(jsonRpc))

    // Check promises
    await Promise.all([
      // Request and Run
      expect(promiseRequest).resolves.toBe("bar 2"),
      expect(promiseRun).resolves.toBeUndefined(),

      // Response and Result
      promiseResponse.then(function(response)
      {
        expect(response.valueOf()).toEqual(
          '[{"id":0,"jsonrpc":"2.0","result":"bar"}]'
        )
      }),
      expect(promiseResult).resolves.toBeUndefined()
    ])
  })
})
