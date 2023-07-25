import Rpc from "@piranna/rpc";

describe("onMessage", function () {
  test("no arguments for onMessage", function () {
    const rpc = new Rpc();

    const result = rpc.onMessage();

    return expect(result).rejects.toMatchInlineSnapshot(
      "[SyntaxError: `message` argument can't be `undefined`]"
    );
  });

  test("Invalid message", function () {
    const rpc = new Rpc();

    const result = rpc.onMessage({});

    return expect(result).rejects.toMatchInlineSnapshot(
      `[TypeError: Invalid response]`
    );
  });

  test("Unexpected response", function () {
    const rpc = new Rpc();

    const result = rpc.onMessage({ ack: 0 });

    return expect(result).rejects.toMatchInlineSnapshot(
      `[Error: Received response for unknown request '0']`
    );
  });
});

describe("Mixed message", function () {
  test("Response", function () {
    const methods = {
      foo() {},
    };

    const rpc = new Rpc(methods);

    rpc.request("foo");

    const result = rpc.onMessage({ ack: 0, method: "foo" });

    return expect(result).resolves.toBeUndefined();
  });

  test("Unexpected response", function () {
    const rpc = new Rpc();

    const result = rpc.onMessage({ ack: 0, method: "foo" });

    return expect(result).resolves.toMatchInlineSnapshot(`
      {
        "ack": undefined,
        "batch": undefined,
        "error": [Error: Received response for unknown request '0'],
        "result": undefined,
      }
    `);
  });
});

test("Invalid method params", function () {
  function foo() {}

  foo.validateParams = function () {
    throw new Error();
  };

  const methods = { foo };

  const rpc = new Rpc(methods);

  const request = rpc.request("foo");

  return Promise.all([
    rpc.onMessage(request).then(function (response) {
      expect(response).toMatchInlineSnapshot(`
        {
          "ack": 0,
          "error": [Error],
          "requests": [],
          "result": undefined,
        }
      `);
      expect(response.error.code).toBe(-32602);
      expect(response.error.message).toBe("");

      const result = rpc.onMessage(response);

      return expect(result).resolves.toBeUndefined();
    }),
    expect(request).rejects.toMatchInlineSnapshot(`[Error]`),
    request.catch(function (error) {
      expect(error.code).toBe(-32602),
      expect(error.message).toBe("")
    }),
  ]);
});

describe("Failed method", function () {
  test("throw error", function () {
    const methods = {
      foo() {
        throw new Error();
      },
    };

    const rpc = new Rpc(methods);

    const request = rpc.request("foo");

    const onMessageRequest = rpc.onMessage(request)
    const onMessageResponse = onMessageRequest.then(rpc.onMessage.bind(rpc))

    return Promise.all([
      expect(onMessageRequest).resolves.toMatchInlineSnapshot(`
        {
          "ack": 0,
          "batch": [],
          "error": [Error],
          "result": undefined,
        }
      `),
      onMessageRequest.then(function (result) {
        expect(result.error.code).toBe(-32500),
        expect(result.error.message).toBe("")
      }),
        expect(onMessageResponse).resolves.toBeUndefined(),
      expect(request).rejects.toMatchInlineSnapshot(`[Error]`),
      request.catch(function (error) {
        expect(error.code).toBe(-32500),
        expect(error.message).toBe("")
      }),
    ]);
  });

  test("throw string", function () {
    const methods = {
      foo() {
        throw 'Error';
      },
    };

    const rpc = new Rpc(methods);

    const request = rpc.request("foo");

    return Promise.all([
      // Process request
      rpc.onMessage(request).then(function (response) {
        expect(response).toMatchInlineSnapshot(`
          {
            "ack": 0,
            "batch": [],
            "error": [Error: Error],
            "result": undefined,
          }
        `);
        expect(response.error.code).toBe(-32500),
        expect(response.error.message).toBe("Error")

        // Process response
        const result = rpc.onMessage(response);

        // No need to reply response
        return expect(result).resolves.toBeUndefined();
      }),

      // Request is failed
      expect(request).rejects.toMatchInlineSnapshot(`[Error: Error]`),
      request.catch(function (error) {
        expect(error.code).toBe(-32500),
        expect(error.message).toBe("Error")
      }),
    ]);
  });
});

test("notification without arguments", function () {
  const rpc = new Rpc();

  function func()
  {
    rpc.notification();
  }

  expect(func).toThrowErrorMatchingInlineSnapshot(
    `"\`method\` argument is not provided"`
  );
});
