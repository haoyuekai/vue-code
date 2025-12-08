import { isRef } from '@vue/reactivity';
import { isString, ShapeFlags } from '@vue/shared';
import { getComponentPublicInstance } from './component';

export function setRef(ref, vnode) {
    const { r: rawRef, i: instance } = ref;

    // vnode 传 null 卸载的时候，清除 refs
    if (vnode == null) {
        if (isRef(rawRef)) {
            rawRef.value = null;
        } else if (isString(rawRef)) {
            instance.refs[rawRef] = null;
        }
        return;
    }

    const { shapeFlag } = vnode;

    if (isRef(rawRef)) {
        // 判断 rawRef 是响应式 Ref，绑定 el 到 rawRef.value 上

        if (shapeFlag & ShapeFlags.COMPONENT) {
            // 组件类型
            rawRef.value = getComponentPublicInstance(vnode.component);
        } else {
            // vnode 是 dom 元素类型
            rawRef.value = vnode.el;
        }
    } else if (isString(rawRef)) {
        // 把 vnode.el 绑定到 instance.$refs[rawRef] 上
        if (shapeFlag & ShapeFlags.COMPONENT) {
            // 组件
            instance.refs[rawRef] = getComponentPublicInstance(vnode.component);
        } else {
            // 元素
            instance.refs[rawRef] = vnode.el;
        }
    }
}
