import { hasChanged, isFunction } from '@vue/shared';
import { ReactiveFlags } from './ref';
import { Link, Dependency, Sub, link, startTrack, endTrack } from './system';
import { activeSub, setActiveSub } from './effect';

class ComputedRefImpl implements Dependency, Sub {
    // computed也是一个ref
    [ReactiveFlags.IS_REF] = true;

    // 保存fn的值
    _value;

    // 作为dep,要关联subs（effect）,value更新后，要通知他们重新执行
    /**
     * 订阅者链表的头结点（head）
     */
    subs: Link;
    /**
     * 订阅者链表的尾节点（tail）
     */
    subsTail: Link;

    // 作为sub,要知道那些dep（ref），被此处收集了
    /**
     * 依赖项链表的头节点
     */
    deps: Link | undefined;
    /**
     * 依赖项链表的尾节点
     */
    depsTail: Link | undefined;

    tracking: boolean;

    // 计算属性脏不脏， 如果dirty为true, 表示计算属性是脏的，get value 的时候，需要执行update
    dirty = true;

    constructor(
        public fn, // getter
        private setter,
    ) {}

    get value() {
        if (this.dirty) {
            this.update();
        }

        /**
         * 此处和sub（effect）做关联关系
         */
        if (activeSub) {
            link(this, activeSub);
        }

        return this._value;
    }

    set value(newValue) {
        if (this.setter) {
            this.setter(newValue);
        } else {
            console.warn('只读属性，不允许赋值');
        }
    }

    update() {
        /**
         * 实现sub的功能，执行fn期间，收集执行fn执行过程中访问到的响应式数据
         * 建立dep和sub的关联关系
         */
        // 先将之前的activeSub保存起来，用来处理嵌套的逻辑
        const prevSub = activeSub;

        // 每次执行 fn 之前，把 this 放到 activeSub 上
        setActiveSub(this);
        startTrack(this);

        try {
            const oldValue = this._value;
            this._value = this.fn();

            // 值是否发生变化
            return hasChanged(this._value, oldValue);
        } finally {
            // 执行完成后，把activeSub设置为prevSub
            endTrack(this);
            setActiveSub(prevSub);
        }
    }
}

/**
 * 计算属性
 * @param getterOrOptions 函数 or 对象{get 和 set属性}
 */
export function computed(getterOrOptions) {
    let getter;
    let setter;

    if (isFunction(getterOrOptions)) {
        /**
         * const c = computed(() => {})
         */
        getter = getterOrOptions;
    } else {
        /**
         * const c = computed({get() {}, set() {}})
         */
        getter = getterOrOptions.get;
        setter = getterOrOptions.set;
    }

    return new ComputedRefImpl(getter, setter);
}
