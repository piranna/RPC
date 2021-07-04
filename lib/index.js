function isFulfilledResponse({status, value})
{
  return status === 'fulfilled' && value !== undefined
}

function filterRejected({status})
{
  return status === 'rejected'
}

function filterResponses({status, value})
{
  return status === 'rejected' || value !== undefined
}

function getReason({reason})
{
  return reason
}

function getValue({reason})
{
  return reason
}


export default class Rpc
{
  constructor(methods)
  {
    this.#methods = methods
  }


  //
  // Public API
  //

  notification(method, ...params)
  {
    return this._stringify(this._encode(this._notification(method, ...params)))
  }

  async onMessage(message)
  {
    const result = await this._processMessage(message)

    return this._stringify(this._encode(result))
  }

  request(method, ...params)
  {
    return this._stringify(this._request(method, ...params))
  }


  //
  // Hidden API
  //

  _encode(data)
  {
    return data
  }

  _notification(method, ...params)
  {
    if(!method) throw new SyntaxError('`method` argument is not provided')

    // Trim `undefined` values from end of `params`
    let {length} = params
    while(length && params[length-1] === undefined) length--
    params.length = length

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

  async _processMessage({ack, error, id, method, params, result})
  {
    // Response
    if(ack != null)
    {
      const response = this.#responses[ack]
      if(!response)
      {
        const err = new Error(`Received response for unknown request '${ack}'`)
        err.ack    = ack
        err.error  = error
        err.result = result

        // Both response and request in same message, set error as request reply
        if(method) return this.#reply(id, err)

        throw err
      }

      const {reject, resolve} = response
      delete this.#responses[ack]

      if(error)
        reject(error)
      else
        resolve(result)

      if(!method) return
    }

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

      // Check if params where `undefined` or an `Object`, instead of an `Àrray`
      if(!Array.isArray(params)) params = [params]

      // Validate method params and return error -32602
      let code = -32602

      if(func.validateParams)
        try {
          error = await func.validateParams(...params)
        }
        catch(data)
        {
          error = data
        }

      // Exec function method
      if(!error)
        try {
          result = await func.apply(this, params)
        }
        catch(data)
        {
          code = -32500
          error = data
        }

      // Compose error, if any
      if(error != null && error.code == null)
        error = {code, data: error, message: error.message || error}

      // Return message reply
      return this.#reply(id, error, result)
    }

    // Invalid message
    const err = new TypeError('Received invalid message')
    err.error  = error
    err.id     = id
    err.params = params
    err.result = result

    throw err
  }

  _request(method, ...params)
  {
    let promise = new Promise(this.#resolver)

    if(params[params.length-1] instanceof Function)
    {
      const callback = params.pop()

      promise = promise.then(callback.bind(null, null), callback)
    }

    return this._encode(Object.assign(promise, {id: this.#requestId++},
      this._notification(method, ...params)))
  }

  _stringify(data)
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
    if(error || ack !== undefined) return {ack, error, result}
  }

  #resolver = (resolve, reject) =>
    this.#responses[this.#requestId] = {reject, resolve}
}
