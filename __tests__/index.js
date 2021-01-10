import Rpc from "..";

test("Failed method", function () {
  const methods = {
    foo() {
      throw new Error();
    },
  };

  const rpc = new Rpc(methods);

  const request = rpc.request("foo");

  return rpc
    .onMessage(request)
    .then(function (response) {
      expect(response).toMatchInlineSnapshot(`
        Object {
          "ack": 0,
          "error": Object {
            "code": -32500,
            "data": [Error],
            "message": [Error],
          },
          "result": undefined,
        }
      `);

      return rpc.onMessage(response);
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

test("Unexpected response", function () {
  const rpc = new Rpc();

  const result = rpc.onMessage({ ack: 0 });

  return expect(result).rejects.toMatchInlineSnapshot(
    `[Error: Received response for unknown request '0']`
  );
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
