import Rpc from '.'


function format(data)
{
  if(data === undefined) return

  const {ack: id, error, ...rest} = data

  // Throw error responses for notifications
  if(error && id === undefined) throw error

  return JSON.stringify({error, id, jsonrpc: '2.0', ...rest})
}


export default class JsonRpc extends Rpc
{
  async onMessage(message)
  {
    try {
      message = JSON.parse(message)
    }
    catch(data)
    {
      return format({
        ack: null,  // Spec says `id` must be set to `null` if it can't be parsed
        error: {code: -32700, data, message: 'Invalid JSON'}
      })
    }

    const {id: ack, jsonrpc: data, method, ...rest} = message

    if(data !== '2.0')
      return format({
        ack,
        error: {
          code: -32600,
          data,
          message: `Invalid JsonRPC version '${data}'`
        }
      })

    return super.onMessage({[method ? 'id' : 'ack']: ack, method, ...rest})
    .then(format)
  }

  request(method, ...params)
  {
    const request = super.request(method, ...params)

    const result = new String(format(request))

    result.then = request.then.bind(request)

    return result
  }


  //
  // Protected API
  //

  _format(data)
  {
    return format(data)
  }
}
