import Rpc from "@piranna/rpc";

describe("onMessage", function () {
  test("no arguments for onMessage", function () {
    const rpc = new Rpc();

    const result = rpc.onMessage();

    return expect(result).rejects.toMatchInlineSnapshot(
      `[TypeError: Cannot destructure property 'ack' of 'undefined' as it is undefined.]`
    );
  });

  test("Invalid message", function () {
    const rpc = new Rpc();

    const result = rpc.onMessage({});

    return expect(result).rejects.toMatchInlineSnapshot(
      `[TypeError: Received invalid message]`
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
      Object {
        "ack": undefined,
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
        Object {
          "ack": 0,
          "error": Object {
            "code": -32602,
            "data": [Error],
            "message": "",
          },
          "result": undefined,
        }
      `);

      const result = rpc.onMessage(response);

      return expect(result).resolves.toBeUndefined();
    }),
    expect(request).rejects.toMatchInlineSnapshot(`
      Object {
        "code": -32602,
        "data": [Error],
        "message": "",
      }
    `),
  ]);
});

test("Failed method", function () {
  const methods = {
    foo() {
      throw new Error();
    },
  };

  const rpc = new Rpc(methods);

  const request = rpc.request("foo");

  return Promise.all([
    rpc.onMessage(request).then(function (response) {
      expect(response).toMatchInlineSnapshot(`
        Object {
          "ack": 0,
          "error": Object {
            "code": -32500,
            "data": [Error],
            "message": "",
          },
          "result": undefined,
        }
      `);

      const result = rpc.onMessage(response);

      return expect(result).resolves.toBeUndefined();
    }),
    expect(request).rejects.toMatchInlineSnapshot(`
      Object {
        "code": -32500,
        "data": [Error],
        "message": "",
      }
    `),
  ]);
});

test("notification with spread params", function () {
  const rpc = new Rpc();

  const notification = rpc.notification("foo", "bar");

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
  const rpc = new Rpc({
    foo() {},
  });

  const notification = rpc.notification("foo", ["bar"]);

  return rpc.onMessage(notification);
});
