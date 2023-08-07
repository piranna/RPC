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

  _decode({ack, error, method, ...rest})
  {
    // Deserialize errors
    if(error) error = this.#decodeError(error)

    // Process
    return {
      [method ? 'id' : 'ack']: ack,
      error,
      method,
      ...rest
    }
  }

  async _onMessage(message, ack)
  {
    // Parse
    const cause = XmlRpc.#parseFromString(message.toString(), "text/xml")

    const {documentElement} = cause

    if(!documentElement || documentElement.nodeName === "parsererror")
    {
      const error = new Error('parse error. not well formed', {cause})
      error.code = -32700

      return this._ess({ack, error})
    }

    // Decode
    try
    {
      message = decode(documentElement)
    }
    catch(cause)
    {
      const error = new Error(
        'server error. invalid xml-rpc. not conforming to spec.', {cause}
      )
      error.code = -32600

      return this._ess({ack, error})
    }

    if(message.method === 'system.multicall') message = message.params

    // Process
    return {...message, ack}
  }

  _stringify(data)
  {
    return new String(stringify(data))
  }


  //
  // Private API
  //

  static #parseFromString

  #decodeError({faultCode, faultString})
  {
    const error = new Error(faultString)
    error.code = faultCode

    return error
  }
}
