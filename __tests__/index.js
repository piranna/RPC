const JsonRpcClient = require('..')


test('basic', function(done)
{
  const methods =
  {
    foo()
    {
      return 'bar'
    }
  }

  function send(data)
  {
    expect(data).toBe('{"id":0,"jsonrpc":"2.0","result":"bar"}')

    jsonRpcClient.onMessage({data: JSON.stringify(data)})
  }

  const jsonRpcClient = JsonRpcClient(methods, send)

  const data = jsonRpcClient.request('foo', [], function(error, result)
  {
    expect(error).toBeFalsy()
    expect(result).toBe('bar')

    done()
  })

  expect(data).toEqual({id: 0, jsonrpc: '2.0', method: 'foo', params: []})

  jsonRpcClient.onMessage({data: JSON.stringify(data)})
})

test('Invalid JSON', function(done)
{
  function send(data)
  {
    expect(data).toBe('{"error":{"code":-32700,"message":"Invalid JSON"},"id":null,"jsonrpc":"2.0"}')

    done()
  }

  const jsonRpcClient = JsonRpcClient({}, send)

  jsonRpcClient.onMessage({})
})
