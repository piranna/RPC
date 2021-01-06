import XmlRpc from "../lib/XmlRpc";

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

  expect(request).toMatchInlineSnapshot(`
    Object {
      "id": 0,
      "then": [Function],
      "xml": "<?xml version=\\"1.0\\"?><methodCall><methodName>foo</methodName></methodCall>",
    }
  `);

  return xmlRpc
    .onMessage(request.xml, request.id)
    .then(function (response) {
      expect(response).toMatchInlineSnapshot(`
        Object {
          "ack": 0,
          "error": undefined,
          "result": "bar",
          "xml": "<?xml version=\\"1.0\\"?><methodResponse><params><param><value><string>bar</string></value></param></params></methodResponse>",
        }
      `);

      return xmlRpc.onMessage(response.xml, response.ack);
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
  const xmlRpc = new XmlRpc();

  const result = xmlRpc.onMessage('<?xml version="1.0"?><foo/>', 0);

  return expect(result).resolves.toMatchInlineSnapshot(`
      Object {
        "ack": 0,
        "error": Object {
          "code": -32600,
          "data": [Error: Unknown node 'foo'],
          "message": "server error. invalid xml-rpc. not conforming to spec.",
        },
        "xml": "<?xml version=\\"1.0\\"?><methodResponse><fault><value><struct><member><name>faultCode</name><value><i4>-32600</i4></value></member><member><name>faultString</name><value><string>server error. invalid xml-rpc. not conforming to spec.</string></value></member></struct></value></fault></methodResponse>",
      }
  `);
});

test("Invalid XML", function () {
  const xmlRpc = new XmlRpc();

  const result = xmlRpc.onMessage("foo");

  return expect(result).resolves.toMatchInlineSnapshot(`
      Object {
        "ack": undefined,
        "error": Object {
          "code": -32700,
          "data": Document {
            "location": null,
          },
          "message": "parse error. not well formed",
        },
        "xml": "<?xml version=\\"1.0\\"?><methodResponse><fault><value><struct><member><name>faultCode</name><value><i4>-32700</i4></value></member><member><name>faultString</name><value><string>parse error. not well formed</string></value></member></struct></value></fault></methodResponse>",
      }
  `);
});

test("notification", function () {
  const xmlRpc = new XmlRpc();

  const notification = xmlRpc.notification("foo", ["bar"]);

  expect(notification).toMatchInlineSnapshot(
    `"<?xml version=\\"1.0\\"?><methodCall><methodName>foo</methodName><params><param><value><string>bar</string></value></param></params></methodCall>"`
  );
});
