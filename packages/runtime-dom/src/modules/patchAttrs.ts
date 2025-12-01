export function pathcAttrs(el, key, value) {
    if (value == undefined) {
        // null 和 undefind
        el.removeAttribute(key);
    } else {
        el.setAttribute(key, value);
    }
}
