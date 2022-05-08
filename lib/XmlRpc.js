import {decode, stringify} from 'xmlrpc-serialization'

import XmlRpcBatch from './XmlRpcBatch.js'
import Rpc from './index.js'


export default class XmlRpc extends Rpc
{
  static Batch = XmlRpcBatch


  constructor(methods, options)
  {
    super(methods, options)

    if(XmlRpc.#parseFromString) return

    const parser = new DOMParser()
    XmlRpc.#parseFromString = parser.parseFromString.bind(parser)
  }


  //
  // Rpc interface
  //

  async onMessage(message, ack)
  {
    // Parse
    const data = XmlRpc.#parseFromString(message.toString(), "text/xml")

    const {documentElement} = data

    if(!documentElement || documentElement.nodeName === "parsererror")
    {
      const error = {code: -32700, data, message: 'parse error. not well formed'}

      return this._ess({ack, error})
    }

    // Decode
    try
    {
      message = decode(documentElement)
    }
    catch(data)
    {
      const error = {
        code: -32600,
        data,
        message: 'server error. invalid xml-rpc. not conforming to spec.'
      }

      return this._ess({ack, error})
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
    return new String(stringify(data))
  }


  //
  // Private API
  //

  static #parseFromString
}
