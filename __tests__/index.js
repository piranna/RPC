import JsonRpcClient from "..";

test("basic", function () {
  const methods = {
    foo() {
      return "bar";
    },
  };

  const jsonRpcClient = new JsonRpcClient(methods);

  const request = jsonRpcClient.request("foo", function (error, result) {
    expect(error).toBeFalsy();
    expect(result).toBe("bar");

    return "bar 2";
  });

  expect(request.valueOf()).toEqual('{"jsonrpc":"2.0","id":0,"method":"foo"}');
  expect(request.then).toBeInstanceOf(Function);

  return jsonRpcClient
    .onMessage(request)
    .then(function (response) {
      expect(response).toEqual('{"jsonrpc":"2.0","id":0,"result":"bar"}');

      return jsonRpcClient.onMessage(response);
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
  const jsonRpcClient = new JsonRpcClient();

  return jsonRpcClient.onMessage('{"id": 0}').then(function (data) {
    expect(data).toEqual(
      '{"jsonrpc":"2.0","id":0,"error":{"code":-32600,"message":"Invalid JsonRPC version \'undefined\'"}}'
    );
  });
});

test("Invalid JSON", function () {
  const jsonRpcClient = new JsonRpcClient();

  return jsonRpcClient.onMessage('foo')
  .then(function(data)
  {
    expect(data).toEqual('{"jsonrpc":"2.0","error":{"code":-32700,"data":{},"message":"Invalid JSON"},"id":null}')
  });
});

test("notification", function () {
  const jsonRpcClient = new JsonRpcClient();

  const notification = jsonRpcClient.notification('foo', ['bar'])

  expect(notification).toEqual('{"jsonrpc":"2.0","method":"foo","params":["bar"]}')
});
