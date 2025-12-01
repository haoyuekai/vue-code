export function patchClass(el, value) {
    if (value == undefined) {
        // null 和 undefind
        el.removeAttribute('class');
    } else {
        el.className = value;
    }
}
