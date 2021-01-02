function notification(method, ...params)
{
  switch(params.length)
  {
    case 0:
      params = undefined
    break

    case 1:
      const params0 = params[0]

      // Check if param is an `Object` or an `Array`
      if(params0.constructor.name === 'Object' || Array.isArray(params0))
        params = params0
  }

  return {method, params}
}


export default class
{
  constructor(methods)
  {
    this.#methods = methods
  }


  notification(method, ...params)
  {
    return notification(method, ...params)
  }

  async onMessage({error, id, method, params, result})
  {
    // Request
    if(method)
    {
      const func = this.#methods[method]
      if(!func)
        return this._reply(id, {
          code: -32601,
          data: method,
          message: `Unknown method '${method}'`
        })

      // Check if params where send as an `Object`
      if(!Array.isArray(params)) params = [params]

      try {
        result = await func.apply(this, params)
      }
      catch(data)
      {
        error = data.code != null ? data
              : {code: -32500, data, message: data.message || data}
      }

      return this._reply(id, error, result)
    }

    // Response
    const response = this.#responses[id]
    if(!response)
    {
      const error = new Error(`Received response for unknown request '${id}'`)
      error.error = error
      error.result = result

      throw error
    }

    const {reject, resolve} = response
    delete this.#responses[id]

    if(error)
      reject(error)
    else
      resolve(result)
  }

  request(method, ...params)
  {
    const callback = params[params.length-1] instanceof Function
      ? params.pop()
      : undefined

    let promise = new Promise(this.#resolver)

    if(callback) promise = promise.then(callback.bind(null, null), callback)

    return Object.assign(promise, {id: this.#requestId++},
      notification(method, ...params))
  }


  //
  // Protected API
  //

  _reply(id, error, result)
  {
    if(id !== undefined) return {error, id, result}

    // Throw error responses for notifications
    if(error) throw error
  }


  //
  // Private API
  //

  #methods
  #requestId = 0
  #responses = {}

  #resolver = (resolve, reject) =>
    this.#responses[this.#requestId] = {reject, resolve}
}
