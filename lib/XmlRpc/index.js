import Rpc from '..'

import parse from './parse'
import stringify from './stringify'


const parser = new DOMParser()


export default class XmlRpc extends Rpc
{
  async onMessage(message, ack)
  {
    const data = parser.parseFromString(message, "text/xml")

    if(data.documentElement.nodeName === "parsererror")
      return this._format({
        ack,
        error: {code: -32700, data, message: 'parse error. not well formed'}
      })

    try
    {
      message = parse(data.documentElement)
    }
    catch(data)
    {
      return this._format({
        ack,
        error: {
          code: -32600,
          data,
          message: 'server error. invalid xml-rpc. not conforming to spec.'
        }
      })
    }

    return super.onMessage({ack, id: ack, ...message})
    .then(this._format)
  }


  //
  // Protected API
  //

  _format(data)
  {
    if(data === undefined) return

    const result = new String(stringify(data))

    result.ack = data.ack
    result.id  = data.id

    if(data.then) result.then = data.then.bind(data)

    return result
  }
}
