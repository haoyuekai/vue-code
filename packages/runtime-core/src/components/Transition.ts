import { getCurrentInstance, h } from '@vue/runtime-core';

function resolveTransitionProps(props) {
    const {
        name = 'v',
        enterFromClass = `${name}-enter-from`,
        enterActiveClass = `${name}-enter-active`,
        enterToClass = `${name}-enter-to`,
        leaveFromClass = `${name}-leave-from`,
        leaveActiveClass = `${name}-leave-active`,
        leaveToClass = `${name}-leave-to`,
        onEnter,
        onBeforeEnter,
        onLeave,
        ...rest
    } = props;

    return {
        ...rest,
        beforeEnter(el) {
            el.classList.add(enterFromClass);
            el.classList.add(enterActiveClass);
            onBeforeEnter?.(el);
        },
        enter(el) {
            // 动画结束，删掉 enter-to 和 enter-active 类
            const done = () => {
                el.classList.remove(enterToClass);
                el.classList.remove(enterActiveClass);
            };
            requestAnimationFrame(() => {
                // 下一帧删除类名，
                el.classList.remove(enterFromClass);
                el.classList.add(enterToClass);
            });
            onEnter?.(el, done);
            // 用户未传 onEnter 或者 onEnter 参数小于2（既没传 done）,动画结束后自动调用done
            if (!onEnter || onEnter.length < 2) {
                el.addEventListener('transitionend', done);
            }
        },
        leave(el, remove) {
            const done = () => {
                el.classList.remove(leaveToClass);
                el.classList.remove(leaveActiveClass);
                remove();
            };

            el.classList.add(leaveFromClass);
            el.classList.add(leaveActiveClass);

            requestAnimationFrame(() => {
                // 下一帧删除类名，
                el.classList.remove(leaveFromClass);
                el.classList.add(leaveToClass);
            });

            onLeave?.(el, done);

            // 用户未传 onLeave 或者 onLeave 参数小于2（既没传 done）,动画结束后自动调用done
            if (!onLeave || onLeave.length < 2) {
                el.addEventListener('transitionend', done);
            }
        },
    };
}

export function Transition(props, { slots }) {
    return h(BaseTransition, resolveTransitionProps(props), slots);
}

const BaseTransition = {
    props: ['enter', 'leave', 'beforeEnter', 'appear'],
    setup(props, { slots }) {
        const vm = getCurrentInstance();

        return () => {
            const vnode = slots.default();
            if (!vnode) return;
            if (vm.isMounted || props.appear) {
                vnode.transition = props;
            } else {
                vnode.transition = {
                    leave: props.leave,
                };
            }
            return vnode;
        };
    },
};
