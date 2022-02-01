# RPC

Transport and protocol agnostic polyglot RPC

This module provides a bi-directional RPC scheme that's independent of the
actual transport or protocol being used, allowing you to use multiple message
formats at the same time or your own one on multiple transports at the same
time. Data structures and error codes are influenced by JsonRPC 2.0, but
similarities ends there.

## Features

- 100% tests coverage
- Designed for simplicity and minimal size, with no (third-party) dependencies
- Requests and notifications (requests without waiting for response)
- Validation of methods params (if provided)
- Return selialized data, sending it is responsability of developer
- Includes implementations of XmlRpc (only for browser) and JsonRPC 2.0

### Future features

- XmlRpc in Node.js

## API

### `new RPC(methods)`

Constructor of `RPC` instance. `methods` is an object with the methods we can
response.

#### `.notification(method, ...params)`

Generates and returns a notification message. Its arguments are the `method` to
be invoqued, and zero or more `param`eters.

#### `.onMessage({ack, error, id, method, params, result})`

Process the received RPC messages, no matter if they are requests, notifications
or responses.

- `ack`   : response ack. Equivalent to JsonRpc 2.0 response `id` field, but
            defined separately to allow protocols that can have both a response
            and a reply request in the same message
- `error` : response error
- `id`    : request or notification id
- `method`: request or notification method
- `params`: request or notification params
- `result`: response result

For requests or errored notifications, it returns a sucessful Promise with the
response message, or with `undefined` as value for succesful notifications. For
responses, it returns a succesul Promise with `undefined` as value, or a failed
one in case we were not expecting the response.

#### `.request(method, ...params, [errback])`

Generates and returns a request message. Its arguments are the `method` to
be invoqued, and zero or more `param`eters. Returned value always includes a
`.then()` method that will be resolved or rejected when the response is received
in the [`.onMessage`](#onMessage) method.

You can also provide a `errback` function as last parameter, in that case the
`errback` will be called when the response is received, and `.then()` method
will be called when the `errback` resolves or rejects.

#### `._format(data)`

Format the messages to the protocol particular format. Not intended for direct
usage, but to be overwritten by child classes to the specific protocol format.
Default one just only return unmodified `data`.

### Custom protocols

#### `new JsonRpc(methods)`

Constructor of `RPC` instance. `methods` is an object with the methods we can
response.

##### `.onMessage({ack, error, id, method, params, result})`

##### `._format(data)`

#### `new XmlRpc(methods)`

Constructor of `RPC` instance. `methods` is an object with the methods we can
response.

##### `.onMessage({ack, error, id, method, params, result})`

##### `._format(data)`

<https://medium.com/swlh/npm-new-package-json-exports-field-1a7d1f489ccf>
<https://nodejs.org/api/packages.html#packages_subpath_imports>

<https://github.com/ershov-konst/dom-parser/issues/22>

xmldom
String objects
<?xml> as first element, instead docfile
https://stackoverflow.com/q/13743250/586382
https://www.w3.org/TR/xml/#sec-prolog-dtd
foo interpreted as text node, not as invalid XML (documentElement is null)
`Element` doesn't includes `ParentNode.children`, only `Node.childNodes`

dom-parser
TypeError: Cannot read property 'nodeName' of undefined
documentElement
https://github.com/ershov-konst/dom-parser/blob/master/lib/Dom.js

https://www.npmjs.com/package/dom-parse
jsdom

xmlshim
TypeError: Cannot read property 'nodeName' of null

    "projects": [
      {
        "displayName": "jsdom"
      },
      {
        "displayName": "node",
        "testEnvironment": "node"
      }
    ]

// import {DOMParser} from 'xmldom'
// import 'xmldom-ts'

// import domparser from '@journeyapps/domparser'
// const {DOMParser} = domparser

// import DOMParser from 'dom-parser'
// import {DOMParser} from 'xmlshim'

https://github.com/nodejs/node/issues/37618
https://github.com/facebook/jest/issues/11161

https://github.com/nodejs/node/pull/37630
https://github.com/facebook/jest/issues/10883
https://github.com/facebook/jest/issues/9771

https://webpack.js.org/guides/tree-shaking/#mark-the-file-as-side-effect-free
