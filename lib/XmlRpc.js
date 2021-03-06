import {decode, stringify} from 'xmlrpc-serialization'

import Rpc from '.'



export default class XmlRpc extends Rpc
{
  constructor(methods)
  {
    super(methods)

    // TODO use static instance
    this.#parser = new DOMParser()
  }


  //
  // Public API
  //

  async onMessage(message, ack)
  {
    // Parse
    const data = this.#parser.parseFromString(message, "text/xml")

    const {documentElement} = data

    if(documentElement.nodeName === "parsererror")
      return this._stringify(this._encode({
        ack,
        error: {code: -32700, data, message: 'parse error. not well formed'}
      }))

    // Decode
    try
    {
      message = decode(documentElement)
    }
    catch(data)
    {
      return this._stringify(this._encode({
        ack,
        error: {
          code: -32600,
          data,
          message: 'server error. invalid xml-rpc. not conforming to spec.'
        }
      }))
    }

    // Process
    return super.onMessage({[message.method ? 'id' : 'ack']: ack, ...message})
  }


  //
  // Hidden API
  //

  _processMessage({ack, ...message})
  {
    // Process
    return super._processMessage({[message.method ? 'id' : 'ack']: ack, ...message})
  }

  _stringify = data =>
  {
    if(data == null) return

    const result = new String(stringify(data))

    result.ack   = data.ack
    result.error = data.error?.data
    result.id    = data.id
    result.then  = data.then?.bind(data)

    return result
  }


  //
  // Private API
  //

  #parser
}
