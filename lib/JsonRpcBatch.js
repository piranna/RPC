import Batch from "./Batch";


export default class JsonRpcBatch extends Batch
{
  _stringify(data)
  {
    return new String(JSON.stringify(data))
  }
}
