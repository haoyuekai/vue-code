import {
    getCurrentInstance,
    setCurrentInstance,
    unsetCurrentInstance,
} from './component';

export enum LifecycleHooks {
    // 挂载
    BEFORE_MOUNT = 'bm',
    MOUNTED = 'm',
    // 更新
    BEFROE_UPDATE = 'bu',
    UPDATED = 'u',
    // 卸载
    BEFORE_UNMOUNT = 'bum',
    UNMOUNTED = 'um',
}

function createHook(type) {
    return (hook, target = getCurrentInstance()) => {
        injectHook(target, hook, type);
    };
}

/**
 * 注入生命周期
 * @param target 当前组件实例
 * @param hook 用户传递的回调
 * @param type 生命周期类型
 */
function injectHook(target, hook, type) {
    // 如果一开始 instance[type] 没有值，给他一个数组
    if (target[type] == null) {
        target[type] = [];
    }

    /**
     * 重写 hook 确保生命周期函数执行期间，可以访问到 currentInstance
     */
    const _hook = () => {
        // 执行之前设置 currentInstance
        setCurrentInstance(target);
        hook();
        // 执行之后清空 currentInstance
        unsetCurrentInstance();
    };

    // 保存 hook
    target[type].push(_hook);
}

// 挂载
export const onBeforeMount = createHook(LifecycleHooks.BEFORE_MOUNT);
export const onMounted = createHook(LifecycleHooks.MOUNTED);

// 更新
export const onBeforeUpdate = createHook(LifecycleHooks.BEFROE_UPDATE);
export const onUpdated = createHook(LifecycleHooks.UPDATED);

// 更新
export const onBeforeUnmount = createHook(LifecycleHooks.BEFORE_UNMOUNT);
export const onUnmounted = createHook(LifecycleHooks.UNMOUNTED);

/**
 * 触发生命周期钩子
 * @param instance 当前组件的实例
 * @param type 生命周期的类型 bm | m | bu | u | bum | um
 */
export function triggerHooks(instance, type) {
    const hooks = instance[type];

    if (hooks) {
        // 依次执行hook
        hooks.forEach(hook => hook());
    }
}
