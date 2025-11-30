import { hasChanged, isObject } from '@vue/shared';
import { track, trigger } from './dep';
import { isRef } from './ref';
import { reactive } from './reactive';

export const mutableHandlers = {
    get(target, key, receiver) {
        // 收集依赖，绑定target中某一个key和sub（effect）之间的关系
        track(target, key);

        /**
         * recevier用来保证访问器里的this指向代理对象
         */
        const res = Reflect.get(target, key, receiver);

        /**
         * 如果target[key]是一个ref,直接把值返回，不要返回一个ref对象
         * target = {a: ref(1)}
         */
        if (isRef(res)) {
            return res.value;
        }

        /**
         * 如果res是obj,将它包装成响应式对象返回，用来深层次构建响应式
         */
        if (isObject(res)) {
            return reactive(res);
        }

        return res;
    },
    set(target, key, value, receiver) {
        const oldValue = target[key];
        const res = Reflect.set(target, key, value, receiver);

        /**
         * 如果更新了 target[key]，它之前是ref,同步修改原始ref.value
         * 如果newValue是ref,不修改原始ref.value
         * example: a = ref(0) target = { a }
         * target.a = 1 // 同步更新a.value
         * target.a = ref(1) // 不更新a.value
         */
        if (isRef(oldValue) && !isRef(value)) {
            oldValue.value = value;
            return res;
        }

        // 只有在值发生变化之后，才触发更新
        if (hasChanged(value, oldValue)) {
            // 触发更新，通知之前收集的依赖，重新执行
            trigger(target, key);
        }
        return res;
    },
};
