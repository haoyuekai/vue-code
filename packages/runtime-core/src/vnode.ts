import {
    isArray,
    isFunction,
    isNumber,
    isObject,
    isString,
    ShapeFlags,
} from '@vue/shared';
import { getCurrentRenderingInstance } from './component';
import { isTeleport } from '@vue/runtime-dom';

/**
 * 文本节点标记
 */
export const Text = Symbol('v-txt');

/**
 * 判断两个节点是否是同一类型，决定节点是否可以复用（更新）
 * @param n1
 * @param n2
 * @returns
 */
export function isSameVNodeType(n1, n2) {
    return n1.type === n2.type && n1.key === n2.key;
}

/**
 * vnode标准化
 * @param vnode
 */
export function normalizeVNode(vnode) {
    if (isString(vnode) || isNumber(vnode)) {
        // string 或者 number 转换成文本节点
        return createVNode(Text, null, String(vnode));
    }
    return vnode;
}

/**
 * 标准化children
 * @param children
 */
function normalizeChildren(vnode, children) {
    let { shapeFlag } = vnode;

    if (isArray(children)) {
        shapeFlag |= ShapeFlags.ARRAY_CHILDREN;
    } else if (isObject(children)) {
        /**
         * eg: children = {header: () => h('div', '插槽 header')}
         */
        if (shapeFlag & ShapeFlags.COMPONENT) {
            // 如果是个组件，那就是插槽
            shapeFlag |= ShapeFlags.SLOTS_CHILDREN;
        }
    } else if (isFunction(children)) {
        /**
         * eg: children = () => h('div', '默认插槽')
         */
        if (shapeFlag & ShapeFlags.COMPONENT) {
            // 如果是个组件，那就是插槽
            shapeFlag |= ShapeFlags.SLOTS_CHILDREN;
            children = { default: children };
        }
    } else if (isString(children) || isNumber(children)) {
        children = String(children);
        shapeFlag |= ShapeFlags.TEXT_CHILDREN;
    }

    /**
     * 处理完成后重新赋值
     */

    vnode.shapeFlag = shapeFlag;
    vnode.children = children;
    return children;
}

function normalizeRef(ref) {
    if (ref == null) return;
    return {
        // 原始 ref
        r: ref,
        // 当前正在渲染的组件实例
        i: getCurrentRenderingInstance(),
    };
}

/**
 * 创建虚拟节点的底层方法
 * @param type 节点类型
 * @param props 节点属性
 * @param children 子节点
 */
export function createVNode(type, props?, children = null) {
    let shapeFlag = 0;

    // 处理 type 上的 shapeFlag
    if (isString(type)) {
        shapeFlag = ShapeFlags.ELEMENT;
    } else if (isTeleport(type)) {
        // Teleport 组件
        shapeFlag = ShapeFlags.TELEPORT;
    } else if (isObject(type)) {
        // 有状态组件
        shapeFlag = ShapeFlags.STATEFUL_COMPONENT;
    } else if (isFunction(type)) {
        // 函数式组件
        shapeFlag = ShapeFlags.FUNCTIONAL_COMPONENT;
    }

    const vnode = {
        // 虚拟节点标识
        __v_isVNode: true,
        type,
        props,
        children: null,
        // 做 diff 用
        key: props?.key,
        // 虚拟节点要挂载的节点
        el: null,
        shapeFlag,
        // 绑定 ref
        ref: normalizeRef(props?.ref),
        appContext: null,
    };

    /**
     * 处理 children 的 标准化 和 shapeFlag
     */
    normalizeChildren(vnode, children);

    return vnode;
}
