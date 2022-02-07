import {randomUUID} from 'crypto';

import etj from 'error-to-json'

import JsonRpcBatch from './JsonRpcBatch'
import Rpc from './index'


const {warn} = console
const {default: errorToJSON, parse} = etj


function hasMessage(error)
{
  return error != null
      && typeof error.message === 'string'
}

function isError(error)
{
  return hasMessage(error)
      && typeof error.name === 'string'
      && 'stack' in error  // 'stack' is not standard, but widely supported
}

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
  // TODO: detect responses with `undefined` value
  return status === 'rejected' || value !== undefined
}

function getReason({reason})
{
  return reason
}

function getResult({reason: error, value})
{
  return error ? {error} : value
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

  createBatch()
  {
    return new JsonRpcBatch(this)
  }

  async onMessage(data)
  {
    // Parse
    try {
      data = JSON.parse(data)
    }
    catch(data)
    {
      // JsonRPC 2.0 spec says `id` must be set to `null` if it can't be parsed
      const ack = null

      return this._stringify(this._encode({
        ack, error: {code: -32700, data, message: 'Parse error'}
      }))
    }

    // Validate batch messages
    if(Array.isArray(data) && !data.length)
      return this._stringify(this._encode({
        ack: null,
        error: {
          code: -32600,
          message: 'Empty batch request'
        }
      }))

    // Process
    return super.onMessage(data)
  }


  //
  // Hidden API
  //

  _agregateResults(results)
  {
    // There's at least one successful or failed response to reply back
    if(results.some(isFulfilledResponse))
      return results.filter(filterResponses).map(getResult)

    // There's nothing to send to the requester, throw errors locally (if any)
    const rejected = results.filter(filterRejected)
    if(rejected.length) {
      const error = new AggregateError(rejected.map(getReason))
      error.rejected = rejected  // TODO: replace by `reason` in the future

      throw error
    }
  }

  _encode(data)
  {
    const {ack, error, id, method, params, result, then} = data

    // Throw error responses for notifications
    if(error && ack === undefined) throw error

    return {
      error,
      id: method ? id : ack,
      jsonrpc: '2.0',
      method,
      params,
      result,
      then: then?.bind(data)
    }
  }

  _decode({error, id, method, ...rest})
  {
    // Deserialize errors
    if(error)
    {
      if(hasMessage(error.data)) error.data = parse(error.data)
      if(hasMessage(error     )) error      = parse(error)
    }

    // Process
    return {
      [method ? 'id' : 'ack']: id,
      error,
      method,
      ...rest
    }
  }

  _stringify(data)
  {
    if(Array.isArray(data)) return new String(JSON.stringify(data))

    const {then, ...rest} = data

    // Serialize errors
    const {error} = rest
    if(error)
    {
      // Only `code`, `data` and `message` fields are required by JsonRPC 2.0
      // https://www.jsonrpc.org/specification#error_object
      let {code, data, message} = error

      if(isError(error))
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
      else if(isError(data))
      {
        if(!data.uuid) data.uuid = randomUUID()

        if(this.#sendFullErrors)
          data = errorToJSON(data)
        else
          ({uuid: data} = data)

        // Remove stack trace
        rest.error = {code, data, message}
      }

      data = rest
    }

    // Stringify message
    const result = new String(JSON.stringify(rest))

    result.error = error
    result.then  = then

    return result
  }


  _validate({ack, id, jsonrpc: data, method})
  {
    if(data !== '2.0')
      return {
        ack: ack ?? id ?? null,
        error: {
          code: -32600,
          data,
          message: `Invalid JsonRPC version '${data}'`
        }
      }

    if(method && id === null)
      this.#onWarn('Using `null` as requests `id` is discouraged')

    return super._validate({ack, method})
  }

  //
  // Private API
  //

  #onWarn
  #sendFullErrors
}
