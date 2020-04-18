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

  const jsonRpcClient = JsonRpcClient(methods)

  const data = jsonRpcClient.request('foo', [], function(error, result)
  {
    expect(error).toBeFalsy()
    expect(result).toBe('bar')

    done()
  })

  expect(data).toEqual({id: 0, jsonrpc: '2.0', method: 'foo', params: []})

  const socket =
  {
    send(data)
    {
      expect(data).toBe('{"id":0,"jsonrpc":"2.0","result":"bar"}')

      jsonRpcClient.onMessage.call(this, {data})
    }
  }

  jsonRpcClient.onMessage.call(socket, {data: JSON.stringify(data)})
})

test('Invalid JSON', function(done)
{
  const jsonRpcClient = JsonRpcClient()

  const socket =
  {
    send(data)
    {
      expect(data).toBe('{"error":{"code":-32700,"message":"Invalid JSON"},"id":null,"jsonrpc":"2.0"}')

      done()
    }
  }

  jsonRpcClient.onMessage.call(socket, {})
})
