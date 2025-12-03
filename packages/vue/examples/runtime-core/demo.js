/**
 * 最长递增子序列
 * https://leetcode.cn/problems/longest-increasing-subsequence/
 *
 */

const arr1 = [1, 5, 3, 4, 7, 8];
/**
 * [1, 5, 3, 4, 7, 8]
 * 1
 * 1, 5
 * 1, 3
 * 1, 3, 4
 * 1, 3, 4, 7
 * 1, 3, 4, 7, 8
 */

const arr2 = [10, 3, 5, 9, 12, 8, 15, 18];
/**
 * [10, 3, 5, 9, 12, 8, 15, 18]
 * 10
 * 3
 * 3, 5
 * 3, 5, 9
 * 3, 5, 9, 12
 * 3, 5, 8, 12
 * 3, 5, 8, 12, 15
 * 3, 5, 8, 12, 15, 18
 *
 * 反向追溯
 * 3, 5, 9, 12, 15, 18
 */

function getSequence(arr) {
    const result = [];

    // 记录前驱节点
    const map = new Map();

    for (let i = 0; i < arr.length; i++) {
        const item = arr[i];

        if (result.length === 0) {
            // 如果result为空，说明当前元素是递增子序列的第一个元素，把当前索引放进去
            result.push(i);
            continue;
        }

        const lastIndex = result[result.length - 1];
        const lastItem = arr[lastIndex];

        // 当前项大于上一个，说明可以延续递增子序列，直接加入
        if (item > lastItem) {
            result.push(i);
            map.set(i, lastIndex);
            continue;
        }

        // item <= lastItem
        let left = 0;
        let right = result.length;

        while (left < right) {
            const mid = Math.floor((left + right) / 2);
            const midItem = arr[result[mid]];

            if (item > midItem) {
                left = mid + 1;
            } else {
                right = mid;
            }
        }

        if (arr[result[left]] > item) {
            if (left > 0) {
                map.set(i, result[left - 1]);
            }
            // 找到合适的位置，把索引替换进去
            result[left] = i;
        }
    }

    let l = result.length;
    let last = result[l - 1];

    while (l > 0) {
        l--;
        // 纠正顺序
        result[l] = last;
        // 找前驱节点
        last = map.get(last);
    }

    return result;
}

console.log(getSequence(arr2));
