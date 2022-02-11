function isThenable({then})
{
  return then
}


export default class Batch
{
  constructor(rpc)
  {
    this.#rpc = rpc
  }


  //
  // Public API
  //

  notification(method, ...params)
  {
    this.#push(this.#rpc._notification(method, ...params))
  }

  async request(method, ...params)
  {
    const result = this.#rpc._request(method, ...params)

    this.#push(result)

    return result
  }

  run()
  {
    const requests = this.#requests

    this.#requests = []

    const promise = Promise.all(requests.filter(isThenable))

    const result = this._stringify ? this._stringify(requests) : requests

    this.#rpc._send?.(result)

    // Return empty `Promise` to know when all requests were settled, not what
    // they resolved
    result.then = promise.then.bind(promise, ()=>{})

    return result
  }


  //
  // Private API
  //

  #requests = []
  #rpc


  #push(request)
  {
    this.#requests.push(this.#rpc._encode(request))
  }
}
