function JsonRpcClient(methods, send)
{
  const responses = {}

  let requestId = 0

  function notification(method, ...params)
  {
    if(params.length === 1)
    {
      params = params[0]

      // Check if params where send as an `Object` or an `Array`
      if(params !== undefined && !(params instanceof Object))
      {
        const error = new Error('params is not an Object or an Array')
        error.params = params

        throw error
      }
    }

    return {jsonrpc: '2.0', method, params}
  }

  function request(method, params, callback)
  {
    params = Array.from(arguments).slice(1)

    callback = params[params.length-1] instanceof Function
      ? params.pop()
      : undefined

    let promise = new Promise(resolver)

    if(callback) promise = promise.then(callback.bind(null, null), callback)

    return Object.assign(promise, {id: requestId++},
      notification(method, ...params))
  }

  function reply(id, error, result)
  {
    if(id !== undefined) return send({error, id, jsonrpc: '2.0', result})

    // Log error responses for notifications
    if(error) console.warn('Error response for notification:', error)
  }

  function resolver(resolve, reject)
  {
    responses[requestId] = {reject, resolve}
  }


  return {
    notification,
    request,

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

        // Check if params where send as an `Object`
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
      if(!response)
        return console.warn(`Received response for missing request '${id}':`,
          error, result)

      const {reject, resolve} = response
      delete responses[id]

      if(error) return reject(error)
      resolve(result)
    }
  }
}


JsonRpcClient.InvalidJSON = function(data)
{
  return {
    error: {code: -32700, data, message: 'Invalid JSON'},
    id: null,  // Spec says `id` must be set to `null` if it can't be parsed
    jsonrpc: '2.0'
  }
}


module.exports = JsonRpcClient
