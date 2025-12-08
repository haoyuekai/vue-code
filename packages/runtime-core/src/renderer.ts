import { ShapeFlags } from '@vue/shared';
import { isSameVNodeType, normalizeVNode, Text } from './vnode';
import { createAppAPI } from './apiCreateApp';
import { createComponentInstance, setupComponent } from './component';
import { ReactiveEffect } from '@vue/reactivity';
import { queueJob } from './scheduler';
import {
    renderComponentRoot,
    shouldUpdateComponent,
} from './componentRenderUtils';
import { updateProps } from './componentProps';
import { updateSlots } from './componentSlots';
import { LifecycleHooks, triggerHooks } from './apiLifecycle';
import { setRef } from './renderTemplateRef';

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
     * 组件卸载
     * @param instance
     */
    const unmountComponent = instance => {
        /**
         * 卸载前 触发 onBeforeUnmount
         */
        triggerHooks(instance, LifecycleHooks.BEFORE_UNMOUNT);

        // 把 subTree 卸载掉
        unmount(instance.subTree);

        /**
         * 卸载后 触发 onUnmounted
         */
        triggerHooks(instance, LifecycleHooks.UNMOUNTED);
    };

    /**
     * 卸载
     * @param vnode
     */
    const unmount = vnode => {
        const { el, shapeFlag, children, type, ref } = vnode;

        if (shapeFlag & ShapeFlags.COMPONENT) {
            // 组件
            unmountComponent(vnode.component);
        } else if (shapeFlag & ShapeFlags.TELEPORT) {
            // Teleport组件
            // 源码：type.remove(...);
            unmountChildren(children);
            return;
        } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            // 子节点是数组

            unmountChildren(children);
        }
        // 移除之前挂载时dom
        hostRemove(el);

        if (ref != null) {
            setRef(ref, null);
        }
    };

    /**
     * 挂载子元素
     * @param children
     * @param el
     * @param parentComponent
     */
    const mountChildren = (children, el, parentComponent) => {
        for (let i = 0; i < children.length; i++) {
            // 标准化vnode
            const child = (children[i] = normalizeVNode(children[i]));
            // 递归挂载子节点
            patch(null, child, el, null, parentComponent);
        }
    };

    /**
     * 挂载节点
     * 1. 创建一个dom节点
     * 2. 设置他的 props
     * 3. 挂载他的子节点
     * @param vnode
     * @param container
     * @param anchor
     */
    const mountElement = (vnode, container, anchor, parentComponent) => {
        const { type, props, children, shapeFlag } = vnode;

        // 创建dom元素
        const el = hostCreateElement(type);
        // 保存el到vnode上，后续卸载更新等功能使用
        vnode.el = el;

        // 设置props
        if (props) {
            for (const key in props) {
                if (key === 'ref') continue;
                hoostPatchProp(el, key, null, props[key]);
            }
        }

        // 处理子节点
        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            // 子节点是文本
            hostSetElementText(el, children);
        } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            // 子节点是数组
            mountChildren(children, el, parentComponent);
        }

        // 把el插入到container中
        hostInsert(el, container, anchor);
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
            // 新的 props 全设置上
            for (const key in newProps) {
                if (key === 'ref') continue;
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
     * @param el
     */
    const patchChildren = (n1, n2, el, parentComponent) => {
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
                    mountChildren(n2.children, el, parentComponent);
                }
            } else {
                // 新--数组（或者 null），老--数组（或者 null） 全量diff
                if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                    if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                        // 新--数组，老--数组 全量diff
                        patchKeyedChildren(
                            n1.children,
                            n2.children,
                            el,
                            parentComponent,
                        );
                    } else {
                        // 新--null，老--数组 全量diff
                        unmountChildren(n1.children);
                    }
                } else {
                    // 老--null
                    if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                        // 新--数组
                        mountChildren(n2.children, el, parentComponent);
                    }
                    // 新--null，不做处理
                }
            }
        }
    };

    /**
     * 全量diff
     * 1. 双端 diff
     * 2. 乱序 diff
     * @param c1 老的子节点
     * @param c2 新的子节点
     * @param container
     * @param parentComponent
     */
    const patchKeyedChildren = (c1, c2, container, parentComponent) => {
        // 开始对比的下标
        let i = 0;

        // 老的子节点最后一个元素的下标
        let e1 = c1.length - 1;

        // 新的子节点最后一个元素的下标
        let e2 = c2.length - 1;

        // 头部对比
        while (i <= e1 && i <= e2) {
            const n1 = c1[i];
            const n2 = (c2[i] = normalizeVNode(c2[i]));
            if (isSameVNodeType(n1, n2)) {
                // n1, n2 是同意类型的子节点，更新，然后对比下一个
                patch(n1, n2, container, null, parentComponent);
            } else {
                break;
            }
            i++;
        }

        // 尾部对比
        while (i <= e1 && i <= e2) {
            const n1 = c1[e1];
            const n2 = (c2[e2] = normalizeVNode(c2[e2]));
            if (isSameVNodeType(n1, n2)) {
                patch(n1, n2, container, null, parentComponent);
            } else {
                break;
            }
            e1--;
            e2--;
        }

        if (i > e1) {
            /**
             * 老的少，新的多。需要挂载新的，范围是 c2 中 i 到 e2 的节点
             */

            const nextPosition = e2 + 1;

            const anchor =
                nextPosition < c2.length ? c2[nextPosition].el : null;

            while (i <= e2) {
                patch(
                    null,
                    (c2[i] = normalizeVNode(c2[i])),
                    container,
                    anchor,
                    parentComponent,
                );
                i++;
            }
        } else if (i > e2) {
            /**
             * 老的多，新的少。需要卸载老的中多的节点，范围是 c1 中 i 到 e1 的节点
             */
            while (i <= e1) {
                unmount(c1[i]);
                i++;
            }
        } else {
            /**
             * 乱序
             * 找到 key 相同的 虚拟节点，执行 patch
             */

            // 老的子节点开始查找的位置
            let s1 = i;
            // 新的子节点开始查找的位置
            let s2 = i;

            /**
             * 做一份新的子节点的 key 和 index 的映射关系
             */
            const keyToNewIndexMap = new Map();

            /**
             *
             * -1 代表不需要计算的
             */
            const newIndexToOldIndex = new Array(e2 - s2 + 1);

            // 遍历新的 s2 - e2 之间的节点（未更新的节点），做一份map
            for (let j = s2; j <= e2; j++) {
                const n2 = (c2[j] = normalizeVNode(c2[j]));
                keyToNewIndexMap.set(n2.key, j);
            }

            // 临时保存下标是否递增
            let pos = -1;

            /**
             * 是否需要调整顺序
             * false，表示老节点顺序没发生变化
             * true，表示老节点顺序发生变化，求出最长递增子序列辅助排序
             */
            let moved = false;

            // 遍历老的 s1 - e1 之间的节点
            for (let j = s1; j <= e1; j++) {
                const n1 = c1[j];
                const newIndex = keyToNewIndexMap.get(n1.key);
                // 判断 key 在新的里面是否存在，决定 patch（更新） 或者 卸载
                if (newIndex != null) {
                    if (newIndex > pos) {
                        pos = newIndex;
                    } else {
                        // 非递增，表示需要移动
                        moved = true;
                    }
                    newIndexToOldIndex[newIndex] = j;
                    patch(n1, c2[newIndex], container, null, parentComponent);
                } else {
                    unmount(n1);
                }
            }

            // 计算最长递增子序列，不需要移动的节点下标
            const newIndexSequence = moved
                ? getSequence(newIndexToOldIndex)
                : [];
            // 转换成 Set 提高查找性能（o(1)） Array ( o(n) )
            const sequenceSet = new Set(newIndexSequence);

            // 遍历新的 e2 - s2 之间的子元素，倒序插入，调整顺序
            for (let j = e2; j >= s2; j--) {
                const n2 = c2[j];
                const anchor = c2[j + 1]?.el || null;

                if (n2.el) {
                    /**
                     * el存在说明之前挂载过，调整顺序
                     * moved 为 false,表示老节点顺序没改变
                     * 调整前判断是否在最长递增子序列里面
                     * 如果不在，表示需要移动，调整顺序
                     */
                    if (moved && !sequenceSet.has(j)) {
                        hostInsert(n2.el, container, anchor);
                    }
                } else {
                    // el不存在，说明之前没有挂载过，直接挂载（第一个参数传null）
                    patch(null, n2, container, anchor, parentComponent);
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
    const patchElement = (n1, n2, parentComponent) => {
        // 复用dom，每次进来，把上一次的 el 保存到最新的虚拟节点上
        const el = (n2.el = n1.el);

        // 更新 props
        const oldProps = n1.props;
        const newProps = n2.props;
        patchProps(el, oldProps, newProps);

        // 更新 children
        patchChildren(n1, n2, el, parentComponent);
    };

    /**
     * 处理元素的挂载和更新
     * @param n1
     * @param n2
     * @param container
     * @param anchor
     * @param parentComponent
     */
    const processElement = (n1, n2, container, anchor, parentComponent) => {
        if (n1 === null) {
            // 挂载
            mountElement(n2, container, anchor, parentComponent);
        } else {
            // 更新
            patchElement(n1, n2, parentComponent);
        }
    };

    /**
     * 处理文本节点的挂载和更新
     * @param n1
     * @param n2
     * @param container
     * @param anchor
     */
    const processText = (n1, n2, container, anchor) => {
        if (n1 == null) {
            // 挂载
            // 创建文本节点
            const el = hostCreateText(n2.children);
            // vnode上绑定el
            n2.el = el;
            // 文本节点插入到container中
            hostInsert(el, container, anchor);
        } else {
            // 更新
            n2.el = n1.el;
            if (n2.children !== n1.children) {
                hostSetText(n2.el, n2.children);
            }
        }
    };

    /**
     * 复用组件实例
     * 更新 props
     * 更新 slots
     *
     * @param instance
     * @param nextVnode
     */
    const updateComponentPreRender = (instance, nextVnode) => {
        // 更新虚拟节点
        instance.vnode = nextVnode;
        instance.next = null;
        /**
         * 更新组件的属性
         * props 和 attrs
         */
        updateProps(instance, nextVnode);

        /**
         * 更新组件的插槽
         */
        updateSlots(instance, nextVnode);
    };

    const setupRenderEffect = (instance, container, anchor) => {
        const componentUpdateFn = () => {
            /**
             * 区分挂载和更新 instance.isMounted
             */
            if (!instance.isMounted) {
                // 挂载的逻辑

                const { vnode, render } = instance;

                /**
                 * 挂载前 onBeforeMount
                 */
                triggerHooks(instance, LifecycleHooks.BEFORE_MOUNT);

                // 调用 render 拿到 subTree , this 指向 instance.setupState
                const subTree = renderComponentRoot(instance);

                // 将 subTree 挂载到 container 上
                patch(null, subTree, container, anchor, instance);

                // 组件的 vnode 的 el 会指向 subTree 的 el
                vnode.el = subTree.el;

                // 保存子树
                instance.subTree = subTree;
                // 标记已挂载
                instance.isMounted = true;

                /**
                 * 挂载完成 onMounted
                 */
                triggerHooks(instance, LifecycleHooks.MOUNTED);
            } else {
                // 更新的逻辑

                let { vnode, render, next } = instance;

                if (next) {
                    // 父组件传递的属性触发的更新
                    updateComponentPreRender(instance, next);
                } else {
                    // 自身属性触发的更新，没有next，就用之前的
                    next = vnode;
                }

                /**
                 * 更新前 onBeforeUpdate
                 */
                triggerHooks(instance, LifecycleHooks.BEFROE_UPDATE);

                const prevSubTree = instance.subTree;
                // 调用 render 拿到 subTree , this 指向 instance.setupState
                const subTree = renderComponentRoot(instance);

                // 将 subTree 挂载到 container 上
                patch(prevSubTree, subTree, container, anchor, instance);

                // 组件的 vnode 的 el 会指向 subTree 的 el
                next.el = subTree.el;

                // 保存子树
                instance.subTree = subTree;

                /**
                 * 更新后 onUpdated
                 */
                triggerHooks(instance, LifecycleHooks.UPDATED);
            }
        };

        // 创建 effect
        const effect = new ReactiveEffect(componentUpdateFn);
        const update = effect.run.bind(effect);

        // 保存 effect run 到 instance.update
        instance.update = update;

        effect.scheduler = () => {
            queueJob(update);
        };

        update();
    };

    /**
     * 组件的挂载
     * 1. 创建组件实例
     * 2. 初始化组件的状态
     * 3. 将组件挂载到页面上
     * @param vnode
     * @param container
     * @param anchor
     */
    const mountComponent = (vnode, container, anchor, parentComponent) => {
        // 创建组件实例
        const instance = createComponentInstance(vnode, parentComponent);

        // 保存组件实例 到 虚拟节点，方便后续复用（对比 dom节点 保存 el）
        vnode.component = instance;

        // 初始化组件状态
        setupComponent(instance);

        // 将组件挂载到页面上，并这是 effect ,和响应式数据关联起来
        setupRenderEffect(instance, container, anchor);
    };

    /**
     * 组件更新
     * 复用组件实例（dom更新复用el）
     * @param n1
     * @param n2
     */
    function updateComponent(n1, n2) {
        const instance = (n2.component = n1.component);

        /**
         * 该更新 props 或者 slots 发生了变化
         * 父组件其他子节点发生变化 parent h('div', [h(Child, { age: 0 }), age.value])
         */

        if (shouldUpdateComponent(n1, n2)) {
            // 绑定新的虚拟节点 ==> instance
            instance.next = n2;

            instance.update();
        } else {
            // 复用元素
            n2.el = n1.el;
            // 更新虚拟节点
            instance.vnode = n2;
        }
    }

    /**
     * 组件节点的挂载和更新
     * @param n1 老节点
     * @param n2 新节点
     * @param container
     * @param anchor
     * @param parentComponent
     */
    const processComponent = (n1, n2, container, anchor, parentComponent) => {
        if (n1 == null) {
            // 挂载
            mountComponent(n2, container, anchor, parentComponent);
        } else {
            // 更新
            updateComponent(n1, n2);
        }
    };

    /**
     * 更新和挂载的方法
     * @param n1 老节点，如果有，表示要和 n2 做 diff 进行更新，没有则表示挂载
     * @param n2 新节点，
     * @param container 要要挂载的容器
     * @param anchor 插入元素的锚点
     * @param parentComponent 父组件
     */
    const patch = (
        n1,
        n2,
        container,
        anchor = null,
        parentComponent = null,
    ) => {
        if (n1 === n2) {
            // 如果两次传递了同一个虚拟节点，直接返回
            return;
        }

        if (n1 && !isSameVNodeType(n1, n2)) {
            // 卸载 n1 之前， 拿到 n1 的下一子节点，挂载的时候，将 n2 挂载到 n1 之前的位置
            anchor = hostNextSibling(n1.el);
            // 两个节点不是同一类型，卸载n1
            unmount(n1);
            n1 = null;
        }

        /**
         * 节点类型
         * 元素
         * 文本
         * 组件
         */
        const { shapeFlag, type, ref } = n2;

        switch (type) {
            case Text:
                processText(n1, n2, container, anchor);
                break;
            default:
                if (shapeFlag & ShapeFlags.ELEMENT) {
                    // 元素的子节点可能是组件，所以也要绑定父组件
                    processElement(n1, n2, container, anchor, parentComponent);
                } else if (shapeFlag & ShapeFlags.COMPONENT) {
                    // 组件
                    processComponent(
                        n1,
                        n2,
                        container,
                        anchor,
                        parentComponent,
                    );
                } else if (shapeFlag & ShapeFlags.TELEPORT) {
                    // Teleport 组件
                    type.process(n1, n2, container, anchor, parentComponent, {
                        mountChildren,
                        patchChildren,
                        options,
                    });
                }
                break;
        }

        if (ref != null) {
            setRef(ref, n2);
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
        createApp: createAppAPI(render),
    };
}

/**
 * 求最长递增子序列
 * @param arr
 * @returns
 */
function getSequence(arr) {
    const result = [];

    // 记录前驱节点
    const map = new Map();

    for (let i = 0; i < arr.length; i++) {
        const item = arr[i];
        // -1 不在计算范围内
        if (item === -1 || item == undefined) continue;

        if (result.length === 0) {
            // 如果result为空，说明当前元素是递增子序列的第一个元素，把当前索引放进去
            result.push(i);
            continue;
        }

        const lastIndex = result[result.length - 1];
        const lastItem = arr[lastIndex];

        // 当前项大于上一个，说明可以延续递增子序列，直接加入
        if (item > lastItem) {
            result.push(i);
            map.set(i, lastIndex);
            continue;
        }

        // item <= lastItem
        let left = 0;
        let right = result.length;

        while (left < right) {
            const mid = Math.floor((left + right) / 2);
            const midItem = arr[result[mid]];

            if (item > midItem) {
                left = mid + 1;
            } else {
                right = mid;
            }
        }

        if (arr[result[left]] > item) {
            if (left > 0) {
                map.set(i, result[left - 1]);
            }
            // 找到合适的位置，把索引替换进去
            result[left] = i;
        }
    }

    let l = result.length;
    let last = result[l - 1];

    while (l > 0) {
        l--;
        // 纠正顺序
        result[l] = last;
        // 找前驱节点
        last = map.get(last);
    }

    return result;
}
