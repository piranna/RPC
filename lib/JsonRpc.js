import Rpc from '.'


export default class JsonRpc extends Rpc
{
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

    // Process
    if(id === null)
    {
      if(!method) throw error

      console.warn('Using `null` as requests `id` is discouraged')
    }

    return super._processMessage({[method ? 'id' : 'ack']: id, error, method, ...rest})
  }

  _stringify = data => {
    if(data == null) return

    const {then, ...rest} = data

    let result = JSON.stringify(rest)

    if(then)
    {
      result = new String(result)
      result.then = then
    }

    return result
  }
}
