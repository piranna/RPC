import {decode, stringify} from 'xmlrpc-serialization'

import Rpc from '.'


const parser = new DOMParser()


export default class XmlRpc extends Rpc
{
  // Parse
  async onMessage(message, ack)
  {
    const data = parser.parseFromString(message, "text/xml")

    const {documentElement} = data

    if(documentElement.nodeName === "parsererror")
      return this._format({
        ack,
        error: {code: -32700, data, message: 'parse error. not well formed'}
      })

    // Decode
    try
    {
      message = decode(documentElement)
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

    // Process
    return super.onMessage({[message.method ? 'id' : 'ack']: ack, ...message})
  }


  //
  // Protected API
  //

  _format(data)
  {
    const result = new String(stringify(data))

    result.ack   = data.ack
    result.error = data.error?.data
    result.id    = data.id

    if(data.then) result.then = data.then.bind(data)

    return result
  }
}
