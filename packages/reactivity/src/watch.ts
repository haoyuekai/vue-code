import { isFunction, isObject } from '@vue/shared';
import { ReactiveEffect } from './effect';
import { isRef } from './ref';
import { isReactive } from './reactive';

export function watch(source, cb, options) {
    let { immediate, once, deep } = options || {};

    if (once) {
        // 如果传了once,保存一个新的cb,直接调用原来的cb,然后stop停止监听
        const _cb = cb;
        cb = (...args) => {
            _cb(...args);
            stop();
        };
    }

    let getter;

    if (isRef(source)) {
        getter = () => source.value;
    } else if (isReactive(source)) {
        // 如果是reactive,那就把deep置为true,但是如果手动传了deep,就以传入的值为主
        getter = () => source;
        if (!deep) {
            deep = true;
        }
    } else if (isFunction(source)) {
        // 如果source是函数，直接赋值
        getter = source;
    }

    if (deep) {
        const baseGetter = getter;
        const depth = deep === true ? Infinity : deep;
        getter = () => traverse(baseGetter(), depth);
    }

    let oldValue;

    let cleanup = null;

    function onCleanup(cb) {
        cleanup = cb;
    }

    function job() {
        if (cleanup) {
            // 情理上一次的副作用，清理完成，置空
            cleanup();
            cleanup = null;
        }

        // 拿到getter的返回值，此处不能执行getter,因为要收集依赖
        const newValue = effect.run();
        // 执行用户回调
        cb(newValue, oldValue, onCleanup);
        // 下次的oldValue保存本次的newValue
        oldValue = newValue;
    }

    const effect = new ReactiveEffect(getter);

    effect.scheduler = job;

    if (immediate) {
        // 传了immediate,直接执行一次job
        job();
    } else {
        // 拿到oldValue,并且收集依赖
        oldValue = effect.run();
    }

    // 停止监听
    function stop() {
        effect.stop();
    }

    return stop;
}

/**
 * 递归触发getter
 * @param value
 * @param depth
 * @param seen
 * @returns
 */
function traverse(value, depth = Infinity, seen = new Set()) {
    // 如果不是对象 || 监听层级到了，直接返回value
    if (!isObject(value) || depth <= 0) {
        return value;
    }

    // 如果之前访问过，直接返回，防止循环引用栈溢出
    if (seen.has(value)) {
        return value;
    }

    // 层级 -1
    depth--;

    seen.add(value);

    for (const key in value) {
        // 递归触发getter
        traverse(value[key], depth, seen);
    }
    return value;
}
