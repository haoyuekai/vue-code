import { render } from '@vue/runtime-dom';
import { ShapeFlags } from '@vue/shared';
import { isSameVNodeType } from './vnode';
import { patchClass } from 'packages/runtime-dom/src/modules/patchClass';

/**
 * // 提供 将虚拟节点渲染到页面上的功能
 * @param options
 * @returns
 */
export function createRenderer(options) {
    const {
        insert: hostInsert,
        createElement: hostCreateElement,
        setElementText: hostSetElementText,
        createText: hostCreateText,
        setText: hostSetText,
        parentNode: hostParentNode,
        nextSibling: hostNextSibling,
        querySelector: hostQuerySelector,
        remove: hostRemove,
        patchProp: hoostPatchProp,
    } = options;

    /**
     * 卸载子元素
     * @param children
     */
    const unmountChildren = children => {
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            // 递归卸载
            unmount(child);
        }
    };

    /**
     * 卸载
     * @param vnode
     */
    const unmount = vnode => {
        const { el, shapeFlag, children } = vnode;

        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            // 子节点是数组

            unmountChildren(children);
        }
        // 移除之前挂载时dom
        hostRemove(el);
    };

    /**
     * 挂载子元素
     * @param children
     * @param el
     */
    const mountChildren = (children, el) => {
        for (let i = 0; i < children.length; i++) {
            const child = children[i];
            // 递归挂载子节点
            patch(null, child, el);
        }
    };

    /**
     * 挂载节点
     * 1. 创建一个dom节点
     * 2. 设置他的 props
     * 3. 挂载他的子节点
     * @param vnode
     * @param container
     */
    const mountElement = (vnode, container) => {
        const { type, props, children, shapeFlag } = vnode;

        // 创建dom元素
        const el = hostCreateElement(type);
        // 保存el到vnode上，后续卸载更新等功能使用
        vnode.el = el;

        // 设置props
        if (props) {
            for (const key in props) {
                hoostPatchProp(el, key, null, props[key]);
            }
        }

        // 处理子节点
        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            // 子节点是文本
            hostSetElementText(el, children);
        } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            // 子节点是数组
            mountChildren(children, el);
        }

        // 把el插入到container中
        hostInsert(el, container);
    };

    /**
     * 更新props
     * 1. 老的 props 全删掉
     * 2. 新的 props 设置上
     * @param el
     * @param oldProps
     * @param newProps
     */
    const patchProps = (el, oldProps, newProps) => {
        if (oldProps === newProps) {
            return;
        }

        if (oldProps) {
            // 老的 props 全干掉
            for (const key in oldProps) {
                hoostPatchProp(el, key, oldProps[key], null);
            }
        }

        if (newProps) {
            // 新的 props 全干掉
            for (const key in newProps) {
                hoostPatchProp(el, key, oldProps?.[key], newProps[key]);
            }
        }
    };

    /**
     * 更新子节点
     * 1. 新的子节点是文本
     *  a. 老的子节点是数组
     *  b. 老的子节点是文本
     * 2. 新的子节点是数组或者null
     *  a. 老的子节点是文本
     *  b. 老的子节点是数组
     *  c. 老的是null
     * @param n1
     * @param n2
     */
    const patchChildren = (n1, n2) => {
        const el = n2.el;

        const prevShapeFlag = n1.shapeFlag;
        const shapeFlag = n2.shapeFlag;

        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                // 新--文本，老--数组 把老的children全卸载
                unmountChildren(n1.children);
            }

            if (n1.children !== n2.children) {
                // 新--文本，老--文本 并且内容变化，直接更新
                hostSetElementText(el, n2.children);
            }
        } else {
            if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
                // 新--数组（或者 null），老--文本 把老的子元素文本干掉
                hostSetElementText(el, '');
                if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                    // 新的是数组，挂载新的节点
                    mountChildren(n2.children, el);
                }
            } else {
                // 新--数组（或者 null），老--数组（或者 null） 全量diff
                if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                    if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                        // 新--数组，老--数组 全量diff
                        // TODO: 全量diff
                    } else {
                        // 新--null，老--数组 全量diff
                        unmountChildren(n1.children);
                    }
                } else {
                    // 老--null
                    if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                        // 新--数组
                        mountChildren(n2.children, el);
                    }
                    // 新--null，不做处理
                }
            }
        }
    };

    /**
     * 更新
     * 1. 复用 dom 元素
     * 2. 更新 props
     * 3. 更新 children
     * @param n1 老的
     * @param n2 新的
     */
    const patchElement = (n1, n2) => {
        // 复用dom，每次进来，把上一次的 el 保存到最新的虚拟节点上
        const el = (n2.el = n1.el);

        // 更新 props
        const oldProps = n1.props;
        const newProps = n2.props;
        patchProps(el, oldProps, newProps);

        // 更新 children
        patchChildren(n1, n2);
    };

    /**
     * 更新和挂载的方法
     * @param n1 老节点，如果有，表示要和 n2 做 diff 进行更新，没有则表示挂载
     * @param n2 新节点，
     * @param container 要要挂载的容器
     */
    const patch = (n1, n2, container) => {
        if (n1 === n2) {
            // 如果两次传递了同一个虚拟节点，直接返回
            return;
        }

        if (n1 && !isSameVNodeType(n1, n2)) {
            // 两个节点不是同一类型，卸载n1
            unmount(n1);
            n1 = null;
        }

        if (n1 === null) {
            // 挂载
            mountElement(n2, container);
        } else {
            // 更新
            patchElement(n1, n2);
        }
    };

    const render = (vnode, container) => {
        /**
         * 分三步
         * 1. 挂载
         * 2. 更新
         * 3. 卸载
         */

        if (vnode === null) {
            if (container._vnode) {
                // 卸载
                unmount(container._vnode);
            }
        } else {
            // 挂载和更新
            patch(container._vnode || null, vnode, container);
        }
        // 保存本次vnode，用来下次 diff 或者 卸载
        container._vnode = vnode;
    };

    return {
        render,
    };
}
