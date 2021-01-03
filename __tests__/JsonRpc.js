import JsonRpc from "../lib/JsonRpc";

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

  expect(request.valueOf()).toEqual('{"jsonrpc":"2.0","id":0,"method":"foo"}');
  expect(request.then).toBeInstanceOf(Function);

  return jsonRpc
    .onMessage(request)
    .then(function (response) {
      expect(response).toEqual('{"jsonrpc":"2.0","id":0,"result":"bar"}');

      return jsonRpc.onMessage(response);
    })
    .then(function (result) {
      expect(result).toBeUndefined();

      return request;
    })
    .then(function (result) {
      expect(result).toBe("bar 2");
    });
});

test("Invalid JsonRPC version 'undefined'", function () {
  const jsonRpc = new JsonRpc();

  return jsonRpc.onMessage('{"id": 0}').then(function (data) {
    expect(data).toEqual(
      '{"jsonrpc":"2.0","id":0,"error":{"code":-32600,"message":"Invalid JsonRPC version \'undefined\'"}}'
    );
  });
});

test("Invalid JSON", function () {
  const jsonRpc = new JsonRpc();

  return jsonRpc.onMessage('foo')
  .then(function(data)
  {
    expect(data).toEqual('{"jsonrpc":"2.0","error":{"code":-32700,"data":{},"message":"Invalid JSON"},"id":null}')
  });
});

test("notification", function () {
  const jsonRpc = new JsonRpc();

  const notification = jsonRpc.notification('foo', ['bar'])

  expect(notification).toEqual('{"jsonrpc":"2.0","method":"foo","params":["bar"]}')
});
