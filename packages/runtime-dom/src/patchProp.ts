import { isOn } from '@vue/shared';
import { patchClass } from './modules/patchClass';
import { patchStyle } from './modules/patchStyle';
import { patchEvent } from './modules/events';
import { pathcAttrs } from './modules/patchAttrs';

/**
 * 1. class
 * 2. style
 * 3. event
 * 4. attrs
 * @param el
 * @param key
 * @param prevValue
 * @param nextValue
 * @returns
 */
export function patchProp(el, key, prevValue, nextValue) {
    //class
    if (key === 'class') {
        return patchClass(el, nextValue);
    }

    // style
    if (key === 'style') {
        return patchStyle(el, prevValue, nextValue);
    }

    // event
    if (isOn(key)) {
        return patchEvent(el, key, nextValue);
    }

    // attrs
    pathcAttrs(el, key, nextValue);
}
