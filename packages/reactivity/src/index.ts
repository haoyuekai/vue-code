import { isObject } from '@vue/shared';

export function reactive() {
    console.log(isObject({}));
}