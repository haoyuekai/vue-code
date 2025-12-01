import { hasChanged, isObject } from '@vue/shared';
import { activeSub } from './effect';
import { Dependency, link, Link, propagate } from './system';
import { reactive } from './reactive';

// 枚举
export enum ReactiveFlags {
    IS_REF = '__v_isRef',
}

/**
 * Ref类
 */
class RefImpl implements Dependency {
    // 保存实际的值
    _value;

    // ref 标记，证明是 ref
    [ReactiveFlags.IS_REF] = true;

    /**
     * 订阅者链表的头结点（head）
     */
    subs: Link;

    /**
     * 订阅者链表的尾节点（tail）
     */
    subsTail: Link;

    constructor(value) {
        /**
         * 如果value是对象，使用reactive生成响应式对象
         */
        this._value = isObject(value) ? reactive(value) : value;
    }

    // 收集依赖
    get value() {
        // 存在activeSub，保存到subs，等到更新的时候触发
        if (activeSub) {
            trackRef(this);
        }

        return this._value;
    }

    // 触发更新
    set value(newValue) {
        // 只有在值发生变化之后，才触发更新
        if (hasChanged(newValue, this._value)) {
            this._value = isObject(newValue) ? reactive(newValue) : newValue;
            triggerRef(this);
        }
    }
}

export function ref(value) {
    return new RefImpl(value);
}

/**
 * 判断是否ref
 * @param value
 * @returns
 */
export function isRef(value) {
    return !!(value && value[ReactiveFlags.IS_REF]);
}

/**
 * 收集依赖，建立 ref 和 effect 的链表关系
 * @param dep
 */
export function trackRef(dep) {
    if (activeSub) {
        link(dep, activeSub);
    }
}

/**
 * 触发 ref 关联的 effect 重新执行
 * @param dep
 */
export function triggerRef(dep) {
    if (dep.subs) {
        propagate(dep.subs);
    }
}

class ObjectRefImpl {
    [ReactiveFlags.IS_REF] = true;
    constructor(
        public _object,
        public _key,
    ) {}

    get value() {
        return this._object[this._key];
    }

    set value(newValue) {
        this._object[this._key] = newValue;
    }
}

export function toRef(object, key) {
    return new ObjectRefImpl(object, key);
}

export function toRefs(target) {
    // 源码会先判断target是否是响应式对象，不是的话，抛出错误，此处暂不实现
    const res = Array.isArray(target) ? new Array(target.length) : {};
    for (const key in target) {
        res[key] = new ObjectRefImpl(target, key);
    }
    return res;
}

export function unref(value) {
    return isRef(value) ? value.value : value;
}

// 源码中未导出，
export function proxyRefs(target) {
    return new Proxy(target, {
        get(target, key, receiver) {
            /**
             * 自动解包
             * target[key]是ref,返回ref.value
             * 不是ref,返回target[key]
             */
            const res = Reflect.get(target, key, receiver);

            return unref(res);
        },

        set(target, key, newValue, receiver) {
            const oldValue = target[key];
            /**
             * 如果更新了 target[key]，它之前是ref,同步修改原始ref.value
             * 如果newValue是ref,不修改原始ref.value
             * example: a = ref(0) target = { a }
             * target.a = 1 // 同步更新a.value
             * target.a = ref(1) // 不更新a.value
             */
            if (isRef(oldValue) && !isRef(newValue)) {
                oldValue.value = newValue;
                return true;
            }
            return Reflect.set(target, key, newValue, receiver);
        },
    });
}
