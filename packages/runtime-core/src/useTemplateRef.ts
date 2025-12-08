import { ref } from '@vue/reactivity';
import { getCurrentInstance } from './component';

export function useTemplateRef(key) {
    const vm = getCurrentInstance();

    const { refs } = vm;

    /**
     * key => string
     * 会 set 到 instance.refs 上
     */
    const elRef = ref(null);

    Object.defineProperty(refs, key, {
        get() {
            return elRef.value;
        },
        set(value) {
            // 拦截 refs[key] = vnode.el
            elRef.value = value;
        },
    });

    return elRef;
}
