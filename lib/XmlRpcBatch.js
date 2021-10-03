function extractMethodParams({method, params})
{
  return {method, params}
}

function forEachResult({fault, result}, index, results)
{
  const {reject, resolve} = results[index]

  if(fault) return reject(fault)

  resolve(result)
}


export default class XmlRpcBatch
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
    request(method, ...params)
  }

  request(method, ...params)
  {
    const result = new Promise((resolve, reject) =>
    {
      this.#requests.push({method, params, reject, resolve})
    })

    return result
  }

  run()
  {
    const requests = this.#requests

    this.#requests = []

    return this.#rpc.request(
      'system.multicall', [requests.map(extractMethodParams)]
    )
    // Use `forEach` to return `undefined`, we want to know when it gets
    // settled, not the results `Array` it resolved
    .then(results.forEach.bind(results, forEachResult))
  }


  //
  // Private API
  //

  #requests = []
  #rpc
}
