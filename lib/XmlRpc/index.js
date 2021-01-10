import Rpc from '..'

import parse from './parse'
import stringify from './stringify'


function format(data)
{
  if(data === undefined) return

  data.xml = stringify(data)

  return data
}


export default class XmlRpc extends Rpc
{
  async onMessage(message, ack)
  {
    const parser = new DOMParser()
    const data = parser.parseFromString(message, "text/xml")

    if(data.documentElement.nodeName === "parsererror")
      return format({
        ack,
        error: {code: -32700, data, message: 'parse error. not well formed'}
      })

    try
    {
      message = parse(data.documentElement)
    }
    catch(data)
    {
      return format({
        ack,
        error: {
          code: -32600,
          data,
          message: 'server error. invalid xml-rpc. not conforming to spec.'
        }
      })
    }

    return super.onMessage({ack, id: ack, ...message})
    .then(format)
  }

  request(method, ...params)
  {
    const request = super.request(method, ...params)

    return {
      id: request.id,
      then: request.then.bind(request),
      xml: stringify(request)
    }
  }


  //
  // Protected API
  //

  _format(data)
  {
    return format(data)
  }
}
