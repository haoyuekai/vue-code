export const isTeleport = type => type.__isTeleport;

export const Teleport = {
    name: 'Teleport',

    // Teleport 组件标记
    __isTeleport: true,

    props: {
        to: {
            // 要挂载到选择器为 to 的容器中
            type: String,
        },
        disabled: {
            // 是否禁用 Teleport, 如果禁用，子节点挂载到 container 中
            type: Boolean,
        },
    },

    /**
     * 挂载和更新
     * @param n1
     * @param n2
     * @param container
     * @param anchor
     * @param parentComponent
     * @param internals
     */
    process(n1, n2, container, anchor, parentComponent, internals) {
        const {
            mountChildren,
            patchChildren,
            options: { querySelector, insert },
        } = internals;

        const { disabled, to } = n2.props;

        if (n1 == null) {
            /**
             * 挂载
             * 把 n2.children 挂载到选择器为 to 的容器中
             */
            // 如果禁用，就挂载到 container 中，否则就根据 to 查询 dom
            const target = disabled ? container : querySelector(to);
            if (target) {
                // 首次挂载，保存target
                n2.target = target;
                mountChildren(n2.children, target, parentComponent);
            }
        } else {
            // 更新
            patchChildren(n1, n2, n1.target, parentComponent);
            // 复用target
            n2.target = n1.target;

            const prevProps = n1.props;
            if (prevProps.to !== to || prevProps.disabled !== disabled) {
                /**
                 * to 发生了变化，
                 * disabled 发生了变化，
                 * 都需要 将原来的子节点移动到新的 target 中
                 */
                const target = disabled ? container : querySelector(to);
                for (const child of n2.children) {
                    insert(child.el, target);
                }
            }
        }
    },

    remove() {},
};
