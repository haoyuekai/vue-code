import { isArray, isString, ShapeFlags } from '@vue/shared';

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
 * 创建虚拟节点的底层方法
 * @param type 节点类型
 * @param props 节点属性
 * @param children 子节点
 */
export function createVNode(type, props?, children = null) {
    let shapeFlag;

    if (isString(type)) {
        shapeFlag = ShapeFlags.ELEMENT;
    }

    if (isString(children)) {
        shapeFlag |= ShapeFlags.TEXT_CHILDREN;
    } else if (isArray(children)) {
        shapeFlag |= ShapeFlags.ARRAY_CHILDREN;
    }

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
        shapeFlag,
    };

    return vnode;
}
