import {randomUUID} from 'crypto';

import {errToJSON, parse} from 'error-to-json'

import JsonRpcBatch from './JsonRpcBatch.js'
import Rpc from './index.js'


const {warn} = console


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
  // Rpc interface
  //

  async onMessage(cause)
  {
    // JsonRPC 2.0 spec says `id` must be set to `null` if it can't be parsed
    const ack = null

    // Parse
    try {
      cause = JSON.parse(cause)
    }
    catch(cause)
    {
      const error = new Error('Parse error', {cause})
      error.code = -32700

      return this._ess({ack, error})
    }

    // Validate batch messages
    if(Array.isArray(cause) && !cause.length)
    {
      const error = new Error('Empty batch request', {cause})
      error.code = -32600

      return this._ess({ack, error})
    }

    // Process
    return super.onMessage(cause)
  }


  //
  // Hidden API
  //

  _aggregateResults(results)
  {
    // There's at least one successful or failed response to reply back
    if(results.some(isFulfilledResponse))
      return results.filter(filterResponses).map(getResult)

    // There's nothing to send to the requester, throw errors locally (if any)
    const rejected = results.filter(filterRejected)
    if(rejected.length) throw new AggregateError(rejected.map(getReason))
  }

  _decode({error, id, method, ...rest})
  {
    // Deserialize errors
    if(error)
    {
      if(hasMessage(error.data)) error.data = parse(error.data)
      if(hasMessage(error     )) error      = parse(error)

      if(error.data !== undefined && error.cause === undefined)
      {
        error.cause = error.data
        delete error.data
      }
    }

    // Process
    return {
      [method ? 'id' : 'ack']: id,
      error,
      method,
      ...rest
    }
  }

  _encode(data)
  {
    const {ack, id, method, params, result, then} = data
    let {error} = data

    // Throw error responses for notifications
    if(error && ack === undefined)
    {
      if(hasMessage(error.data)) error.data = parse(error.data)
      if(hasMessage(error     )) error      = parse(error)

      if(error.data !== undefined && error.cause === undefined)
      {
        error.cause = error.data
        delete error.data
      }

      throw error
    }

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

  _stringify(data)
  {
    return new String(
      JSON.stringify(
        Array.isArray(data) ? data.map(this.#serialize) : this.#serialize(data)
      )
    )
  }

  _validate({ack, id, jsonrpc: cause, method})
  {
    if(cause !== '2.0')
    {
      const error = new Error(`Invalid JsonRPC version '${cause}'`, {cause})
      error.code = -32600

      return error
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


  #serialize = result =>
  {
    const {error} = result
    if(error)
    {
      // Only `code`, `data` and `message` fields are required by JsonRPC 2.0
      // https://www.jsonrpc.org/specification#error_object
      let {code, cause: data, message} = error

      if(isError(error))
      {
        if(!error.uuid) error.uuid = randomUUID()

        let json

        if(this.#sendFullErrors)
        {
          json = errToJSON(error)

          if(json.cause !== undefined && json.data === undefined)
          {
            json.data = json.cause
            delete json.cause
          }
        }
        else
        {
          ({uuid: data} = error)

          // Remove non-essential fields
          json = {code, data, message}
        }

        result.error = json
      }

      else if(isError(data))
      {
        if(!data.uuid) data.uuid = randomUUID()

        let json

        if(this.#sendFullErrors)
        {
          json = errToJSON(data)

          if(json.cause !== undefined && json.data === undefined)
          {
            json.data = json.cause
            delete json.cause
          }
        }
        else
        {
          ({uuid: data} = data)

          // Remove non-essential fields
          json = {code, data, message}
        }

        error.data = json
      }
    }

    return result
  }
}
