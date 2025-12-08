import { ShapeFlags } from '@vue/shared';
import {
    setCurrentRenderInstance,
    unsetCurrentRenderInstance,
} from './component';

/**
 * 对比两次的 props 是否发生改变
 * @param prevProps
 * @param nextProps
 * @returns
 */
function hasPropsChanged(prevProps, nextProps) {
    const nextKeys = Object.keys(nextProps);
    if (nextKeys.length !== Object.keys(prevProps).length) {
        return true;
    }

    for (const key of nextKeys) {
        if (nextProps[key] !== prevProps[key]) {
            return true;
        }
    }

    return false;
}

/**
 * 判断是否需要更新组件
 * @param n1
 * @param n2
 * @returns
 */
export function shouldUpdateComponent(n1, n2) {
    const { props: prevProps, children: prevChildren } = n1;
    const { props: nextProps, children: nextChildren } = n2;

    /**
     * 任意一个有插槽（children），直接更新
     */
    if (prevChildren || nextChildren) {
        return true;
    }

    if (!prevProps) {
        // 老的没有：  新的有--更新  新的没有--不更新
        return !!nextProps;
    }
    if (!nextProps) {
        // 老的有：新的没有--更新
        return true;
    }

    /**
     * 老的和新的 props 都存在
     */

    return hasPropsChanged(prevProps, nextProps);
}

export function renderComponentRoot(instance) {
    const { vnode } = instance;

    if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
        // 有状态的组件

        // render 之前设置当前组件实例
        setCurrentRenderInstance(instance);
        const subTree = instance.render.call(instance.proxy);
        // render 调用完了，清空当前组件实例
        unsetCurrentRenderInstance();

        return subTree;
    } else {
        // 函数式组件
        return vnode.type(instance.props, {
            get attrs() {
                return instance.attrs;
            },
            slots: instance.slots,
            emit: instance.emit,
        });
    }
}
