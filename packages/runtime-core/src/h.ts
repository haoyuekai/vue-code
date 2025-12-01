/**
 * h 函数使用方法
 * 1. const vnode = h('div', 'Hello world!');
 * 2. const vnode = h('div', h('span', 'Hello world!'));
 * 3. const vnode = h('div', [h('span', 'Hello'), h('span', ' world!')]);
 * 4. const vnode = h('div', h('span', 'Hello world!'));
 * -------
 * 5. const vnode = h('div', { class: 'container' }, 'Hello world!');
 * 6. const vnode = h('div', { class: 'container' }, h('span', 'Hello world!'));
 * 7. const vnode = h('div', { class: 'container' }, h('span', 'Hello'), h('span', ' world!'));
 * 8. const vnode = h('div', { class: 'container' }, [h('span', 'Hello'), h('span', ' world!')]);
 */

import { isArray, isObject } from '@vue/shared';

export function h(type, propsOrChildren?, children?) {
    /**
     * h 函数的主要作用是对 createVNode 做一个参数标准化（归一化）
     */

    let l = arguments.length;

    if (l === 2) {
        if (isArray(propsOrChildren)) {
            // const vnode = h('div', [h('span', 'Hello'), h('span', ' world!')]);
            return createVNode(type, null, propsOrChildren);
        }

        if (isObject(propsOrChildren)) {
            if (isVNode(propsOrChildren)) {
                // const vnode = h('div', h('span', 'Hello world!'));
                return createVNode(type, null, [propsOrChildren]);
            } else {
                // const vnode = h('div', h('span', 'Hello world!'));
                return createVNode(type, propsOrChildren, children);
            }
        }

        // onst vnode = h('div', 'Hello world!');
        return createVNode(type, null, propsOrChildren);
    } else {
        if (l > 3) {
            /**
             * const vnode = h('div', { class: 'container' }, h('span', 'Hello'), h('span', ' world!'));
             * ==>
             * const vnode = h('div', { class: 'container' }, [h('span', 'Hello'), h('span', ' world!')]);
             */
            children = [[...arguments].slice(2)];
        } else if (isVNode(children)) {
            children = [children];
        }

        return createVNode(type, propsOrChildren, children);
    }
}

/**
 * 根据 __v_isVNode 判断是否是虚拟节点
 * @param value
 * @returns
 */
function isVNode(value) {
    return value?.__v_isVNode;
}

/**
 * 创建虚拟节点的底层方法
 * @param type 节点类型
 * @param props 节点属性
 * @param children 子节点
 */
function createVNode(type, props?, children?) {
    const vnode = {
        // 虚拟节点标识
        __v_isVNode: true,
        type,
        props,
        children,
        // 做 diff 用
        key: props?.key,
        // 虚拟节点要挂载的节点
        el: null,
    };

    return vnode;
}
