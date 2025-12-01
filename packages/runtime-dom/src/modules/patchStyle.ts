export function patchStyle(el, prevValue, nextValue) {
    const style = el.style;

    /**
     * 把之前有的，但是现在没有的，删 掉
     */
    if (prevValue) {
        for (const key in prevValue) {
            if (!(key in nextValue)) {
                style[key] = null;
            }
        }
    }

    /**
     * 新的样式全部生效，设置到style上
     */
    if (nextValue) {
        for (const key in nextValue) {
            style[key] = nextValue[key];
        }
    }
}
