function JsonRpcClient(methods, send)
{
  const responses = {}

  let requestId = 0

  function request(method, params, callback)
  {
    let id

    if(callback)
    {
      id = requestId++

      responses[id] = callback
    }

    return {id, jsonrpc: '2.0', method, params}
  }

  function reply(id, error, result)
  {
    if(id !== undefined) return send({error, id, jsonrpc: '2.0', result})

    // Log error responses for notifications
    if(error) console.warn('Error response for notification:', error)
  }

  return {
    notification(method, params)
    {
      return request(method, params)
    },

    async onMessage({error, id, jsonrpc, method, params, result})
    {
      if(jsonrpc !== '2.0')
        return reply(id, {
          code: -32600,
          data: jsonrpc,
          message: `Invalid JsonRPC version '${jsonrpc}'`
        })

      // Request
      if(method)
      {
        const func = methods[method]
        if(!func)
          return reply(id, {
            code: -32601,
            data: method,
            message: `Unknown method '${method}'`
          })

        if(!Array.isArray(params)) params = [params]

        try {
          result = await func(...params)
        }
        catch(data)
        {
          error = data.code != null ? data
                : {code: -32500, data, message: data.message || data}
        }

        return reply(id, error, result)
      }

      // Response
      const response = responses[id]
      if(!response) return

      delete responses[id]
      response(error, result)
    },

    request
  }
}


JsonRpcClient.InvalidJSON = function(data)
{
  return {
    error: {code: -32700, data, message: 'Invalid JSON'},
    id: null,  // Spec says `id` must be set to null if it can't be parsed
    jsonrpc: '2.0'
  }
}


module.exports = JsonRpcClient
