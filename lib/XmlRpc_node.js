import {DOMParser} from '@xmldom/xmldom'


// Ensure we don't override the global
if(!global.DOMParser) global.DOMParser = DOMParser


export {default} from './XmlRpc'
