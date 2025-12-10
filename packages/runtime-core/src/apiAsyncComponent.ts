import { ref } from '@vue/reactivity';
import { h } from './h';
import { isFunction } from '@vue/shared';

export function defineAsyncComponent(options) {
    if (isFunction(options)) {
        options = {
            loader: options,
        };
    }

    const defaultComponent = () => h('span', null, '');

    const {
        loader,
        loadingComponent = defaultComponent,
        errorComponent = defaultComponent,
        timeout,
    } = options;

    return {
        setup(props, { attrs, slots }) {
            const component = ref(loadingComponent);

            function loadComponent() {
                return new Promise((resolve, reject) => {
                    if (timeout && timeout > 0) {
                        setTimeout(() => {
                            // 包装一下，手动处理超时
                            reject('请求超时');
                        }, timeout);
                    }
                    // loader() 成功调用 resolve, 失败调用 reject
                    loader().then(resolve, reject);
                });
            }

            /**
             * loader 返回一个 Promise
             * 可以设置超时时间，超时
             */
            loadComponent().then(
                comp => {
                    // 加载成功
                    if (comp && comp[Symbol.toStringTag] === 'Module') {
                        // 处理 esModule
                        // @ts-ignore
                        comp = comp.default;
                    }
                    component.value = comp;
                },
                () => {
                    // 加载失败
                    component.value = errorComponent;
                },
            );

            return () => {
                return h(
                    component.value,
                    {
                        ...props,
                        ...attrs,
                    },
                    slots,
                );
            };
        },
    };
}
