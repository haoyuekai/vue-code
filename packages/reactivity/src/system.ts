import next from 'next';

/**
 * 依赖项(ref computed等)
 */
interface Dep {
    // 依赖项链表的头结点
    subs: Link | undefined;
    // 依赖项链表的尾节点
    subsTail: Link | undefined;
}

/**
 * 订阅者(effect watch等)
 */
interface Sub {
    // 订阅者链表的头结点
    deps: Link | undefined;
    // 订阅者链表的尾节点
    depsTail: Link | undefined;
}

/**
 * 链表节点
 */
export interface Link {
    // 订阅者
    sub: Sub;
    nextSub: Link | undefined;
    prevSub: Link | undefined;
    // 依赖项
    dep: Dep;
    nextDep: Link | undefined;
}

let linkPool: Link;

/**
 * 链接链表关系
 * @param dep
 * @param sub
 */
export function link(dep, sub) {
    /**
     * 尝试复用链表节点
     */
    // 获取尾节点
    const currentDep = sub.depsTail;
    /**
     * 1. 头节点存在，尾节点不存在，尝试复用头结点（currentDep === undefind && sub.deps）复用sub.deps
     * 2. 尾节点存在，尝试复用尾节点的nextDep（currentDep && currentDep.nextDep复用currentDep.nextDep
     * 判断等于当前dep（ref）同一ref下可以复用，执行复用逻辑，否则继续下面的逻辑
     * if (!currentDep) {1} else if (currentDep) {2}
     */
    const nextDep = currentDep === undefined ? sub.deps : currentDep.nextDep;
    if (nextDep?.dep === dep) {
        // 移动为尾指针，指向复用节点
        sub.depsTail = nextDep;
        return;
    }

    let newLink;
    /**
     * 判断linkPoll是否存在，决定是否复用
     */
    if (linkPool) {
        newLink = linkPool;
        linkPool = linkPool.nextDep;
        newLink.sub = sub;
        newLink.dep = dep;
        newLink.nextDep = nextDep;
    } else {
        newLink = {
            sub, // 当前节点的effect
            dep, // dep指向当前节点关联的ref
            nextDep, // 创建新节点时，nextDep指向之前创建（如果有）的节点，后面用来清理这个节点的关联关系
            nextSub: undefined,
            prevSub: undefined,
        };
    }
    /**
     * 将链表节点和dep(ref)建立关联关系(双向链表)
     * 关联链表关系，判断尾节点是否存在
     * 尾节点存在，往尾节点后面添加
     * 尾节点不存在，表示第一次添加，往头结点添加，头尾相同
     */
    if (dep.subsTail) {
        dep.subsTail.nextSub = newLink;
        newLink.prevSub = dep.subsTail;
        dep.subsTail = newLink;
    } else {
        dep.subs = newLink;
        dep.subsTail = newLink;
    }

    /**
     * 将链表节点和sub(effect)建立关联关系(单向链表)
     * 关联链表关系，判断尾节点是否存在
     * 尾节点存在，往尾节点后面添加
     * 尾节点不存在，表示第一次添加，往头结点添加，头尾相同
     */
    if (sub.depsTail) {
        sub.depsTail.nextDep = newLink;
        sub.depsTail = newLink;
    } else {
        sub.deps = newLink;
        sub.depsTail = newLink;
    }
}

/**
 *
 * @param subs 传播更新的函数
 */
export function propagate(subs) {
    let link = subs;
    let queuedEffect = [];

    while (link) {
        const sub = link.sub;
        if (!sub.tracking) {
            queuedEffect.push(link.sub);
        }
        link = link.nextSub;
    }

    queuedEffect.forEach(effect => {
        effect.notify();
    });
}

/**
 * 开始追踪依赖，将depsTail设置成undefind
 * @param sub
 */
export function startTrack(sub) {
    sub.tracking = true;
    sub.depsTail = undefined;
}

/**
 * 结束追踪，找到需要清理的依赖，断开关联关系
 * @param sub
 */
export function endTrack(sub) {
    sub.tracking = false;
    const depsTail = sub.depsTail;
    /**
     * 1. depsTail存在，并且有nextDep，清理nextDep
     * 2. depsTail没有，并且deps有，清理所有的
     */
    if (depsTail) {
        if (depsTail.nextDep) {
            // 清理nextDep
            clearTracking(depsTail.nextDep);
            depsTail.nextDep = undefined;
        }
    } else if (sub.deps) {
        // 从头开始清理
        clearTracking(sub.deps);
        sub.deps = undefined;
    }
}

/**
 * 清理依赖关系
 * @param link
 */
export function clearTracking(link: Link) {
    while (link) {
        const { prevSub, nextSub, dep, nextDep } = link;
        /**
         * 如果有prevSub，把prevSub的下一个节点，指向当前节点的下一下节点（删除中间节点）
         * 如果没有prevSub，说明是头节点，dep.subs指向当前节点的下一个节点（删除头结点）
         */
        if (prevSub) {
            prevSub.nextSub = nextSub;
            link.nextSub = undefined;
        } else {
            dep.subs = nextSub;
        }

        /**
         * 如果有nextSub，把nextSub的上一个节点，指向当前节点的上一个节点
         * 如果没有nextSub，说明是尾结点，把dep.depsTail指向上一个节点
         */
        if (nextSub) {
            nextSub.prevSub = prevSub;
            link.prevSub = undefined;
        } else {
            dep.subsTail = prevSub;
        }

        link.dep = link.sub = undefined;

        // 要清理的节点，使用linkPoll暂存，用以后面复用
        link.nextDep = linkPool;
        linkPool = link;

        link = nextDep;
    }
}
