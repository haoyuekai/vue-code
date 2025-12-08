import { isObject } from '@vue/shared';
import { mutableHandlers } from './baseHandlers';

export function reactive(target) {
    return createReactiveObject(target);
}

/**
 * 用来保存target和响应式对象之间的关联关系
 */
const reactiveMap = new WeakMap();

/**
 * 用来保存所有使用reactive创建出来的响应式对象
 */
const reactiveSet = new WeakSet();

/**
 * 创建target的代理对象
 * @param {*} target
 * @returns
 */
function createReactiveObject(target) {
    if (!isObject(target)) {
        return target;
    }

    // 如果 target 是 dom 元素，直接返回
    if (target instanceof HTMLElement) {
        return target;
    }

    // 如果reactiveSet中有target,说明target本身是响应式对象，直接返回
    if (isReactive(target)) {
        return target;
    }
    // 如果target之前使用reactive创建过响应式对象，直接返回
    const existingProxy = reactiveMap.get(target);
    if (existingProxy) {
        return existingProxy;
    }

    const proxy = new Proxy(target, mutableHandlers);

    // 保存target和响应式对象之间的关联关系
    reactiveMap.set(target, proxy);
    // 保存响应式对象到reactiveSet
    reactiveSet.add(proxy);

    return proxy;
}

/**
 * 判断target是否是响应式对象
 * @param target
 * @returns
 */
export function isReactive(target) {
    return reactiveSet.has(target);
}
