import { hasChanged, isObject } from '@vue/shared';
import { activeSub } from './effect';
import { link, Link, propagate } from './system';
import { reactive } from './reactive';

// 枚举
export enum ReactiveFlags {
    IS_REF = '__v_isRef',
}

/**
 * Ref类
 */
class RefImpl {
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
