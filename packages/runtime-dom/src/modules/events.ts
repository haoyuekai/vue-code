function createInvoker(value) {
    /**
     * 创建一个事件处理函数，内部调用invoker.value
     * 如果需要更新事件，后面直接修改invoker.value，就可以完成事件换绑
     */
    const invoker = e => {
        invoker.value();
    };

    invoker.value = value;

    return invoker;
}

const veiKey = Symbol('_vei');

/**
 * fn1 = () => {console.log(1)}
 * fn2 = () => {console.log(2)}
 * 避免每次解绑后再绑定同一事件
 * click el.addEventListener('click', (e) => { fn1(e) => fn2(e) })
 */
export function patchEvent(el, rawName, nextValue) {
    const name = rawName.slice(2).toLowerCase();

    const invokers = (el[veiKey] ??= {});
    // 等价于 el._vei = el._vei ?? {};

    // 拿到之前绑定的 invoker
    const existingInvoker = invokers[rawName];
    if (nextValue) {
        if (existingInvoker) {
            // 之前绑定过，更新invoker.value,完成事件换绑
            return (existingInvoker.value = nextValue);
        }

        // 之前未绑定过，创建一个新的invoker,完成绑定，并记录invoker
        const invoker = createInvoker(nextValue);
        invokers[rawName] = invoker;
        el.addEventListener(name, invoker);
    } else {
        if (existingInvoker) {
            /**
             * 如果老的事件有，新的事件没有，进行解绑
             */
            el.removeEventListener(name, existingInvoker);
            // delete invokers[rawName];
            invokers[rawName] = null;
        }
    }
}
