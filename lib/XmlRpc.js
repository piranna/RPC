import {decode, stringify} from 'xmlrpc-serialization'

import XmlRpcBatch from './XmlRpcBatch'
import Rpc from './index'


export default class XmlRpc extends Rpc
{
  static Batch = XmlRpcBatch


  static #parseFromString


  constructor(methods, options)
  {
    super(methods, options)

    if(!XmlRpc.#parseFromString)
    {
      const parser = new DOMParser()

      XmlRpc.#parseFromString = parser.parseFromString.bind(parser)
    }
  }


  //
  // Public API
  //

  createBatch()
  {
    return new XmlRpcBatch(this)
  }

  async onMessage(message, ack)
  {
    // Parse
    const data = XmlRpc.#parseFromString(message.toString(), "text/xml")

    const {documentElement} = data

    if(!documentElement || documentElement.nodeName === "parsererror")
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

    if(message.method === 'system.multicall') message = message.params

    // Process
    return super.onMessage({...message, ack})
  }


  //
  // Hidden API
  //

  _decode({ack, method, ...rest})
  {
    // Process
    return {
      [method ? 'id' : 'ack']: ack,
      method,
      ...rest
    }
  }

  _stringify(data)
  {
    const result = new String(stringify(data))

    result.ack   = data.ack
    result.error = data.error
    result.id    = data.id
    result.then  = data.then?.bind(data)

    return result
  }
}
