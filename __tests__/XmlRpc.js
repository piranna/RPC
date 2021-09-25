import XmlRpc from "@piranna/rpc/XmlRpc";

test("basic", function () {
  const methods = {
    foo() {
      return "bar";
    },
  };

  const xmlRpc = new XmlRpc(methods);

  const request = xmlRpc.request("foo", function (error, result) {
    expect(error).toBeFalsy();
    expect(result).toBe("bar");

    return "bar 2";
  });

  expect(request).toMatchObject({
    ack: undefined,
    error: undefined,
    id: 0
  });
  expect(request.valueOf()).toBe(
    '<?xml version="1.0"?><methodCall><methodName>foo</methodName></methodCall>'
  );

  return Promise.all([
    xmlRpc.onMessage(request, request.id).then(function (response) {
      expect(response).toMatchObject({
        ack: 0,
        error: undefined,
        id: undefined,
        then: undefined
      });
      expect(response.valueOf()).toBe(
        '<?xml version="1.0"?><methodResponse><params><param><value><string>bar</string></value></param></params></methodResponse>'
      );

      const result = xmlRpc.onMessage(response, response.ack);

      return expect(result).resolves.toBeUndefined();
    }),
    expect(request).resolves.toBe("bar 2"),
  ]);
});

test("Invalid XmlRPC", function () {
  const xmlRpc = new XmlRpc();

  const result = xmlRpc.onMessage('<?xml version="1.0"?><foo/>', 0);

  return result.then(function (result) {
    expect(result).toMatchObject({
      ack: 0,
      error: new Error("Unknown node 'foo'"),
      id: undefined,
      then: undefined
    });
    expect(result.valueOf()).toBe(
      '<?xml version="1.0"?><methodResponse><fault><value><struct><member><name>faultCode</name><value><i4>-32600</i4></value></member><member><name>faultString</name><value><string>server error. invalid xml-rpc. not conforming to spec.</string></value></member></struct></value></fault></methodResponse>'
    );
  });
});

test("Invalid XML", function () {
  const xmlRpc = new XmlRpc();

  const result = xmlRpc.onMessage("foo");

  return result.then(function (result) {
    expect(result).toMatchObject({
      ack: undefined,
      id: undefined,
      then: undefined
    });
    expect(result.error).toBeDefined()
    expect(result.valueOf()).toBe(
      '<?xml version="1.0"?><methodResponse><fault><value><struct><member><name>faultCode</name><value><i4>-32700</i4></value></member><member><name>faultString</name><value><string>parse error. not well formed</string></value></member></struct></value></fault></methodResponse>'
    );
  });
});

test("notification", function () {
  const xmlRpc = new XmlRpc();

  const notification = xmlRpc.notification("foo", ["bar"]);

  expect(notification).toMatchObject({
    ack: undefined,
    error: undefined,
    id: undefined,
    then: undefined
  });
  expect(notification.valueOf()).toBe(
    '<?xml version="1.0"?><methodCall><methodName>foo</methodName><params><param><value><string>bar</string></value></param></params></methodCall>'
  );
});
