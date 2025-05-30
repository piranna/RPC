import {setTimeout} from 'node:timers/promises'

import objectPath from "object-path"

import Batch from './Batch.js'


export default class Rpc
{
  static Batch = Batch


  constructor(methods, {logMessages, send} = {})
  {
    this.#logMessages = logMessages
    this.#methods = methods
    this.#send = send

    this.reset()
  }


  //
  // Public API
  //

  createBatch()
  {
    return new this.constructor.Batch(this)
  }

  notification(method, ...params)
  {
    const notification = this._ess(this._notification(method, ...params))

    if(this.#logMessages)
      console.debug('notification:', notification.toString())

    return notification
  }

  async onMessage(...args)
  {
    let [message] = args

    if(this.#logMessages) console.debug('onMessage:', message.toString())

    message = this._onMessage ? (await this._onMessage(...args)) : message

    if(!message) throw SyntaxError("`message` argument can't be `undefined`")

    if(message instanceof String) return message

    let reply

    // Single message
    if(!Array.isArray(message)) reply = await this.#onMessage(message)

    // Batch
    else
    {
      reply = await Promise.allSettled(message.map(this.#onMessage))
      if(this._aggregateResults) reply = this._aggregateResults(reply)
    }

    if(reply === undefined) return

    reply = this.#stringify(reply)

    if(this.#logMessages) console.debug('    reply:', reply.toString())

    return reply
  }

  request(method, ...params)
  {
    const request = this._ess(this._request(method, ...params))

    if(this.#logMessages) console.debug('request:', request.toString())

    return request
  }

  reset()
  {
    this.#requestId = 0
    this.#responses = {}
  }


  //
  // Hidden API
  //

  _ess(data)
  {
    if(this._encode) data = this._encode(data)

    return this.#stringify(data)
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

    if(typeof method !== 'string')
    {
      if(!params.length) throw new SyntaxError('Missing method')

      let options
      let timeout

      if(method instanceof Number) timeout = method
      else ({timeout, ...options} = method)

      method = params.shift()

      if(timeout)
        promise = Promise.race(
          [
            promise,
            setTimeout(timeout, Promise.reject(new Error('Timeout')), options)
          ]
        )
    }

    if(params[params.length-1] instanceof Function)
    {
      const callback = params.pop()

      promise = promise.then(callback.bind(null, null), callback)
    }

    const notification = this._notification(method, ...params)

    return Object.assign(promise, {id: this.#requestId++}, notification)
  }

  _validate({ack, method})
  {
    // It's not possible to have a response without a request ID
    if(!method && ack === undefined) throw new TypeError('Invalid response')
  }


  //
  // Private API
  //

  #logMessages
  #methods
  #requestId = 0
  #responses = {}
  #send


  #onMessage = async message =>
  {
    // Decode message
    if(this._decode) message = await this._decode(message)

    let {ack, error, id, method, params = [], result} = message


    // Validate
    const failedValidation = await this._validate(message)
    if(failedValidation) return this.#reply(ack ?? id ?? null, failedValidation)


    //
    // Process message
    //

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
    {
      const error = new Error('Client doesn\'t accept requests')
      error.code = -32603

      return this.#reply(id, error)
    }

    const func = objectPath(this.#methods).get(method)
    if(!func)
    {
      // TODO: Check if requested method is an accessor (a getter or setter)
      // https://stackoverflow.com/a/58311424/586382

      const error = new Error(
        `Unknown ${id !== undefined ? 'method' : 'notification'} '${method}'`,
        {cause: method}
      )
      error.code = -32601

      return this.#reply(id, error)
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
      if(typeof error === 'string') error = new Error(error)

      error.code = code
    }

    // Return message reply
    return this.#reply(id, error, result, batch)
  }

  #reply(ack, error, result, batch)
  {
    if(!error && ack === undefined) return

    const reply = {ack, batch, error, result}

    return this._encode ? this._encode(reply) : reply
  }

  #resolver = (resolve, reject) =>
    this.#responses[this.#requestId] = {reject, resolve}

  #stringify(data)
  {
    let result = data

    if(this._stringify) result = this._stringify(result)

    if(result !== data)
    {
      result.ack   = data.ack
      result.catch = data.catch?.bind(data)
      result.error = data.error
      result.id    = data.id
      result.then  = data.then?.bind(data)
    }

    this.#send?.(result)

    return result
  }
}
