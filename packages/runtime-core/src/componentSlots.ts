import { ShapeFlags } from '@vue/shared';

export function initSlots(instance) {
    const { vnode, slots } = instance;
    if (vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
        // 组件的子元素是插槽
        const { children } = vnode;
        /**
         * eg: children = {header: () => h('div', '父组件传递的插槽')}
         */
        for (const key in children) {
            slots[key] = children[key];
        }
    }
}

export function updateSlots(instance, vnode) {
    const { slots } = instance;

    if (vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
        // 组件的子元素是插槽
        const { children } = vnode;
        /**
         * 将最新的全部更新到 solts 中
         */
        for (const key in children) {
            slots[key] = children[key];
        }
        /**
         * 把之前有的，现在没有的删掉
         * eg:
         * slots = {header: () => h('div', '...'), footer: () => h('div', '...')}
         * children = {header: () => h('div', '...')}
         */
        for (const key in slots) {
            if (children[key] == null) {
                delete slots[key];
            }
        }
    }
}
