import RpcClient from './RpcClient'


function ack2id(data)
{
  if(data === undefined) return

  const {ack: id, ...rest} = data

  return stringify({id, ...rest})
}

function stringify(data)
{
  return JSON.stringify({jsonrpc: '2.0', ...data})
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

    const {id, jsonrpc: data, method, ...rest} = message

    const promise = data === '2.0'
      ? super.onMessage({[method ? 'id' : 'ack']: id, method, ...rest})
      : Promise.resolve(super._reply(id, {
          code: -32600,
          data,
          message: `Invalid JsonRPC version '${data}'`
        }))

    return promise.then(ack2id)
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
