import objectPath from "object-path"

import Batch from './Batch'


export default class Rpc
{
  static Batch = Batch


  constructor(methods, {send} = {})
  {
    this.#methods = methods
    this._send = send

    this.reset()
  }


  //
  // Public API
  //

  createBatch()
  {
    return new Batch(this)
  }

  notification(method, ...params)
  {
    const result = this._stringify(
      this._encode(this._notification(method, ...params))
    )

    this._send?.(result)

    return result
  }

  async onMessage(message)
  {
    if(!message) throw SyntaxError("`message` argument can't be `undefined`")

    let reply

    // Single message
    if(!Array.isArray(message)) reply = await this.#onMessage(message)

    // Batch
    else
    {
      reply = await Promise.allSettled(message.map(this.#onMessage))
      reply = this._agregateResults(reply)
    }

    if(reply === undefined) return

    const result = this._stringify(reply)

    this._send?.(result)

    return result
  }

  request(method, ...params)
  {
    const result = this._stringify(this._encode(this._request(method, ...params)))

    this._send?.(result)

    return result
  }

  reset()
  {
    this.#requestId = 0
    this.#responses = {}
  }


  //
  // Hidden API
  //

  _agregateResults(results)
  {
    return results
  }

  _decode(data)
  {
    return data
  }

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

  _request(method, ...params)
  {
    let promise = new Promise(this.#resolver)

    if(params[params.length-1] instanceof Function)
    {
      const callback = params.pop()

      promise = promise.then(callback.bind(null, null), callback)
    }

    const notification = this._notification(method, ...params)

    return Object.assign(promise, {id: this.#requestId++}, notification)
  }

  _stringify(data)
  {
    return data
  }

  _validate({ack, method})
  {
    // It's not possible to have a response without a request ID
    if(!method && ack === undefined) throw new TypeError('Invalid response')
  }


  //
  // Private API
  //

  #methods
  #requestId = 0
  #responses = {}


  #onMessage = async message =>
  {
    // Decode message
    const decoded = await this._decode(message)

    // Validate
    const failedValidation = await this._validate(decoded)
    if(failedValidation) return this._encode(failedValidation)


    //
    // Process message
    //

    let {ack, error, id, method, params, result} = decoded

    // Throw error responses for malformed requests
    if(ack === null && !method) throw error

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

      // No request in the same message of the response, finish processing it
      if(!method) return
    }

    // Request or notification
    if(!this.#methods)
      return this.#reply(id, {
        code: -32603,
        message: "Client doesn't accept requests"
      })

    const func = objectPath(this.#methods).get(method)
    if(!func)
    {
      // TODO Check if requested method is an accessor (a getter or setter)
      // https://stackoverflow.com/a/58311424/586382

      return this.#reply(id, {
        code: -32601,
        data: method,
        message: `Unknown method '${method}'`
      })
    }

    // Check if params were `undefined` or an `Object`, instead of an `Àrray`
    if(!Array.isArray(params)) params = [params]

    // Validate method params and return error -32602 by default
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
    const batch = []

    if(!error)
    {
      const thisArg =
      {
        // createBatch: () =>
        // {
        //   return new JsonRpcBatch(this)
        // },

        notification: (method, ...params) =>
        {
          batch.push(this._notification(method, ...params))
        },

        request: async (method, ...params) =>
        {
          const request = this._request(method, ...params)

          batch.push(request)

          await request
        }
      }

      try {
        result = await func.apply(thisArg, params)
      }
      catch(data)
      {
        code = -32500
        error = data
      }
    }

    // Compose error, if any
    if(error != null && error.code == null)
    {
      let data
      let message

      if(typeof error === 'string')
        message = error

      else
      {
        data = error
        message = error.message
      }

      error = {code, data, message}
    }

    // Return message reply
    return this.#reply(id, error, result, batch)
  }

  #reply(ack, error, result, batch)
  {
    if(error || ack !== undefined)
      return this._encode({ack, batch, error, result})
  }

  #resolver = (resolve, reject) =>
    this.#responses[this.#requestId] = {reject, resolve}
}
