// @aws-cdk/custom-resources/lib/aws-custom-resource/runtime/index.js#L17-L17

export function flatten(object: object) {
  return Object.assign({}, ...function _flatten(child: { [key: string]: any }, path = [] as string[]): any {
    return [].concat(...Object.keys(child)
      .map(key => {
        const childKey = Buffer.isBuffer(child[key]) ? child[key].toString('utf8') : child[key];
        return typeof childKey === 'object' && childKey !== null
          ? _flatten(childKey, path.concat([key]))
          : ({ [path.concat([key]).join('.')]: childKey });
      }));
  }(object));
}
