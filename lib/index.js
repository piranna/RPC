import RpcClient from './RpcClient'


function stringify(data)
{
  return data !== undefined
    ? JSON.stringify({jsonrpc: '2.0', ...data})
    : undefined
}


export default class JsonRpcClient extends RpcClient
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

    const {jsonrpc: data, ...rest} = message

    return data === '2.0'
      ? super.onMessage(rest).then(stringify)
      : stringify(super._reply(rest.id, {
          code: -32600,
          data,
          message: `Invalid JsonRPC version '${data}'`
        }))
  }

  request(method, ...params)
  {
    const request = super.request(method, ...params)

    const result = new String(stringify(request))

    result.then = request.then.bind(request)

    return result
  }
}


export {RpcClient}
