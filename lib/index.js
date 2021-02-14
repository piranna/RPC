function notification(method, ...params)
{
  switch(params.length)
  {
    case 0:
      params = undefined
    break

    case 1:
      const [params0] = params

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
    return this._format(notification(method, ...params))
  }

  async onMessage({ack, error, id, method, params, result})
  {
    // Request
    if(method)
    {
      if(!this.#methods)
        return this.#reply(id, {
          code: -32603,
          message: "Client doesn't accept requests"
        })

      const func = this.#methods[method]
      if(!func)
        return this.#reply(id, {
          code: -32601,
          data: method,
          message: `Unknown method '${method}'`
        })

      // TODO validate method params and return error -32602

      // Check if params where `undefined` or an `Object`, instead of an `Àrray`
      if(!Array.isArray(params)) params = [params]

      try {
        result = await func.apply(this, params)
      }
      catch(data)
      {
        error = data.code != null ? data
              : {code: -32500, data, message: data.message || data}
      }

      return this.#reply(id, error, result)
    }

    // Response
    const response = this.#responses[ack]
    if(!response)
    {
      const error = new Error(`Received response for unknown request '${ack}'`)
      error.error = error
      error.result = result

      throw error
    }

    const {reject, resolve} = response
    delete this.#responses[ack]

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

    return this._format(Object.assign(promise, {id: this.#requestId++},
      notification(method, ...params)))
  }


  //
  // Protected API
  //

  _format(data)
  {
    return data
  }


  //
  // Private API
  //

  #methods
  #requestId = 0
  #responses = {}

  #reply(ack, error, result)
  {
    if(error || ack !== undefined) return this._format({ack, error, result})
  }

  #resolver = (resolve, reject) =>
    this.#responses[this.#requestId] = {reject, resolve}
}
