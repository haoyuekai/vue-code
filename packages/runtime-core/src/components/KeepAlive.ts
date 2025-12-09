import { ShapeFlags } from '@vue/shared';
import { getCurrentInstance } from '../component';

export const isKeepAlive = type => type?.__isKeepAlive;

export const KeepAlive = {
    name: 'KeepAlive',
    __isKeepAlive: true,
    props: ['max'],
    setup(props, { slots }) {
        const instance = getCurrentInstance();

        const { options, unmount } = instance.ctx.renderer;
        const { createElement, insert } = options;

        const cache = new LRUCache(props.max);

        //
        const storageContainer = createElement('div');

        /**
         * 激活的时候， renderer.ts 调用这个方法，
         * 在 keep-alive 中，将之前缓存的 DOM 元素，移动到 container 中
         * @param vnode
         * @param container
         * @param anchor
         */
        instance.ctx.activate = (vnode, container, anchor) => {
            insert(vnode.el, container, anchor);
        };

        /**
         * unmount 不卸载组件，这里处理虚拟节点的 dom，不在展示在页面上
         * @param vnode
         */
        instance.ctx.deactivate = vnode => {
            insert(vnode.el, storageContainer);
        };

        return () => {
            const vnode = slots.default();

            const key = vnode.key != null ? vnode.key : vnode.type;

            const cacheVNode = cache.get(key);

            if (cacheVNode) {
                /**
                 * 复用缓存过的组件实例
                 * 复用缓存过的 dom 元素
                 */
                vnode.component = cacheVNode.component;
                vnode.el = cacheVNode.el;
                /**
                 * 标记 keep-alive, 通知 renderer.ts (processComponent), 不要重新挂载，我要复用之前的
                 */
                vnode.shapeFlag |= ShapeFlags.COMPONENT_KEPT_ALIVE;
            }
            /**
             * 缓存 vnode
             * component => vnode
             * 或者
             * key => vnode
             */
            const _vnode = cache.set(key, vnode);

            /**
             * 超出限制，卸载最久没使用的节点
             */
            if (_vnode) {
                resetShapeFlag(_vnode);
                unmount(_vnode);
            }

            /**
             * 标记为 keep-alive， 通知 unmount 的时候不卸载
             */
            vnode.shapeFlag |= ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE;

            return vnode;
        };
    },
};

/**
 * 清除 keep-alive 的两个标记
 * @param vnode
 */
function resetShapeFlag(vnode) {
    vnode.shapeFlag &= ~ShapeFlags.COMPONENT_KEPT_ALIVE;
    vnode.shapeFlag &= ~ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE;
}

class LRUCache {
    cache = new Map();
    max;
    constructor(max = Infinity) {
        this.max = max;
    }

    get(key) {
        if (!this.cache.has(key)) return null;
        /**
         * 移动 key 到后面
         */
        const value = this.cache.get(key);
        this.cache.delete(key);
        this.cache.set(key, value);
        return value;
    }

    set(key, value) {
        let vnode;
        if (this.cache.has(key)) {
            this.cache.delete(key);
            this.cache.set(key, value);
        } else {
            if (this.cache.size >= this.max) {
                const firstKey = this.cache.keys().next().value;
                vnode = this.cache.get(firstKey);
                this.cache.delete(firstKey);
            }
            this.cache.set(key, value);
        }
        // 超限自动删除的节点
        return vnode;
    }
}
