module.exports = function(methods, send)
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

    async onMessage({data})
    {
      try {
        data = JSON.parse(data)
      }
      catch(e) {
        // Spec says `id` must be set to null if it can't be parsed

        return reply(null, {code: -32700, message: 'Invalid JSON'})
      }

      const {jsonrpc, method} = data
      let {error, params, result} = data
      var {id} = data

      if(jsonrpc !== '2.0')
        return reply(id, {code: -32600, message: `Invalid JsonRPC version '${jsonrpc}`})

      // Request
      if(method)
      {
        const func = methods[method]
        if(!func) return reply(id, {code: -32601, message: `Unknown method '${method}'`})

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
