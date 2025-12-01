// 判断是否对象
export function isObject(value) {
    return typeof value === 'object' && value !== null;
}

/**
 * 判断值有没有发生变化
 * @param newValue
 * @param oldValue
 * @returns
 */
export function hasChanged(newValue, oldValue) {
    return !Object.is(newValue, oldValue);
}

export function isFunction(value) {
    return typeof value === 'function';
}

// 是否是event
export function isOn(key) {
    return /^on[A-Z]/.test(key);
}

export function isString(value) {
    return typeof value === 'string';
}

export const isArray = Array.isArray;
