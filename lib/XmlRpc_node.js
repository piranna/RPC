// import domparser from '@journeyapps/domparser'
import {DOMParser} from '@xmldom/xmldom'


// Ensure we don't override the global
if(!globalThis.DOMParser) globalThis.DOMParser = DOMParser


export {default} from './XmlRpc'
