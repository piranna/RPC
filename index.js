module.exports = function(methods)
{
  const responses = {}

  let requestId = 0


  return {
    async onMessage({data})
    {
      const reply = (error, result) =>
      {
        if(id !== undefined)
          return this.send(JSON.stringify({error, id, jsonrpc: '2.0', result}))

        // Log error responses for notifications
        if(error) console.warn('Error response for notification:', error)
      }

      try {
        data = JSON.parse(data)
      }
      catch(data) {
        id = null  // Spec says `id` must be set to null if it can't be parsed

        return reply({code: -32700, data, message: 'Invalid JSON'})
      }

      const {jsonrpc, method} = data
      let {error, params, result} = data
      var {id} = data

      if(jsonrpc !== '2.0')
        return reply({code: -32600, data: jsonrpc, message: `Invalid JsonRPC version '${jsonrpc}`})

      // Request
      if(method)
      {
        const func = methods[method]
        if(!func) return reply({code: -32601, data: method, message: `Unknown method '${method}'`})

        if(!Array.isArray(params)) params = [params]

        try {
          result = await func.apply(null, params)
        }
        catch(data)
        {
          error = data.code != null ? data
                : {code: -32500, data, message: data.message || data}
        }

        return reply(error, result)
      }

      // Response
      const response = responses[id]
      if(!response) return

      delete responses[id]
      response(error, result)
    },

    request(method, params, callback)
    {
      let id

      if(callback)
      {
        id = requestId++

        responses[id] = callback
      }

      return {id, jsonrpc: '2.0', method, params}
    }
  }
}
