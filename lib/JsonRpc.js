import Rpc from '.'


export default class JsonRpc extends Rpc
{
  // Parse
  async onMessage(message)
  {
    try {
      message = JSON.parse(message)
    }
    catch(data)
    {
      return this._format({
        ack: null,  // Spec says `id` must be set to `null` if it can't be parsed
        error: {code: -32700, data, message: 'Invalid JSON'}
      })
    }

    // Decode
    const {id: ack, jsonrpc: data, ...rest} = message

    if(data !== '2.0')
      return this._format({
        ack,
        error: {
          code: -32600,
          data,
          message: `Invalid JsonRPC version '${data}'`
        }
      })

    // Process
    return super.onMessage({ack, id: ack, ...rest})
  }


  //
  // Protected API
  //

  _format(data)
  {
    const {ack: id, error, ...rest} = data

    // Throw error responses for notifications
    if(error && id === undefined) throw error

    let result = JSON.stringify({error, id, jsonrpc: '2.0', ...rest})

    if(data.then)
    {
      result = new String(result)

      result.then = data.then.bind(data)
    }

    return result
  }
}
