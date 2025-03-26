import { JSONStringify } from 'json-with-bigint';

import Batch from "./Batch.js";


export default class JsonRpcBatch extends Batch
{
  _stringify(data)
  {
    return new String(JSONStringify(data))
  }
}
