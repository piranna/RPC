import Rpc from "@piranna/rpc";

describe("onMessage", function () {
  test("no arguments for onMessage", async function () {
    const rpc = new Rpc();

    const result = rpc.onMessage();

    await expect(result).rejects.toMatchInlineSnapshot(
      "[SyntaxError: `message` argument can't be `undefined`]"
    );
  });

  test("Invalid message", async function () {
    const rpc = new Rpc();

    const result = rpc.onMessage({});

    await expect(result).rejects.toMatchInlineSnapshot(
      `[TypeError: Invalid response]`
    );
  });

  test("Unexpected response", async function () {
    const rpc = new Rpc();

    const result = rpc.onMessage({ ack: 0 });

    await expect(result).rejects.toMatchInlineSnapshot(
      `[ReferenceError: Cannot access 'requests' before initialization]`
    );
  });
});

describe("Mixed message", function () {
  test("Response", async function () {
    const methods = {
      foo() {},
    };

    const rpc = new Rpc(methods);

    rpc.request("foo");

    const result = rpc.onMessage({ ack: 0, method: "foo" });

    await expect(result).resolves.toBeUndefined();
  });

  test("Unexpected response", async function () {
    const rpc = new Rpc();

    const result = rpc.onMessage({ ack: 0, method: "foo" });

    await expect(result).resolves.toMatchInlineSnapshot(`
      {
        "ack": undefined,
        "error": [Error: Received response for unknown request '0'],
        "requests": undefined,
        "result": undefined,
      }
    `);
  });
});

test("Invalid method params", async function () {
  function foo() {}

  foo.validateParams = function () {
    throw new Error();
  };

  const methods = { foo };

  const rpc = new Rpc(methods);

  const request = rpc.request("foo");

  await Promise.all([
    rpc.onMessage(request).then(async function (response) {
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

      await expect(result).resolves.toBeUndefined();
    }),
    expect(request).rejects.toMatchInlineSnapshot(`[Error]`),
    request.catch(function (error) {
      expect(error.code).toBe(-32602),
      expect(error.message).toBe("")
    }),
  ]);
});

describe("Failed method", function () {
  test("throw error", async function () {
    const methods = {
      foo() {
        throw new Error();
      },
    };

    const rpc = new Rpc(methods);

    const request = rpc.request("foo");

    const onMessageRequest = rpc.onMessage(request)
    const onMessageResponse = onMessageRequest.then(rpc.onMessage.bind(rpc))

    await Promise.all([
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

  test("throw string", async function () {
    const methods = {
      foo() {
        throw 'Error';
      },
    };

    const rpc = new Rpc(methods);

    const request = rpc.request("foo");

    await Promise.all([
      // Process request
      rpc.onMessage(request).then(async function (response) {
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
        await expect(result).resolves.toBeUndefined();
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
