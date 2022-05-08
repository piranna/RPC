import Batch from "./Batch.js";


export default class JsonRpcBatch extends Batch
{
  _stringify(data)
  {
    return new String(JSON.stringify(data))
  }
}
