import {randomUUID} from 'crypto';

import errorToJSON, {parse} from 'error-to-json'

import Rpc from '.'
import JsonRpcBatch from './JsonRpcBatch';


const {warn} = console


function isError(error)
{
  return error != null
      && typeof error.message === 'string'
      && typeof error.name    === 'string'
      && 'stack' in error  // 'stack' is not standard, but widely supported
}


export default class JsonRpc extends Rpc
{
  static Batch = JsonRpcBatch


  constructor(
    methods, {onWarn = warn, sendFullErrors, ...options} = {onWarn: warn}
  ) {
    super(methods, options)

    this.#onWarn = onWarn
    this.#sendFullErrors = sendFullErrors
  }


  //
  // Public API
  //

  async onMessage(message)
  {
    // Parse
    try {
      message = JSON.parse(message)
    }
    catch(data)
    {
      return this._stringify(this._encode({
        ack: null,  // Spec says `id` must be set to `null` if it can't be parsed
        error: {code: -32700, data, message: 'Invalid JSON'}
      }))
    }

    // Decode

    // Process
    return super.onMessage(message)
  }


  //
  // Hidden API
  //

  _encode(data)
  {
    if(data == null) return

    const {ack, error, id, method, params, result} = data

    // Throw error responses for notifications
    if(error && ack === undefined) throw error

    return {
      error,
      id: method ? id : ack,
      jsonrpc: '2.0',
      method,
      params,
      result,
      then: data.then?.bind(data)
    }
  }

  _processMessage({error, id, jsonrpc: data, method, ...rest})
  {
    // Validate
    if(data !== '2.0')
      return {
        ack: id ?? null,
        error: {
          code: -32600,
          data,
          message: `Invalid JsonRPC version '${data}'`
        }
      }

    // Deserialize errors
    if(error)
    {
      if(isError(error.data)) error.data = parse(error.data)
      if(isError(error     )) error      = parse(error)
    }

    // Process
    if(id === null)
    {
      if(!method) throw error

      this.#onWarn('Using `null` as requests `id` is discouraged')
    }

    return super._processMessage(
      {[method ? 'id' : 'ack']: id, error, method, ...rest}
    )
  }

  _stringify = data => {
    if(data == null) return

    const {then, ...rest} = data

    // Serialize errors
    const {error} = rest
    if(error)
    {
      let {code, data, message} = error

      if(error instanceof Error)
      {
        if(!error.uuid) error.uuid = randomUUID()

        if(this.#sendFullErrors)
          rest.error = errorToJSON(error)
        else
        {
          ({uuid: data} = error)

          // Remove stack trace
          rest.error = {code, data, message}
        }
      }
      else if(data instanceof Error)
      {
        if(!data.uuid) data.uuid = randomUUID()

        if(this.#sendFullErrors)
          data = errorToJSON(data)
        else
          ({uuid: data} = data)

        rest.error = {code, data, message}
      }
    }

    // Stringify message
    const result = new String(JSON.stringify(rest))

    result.error = error
    result.then  = then

    return result
  }


  //
  // Private API
  //

  #onWarn
  #sendFullErrors
}
