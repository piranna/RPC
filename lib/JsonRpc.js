import Rpc from '.'


function format(data)
{
  if(data === undefined) return

  const {ack, ...rest} = data

  return stringify({id: ack, ...rest})
}

function stringify(data)
{
  return JSON.stringify({jsonrpc: '2.0', ...data})
}


export default class JsonRpc extends Rpc
{
  notification(method, ...params)
  {
    return stringify(super.notification(method, ...params))
  }

  async onMessage(message)
  {
    try {
      message = JSON.parse(message)
    }
    catch(data)
    {
      return stringify({
        error: {code: -32700, data, message: 'Invalid JSON'},
        id: null  // Spec says `id` must be set to `null` if it can't be parsed
      })
    }

    const {id, jsonrpc: data, method, ...rest} = message

    if(data !== '2.0')
      return format(super._reply(id, {
        code: -32600,
        data,
        message: `Invalid JsonRPC version '${data}'`
      }))

    return super.onMessage({[method ? 'id' : 'ack']: id, method, ...rest})
    .then(format)
  }

  request(method, ...params)
  {
    const request = super.request(method, ...params)

    const result = new String(stringify(request))

    result.then = request.then.bind(request)

    return result
  }
}
