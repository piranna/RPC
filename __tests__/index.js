const JsonRpcClient = require("..");

test("basic", function (done) {
  const methods = {
    foo() {
      return "bar";
    },
  };

  function send(data) {
    expect(data).toEqual({
      id: 0,
      jsonrpc: "2.0",
      result: "bar",
    });

    jsonRpcClient.onMessage(data);
  }

  const jsonRpcClient = JsonRpcClient(methods, send);

  const data = jsonRpcClient.request("foo", [], function (error, result) {
    expect(error).toBeFalsy();
    expect(result).toBe("bar");

    done();
  });

  expect(data).toMatchInlineSnapshot(`
    Promise {
      "id": 0,
      "jsonrpc": "2.0",
      "method": "foo",
      "params": Array [],
    }
  `);

  jsonRpcClient.onMessage(data);
});

test("Invalid JsonRPC version 'undefined'", function (done) {
  function send(data) {
    expect(data).toEqual({
      error: {
        code: -32600,
        message: "Invalid JsonRPC version 'undefined'",
      },
      id: 0,
      jsonrpc: "2.0",
    });

    done();
  }

  const jsonRpcClient = JsonRpcClient({}, send);

  jsonRpcClient.onMessage({ id: 0 });
});
