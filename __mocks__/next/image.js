/**
 * @file image.js
 * @description Mock for Next.js Image component in Jest tests
 * @author Jest Fix Team
 */

const React = require('react');

// Mock Next.js Image component
const MockImage = React.forwardRef((props, ref) => {
  const {
    src,
    alt,
    width,
    height,
    fill,
    priority,
    loading,
    placeholder,
    blurDataURL,
    quality,
    sizes,
    style,
    className,
    onLoad,
    onError,
    ...rest
  } = props;

  // Create img element with essential props
  return React.createElement('img', {
    ref,
    src: typeof src === 'string' ? src : src?.src || '',
    alt: alt || '',
    width: fill ? undefined : width,
    height: fill ? undefined : height,
    style: fill ? { ...style, objectFit: 'cover' } : style,
    className,
    onLoad,
    onError,
    'data-testid': 'next-image-mock',
    ...rest,
  });
});

MockImage.displayName = 'MockImage';

module.exports = MockImage;
module.exports.default = MockImage;